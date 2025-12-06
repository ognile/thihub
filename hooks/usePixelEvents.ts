'use client';

import { useEffect, useRef } from 'react';

export default function usePixelEvents() {
    const hasFiredViewContent = useRef(false);
    const hasFiredHalf = useRef(false);
    const hasFiredFull = useRef(false);

    useEffect(() => {
        // Helper to track events safely
        const trackEvent = (eventName: string, data?: any) => {
            import('react-facebook-pixel')
                .then((x) => x.default)
                .then((ReactPixel) => {
                    ReactPixel.track(eventName, data);
                    console.log(`[Pixel] Fired: ${eventName}`, data);
                });
        };

        // 0. ViewContent - Fire on article page load (standard FB Pixel best practice)
        if (!hasFiredViewContent.current) {
            trackEvent('ViewContent', {
                content_type: 'article',
                content_name: document.title,
                content_category: 'Health Article',
            });
            hasFiredViewContent.current = true;
        }

        // 1. Lead Tracking (Click on any link)
        const handleLinkClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (link) {
                trackEvent('Lead', {
                    content_name: document.title,
                    content_category: 'Article Link',
                    value: 0.00,
                    currency: 'USD'
                });
            }
        };
        document.addEventListener('click', handleLinkClick);

        // 2. Scroll Tracking (50% and 90%)
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = scrollTop / docHeight;

            // ReadHalfArticle (50%)
            if (scrollPercent >= 0.5 && !hasFiredHalf.current) {
                trackEvent('ReadHalfArticle');
                hasFiredHalf.current = true;
            }

            // ReadFullArticle (90%)
            if (scrollPercent >= 0.9 && !hasFiredFull.current) {
                trackEvent('ReadFullArticle');
                hasFiredFull.current = true;
            }
        };
        window.addEventListener('scroll', handleScroll);

        return () => {
            document.removeEventListener('click', handleLinkClick);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);
}
