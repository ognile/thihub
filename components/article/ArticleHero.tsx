import React from 'react';
import Image from 'next/image';
import { BadgeCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_AUTHOR_IMAGE, type HeroMetaV1 } from '@/lib/articles/schema';

interface ArticleHeroPatch {
    title?: string;
    subtitle?: string;
    author?: string;
    reviewer?: string;
    date?: string;
    authorImage?: string | null;
    heroMeta?: Partial<HeroMetaV1>;
}

interface ArticleHeroProps {
    image: string;
    title: string;
    subtitle: string;
    author: string;
    reviewer?: string | null;
    date: string;
    authorImage?: string | null;
    heroMeta: HeroMetaV1;
    readTimeMinutes: number;
    mode?: 'public' | 'editor';
    selected?: boolean;
    onSelect?: () => void;
    onChangeHeroFields?: (patch: ArticleHeroPatch) => void;
    registerHeroRef?: (node: HTMLElement | null) => void;
}

function HeroChip({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return <span className={cn('inline-flex items-center gap-1 rounded-sm px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm', className)}>{children}</span>;
}

export default function ArticleHero({
    image,
    title,
    subtitle,
    author,
    reviewer,
    date,
    authorImage,
    heroMeta,
    readTimeMinutes,
    mode = 'public',
    selected = false,
    onSelect,
    onChangeHeroFields,
    registerHeroRef,
}: ArticleHeroProps) {
    const editable = mode === 'editor' && Boolean(onChangeHeroFields);
    const reviewLabel = reviewer?.trim()
        ? `${heroMeta.medicallyReviewedLabel} by ${reviewer.trim()}`
        : heroMeta.medicallyReviewedLabel;

    return (
        <section
            ref={registerHeroRef}
            data-block-id="__hero__"
            data-testid={mode === 'editor' ? 'editor-canvas-hero' : undefined}
            onClick={onSelect}
            className={cn(
                'relative w-full min-h-[85vh] overflow-hidden pb-24 sm:min-h-[85vh] sm:pb-20',
                editable ? 'cursor-text' : '',
                selected ? 'ring-2 ring-blue-300 ring-inset' : '',
            )}
        >
            <div className="absolute inset-0 z-0">
                <Image
                    unoptimized
                    src={image}
                    alt="Hero Background"
                    fill
                    priority={mode === 'public'}
                    sizes="100vw"
                    className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pt-24 sm:px-6 sm:pt-20">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <HeroChip className="bg-blue-600 text-white">
                        {editable ? (
                            <input
                                value={heroMeta.reportLabel}
                                onChange={(event) =>
                                    onChangeHeroFields?.({
                                        heroMeta: { reportLabel: event.target.value },
                                    })
                                }
                                className="w-[165px] bg-transparent text-[10px] font-bold uppercase tracking-widest text-white placeholder-white/70 focus:outline-none"
                                placeholder="Report label"
                            />
                        ) : (
                            heroMeta.reportLabel
                        )}
                    </HeroChip>

                    <HeroChip className="border border-white/20 bg-white/10 text-white/90 backdrop-blur-sm">
                        {editable && heroMeta.readTimeMode === 'override' ? (
                            <>
                                <input
                                    type="number"
                                    min={1}
                                    value={heroMeta.readTimeOverrideMinutes ?? readTimeMinutes}
                                    onChange={(event) => {
                                        const parsed = Number.parseInt(event.target.value, 10);
                                        onChangeHeroFields?.({
                                            heroMeta: {
                                                readTimeOverrideMinutes: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                                            },
                                        });
                                    }}
                                    className="w-8 bg-transparent text-[10px] font-bold uppercase tracking-widest text-white/90 focus:outline-none"
                                />
                                MIN READ
                            </>
                        ) : (
                            `${readTimeMinutes} MIN READ`
                        )}
                    </HeroChip>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {editable ? (
                            <input
                                value={heroMeta.factCheckedLabel}
                                onChange={(event) =>
                                    onChangeHeroFields?.({
                                        heroMeta: { factCheckedLabel: event.target.value },
                                    })
                                }
                                className="w-[110px] bg-transparent text-[10px] font-bold uppercase tracking-wider text-green-400 placeholder-green-300/80 focus:outline-none"
                                placeholder="Fact Checked"
                            />
                        ) : (
                            heroMeta.factCheckedLabel
                        )}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-400">
                        <BadgeCheck className="h-3 w-3" />
                        {editable ? (
                            <>
                                <input
                                    value={heroMeta.medicallyReviewedLabel}
                                    onChange={(event) =>
                                        onChangeHeroFields?.({
                                            heroMeta: { medicallyReviewedLabel: event.target.value },
                                        })
                                    }
                                    className="w-[122px] bg-transparent text-[10px] font-bold uppercase tracking-wider text-green-400 placeholder-green-300/80 focus:outline-none"
                                    placeholder="Medically Reviewed"
                                />
                                <span className="text-green-300/90">by</span>
                                <input
                                    value={reviewer ?? ''}
                                    onChange={(event) =>
                                        onChangeHeroFields?.({
                                            reviewer: event.target.value,
                                        })
                                    }
                                    className="w-[120px] bg-transparent text-[10px] font-bold uppercase tracking-wider text-green-400 placeholder-green-300/80 focus:outline-none"
                                    placeholder="Reviewer"
                                />
                            </>
                        ) : (
                            reviewLabel
                        )}
                    </span>
                </div>

                {editable ? (
                    <textarea
                        value={title}
                        onChange={(event) => onChangeHeroFields?.({ title: event.target.value })}
                        className="mb-6 min-h-[210px] w-full resize-none bg-transparent p-0 font-serif text-4xl font-black leading-[1.2] tracking-tight text-white drop-shadow-lg placeholder-white/50 focus:outline-none sm:text-4xl md:text-5xl lg:text-6xl"
                        placeholder="Article title"
                    />
                ) : (
                    <h1 className="mb-6 break-words font-serif text-4xl font-black leading-[1.2] tracking-tight text-white drop-shadow-lg hyphens-auto sm:text-4xl md:text-5xl lg:text-6xl">
                        {title}
                    </h1>
                )}

                {editable ? (
                    <textarea
                        value={subtitle}
                        onChange={(event) => onChangeHeroFields?.({ subtitle: event.target.value })}
                        className="mb-8 min-h-[68px] w-full resize-none bg-transparent p-0 font-sans text-lg font-light leading-relaxed text-gray-200 drop-shadow-md placeholder-gray-300/80 focus:outline-none sm:text-xl"
                        placeholder="Subtitle"
                    />
                ) : (
                    <p className="mb-8 max-w-xl font-sans text-lg font-light leading-relaxed text-gray-200 drop-shadow-md sm:text-xl">
                        {subtitle}
                    </p>
                )}

                <div className="flex items-center gap-4 border-t border-white/20 pt-6">
                    <div className="h-12 w-12 flex-shrink-0 rounded-full bg-black/20 p-0.5 backdrop-blur-sm ring-2 ring-white/30">
                        <Image
                            unoptimized
                            src={authorImage || DEFAULT_AUTHOR_IMAGE}
                            alt={author || 'Author'}
                            width={48}
                            height={48}
                            className="h-full w-full rounded-full object-cover"
                        />
                    </div>
                    <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2">
                            {editable ? (
                                <input
                                    value={author}
                                    onChange={(event) => onChangeHeroFields?.({ author: event.target.value })}
                                    className="min-w-[200px] bg-transparent text-sm font-bold tracking-wide text-white placeholder-white/70 focus:outline-none"
                                    placeholder="Author"
                                />
                            ) : (
                                <span className="text-sm font-bold tracking-wide text-white">{author}</span>
                            )}
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-blue-400" aria-label="Verified">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                            {editable ? (
                                <input
                                    value={date}
                                    onChange={(event) => onChangeHeroFields?.({ date: event.target.value })}
                                    className="min-w-[220px] bg-transparent text-xs font-medium uppercase tracking-wider text-gray-400 placeholder-gray-500 focus:outline-none"
                                    placeholder="Updated: 2 hours ago"
                                />
                            ) : (
                                <span>{date}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
