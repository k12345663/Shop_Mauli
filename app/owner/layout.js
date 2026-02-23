'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export default function OwnerLayout({ children }) {
    return (
        <AuthGuard allowedRoles={['owner']}>
            <div className="app-layout">
                <Sidebar role="owner" />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
