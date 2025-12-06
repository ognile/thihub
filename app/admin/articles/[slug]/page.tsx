'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import LiveArticleEditor from '@/components/admin/LiveArticleEditor';
import { Skeleton } from '@/components/ui/skeleton';

interface Article {
    slug: string;
    title: string;
    subtitle: string;
    content: string;
    author: string;
    reviewer: string;
    date: string;
    image: string;
    ctaText?: string;
    ctaTitle?: string;
    ctaDescription?: string;
    keyTakeaways?: { title: string; content: string }[] | null;
    comments?: any[];
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
                // Use the optimized single-article endpoint
                const res = await fetch(`/api/articles/${slug}`, { cache: 'no-store' });
                
                if (res.status === 404) {
                    if (retries < maxRetries) {
                        retries++;
                        setTimeout(fetchArticle, 1000 * retries);
                        return;
                    }
                    toast.error('Article not found');
                    router.push('/admin');
                    setLoading(false);
                    return;
                }

                if (res.ok) {
                    const data = await res.json();
                    setArticle(data);
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                if (retries < maxRetries) {
                    retries++;
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
        const res = await fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedArticle),
        });
        if (!res.ok) {
            throw new Error('Failed to save');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/30 p-6">
                <div className="max-w-4xl mx-auto space-y-4">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-[60vh] w-full rounded-xl" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground">
                Article not found
            </div>
        );
    }

    return <LiveArticleEditor article={article} onSave={handleSave} />;
}
