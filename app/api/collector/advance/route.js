import { db } from "@/lib/db";
import { rentPayments, renters } from "@/lib/db/schema";
import { NextResponse } from 'next/server';
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'collector') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { renterId, lumpSum, paymentMode, notes, collectionDate } = body;

        if (!renterId || !lumpSum || lumpSum <= 0) {
            return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 });
        }

        // 1. Fetch renter & active shops to determine Monthly Expected Rent
        const renter = await db.query.renters.findFirst({
            where: eq(renters.id, parseInt(renterId)),
            with: {
                renterShops: {
                    with: {
                        shops: true
                    }
                }
            }
        });

        if (!renter) {
            return NextResponse.json({ error: 'Renter not found' }, { status: 404 });
        }

        const activeShops = renter.renterShops.map(rs => rs.shops).filter(s => s?.isActive);
        const monthlyExpected = activeShops.reduce((sum, sh) => sum + Number(sh.rentAmount || 0), 0);

        if (monthlyExpected <= 0) {
            return NextResponse.json({ error: 'This renter has no active rent required' }, { status: 400 });
        }

        // 2. Fetch past payments to figure out what month to start applying the advance to
        // We'll start from the current calendar month and move forward
        const now = new Date();
        let currentYear = now.getFullYear();
        let currentMonthNum = now.getMonth(); // 0-indexed

        const allPayments = await db.query.rentPayments.findMany({
            where: eq(rentPayments.renterId, renter.id)
        });

        const getMonthString = (year, monthIndex) => {
            const shortMonth = new Date(year, monthIndex).toLocaleString('en-US', { month: 'short' });
            return `${shortMonth}-${year}`;
        };

        const newRecords = [];
        let remainingSum = Number(lumpSum);
        let loops = 0; // Failsafe

        // 3. Auto-Split Loop
        while (remainingSum > 0 && loops < 120) { // Max 10 years advance to prevent infinite loop errors
            loops++;

            const targetMonthStr = getMonthString(currentYear, currentMonthNum);

            // Check if this month is already fully paid
            const monthPayments = allPayments.filter(p => p.periodMonth === targetMonthStr);
            const totalCollectedThisMonth = monthPayments.reduce((s, p) => s + Number(p.receivedAmount || 0), 0);

            const monthDeficit = Math.max(0, monthlyExpected - totalCollectedThisMonth);

            if (monthDeficit > 0) {
                // We need to apply payment to this month
                const amountToApply = Math.min(monthDeficit, remainingSum);
                const willBeFullyPaid = (totalCollectedThisMonth + amountToApply) >= monthlyExpected;

                newRecords.push({
                    renterId: renter.id,
                    collectorUserId: session.user.id,
                    periodMonth: targetMonthStr,
                    expectedAmount: monthlyExpected.toString(),
                    receivedAmount: amountToApply.toString(),
                    status: willBeFullyPaid ? 'paid' : 'partial',
                    paymentMode: paymentMode || 'cash',
                    collectionDate: collectionDate || new Date().toISOString().split('T')[0],
                    notes: `(Advance Distribution) ${notes || ''}`.trim()
                });

                remainingSum -= amountToApply;
            }

            // Move to next month
            currentMonthNum++;
            if (currentMonthNum > 11) {
                currentMonthNum = 0;
                currentYear++;
            }
        }

        // 4. Save to DB in a transaction
        if (newRecords.length > 0) {
            await db.transaction(async (tx) => {
                for (const record of newRecords) {
                    await tx.insert(rentPayments).values(record);
                }
            });
        }

        return NextResponse.json({
            success: true,
            monthsAffected: newRecords.length,
            recordsCreated: newRecords
        });

    } catch (err) {
        console.error('Advance payment error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
