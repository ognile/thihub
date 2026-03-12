'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import LiveArticleEditor from '@/components/admin/LiveArticleEditor';
import { Skeleton } from '@/components/ui/skeleton';
import type { ArticleBlock, HeroMetaV1, StylePreset } from '@/lib/articles/schema';

interface Article {
    slug: string;
    title: string;
    subtitle: string;
    content: string;
    contentBlocks: ArticleBlock[];
    contentSchemaVersion: number;
    stylePreset: StylePreset;
    author: string;
    reviewer: string;
    date: string;
    image: string;
    authorImage?: string | null;
    heroMeta: HeroMetaV1;
    ctaUrl?: string;
    pixelId?: string;
    comments?: unknown[];
    stickyCTAEnabled?: boolean;
    stickyCTAText?: string;
    stickyCTAPrice?: string;
    stickyCTAOriginalPrice?: string;
    stickyCTAProductName?: string;
}

export default function EditArticlePage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let retries = 0;
        const maxRetries = 3;

        const fetchArticle = async () => {
            try {
                const response = await fetch(`/api/articles/${slug}`, { cache: 'no-store' });

                if (response.status === 404) {
                    if (retries < maxRetries) {
                        retries += 1;
                        setTimeout(fetchArticle, 1000 * retries);
                        return;
                    }

                    toast.error('Article not found');
                    router.push('/admin');
                    setLoading(false);
                    return;
                }

                if (response.ok) {
                    const payload = (await response.json()) as Article;
                    setArticle(payload);
                    setLoading(false);
                }
            } catch (error) {
                console.error(error);
                if (retries < maxRetries) {
                    retries += 1;
                    setTimeout(fetchArticle, 1000 * retries);
                } else {
                    toast.error('Failed to load article');
                    setLoading(false);
                }
            }
        };

        fetchArticle();
    }, [slug, router]);

    const handleSave = async (updatedArticle: Article) => {
        const response = await fetch(`/api/articles/${slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedArticle),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Failed to save article');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/30 p-6">
                <div className="mx-auto max-w-4xl space-y-4">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-[60vh] w-full rounded-xl" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                Article not found
            </div>
        );
    }

    return <LiveArticleEditor article={article} onSave={handleSave} />;
}
