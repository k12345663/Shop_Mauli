import { db } from "@/lib/db";
import { shops, renters, rentPayments, complexes, renterShops } from "@/lib/db/schema";
import { NextResponse } from 'next/server';
import { eq, sql, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'owner')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const month = searchParams.get('month');

        if (!month) {
            return NextResponse.json({ error: 'Month is required' }, { status: 400 });
        }

        // 1. Fetch Shops
        const allShops = await db.select().from(shops).where(eq(shops.isActive, true));

        // 2. Fetch Renters
        const allRenters = await db.select().from(renters);

        // 3. Fetch Payments for this month
        const monthlyPayments = await db.select().from(rentPayments).where(eq(rentPayments.periodMonth, month));

        // 4. Fetch Complexes with Shops and RenterShops (Simple fetch and group in JS to match frontend logic)
        const allComplexes = await db.select().from(complexes);
        const shopAssignments = await db.query.renterShops.findMany({
            with: {
                renters: true,
                shops: {
                    with: {
                        complexes: true
                    }
                }
            }
        });

        // The frontend expects a specific structure. 
        // We'll return the raw data and let the frontend calculate most stats for now 
        // to minimize breaking the complex dashboard logic.

        return NextResponse.json({
            shops: allShops,
            renters: allRenters,
            payments: monthlyPayments,
            complexes: allComplexes,
            assignments: shopAssignments
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
