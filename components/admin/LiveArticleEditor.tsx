'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    ImagePlus,
    Loader2,
    Monitor,
    Eye,
    Save,
    Settings,
    Smartphone,
    X,
} from 'lucide-react';
import ArticleSettingsSheet from '@/components/admin/ArticleSettingsSheet';
import AdminIconToggle from '@/components/admin/ui/AdminIconToggle';
import ArticleHeader from '@/components/ArticleHeader';
import BlockCanvas from '@/components/article/BlockCanvas';
import BlockNavigator from '@/components/admin/BlockNavigator';
import BlockInspector from '@/components/admin/BlockInspector';
import ArticleHero from '@/components/article/ArticleHero';
import { createDefaultBlock } from '@/lib/articles/block-utils';
import { renderBlocksToHtml } from '@/lib/articles/renderer';
import { resolveReadTimeMinutes } from '@/lib/articles/read-time';
import {
    DEFAULT_AUTHOR_IMAGE,
    normalizeHeroMeta,
    type ArticleBlock,
    type HeroMetaV1,
    type StylePreset,
} from '@/lib/articles/schema';

const HERO_SELECTION_ID = '__hero__';

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

interface LiveArticleEditorProps {
    article: Article;
    onSave: (updatedArticle: Article) => Promise<void>;
}

function withUpdatedBlocks(article: Article, contentBlocks: ArticleBlock[]): Article {
    return {
        ...article,
        contentBlocks,
        content: renderBlocksToHtml(contentBlocks),
    };
}

type SyncSource = 'navigator' | 'canvas' | 'programmatic';

function getScrollBehavior(): ScrollBehavior {
    if (typeof window === 'undefined') return 'auto';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function scrollElementWithinContainer(
    container: HTMLElement,
    target: HTMLElement,
    mode: 'center' | 'nearest',
    behavior: ScrollBehavior,
) {
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const currentScrollTop = container.scrollTop;

    const resolveBehavior = (nextTop: number) => {
        if (behavior !== 'smooth') {
            return behavior;
        }

        const distance = Math.abs(nextTop - currentScrollTop);
        return distance > containerRect.height * 2.5 ? 'auto' : 'smooth';
    };

    if (mode === 'center') {
        const targetTop =
            currentScrollTop +
            (targetRect.top - containerRect.top) -
            (containerRect.height / 2 - targetRect.height / 2);
        container.scrollTo({
            top: Math.max(0, targetTop),
            behavior: resolveBehavior(targetTop),
        });
        return;
    }

    if (targetRect.top < containerRect.top) {
        const offset = containerRect.top - targetRect.top + 12;
        const nextTop = Math.max(0, currentScrollTop - offset);
        container.scrollTo({ top: nextTop, behavior: resolveBehavior(nextTop) });
        return;
    }

    if (targetRect.bottom > containerRect.bottom) {
        const offset = targetRect.bottom - containerRect.bottom + 12;
        const nextTop = currentScrollTop + offset;
        container.scrollTo({ top: nextTop, behavior: resolveBehavior(nextTop) });
    }
}

export default function LiveArticleEditor({ article: initialArticle, onSave }: LiveArticleEditorProps) {
    const [article, setArticle] = useState<Article>(
        withUpdatedBlocks(
            {
                ...initialArticle,
                contentBlocks: initialArticle.contentBlocks ?? [],
                stylePreset: initialArticle.stylePreset ?? 'core-polished',
                contentSchemaVersion: initialArticle.contentSchemaVersion ?? 1,
                heroMeta: normalizeHeroMeta(initialArticle.heroMeta),
                authorImage: initialArticle.authorImage ?? null,
            },
            initialArticle.contentBlocks ?? [],
        ),
    );
    const [selectedItemId, setSelectedItemId] = useState<string>(HERO_SELECTION_ID);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectionSignal, setSelectionSignal] = useState(0);
    const navigatorScrollRef = useRef<HTMLDivElement | null>(null);
    const canvasScrollRef = useRef<HTMLDivElement | null>(null);
    const inspectorScrollRef = useRef<HTMLDivElement | null>(null);
    const navigatorItemRefMap = useRef<Map<string, HTMLDivElement>>(new Map());
    const canvasBlockRefMap = useRef<Map<string, HTMLElement>>(new Map());
    const selectionSourceRef = useRef<SyncSource>('programmatic');

    const isMobile = previewMode === 'mobile';
    const selectedBlockId = selectedItemId === HERO_SELECTION_ID ? null : selectedItemId;

    const registerNavigatorItemRef = useCallback((id: string, node: HTMLDivElement | null) => {
        if (node) {
            navigatorItemRefMap.current.set(id, node);
            return;
        }
        navigatorItemRefMap.current.delete(id);
    }, []);

    const registerCanvasBlockRef = useCallback((id: string, node: HTMLElement | null) => {
        if (node) {
            canvasBlockRefMap.current.set(id, node);
            return;
        }
        canvasBlockRefMap.current.delete(id);
    }, []);

    const alignInspectorToTop = useCallback((behavior: ScrollBehavior) => {
        if (!inspectorScrollRef.current) return;
        inspectorScrollRef.current.scrollTo({ top: 0, behavior });
    }, []);

    const setSelectedItemWithSource = useCallback((id: string, source: SyncSource) => {
        selectionSourceRef.current = source;
        setSelectedItemId(id);
        setSelectionSignal((value) => value + 1);
    }, []);

    const selectFromNavigator = useCallback(
        (id: string) => {
            setSelectedItemWithSource(id, 'navigator');
        },
        [setSelectedItemWithSource],
    );

    const selectHeroFromNavigator = useCallback(() => {
        setSelectedItemWithSource(HERO_SELECTION_ID, 'navigator');
    }, [setSelectedItemWithSource]);

    const selectFromCanvas = useCallback(
        (id: string) => {
            setSelectedItemWithSource(id, 'canvas');
        },
        [setSelectedItemWithSource],
    );

    const selectHeroFromCanvas = useCallback(() => {
        setSelectedItemWithSource(HERO_SELECTION_ID, 'canvas');
    }, [setSelectedItemWithSource]);

    const updateArticle = useCallback((next: React.SetStateAction<Article>) => {
        setArticle((previous) => {
            const resolved =
                typeof next === 'function' ? (next as (value: Article) => Article)(previous) : next;
            return withUpdatedBlocks(resolved, resolved.contentBlocks ?? []);
        });
    }, []);

    const updateBlocks = useCallback((mutator: (blocks: ArticleBlock[]) => ArticleBlock[]) => {
        setArticle((previous) => {
            const currentBlocks = previous.contentBlocks ?? [];
            const nextBlocks = mutator(currentBlocks);

            setSelectedItemId((currentSelected) => {
                if (currentSelected === HERO_SELECTION_ID) {
                    return currentSelected;
                }
                if (nextBlocks.some((block) => block.id === currentSelected)) {
                    return currentSelected;
                }
                selectionSourceRef.current = 'programmatic';
                return nextBlocks[0]?.id ?? HERO_SELECTION_ID;
            });

            return withUpdatedBlocks({ ...previous, contentBlocks: nextBlocks }, nextBlocks);
        });
    }, []);

    const updateHeroFields = useCallback((patch: {
        title?: string;
        subtitle?: string;
        author?: string;
        reviewer?: string;
        date?: string;
        authorImage?: string | null;
        heroMeta?: Partial<HeroMetaV1>;
    }) => {
        setArticle((previous) => {
            const next: Article = { ...previous };
            if (patch.title !== undefined) next.title = patch.title;
            if (patch.subtitle !== undefined) next.subtitle = patch.subtitle;
            if (patch.author !== undefined) next.author = patch.author;
            if (patch.reviewer !== undefined) next.reviewer = patch.reviewer;
            if (patch.date !== undefined) next.date = patch.date;
            if (Object.prototype.hasOwnProperty.call(patch, 'authorImage')) {
                next.authorImage = patch.authorImage ?? null;
            }
            if (patch.heroMeta) {
                next.heroMeta = normalizeHeroMeta({
                    ...next.heroMeta,
                    ...patch.heroMeta,
                });
            }

            return withUpdatedBlocks(next, next.contentBlocks ?? []);
        });
    }, []);

    useEffect(() => {
        if (!selectedItemId) {
            selectionSourceRef.current = 'programmatic';
            setSelectedItemId(HERO_SELECTION_ID);
        }
    }, [selectedItemId]);

    useEffect(() => {
        const ids = new Set([HERO_SELECTION_ID, ...article.contentBlocks.map((block) => block.id)]);
        Array.from(navigatorItemRefMap.current.keys()).forEach((id) => {
            if (!ids.has(id)) {
                navigatorItemRefMap.current.delete(id);
            }
        });
        Array.from(canvasBlockRefMap.current.keys()).forEach((id) => {
            if (!ids.has(id)) {
                canvasBlockRefMap.current.delete(id);
            }
        });
    }, [article.contentBlocks]);

    useEffect(() => {
        if (!selectedItemId) return;

        const behavior = getScrollBehavior();
        const source = selectionSourceRef.current;
        const navigatorContainer = navigatorScrollRef.current;
        const canvasContainer = canvasScrollRef.current;
        const navigatorItem = navigatorItemRefMap.current.get(selectedItemId);
        const canvasBlock = canvasBlockRefMap.current.get(selectedItemId);

        if (source === 'navigator') {
            if (canvasContainer && canvasBlock) {
                scrollElementWithinContainer(canvasContainer, canvasBlock, 'center', behavior);
            }
            if (navigatorContainer && navigatorItem) {
                scrollElementWithinContainer(navigatorContainer, navigatorItem, 'nearest', behavior);
            }
            alignInspectorToTop(behavior);
        } else if (source === 'canvas') {
            if (navigatorContainer && navigatorItem) {
                scrollElementWithinContainer(navigatorContainer, navigatorItem, 'center', behavior);
            }
            if (canvasContainer && canvasBlock) {
                scrollElementWithinContainer(canvasContainer, canvasBlock, 'nearest', behavior);
            }
            alignInspectorToTop(behavior);
        } else {
            if (navigatorContainer && navigatorItem) {
                scrollElementWithinContainer(navigatorContainer, navigatorItem, 'nearest', behavior);
            }
            if (canvasContainer && canvasBlock) {
                scrollElementWithinContainer(canvasContainer, canvasBlock, 'nearest', behavior);
            }
        }

        selectionSourceRef.current = 'programmatic';
    }, [alignInspectorToTop, selectedItemId, selectionSignal]);

    const selectedBlock = useMemo(
        () =>
            selectedBlockId
                ? article.contentBlocks.find((block) => block.id === selectedBlockId) ?? null
                : null,
        [article.contentBlocks, selectedBlockId],
    );

    const publishableBlocks = useMemo(
        () => article.contentBlocks.filter((block) => !block.hidden),
        [article.contentBlocks],
    );

    const readTimeMinutes = useMemo(
        () =>
            resolveReadTimeMinutes({
                title: article.title,
                subtitle: article.subtitle,
                blocks: publishableBlocks,
                heroMeta: article.heroMeta,
            }),
        [article.heroMeta, article.subtitle, article.title, publishableBlocks],
    );

    const handleHeroReplace = useCallback(async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (!input.files?.length) {
                return;
            }

            const formData = new FormData();
            formData.append('file', input.files[0]);

            try {
                const response = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!response.ok) {
                    throw new Error(await response.text());
                }

                const payload = (await response.json()) as { url?: string };
                if (payload.url) {
                    updateArticle((previous) => ({ ...previous, image: payload.url || previous.image }));
                    setSelectedItemWithSource(HERO_SELECTION_ID, 'canvas');
                    toast.success('Cover image updated');
                }
            } catch (error) {
                console.error('Upload failed', error);
                toast.error('Failed to upload image');
            }
        };
        input.click();
    }, [setSelectedItemWithSource, updateArticle]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(withUpdatedBlocks(article, article.contentBlocks));
            toast.success('Article saved successfully');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save article';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const shellClassName = useMemo(
        () =>
            cn(
                'font-serif transition-all duration-300 selection:bg-blue-100 selection:text-blue-900',
                isMobile
                    ? 'mx-auto w-[390px] max-w-full overflow-hidden rounded-[2.25rem] border border-gray-200 bg-white p-3 shadow-2xl'
                    : 'w-full',
            ),
        [isMobile],
    );

    return (
        <div className="flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-muted/30">
            <div className="sticky top-0 z-50 border-b bg-background shadow-sm">
                <div className="flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-muted-foreground transition-colors hover:text-foreground">
                            <X className="h-5 w-5" />
                        </Link>
                        <div className="text-sm">
                            <span className="text-muted-foreground">Editing:</span>{' '}
                            <span className="inline-block max-w-[260px] truncate align-bottom font-medium">
                                {article.title}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg bg-muted p-1">
                            <AdminIconToggle
                                icon={Monitor}
                                label="Preview on desktop"
                                pressed={previewMode === 'desktop'}
                                onPressedChange={() => setPreviewMode('desktop')}
                            />
                            <AdminIconToggle
                                icon={Smartphone}
                                label="Preview on mobile"
                                pressed={previewMode === 'mobile'}
                                onPressedChange={() => setPreviewMode('mobile')}
                            />
                        </div>

                        <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>

                        <Button variant="outline" asChild>
                            <Link
                                href={`/articles/${article.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid="editor-view-live-link"
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                View Live
                            </Link>
                        </Button>

                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <ArticleSettingsSheet
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                article={article}
                setArticle={updateArticle}
            />

            <div className="min-h-0 flex-1 overflow-hidden">
                <div className="grid h-full min-h-0 gap-3 p-3 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
                    <BlockNavigator
                        blocks={article.contentBlocks}
                        selectedBlockId={selectedBlockId}
                        heroSelected={selectedItemId === HERO_SELECTION_ID}
                        onSelectHero={selectHeroFromNavigator}
                        onSelectBlock={selectFromNavigator}
                        onReorderBlocks={(nextBlocks) => updateBlocks(() => nextBlocks)}
                        onToggleHidden={(id) =>
                            updateBlocks((blocks) =>
                                blocks.map((block) =>
                                    block.id === id ? { ...block, hidden: !block.hidden } : block,
                                ),
                            )
                        }
                        onDeleteBlock={(id) =>
                            updateBlocks((blocks) => blocks.filter((block) => block.id !== id))
                        }
                        onAddBlock={(type) => {
                            const nextBlock = createDefaultBlock(type);
                            updateBlocks((blocks) => [...blocks, nextBlock]);
                            setSelectedItemWithSource(nextBlock.id, 'navigator');
                        }}
                        registerHeroItemRef={(node) =>
                            registerNavigatorItemRef(HERO_SELECTION_ID, node)
                        }
                        registerNavigatorItemRef={registerNavigatorItemRef}
                        scrollContainerRef={navigatorScrollRef}
                    />

                    <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-3">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Canvas</h3>
                                <p className="text-xs text-gray-500">
                                    Hero and body preview match public rendering.
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleHeroReplace}
                                aria-label="Replace article cover image"
                            >
                                <ImagePlus className="mr-2 h-4 w-4" />
                                Replace Cover
                            </Button>
                        </div>

                        <div
                            ref={canvasScrollRef}
                            data-testid="editor-canvas-scroll"
                            className="min-h-0 flex-1 overflow-y-auto pr-1"
                        >
                            <div className={shellClassName}>
                                <div className="relative bg-white">
                                    <ArticleHeader transparent embedded interactive={false} />

                                    <ArticleHero
                                        image={article.image}
                                        title={article.title}
                                        subtitle={article.subtitle}
                                        author={article.author}
                                        reviewer={article.reviewer}
                                        date={article.date}
                                        authorImage={article.authorImage || DEFAULT_AUTHOR_IMAGE}
                                        heroMeta={article.heroMeta}
                                        readTimeMinutes={readTimeMinutes}
                                        mode="editor"
                                        selected={selectedItemId === HERO_SELECTION_ID}
                                        onSelect={selectHeroFromCanvas}
                                        onChangeHeroFields={updateHeroFields}
                                        registerHeroRef={(node) =>
                                            registerCanvasBlockRef(HERO_SELECTION_ID, node)
                                        }
                                    />

                                    <main className="relative z-20 mx-auto -mt-20 max-w-[680px] rounded-t-3xl bg-white px-5 pt-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] sm:pt-12">
                                        <BlockCanvas
                                            blocks={article.contentBlocks}
                                            editable
                                            selectedBlockId={selectedBlockId}
                                            onSelectBlock={selectFromCanvas}
                                            showBlockLibrary={false}
                                            showBlockControls={false}
                                            onChange={(nextBlocks) => updateBlocks(() => nextBlocks)}
                                            ctaUrl={article.ctaUrl || '#'}
                                            registerCanvasBlockRef={registerCanvasBlockRef}
                                        />
                                    </main>
                                </div>
                            </div>
                        </div>
                    </section>

                    <BlockInspector
                        block={selectedBlock}
                        isHeroSelected={selectedItemId === HERO_SELECTION_ID}
                        hero={{
                            title: article.title,
                            subtitle: article.subtitle,
                            author: article.author,
                            reviewer: article.reviewer,
                            date: article.date,
                            authorImage: article.authorImage ?? null,
                            heroMeta: article.heroMeta,
                        }}
                        readTimeMinutes={readTimeMinutes}
                        onChangeHero={updateHeroFields}
                        onChangeBlock={(nextBlock) =>
                            updateBlocks((blocks) =>
                                blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block)),
                            )
                        }
                        onDeleteBlock={(id) =>
                            updateBlocks((blocks) => blocks.filter((block) => block.id !== id))
                        }
                        scrollContainerRef={inspectorScrollRef}
                    />
                </div>
            </div>
        </div>
    );
}
