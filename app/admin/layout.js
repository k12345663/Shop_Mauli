'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }) {
    return (
        <AuthGuard allowedRoles={['admin', 'owner']}>
            <div className="app-layout">
                <Sidebar role="admin" />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
