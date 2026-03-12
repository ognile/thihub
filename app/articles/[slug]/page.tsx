import React from 'react';
import ArticleHeader from '@/components/ArticleHeader';
import FBComments from '@/components/FBComments';
import type { CommentData } from '@/components/FBComments';
import PixelTracker from '@/components/PixelTracker';
import UrlPreserver from '@/components/UrlPreserver';
import ArticleHero from '@/components/article/ArticleHero';
import { StickyCTA } from '@/components/article-v2';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ArticleService } from '@/lib/services/article-service';
import { createDomainContextFromHeaders } from '@/lib/services/domain-context';
import BlockCanvas from '@/components/article/BlockCanvas';
import { DEFAULT_AUTHOR_IMAGE } from '@/lib/articles/schema';
import { resolveReadTimeMinutes } from '@/lib/articles/read-time';
import { buildQuizEntryUrl } from '@/lib/quizzes/url';

async function getArticleAndDefaults(slug: string) {
    const requestHeaders = await headers();
    const domainContext = createDomainContextFromHeaders(requestHeaders);

    const [article, defaults] = await Promise.all([
        ArticleService.getBySlug(slug, domainContext),
        ArticleService.getGlobalDefaults(domainContext),
    ]);

    return { article, defaults };
}

function normalizeComments(value: unknown): CommentData[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const normalized = value
        .filter((item): item is CommentData => {
            if (typeof item !== 'object' || item === null) {
                return false;
            }

            const candidate = item as Partial<CommentData>;
            return (
                typeof candidate.id === 'string' &&
                typeof candidate.author === 'string' &&
                typeof candidate.avatar === 'string' &&
                typeof candidate.content === 'string' &&
                typeof candidate.time === 'string' &&
                typeof candidate.likes === 'number'
            );
        });

    return normalized.length > 0 ? normalized : undefined;
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    let article = null;
    let defaults = null;

    try {
        const response = await getArticleAndDefaults(slug);
        article = response.article;
        defaults = response.defaults;
    } catch (error) {
        console.error('Error fetching article page data:', error);
    }

    if (!article || !defaults) {
        notFound();
    }

    const pixelId = article.pixelId || defaults.defaultPixelId;
    const quizEntryUrl = buildQuizEntryUrl({
        source: 'article-inline-cta',
        articleSlug: slug,
    });
    const publishableBlocks = article.contentBlocks.filter((block) => !block.hidden);
    const readTimeMinutes = resolveReadTimeMinutes({
        title: article.title,
        subtitle: article.subtitle,
        blocks: publishableBlocks,
        heroMeta: article.heroMeta,
    });

    return (
        <div className="min-h-screen bg-white pb-20 font-serif selection:bg-blue-100 selection:text-blue-900">
            <PixelTracker pixelId={pixelId} />
            <UrlPreserver articleSlug={slug} />
            <ArticleHeader transparent={true} />

            {article.stickyCTAEnabled ? (
                <StickyCTA
                    productName="4-minute symptom profile"
                    ctaLink={quizEntryUrl}
                    ctaText="get my result"
                    enabled={true}
                />
            ) : null}

            <ArticleHero
                image={article.image || 'https://picsum.photos/seed/article-hero/1600/900'}
                title={article.title}
                subtitle={article.subtitle || ''}
                author={article.author || 'Top Health Insider'}
                reviewer={article.reviewer}
                date={article.date || ''}
                authorImage={article.authorImage || DEFAULT_AUTHOR_IMAGE}
                heroMeta={article.heroMeta}
                readTimeMinutes={readTimeMinutes}
                mode="public"
            />

            <main className="px-5 max-w-[680px] mx-auto -mt-20 relative z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pt-10 sm:pt-12">
                <BlockCanvas blocks={publishableBlocks} ctaUrl={quizEntryUrl} />

                <div className="font-sans border-t border-gray-200 pt-10">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Discussion</h3>
                    <FBComments comments={normalizeComments(article.comments)} />
                </div>
            </main>
        </div>
    );
}
