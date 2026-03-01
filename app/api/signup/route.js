import { db } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const { email, password, fullName, role } = await req.json();

        if (!email || !password || !fullName || !role) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Create User (NextAuth requirements)
        const [newUser] = await db.insert(users).values({
            name: fullName,
            email: email,
        }).returning();

        // 2. Create Profile (App requirements)
        await db.insert(profiles).values({
            id: newUser.id,
            email: email,
            password: hashedPassword,
            fullName,
            role,
            isApproved: true,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
