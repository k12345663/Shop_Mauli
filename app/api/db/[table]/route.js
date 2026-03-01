import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { NextResponse } from 'next/server';
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(req, { params }) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { table } = await params;
        const targetTable = schema[table];

        if (!targetTable) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

        // Simple auth check: only admin/owner can see most tables, collectors can see some
        const role = session.user.role;
        const protectedTables = ['profiles', 'users', 'accounts', 'sessions', 'settings'];
        if (protectedTables.includes(table) && role !== 'admin' && role !== 'owner') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (id) {
            const data = await db.select().from(targetTable).where(eq(targetTable.id, id)).limit(1);
            return NextResponse.json(data[0] || null);
        }

        // Handle generic filters
        const filters = [];
        for (const [key, value] of searchParams.entries()) {
            if (targetTable[key]) {
                filters.push(eq(targetTable[key], value));
            }
        }

        let query = db.select().from(targetTable);
        if (filters.length > 0) {
            query = query.where(and(...filters));
        }

        const data = await query;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { table } = await params;
        const targetTable = schema[table];
        if (!targetTable) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

        // Collectors can only write to rentPayments
        const role = session.user.role;
        if (role !== 'admin' && role !== 'owner') {
            if (role !== 'collector' || table !== 'rentPayments') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await req.json();
        let result;
        if (Array.isArray(body)) {
            result = await db.insert(targetTable).values(body).returning();
        } else {
            const [inserted] = await db.insert(targetTable).values(body).returning();
            result = inserted;
        }

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { table } = await params;
        const targetTable = schema[table];
        if (!targetTable) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

        // Collectors can edit rentPayments and renterShops (for deposits)
        const role = session.user.role;
        if (role !== 'admin' && role !== 'owner') {
            const collectorTables = ['rentPayments', 'renterShops'];
            if (role !== 'collector' || !collectorTables.includes(table)) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const [updated] = await db.update(targetTable).set(updates).where(eq(targetTable.id, id)).returning();

        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await auth();
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'owner')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { table } = await params;
        const targetTable = schema[table];
        if (!targetTable) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (id) {
            await db.delete(targetTable).where(eq(targetTable.id, id));
            return NextResponse.json({ success: true });
        }

        // Handle generic filters for bulk delete
        const filters = [];
        for (const [key, value] of searchParams.entries()) {
            if (targetTable[key]) {
                filters.push(eq(targetTable[key], value));
            }
        }

        if (filters.length === 0) return NextResponse.json({ error: 'ID or filters required' }, { status: 400 });

        await db.delete(targetTable).where(and(...filters));

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
