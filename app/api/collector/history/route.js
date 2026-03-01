import { db } from '@/lib/db';
import { rentPayments, renters } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'collector') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await db.select({
            id: rentPayments.id,
            renterId: rentPayments.renterId,
            collectorUserId: rentPayments.collectorUserId,
            periodMonth: rentPayments.periodMonth,
            expectedAmount: rentPayments.expectedAmount,
            receivedAmount: rentPayments.receivedAmount,
            status: rentPayments.status,
            paymentMode: rentPayments.paymentMode,
            notes: rentPayments.notes,
            collectionDate: rentPayments.collectionDate,
            createdAt: rentPayments.createdAt,
            renters: {
                renterCode: renters.renterCode,
                name: renters.name
            }
        })
            .from(rentPayments)
            .innerJoin(renters, eq(rentPayments.renterId, renters.id))
            .where(eq(rentPayments.collectorUserId, session.user.id))
            .orderBy(desc(rentPayments.createdAt))
            .limit(100);

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
