'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function hasRecoveryHash(hash: string): boolean {
    const value = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!value) {
        return false;
    }

    const params = new URLSearchParams(value);
    return params.get('type') === 'recovery' && Boolean(params.get('access_token'));
}

function hasRecoverySearch(search: string): boolean {
    if (!search) {
        return false;
    }

    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    return params.get('type') === 'recovery' || Boolean(params.get('token_hash'));
}

export default function RecoveryRedirectGuard() {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname === '/reset-password') {
            return;
        }

        const { hash, search } = window.location;

        if (hasRecoveryHash(hash)) {
            window.location.replace(`/reset-password${hash}`);
            return;
        }

        if (hasRecoverySearch(search)) {
            window.location.replace(`/reset-password${search}`);
        }
    }, [pathname]);

    return null;
}
