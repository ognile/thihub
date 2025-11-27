'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LiveArticleEditor from '@/components/admin/LiveArticleEditor';

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
                const res = await fetch('/api/articles', { cache: 'no-store' });
                const data: Article[] = await res.json();
                const found = data.find(a => a.slug === slug);

                if (found) {
                    setArticle(found);
                    setLoading(false);
                } else if (retries < maxRetries) {
                    // Retry after a delay
                    retries++;
                    setTimeout(fetchArticle, 1000 * retries); // Exponential backoff
                } else {
                    alert('Article not found');
                    router.push('/admin');
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                if (retries < maxRetries) {
                    retries++;
                    setTimeout(fetchArticle, 1000 * retries);
                } else {
                    setLoading(false);
                }
            }
        };

        fetchArticle();
    }, [slug, router]);

    const handleSave = async (updatedArticle: Article) => {
        try {
            const res = await fetch('/api/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedArticle),
            });
            if (res.ok) {
                alert('Saved successfully!');
            } else {
                alert('Failed to save');
            }
        } catch (e) {
            alert('Error saving');
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;
    if (!article) return <div className="flex items-center justify-center min-h-screen text-gray-500">Article not found</div>;

    return (
        <LiveArticleEditor article={article} onSave={handleSave} />
    );
}
