import React from 'react';
import ArticleHeader from '@/components/ArticleHeader';
import TrustBadge from '@/components/TrustBadge';
import KeyTakeaways from '@/components/KeyTakeaways';
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
        <div className="min-h-screen bg-white pb-20 font-serif selection:bg-blue-100 selection:text-blue-900">
            <PixelTracker pixelId={pixelId} />
            <UrlPreserver />
            <ArticleHeader />

            <main className="pt-8 px-5 max-w-[640px] mx-auto">

                {/* Article Header */}
                <div className="mb-8">
                    <div className="flex flex-wrap gap-2 mb-5">
                        <TrustBadge type="fact-checked" />
                        <TrustBadge type="medically-reviewed" />
                    </div>
                    <h1 className="text-[32px] leading-[1.15] font-black text-gray-900 mb-4 font-serif tracking-tight">
                        {article.title}
                    </h1>
                    <p className="text-[19px] text-gray-600 leading-relaxed font-sans font-light">
                        {article.subtitle}
                    </p>
                </div>

                {/* Byline */}
                <div className="flex items-center justify-between border-t border-b border-gray-100 py-5 mb-8 font-sans">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gray-100 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                            <img src="https://picsum.photos/seed/doc/100" alt="Author" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-gray-900">{article.author}</span>
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#1877F2]" aria-label="Verified">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                </svg>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{article.date}</span>
                                <span>•</span>
                                <span>4 min read</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Takeaways */}
                <KeyTakeaways items={article.keyTakeaways} />

                {/* Article Content */}
                <article className="prose prose-lg max-w-none text-gray-800 font-serif leading-loose">
                    <img src={article.image} alt="Article Image" className="w-full rounded-xl mb-10 shadow-md" />
                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </article>

                {/* Subtle CTA Link */}
                <div className="my-12 p-8 bg-blue-50 rounded-xl text-center border border-blue-100 shadow-sm">
                    <p className="text-xl font-serif mb-4 text-gray-900 font-medium">{article.ctaTitle || "Curious about the science?"}</p>
                    <Link href={ctaUrl} className="inline-block bg-[#0F4C81] text-white px-8 py-4 rounded-lg font-sans font-bold text-lg hover:bg-[#0a3b66] transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
                        {article.ctaText || "Read the Clinical Study »"}
                    </Link>
                    <p className="mt-4 text-xs text-gray-500 font-sans">{article.ctaDescription || "Secure, verified link to official research."}</p>
                </div>

                {/* Facebook Comments Section */}
                <div className="font-sans border-t border-gray-200 pt-10">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Discussion</h3>
                    <FBComments comments={article.comments} />
                </div>
            </main>
        </div>
    );
}
