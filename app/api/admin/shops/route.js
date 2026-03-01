import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { NextResponse } from 'next/server';
import { asc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'owner')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await db.query.shops.findMany({
            with: {
                complexes: true,
                renterShops: {
                    with: {
                        renters: true
                    }
                }
            },
            orderBy: [asc(shops.shopNo)],
        });

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
