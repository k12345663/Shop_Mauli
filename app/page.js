'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        checkUserAndRedirect();
    }, []);

    async function checkUserAndRedirect() {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile) {
            const targetPath = profile.role === 'owner' ? '/admin' : `/${profile.role}`;
            router.push(targetPath);
        } else {
            router.push('/login');
        }
    }

    return (
        <div className="loading-page">
            <div className="spinner"></div>
        </div>
    );
}
