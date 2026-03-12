'use client';

import {
    DndContext,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RefObject } from 'react';
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { ADDABLE_BLOCK_TYPES, getBlockSummary, getBlockTypeLabel } from '@/lib/articles/block-utils';
import type { ArticleBlock } from '@/lib/articles/schema';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BlockNavigatorProps {
    blocks: ArticleBlock[];
    selectedBlockId: string | null;
    heroSelected?: boolean;
    onSelectBlock: (id: string) => void;
    onSelectHero?: () => void;
    onReorderBlocks: (next: ArticleBlock[]) => void;
    onToggleHidden: (id: string) => void;
    onDeleteBlock: (id: string) => void;
    onAddBlock: (type: ArticleBlock['type']) => void;
    registerNavigatorItemRef?: (id: string, node: HTMLDivElement | null) => void;
    registerHeroItemRef?: (node: HTMLDivElement | null) => void;
    scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

interface SortableBlockItemProps {
    block: ArticleBlock;
    index: number;
    selected: boolean;
    onSelect: () => void;
    onToggleHidden: () => void;
    onDelete: () => void;
    registerItemRef?: (node: HTMLDivElement | null) => void;
}

function SortableBlockItem({
    block,
    index,
    selected,
    onSelect,
    onToggleHidden,
    onDelete,
    registerItemRef,
}: SortableBlockItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: block.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            data-block-id={block.id}
            ref={(node) => {
                setNodeRef(node);
                registerItemRef?.(node);
            }}
            style={style}
            className={cn(
                'rounded-xl border bg-white p-3 transition-colors',
                selected ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300',
                block.hidden ? 'opacity-60' : '',
                isDragging ? 'shadow-lg' : '',
            )}
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="mt-0.5 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Drag block"
                >
                    <GripVertical className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onClick={onSelect}
                    className="min-w-0 flex-1 text-left"
                >
                    <div className="mb-1 flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-[11px] font-semibold text-gray-600">
                            {index + 1}
                        </span>
                        <span className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {getBlockTypeLabel(block.type)}
                        </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-gray-800">{getBlockSummary(block)}</p>
                </button>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onToggleHidden}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        aria-label={block.hidden ? 'Show block' : 'Hide block'}
                    >
                        {block.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                        aria-label="Delete block"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function BlockNavigator({
    blocks,
    selectedBlockId,
    heroSelected = false,
    onSelectBlock,
    onSelectHero,
    onReorderBlocks,
    onToggleHidden,
    onDeleteBlock,
    onAddBlock,
    registerNavigatorItemRef,
    registerHeroItemRef,
    scrollContainerRef,
}: BlockNavigatorProps) {
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 120, tolerance: 8 },
        }),
    );

    const blockIds = blocks.map((block) => block.id);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            return;
        }

        const activeIndex = blocks.findIndex((block) => block.id === active.id);
        const overIndex = blocks.findIndex((block) => block.id === over.id);
        if (activeIndex < 0 || overIndex < 0) {
            return;
        }

        onReorderBlocks(arrayMove(blocks, activeIndex, overIndex));
    };

    return (
        <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Blocks</h3>
                <p className="text-xs text-gray-500">Drag to reorder. Hide or delete from here.</p>
            </div>

            <div
                ref={scrollContainerRef}
                data-testid="editor-navigator-scroll"
                className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
            >
                <div
                    data-block-id="__hero__"
                    ref={registerHeroItemRef}
                    className={cn(
                        'rounded-xl border bg-white p-3 transition-colors',
                        heroSelected ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300',
                    )}
                >
                    <button type="button" onClick={onSelectHero} className="w-full text-left">
                        <div className="mb-1 flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[11px] font-semibold text-blue-700">
                                H
                            </span>
                            <span className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Hero
                            </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-gray-800">Top metadata, headline, subtitle, byline.</p>
                    </button>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                        {blocks.map((block, index) => (
                            <SortableBlockItem
                                key={block.id}
                                block={block}
                                index={index}
                                selected={selectedBlockId === block.id}
                                onSelect={() => onSelectBlock(block.id)}
                                onToggleHidden={() => onToggleHidden(block.id)}
                                onDelete={() => onDeleteBlock(block.id)}
                                registerItemRef={(node) => registerNavigatorItemRef?.(block.id, node)}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            <div className="border-t border-gray-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Add block</p>
                <div className="grid grid-cols-2 gap-2">
                    {ADDABLE_BLOCK_TYPES.map((entry) => (
                        <Button
                            key={entry.type}
                            type="button"
                            variant="outline"
                            className="h-8 justify-start px-2 text-xs"
                            onClick={() => onAddBlock(entry.type)}
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {entry.label}
                        </Button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
