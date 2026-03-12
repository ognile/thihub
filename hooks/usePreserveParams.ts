'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function usePreserveParams(articleSlug?: string) {
    const searchParams = useSearchParams();

    useEffect(() => {
        // Function to update links
        const updateLinks = () => {
            // Select all links in the document
            const links = document.querySelectorAll('a');

            links.forEach((link) => {
                const anchor = link as HTMLAnchorElement;
                const href = anchor.getAttribute('href');

                // Skip invalid or internal anchor links
                if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

                // Skip mailto/tel
                if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

                try {
                    const url = new URL(anchor.href);
                    
                    // We only want to tag outbound links (to Shopify/Brand), not internal nav
                    const isInternal = url.hostname === window.location.hostname;
                    
                    // 1. Preserve incoming params (fbclid, etc.)
                    // Always preserve these for both internal and external to keep tracking alive
                    searchParams.forEach((value, key) => {
                        if (!url.searchParams.has(key)) {
                            url.searchParams.set(key, value);
                        }
                    });

                    // 2. Add Attribution UTMs for OUTBOUND links only
                    if (!isInternal) {
                        // Source/Medium
                        if (!url.searchParams.has('utm_source')) {
                            url.searchParams.set('utm_source', 'tophealthinsider');
                        }
                        if (!url.searchParams.has('utm_medium')) {
                            url.searchParams.set('utm_medium', 'article');
                        }
                        
                        // Content (The specific article)
                        if (articleSlug && !url.searchParams.has('utm_content')) {
                            url.searchParams.set('utm_content', articleSlug);
                        }
                        
                        // Campaign - Optional, you might want to set this via a prop too, 
                        // but usually the Ad sets this. If missing, we could set a default?
                        // For now, let's leave campaign alone so it doesn't overwrite Ad data if passed through.
                    }

                    anchor.href = url.toString();
                } catch {
                    // Ignore parsing errors
                }
            });
        };

        // Run immediately
        updateLinks();

        // Run again after a short delay to catch any late-hydrating client components
        const timer = setTimeout(updateLinks, 1000);
        
        return () => clearTimeout(timer);
    }, [searchParams, articleSlug]);
}
