'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export default function CollectorLayout({ children }) {
    return (
        <AuthGuard allowedRoles={['collector']}>
            <div className="app-layout">
                <Sidebar role="collector" />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
