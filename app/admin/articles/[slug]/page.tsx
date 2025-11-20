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
    keyTakeaways?: string[];
    comments?: any[];
}

export default function EditArticlePage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/articles')
            .then(res => res.json())
            .then((data: Article[]) => {
                const found = data.find(a => a.slug === slug);
                if (found) {
                    setArticle(found);
                } else {
                    alert('Article not found');
                    router.push('/admin');
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
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
