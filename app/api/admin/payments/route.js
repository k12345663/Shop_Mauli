import { db } from "@/lib/db";
import { rentPayments, renterShops, renters, shops, complexes, profiles } from "@/lib/db/schema";
import { NextResponse } from 'next/server';
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'owner')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const filterType = searchParams.get('type') || 'month';
        const month = searchParams.get('month');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const specificDate = searchParams.get('specificDate');

        // 1. Fetch Recorded Payments with Joins
        let conditions = [];
        if (filterType === 'month' && month) {
            conditions.push(eq(rentPayments.periodMonth, month));
        } else if (filterType === 'range') {
            if (startDate) conditions.push(gte(rentPayments.collectionDate, startDate));
            if (endDate) conditions.push(lte(rentPayments.collectionDate, endDate));
        } else if (filterType === 'day' && specificDate) {
            conditions.push(eq(rentPayments.collectionDate, specificDate));
        }

        const query = db.select({
            id: rentPayments.id,
            renterId: rentPayments.renterId,
            collectorUserId: rentPayments.collectorUserId,
            periodMonth: rentPayments.periodMonth,
            expectedAmount: rentPayments.expectedAmount,
            receivedAmount: rentPayments.receivedAmount,
            status: rentPayments.status,
            notes: rentPayments.notes,
            collectionDate: rentPayments.collectionDate,
            createdAt: rentPayments.createdAt,
            renters: {
                id: renters.id,
                renterCode: renters.renterCode,
                name: renters.name
            },
            collector: {
                fullName: profiles.fullName
            }
        })
            .from(rentPayments)
            .leftJoin(renters, eq(rentPayments.renterId, renters.id))
            .leftJoin(profiles, eq(rentPayments.collectorUserId, profiles.id));

        if (conditions.length > 0) {
            query.where(and(...conditions));
        }

        const recordedPayments = await query.orderBy(desc(rentPayments.collectionDate));

        // 2. Fetch All Active Shop Assignments for synthesis
        const assignments = await db.query.renterShops.findMany({
            with: {
                renters: true,
                shops: {
                    with: {
                        complexes: true
                    }
                }
            }
        });

        return NextResponse.json({
            recordedPayments,
            assignments
        });
    } catch (err) {
        console.error('Admin payments error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
