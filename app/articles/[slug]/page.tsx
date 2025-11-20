import React from 'react';
import ArticleHeader from '@/components/ArticleHeader';
import TrustBadge from '@/components/TrustBadge';
import KeyTakeaways from '@/components/KeyTakeaways';
import FBComments from '@/components/FBComments';
import PixelTracker from '@/components/PixelTracker';
import UrlPreserver from '@/components/UrlPreserver';
import CinematicHero from '@/components/CinematicHero';
import AnalysisSection from '@/components/AnalysisSection';
import StickyCTA from '@/components/StickyCTA';
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
            <ArticleHeader transparent={true} />

            {/* Cinematic Hero Section */}
            <CinematicHero
                image={article.image}
                title={article.title}
                subtitle={article.subtitle}
                author={article.author}
                date={article.date}
                authorImage="https://picsum.photos/seed/doc/100" // We might want to make this dynamic later
            />

            <main className="px-5 max-w-[680px] mx-auto -mt-20 relative z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pt-10 sm:pt-12">

                {/* Key Takeaways */}
                <KeyTakeaways items={article.keyTakeaways} />

                {/* Article Content */}
                <article className="prose prose-lg max-w-none text-gray-800 font-serif leading-loose">
                    {/* Removed duplicate hero image */}
                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </article>

                {/* Subtle CTA Link (Desktop/Inline) */}
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
