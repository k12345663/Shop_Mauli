'use client';

import { useSession } from 'next-auth/react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }) {
    const { data: session } = useSession();
    const role = session?.user?.role || 'admin';

    return (
        <AuthGuard allowedRoles={['admin', 'owner', 'dba']}>
            <div className="app-layout">
                <Sidebar role={role} />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
