import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { NextResponse } from 'next/server';
import { desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'owner')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await db.query.profiles.findMany({
            orderBy: [desc(profiles.createdAt)],
        });

        return NextResponse.json(users);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
