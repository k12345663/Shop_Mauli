import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await db.query.profiles.findFirst({
                    where: eq(profiles.email, credentials.email),
                });

                if (user && user.password) {
                    const isMatch = await bcrypt.compare(credentials.password, user.password);
                    if (isMatch) {
                        return {
                            id: user.id,
                            email: user.email,
                            name: user.fullName,
                            role: user.role,
                            is_approved: user.isApproved,
                        };
                    }
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.is_approved = token.is_approved;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.is_approved = user.is_approved;
            }
            return token;
        },
    },
    pages: {
        signIn: "/login",
    },
});
