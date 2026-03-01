import { db } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import { NextResponse } from 'next/server';
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(request) {
    try {
        const { fullName, email, password, role } = await request.json();

        if (!fullName || !email || !password || !role) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Create User in NextAuth record
        const [newUser] = await db.insert(users).values({
            name: fullName,
            email: email,
        }).returning();

        // 2. Create Profile row
        await db.insert(profiles).values({
            id: newUser.id,
            email: email,
            password: hashedPassword,
            fullName,
            role,
            isApproved: true,
        });

        return NextResponse.json({ success: true, userId: newUser.id });
    } catch (err) {
        console.error('Create user error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { userId } = await request.json();

        // Delete from profiles (which should cascade from user if configured)
        // or delete manually if not
        await db.delete(profiles).where(eq(profiles.id, userId));
        await db.delete(users).where(eq(users.id, userId));

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
