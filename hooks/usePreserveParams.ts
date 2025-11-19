'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function usePreserveParams() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const paramsString = searchParams.toString();
        if (!paramsString) return;

        // Select all links within the main article content
        const links = document.querySelectorAll('main a');

        links.forEach((link) => {
            const anchor = link as HTMLAnchorElement;
            const href = anchor.getAttribute('href');

            // Skip if no href, or if it's an anchor link (#), or javascript:
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

            try {
                const url = new URL(anchor.href);

                // Append existing params to the new URL
                searchParams.forEach((value, key) => {
                    // Only append if not already present to avoid duplicates
                    if (!url.searchParams.has(key)) {
                        url.searchParams.set(key, value);
                    }
                });

                anchor.href = url.toString();
            } catch (e) {
                // If relative URL that fails new URL(), handle manually
                // But anchor.href usually returns absolute URL in browser
                console.error('Failed to process link:', href);
            }
        });
    }, [searchParams]);
}
