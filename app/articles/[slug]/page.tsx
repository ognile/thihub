import React from 'react';
import ArticleHeader from '@/components/ArticleHeader';
import AuthorityBadge from '@/components/AuthorityBadge';
import FBComments from '@/components/FBComments';
import PixelTracker from '@/components/PixelTracker';
import UrlPreserver from '@/components/UrlPreserver';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';

// Helper to get article config
function getArticleConfig(slug: string) {
    try {
        const configPath = path.join(process.cwd(), 'data', 'pixel-config.json');
        if (fs.existsSync(configPath)) {
            const fileContents = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(fileContents);

            // Handle both old and new config structures for backward compatibility during dev
            const defaultPixelId = config.defaultPixelId || config.default || '1213472546398709';
            const defaultCtaUrl = config.defaultCtaUrl || 'https://mynuora.com/products/feminine-balance-gummies-1';

            const articleConfig = config.articles?.[slug];

            // Check if articleConfig is object (new) or string (old)
            let pixelId = defaultPixelId;
            let ctaUrl = defaultCtaUrl;

            if (articleConfig) {
                if (typeof articleConfig === 'string') {
                    pixelId = articleConfig;
                } else {
                    pixelId = articleConfig.pixelId || defaultPixelId;
                    ctaUrl = articleConfig.ctaUrl || defaultCtaUrl;
                }
            }

            return { pixelId, ctaUrl };
        }
    } catch (e) {
        console.error('Error reading pixel config:', e);
    }
    return {
        pixelId: '1213472546398709',
        ctaUrl: 'https://mynuora.com/products/feminine-balance-gummies-1'
    };
}

// Get article from JSON database
async function getArticle(slug: string) {
    try {
        const articlesPath = path.join(process.cwd(), 'data', 'articles.json');
        if (fs.existsSync(articlesPath)) {
            const fileContents = fs.readFileSync(articlesPath, 'utf8');
            const articles = JSON.parse(fileContents);
            return articles.find((a: any) => a.slug === slug) || null;
        }
    } catch (e) {
        console.error('Error reading articles database:', e);
    }
    return null;
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = await getArticle(slug);

    if (!article) {
        notFound();
    }

    const { pixelId, ctaUrl } = getArticleConfig(slug);

    return (
        <div className="min-h-screen bg-white pb-10 font-serif">
            <PixelTracker pixelId={pixelId} />
            <UrlPreserver />
            <ArticleHeader />



            <main className="pt-6 px-4 max-w-xl mx-auto">

                {/* Article Header */}
                <div className="mb-6">
                    <div className="flex gap-2 mb-3">
                        <AuthorityBadge type="verified" />
                        <AuthorityBadge type="medical" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3 font-serif">
                        {article.title}
                    </h1>
                    <p className="text-lg text-gray-600 leading-relaxed font-sans">
                        {article.subtitle}
                    </p>
                </div>

                {/* Byline */}
                <div className="flex items-center justify-between border-y border-gray-100 py-4 mb-6 font-sans">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden border border-gray-200">
                            <img src="https://picsum.photos/seed/doc/100" alt="Author" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-[15px] font-bold text-[#1877F2] hover:underline cursor-pointer">{article.author}</p>
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#1877F2]">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                </svg>
                            </div>
                            <p className="text-xs text-gray-500">{article.date}</p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500">Medically Reviewed By</p>
                        <p className="text-sm font-bold text-green-700 flex items-center justify-end gap-1">
                            {article.reviewer}
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                        </p>
                    </div>
                </div>

                {/* Article Content */}
                <article className="prose prose-lg max-w-none text-gray-800 font-serif leading-relaxed">
                    <img src={article.image} alt="Article Image" className="w-full rounded-lg mb-8 shadow-sm" />
                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </article>

                {/* Subtle CTA Link */}
                <div className="my-10 text-center">
                    <p className="text-lg font-serif mb-2">Curious about the science?</p>
                    <Link href={ctaUrl} className="text-[#1877F2] font-bold text-xl hover:underline font-sans">
                        Click here to read the full clinical study on the 5-Second Ritual »
                    </Link>
                </div>

                {/* Facebook Comments Section */}
                <div className="font-sans">
                    <FBComments />
                </div>
            </main>
        </div>
    );
}
