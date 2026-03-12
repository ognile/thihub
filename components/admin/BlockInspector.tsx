'use client';

import { useMemo, type RefObject } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ArticleBlock, HeroMetaV1 } from '@/lib/articles/schema';
import { stripTags } from '@/lib/articles/renderer';

interface HeroInspectorState {
    title: string;
    subtitle: string;
    author: string;
    reviewer: string;
    date: string;
    authorImage: string | null;
    heroMeta: HeroMetaV1;
}

interface BlockInspectorProps {
    block: ArticleBlock | null;
    isHeroSelected?: boolean;
    hero?: HeroInspectorState;
    readTimeMinutes?: number;
    onChangeBlock: (nextBlock: ArticleBlock) => void;
    onChangeHero?: (patch: Omit<Partial<HeroInspectorState>, 'heroMeta'> & { heroMeta?: Partial<HeroMetaV1> }) => void;
    onDeleteBlock: (id: string) => void;
    scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

function uploadImage(onUploaded: (url: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            try {
                if (!input.files?.length) {
                    resolve();
                    return;
                }

                const formData = new FormData();
                formData.append('file', input.files[0]);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Failed to upload image');
                }

                const payload = (await response.json()) as { url?: string };
                if (!payload.url) {
                    throw new Error('Upload did not return URL');
                }

                onUploaded(payload.url);
                resolve();
            } catch (error) {
                reject(error);
            }
        };

        input.click();
    });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 rounded-xl border border-gray-200 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
            {children}
        </section>
    );
}

export default function BlockInspector({
    block,
    isHeroSelected = false,
    hero,
    readTimeMinutes = 1,
    onChangeBlock,
    onChangeHero,
    onDeleteBlock,
    scrollContainerRef,
}: BlockInspectorProps) {
    const blockTitle = useMemo(() => {
        if (!block) return '';
        return block.type.replace('_', ' ');
    }, [block]);

    if (isHeroSelected && hero && onChangeHero) {
        return (
            <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Hero Settings</h3>
                    <p className="text-xs text-gray-500">Top metadata, headline, byline, and avatar.</p>
                </div>

                <div
                    ref={scrollContainerRef}
                    data-testid="editor-inspector-scroll"
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
                >
                    <Section title="Hero Metadata">
                        <div className="space-y-2">
                            <Label className="text-xs">Report Label</Label>
                            <Input
                                value={hero.heroMeta.reportLabel}
                                onChange={(event) => onChangeHero({ heroMeta: { reportLabel: event.target.value } })}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Fact Checked Label</Label>
                            <Input
                                value={hero.heroMeta.factCheckedLabel}
                                onChange={(event) => onChangeHero({ heroMeta: { factCheckedLabel: event.target.value } })}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Medical Review Label</Label>
                            <Input
                                value={hero.heroMeta.medicallyReviewedLabel}
                                onChange={(event) => onChangeHero({ heroMeta: { medicallyReviewedLabel: event.target.value } })}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Read Time Mode</Label>
                            <select
                                value={hero.heroMeta.readTimeMode}
                                onChange={(event) =>
                                    onChangeHero({
                                        heroMeta: {
                                            readTimeMode: event.target.value === 'override' ? 'override' : 'auto',
                                        },
                                    })
                                }
                                className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                            >
                                <option value="auto">Auto</option>
                                <option value="override">Override</option>
                            </select>
                            <p className="text-xs text-gray-500">Auto estimate: {readTimeMinutes} min read</p>
                        </div>

                        {hero.heroMeta.readTimeMode === 'override' ? (
                            <div className="space-y-2">
                                <Label className="text-xs">Override Minutes</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={hero.heroMeta.readTimeOverrideMinutes ?? ''}
                                    onChange={(event) => {
                                        const parsed = Number.parseInt(event.target.value, 10);
                                        onChangeHero({
                                            heroMeta: {
                                                readTimeOverrideMinutes: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                                            },
                                        });
                                    }}
                                    className="h-8"
                                    placeholder="5"
                                />
                            </div>
                        ) : null}
                    </Section>

                    <Section title="Byline">
                        <div className="space-y-2">
                            <Label className="text-xs">Author</Label>
                            <Input
                                value={hero.author}
                                onChange={(event) => onChangeHero({ author: event.target.value })}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Reviewer</Label>
                            <Input
                                value={hero.reviewer}
                                onChange={(event) => onChangeHero({ reviewer: event.target.value })}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Date Line</Label>
                            <Input
                                value={hero.date}
                                onChange={(event) => onChangeHero({ date: event.target.value })}
                                className="h-8"
                                placeholder="Updated: 2 hours ago"
                            />
                        </div>
                    </Section>

                    <Section title="Hero Media">
                        <div className="space-y-2">
                            <Label className="text-xs">Author Image URL</Label>
                            <Input
                                value={hero.authorImage ?? ''}
                                onChange={(event) => onChangeHero({ authorImage: event.target.value || null })}
                                className="h-8"
                                placeholder="https://..."
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                                uploadImage((url) => {
                                    onChangeHero({ authorImage: url });
                                }).catch((error) => {
                                    console.error(error);
                                });
                            }}
                        >
                            <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                            Upload Author Image
                        </Button>
                    </Section>
                </div>
            </aside>
        );
    }

    if (!block) {
        return (
            <aside className="rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="mb-1 text-sm font-semibold text-gray-900">Block Settings</h3>
                <p className="text-sm text-gray-500">Select a block from the left list or center canvas.</p>
            </aside>
        );
    }

    return (
        <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Block Settings</h3>
                <p className="text-xs text-gray-500 capitalize">{blockTitle}</p>
            </div>

            <div
                ref={scrollContainerRef}
                data-testid="editor-inspector-scroll"
                className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
            >
                <Section title="Visibility">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Published</p>
                            <p className="text-xs text-gray-500">Hidden blocks stay in editor but are removed from public article.</p>
                        </div>
                        <Switch
                            checked={!block.hidden}
                            onCheckedChange={(checked) => onChangeBlock({ ...block, hidden: !checked })}
                        />
                    </div>
                </Section>

                {block.type === 'heading' ? (
                    <Section title="Heading">
                        <div className="space-y-2">
                            <Label className="text-xs">Style</Label>
                            <select
                                value={`h${block.level}`}
                                onChange={(event) => {
                                    const next = event.target.value;
                                    if (next === 'p') {
                                        onChangeBlock({
                                            id: block.id,
                                            hidden: block.hidden,
                                            type: 'paragraph',
                                            html: block.text,
                                        });
                                        return;
                                    }

                                    onChangeBlock({
                                        ...block,
                                        level: next === 'h1' ? 1 : next === 'h3' ? 3 : 2,
                                    });
                                }}
                                className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                            >
                                <option value="h1">Heading 1</option>
                                <option value="h2">Heading 2</option>
                                <option value="h3">Heading 3</option>
                                <option value="p">Paragraph</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Level</Label>
                            <select
                                value={block.level}
                                onChange={(event) =>
                                    onChangeBlock({
                                        ...block,
                                        level: Number(event.target.value) === 1 ? 1 : Number(event.target.value) === 3 ? 3 : 2,
                                    })
                                }
                                className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                            >
                                <option value={1}>H1</option>
                                <option value={2}>H2</option>
                                <option value={3}>H3</option>
                            </select>
                        </div>
                    </Section>
                ) : null}

                {block.type === 'paragraph' ? (
                    <Section title="Paragraph">
                        <div className="space-y-2">
                            <Label className="text-xs">Style</Label>
                            <select
                                value="p"
                                onChange={(event) => {
                                    const next = event.target.value;
                                    if (next === 'p') return;
                                    if (next === 'quote') {
                                        onChangeBlock({
                                            id: block.id,
                                            hidden: block.hidden,
                                            type: 'blockquote',
                                            text: stripTags(block.html),
                                        });
                                        return;
                                    }

                                    onChangeBlock({
                                        id: block.id,
                                        hidden: block.hidden,
                                        type: 'heading',
                                        level: next === 'h1' ? 1 : next === 'h3' ? 3 : 2,
                                        text: stripTags(block.html),
                                    });
                                }}
                                className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                            >
                                <option value="p">Paragraph</option>
                                <option value="h1">Heading 1</option>
                                <option value="h2">Heading 2</option>
                                <option value="h3">Heading 3</option>
                                <option value="quote">Quote</option>
                            </select>
                        </div>
                        <p className="text-xs text-gray-500">
                            Use inline toolbar in canvas for bold, italic, underline, link, lists, quote, and highlight.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => onChangeBlock({ ...block, html: stripTags(block.html) })}
                        >
                            Clear Formatting
                        </Button>
                    </Section>
                ) : null}

                {block.type === 'blockquote' ? (
                    <Section title="Quote">
                        <div className="space-y-2">
                            <Label className="text-xs">Style</Label>
                            <select
                                value="quote"
                                onChange={(event) => {
                                    const next = event.target.value;
                                    if (next === 'quote') return;
                                    if (next === 'p') {
                                        onChangeBlock({
                                            id: block.id,
                                            hidden: block.hidden,
                                            type: 'paragraph',
                                            html: block.text,
                                        });
                                        return;
                                    }

                                    onChangeBlock({
                                        id: block.id,
                                        hidden: block.hidden,
                                        type: 'heading',
                                        level: next === 'h1' ? 1 : next === 'h3' ? 3 : 2,
                                        text: block.text,
                                    });
                                }}
                                className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                            >
                                <option value="quote">Quote</option>
                                <option value="p">Paragraph</option>
                                <option value="h1">Heading 1</option>
                                <option value="h2">Heading 2</option>
                                <option value="h3">Heading 3</option>
                            </select>
                        </div>
                        <Label className="text-xs">Text</Label>
                        <textarea
                            value={block.text}
                            onChange={(event) => onChangeBlock({ ...block, text: event.target.value })}
                            rows={4}
                            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                        />
                    </Section>
                ) : null}

                {block.type === 'icon_list' ? (
                    <Section title="Icon List">
                        <div className="space-y-2">
                            <Label className="text-xs">Columns</Label>
                            <select
                                value={block.columns}
                                onChange={(event) =>
                                    onChangeBlock({
                                        ...block,
                                        columns: Number(event.target.value) === 1 ? 1 : Number(event.target.value) === 3 ? 3 : 2,
                                    })
                                }
                                className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            {block.items.map((item, index) => (
                                <div key={`${block.id}_${index}`} className="rounded-lg border border-gray-200 p-2">
                                    <Input
                                        value={item.icon}
                                        onChange={(event) => {
                                            const nextItems = [...block.items];
                                            nextItems[index] = { ...nextItems[index], icon: event.target.value };
                                            onChangeBlock({ ...block, items: nextItems });
                                        }}
                                        placeholder="Icon keyword"
                                        className="mb-1.5 h-8"
                                    />
                                    <Input
                                        value={item.title}
                                        onChange={(event) => {
                                            const nextItems = [...block.items];
                                            nextItems[index] = { ...nextItems[index], title: event.target.value };
                                            onChangeBlock({ ...block, items: nextItems });
                                        }}
                                        placeholder="Title"
                                        className="mb-1.5 h-8"
                                    />
                                    <textarea
                                        value={item.text}
                                        onChange={(event) => {
                                            const nextItems = [...block.items];
                                            nextItems[index] = { ...nextItems[index], text: event.target.value };
                                            onChangeBlock({ ...block, items: nextItems });
                                        }}
                                        rows={2}
                                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 w-full text-xs"
                            onClick={() =>
                                onChangeBlock({
                                    ...block,
                                    items: [...block.items, { icon: 'check', title: 'New item', text: 'Describe item.' }],
                                })
                            }
                        >
                            Add Item
                        </Button>
                    </Section>
                ) : null}

                {block.type === 'comparison_table' ? (
                    <Section title="Comparison Table">
                        <Input
                            value={block.ourBrand}
                            onChange={(event) => onChangeBlock({ ...block, ourBrand: event.target.value })}
                            placeholder="Our brand label"
                            className="h-8"
                        />
                        <Input
                            value={block.theirBrand}
                            onChange={(event) => onChangeBlock({ ...block, theirBrand: event.target.value })}
                            placeholder="Their brand label"
                            className="h-8"
                        />
                        <div className="space-y-2">
                            {block.features.map((feature, index) => (
                                <div key={`${block.id}_feature_${index}`} className="rounded-lg border border-gray-200 p-2">
                                    <Input
                                        value={feature.name}
                                        onChange={(event) => {
                                            const next = [...block.features];
                                            next[index] = { ...next[index], name: event.target.value };
                                            onChangeBlock({ ...block, features: next });
                                        }}
                                        placeholder="Feature name"
                                        className="mb-2 h-8"
                                    />
                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                        <label className="inline-flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={feature.us}
                                                onChange={(event) => {
                                                    const next = [...block.features];
                                                    next[index] = { ...next[index], us: event.target.checked };
                                                    onChangeBlock({ ...block, features: next });
                                                }}
                                            />
                                            Our brand
                                        </label>
                                        <label className="inline-flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={feature.them}
                                                onChange={(event) => {
                                                    const next = [...block.features];
                                                    next[index] = { ...next[index], them: event.target.checked };
                                                    onChangeBlock({ ...block, features: next });
                                                }}
                                            />
                                            Competitor
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 w-full text-xs"
                            onClick={() =>
                                onChangeBlock({
                                    ...block,
                                    features: [...block.features, { name: 'New feature', us: true, them: false }],
                                })
                            }
                        >
                            Add Feature
                        </Button>
                    </Section>
                ) : null}

                {block.type === 'timeline' ? (
                    <Section title="Timeline">
                        <Input
                            value={block.title}
                            onChange={(event) => onChangeBlock({ ...block, title: event.target.value })}
                            placeholder="Timeline title"
                            className="h-8"
                        />
                        <div className="space-y-2">
                            {block.weeks.map((week, index) => (
                                <div key={`${block.id}_week_${index}`} className="rounded-lg border border-gray-200 p-2">
                                    <Input
                                        type="number"
                                        value={week.week}
                                        onChange={(event) => {
                                            const next = [...block.weeks];
                                            next[index] = {
                                                ...next[index],
                                                week: Number.parseInt(event.target.value, 10) || 1,
                                            };
                                            onChangeBlock({ ...block, weeks: next });
                                        }}
                                        className="mb-1.5 h-8"
                                    />
                                    <Input
                                        value={week.title}
                                        onChange={(event) => {
                                            const next = [...block.weeks];
                                            next[index] = { ...next[index], title: event.target.value };
                                            onChangeBlock({ ...block, weeks: next });
                                        }}
                                        className="mb-1.5 h-8"
                                        placeholder="Week title"
                                    />
                                    <textarea
                                        value={week.description}
                                        onChange={(event) => {
                                            const next = [...block.weeks];
                                            next[index] = { ...next[index], description: event.target.value };
                                            onChangeBlock({ ...block, weeks: next });
                                        }}
                                        rows={2}
                                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                                        placeholder="Week description"
                                    />
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 w-full text-xs"
                            onClick={() =>
                                onChangeBlock({
                                    ...block,
                                    weeks: [
                                        ...block.weeks,
                                        { week: block.weeks.length + 1, title: 'New week', description: 'Describe this week.' },
                                    ],
                                })
                            }
                        >
                            Add Week
                        </Button>
                    </Section>
                ) : null}

                {block.type === 'testimonial' ? (
                    <Section title="Testimonial">
                        <Input
                            value={block.helpedWith}
                            onChange={(event) => onChangeBlock({ ...block, helpedWith: event.target.value })}
                            placeholder="Helped with"
                            className="h-8"
                        />
                        <Input
                            value={block.title}
                            onChange={(event) => onChangeBlock({ ...block, title: event.target.value })}
                            placeholder="Title"
                            className="h-8"
                        />
                        <textarea
                            value={block.body}
                            onChange={(event) => onChangeBlock({ ...block, body: event.target.value })}
                            rows={4}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                            placeholder="Body"
                        />
                        <Input
                            value={block.author}
                            onChange={(event) => onChangeBlock({ ...block, author: event.target.value })}
                            placeholder="Author"
                            className="h-8"
                        />
                        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                            <input
                                type="checkbox"
                                checked={block.verified}
                                onChange={(event) => onChangeBlock({ ...block, verified: event.target.checked })}
                            />
                            Verified purchase
                        </label>
                    </Section>
                ) : null}

                {block.type === 'image' ? (
                    <Section title="Image">
                        <Input
                            value={block.searchQuery}
                            onChange={(event) => onChangeBlock({ ...block, searchQuery: event.target.value })}
                            placeholder="Search query"
                            className="h-8"
                        />
                        <Input
                            value={block.alt ?? ''}
                            onChange={(event) => onChangeBlock({ ...block, alt: event.target.value || null })}
                            placeholder="Alt text"
                            className="h-8"
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => {
                                    uploadImage((url) => {
                                        onChangeBlock({ ...block, imageUrl: url });
                                    }).catch((error) => {
                                        console.error(error);
                                    });
                                }}
                            >
                                <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                                Upload
                            </Button>
                            {block.imageUrl ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 text-xs text-red-600"
                                    onClick={() => onChangeBlock({ ...block, imageUrl: null })}
                                >
                                    Clear
                                </Button>
                            ) : null}
                        </div>
                        <Input
                            value={block.imageUrl ?? ''}
                            onChange={(event) => onChangeBlock({ ...block, imageUrl: event.target.value || null })}
                            placeholder="Image URL"
                            className="h-8"
                        />
                    </Section>
                ) : null}

                {block.type === 'takeaways' ? (
                    <Section title="Takeaways">
                        {block.items.map((item, index) => (
                            <div key={`${block.id}_takeaway_${index}`} className="rounded-lg border border-gray-200 p-2">
                                <Input
                                    value={item.title}
                                    onChange={(event) => {
                                        const next = [...block.items];
                                        next[index] = { ...next[index], title: event.target.value };
                                        onChangeBlock({ ...block, items: next });
                                    }}
                                    className="mb-1.5 h-8"
                                    placeholder="Title"
                                />
                                <textarea
                                    value={item.content}
                                    onChange={(event) => {
                                        const next = [...block.items];
                                        next[index] = { ...next[index], content: event.target.value };
                                        onChangeBlock({ ...block, items: next });
                                    }}
                                    rows={2}
                                    className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                                    placeholder="Content"
                                />
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 w-full text-xs"
                            onClick={() =>
                                onChangeBlock({
                                    ...block,
                                    items: [...block.items, { title: 'New takeaway', content: 'Add content.' }],
                                })
                            }
                        >
                            Add Takeaway
                        </Button>
                    </Section>
                ) : null}

                {block.type === 'inline_cta' ? (
                    <Section title="Inline CTA">
                        <Input
                            value={block.title}
                            onChange={(event) => onChangeBlock({ ...block, title: event.target.value })}
                            placeholder="Title"
                            className="h-8"
                        />
                        <Input
                            value={block.buttonText}
                            onChange={(event) => onChangeBlock({ ...block, buttonText: event.target.value })}
                            placeholder="Button text"
                            className="h-8"
                        />
                        <textarea
                            value={block.description}
                            onChange={(event) => onChangeBlock({ ...block, description: event.target.value })}
                            rows={3}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                            placeholder="Description"
                        />
                    </Section>
                ) : null}
            </div>

            <div className="border-t border-gray-200 p-3">
                <Button
                    type="button"
                    variant="destructive"
                    className="h-9 w-full"
                    onClick={() => onDeleteBlock(block.id)}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Block
                </Button>
            </div>
        </aside>
    );
}
