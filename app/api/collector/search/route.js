import { db } from "@/lib/db";
import { renters, rentPayments } from "@/lib/db/schema";
import { NextResponse } from 'next/server';
import { desc, eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'collector') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const monthQuery = searchParams.get('month'); // Format: YYYY-MM

        if (!monthQuery) {
            return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
        }

        let dbMonth = monthQuery;
        if (monthQuery && monthQuery.includes('-')) {
            const [year, monthStr] = monthQuery.split('-');
            const monthIndex = parseInt(monthStr, 10) - 1;
            const shortMonth = new Date(year, monthIndex).toLocaleString('en-US', { month: 'short' });
            dbMonth = `${shortMonth}-${year}`;
        }

        // Fetch all renters with shops
        const allRenters = await db.query.renters.findMany({
            with: {
                renterShops: {
                    with: {
                        shops: {
                            with: {
                                complexes: true
                            }
                        }
                    }
                }
            },
            orderBy: [desc(renters.renterCode)],
        });

        // Fetch all payments for the requested month
        const payments = await db.query.rentPayments.findMany({
            where: eq(rentPayments.periodMonth, dbMonth)
        });

        const paymentsByRenter = {};
        payments.forEach(p => {
            if (!paymentsByRenter[p.renterId]) {
                paymentsByRenter[p.renterId] = [];
            }
            paymentsByRenter[p.renterId].push(p);
        });

        // Attach payment status to each renter
        const results = allRenters.map(renter => {
            const renterPayments = paymentsByRenter[renter.id] || [];

            // Calculate total expected from active shops
            const expectedTotal = renter.renterShops.reduce((sum, rs) => {
                if (rs.shops?.isActive) {
                    return sum + Number(rs.shops.rentAmount || 0);
                }
                return sum;
            }, 0);

            // Calculate deposit totals
            const depositExpected = renter.renterShops.reduce((sum, rs) => sum + Number(rs.expectedDeposit || 0), 0);
            const depositCollected = renter.renterShops.reduce((sum, rs) => sum + Number(rs.depositAmount || 0), 0);

            // Calculate total collected for this month
            const collectedTotal = renterPayments.reduce((sum, p) => sum + Number(p.receivedAmount || 0), 0);

            // Determine status
            let status = 'Unpaid';
            if (expectedTotal > 0) {
                if (collectedTotal >= expectedTotal) {
                    status = 'paid';
                } else if (collectedTotal > 0) {
                    status = 'partial';
                }
            } else if (renter.renterShops.length > 0) {
                status = 'No Rent Due'; // Shops exist but rent is 0
            }

            return {
                ...renter,
                paymentStatus: {
                    status,
                    expected: expectedTotal,
                    collected: collectedTotal
                },
                depositStatus: {
                    expected: depositExpected,
                    collected: depositCollected
                }
            };
        });

        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
