import { db } from "@/lib/db";
import { renters } from "@/lib/db/schema";
import { NextResponse } from 'next/server';
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'owner' && session.user.role !== 'collector')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (id) {
            const renter = await db.query.renters.findFirst({
                where: eq(renters.id, parseInt(id)),
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
                }
            });
            return NextResponse.json(renter || null);
        }

        const data = await db.query.renters.findMany({
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

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
