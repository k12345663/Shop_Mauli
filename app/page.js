'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Home() {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'loading') return;

        if (status === 'unauthenticated' || !session) {
            router.push('/login');
            return;
        }

        const user = session.user;
        if (user) {
            const targetPath = user.role === 'owner' ? '/admin' : `/${user.role}`;
            router.push(targetPath);
        } else {
            router.push('/login');
        }
    }, [session, status, router]);

    return (
        <div className="loading-page">
            <div className="spinner"></div>
        </div>
    );
}
