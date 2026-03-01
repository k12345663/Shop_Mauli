import { SessionProvider } from "next-auth/react";
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'RentFlow — Shop Rent Management',
    description: 'Manage shop rent collection, track payments, and view analytics',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <SessionProvider>
                    {children}
                </SessionProvider>
            </body>
        </html>
    );
}
