"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import type { ArticleBlock } from "@/lib/articles/schema";
import { getIconComponent } from "@/components/article-v2/IconList";
import { ADDABLE_BLOCK_TYPES, createDefaultBlock } from "@/lib/articles/block-utils";
import { stripTags } from "@/lib/articles/renderer";
import { cn } from "@/lib/utils";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Quote,
  Trash2,
  Underline,
  Upload,
} from "lucide-react";

type UpdateBlocks = (next: ArticleBlock[]) => void;

interface BlockCanvasProps {
  blocks: ArticleBlock[];
  editable?: boolean;
  onChange?: UpdateBlocks;
  ctaUrl?: string;
  className?: string;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
  showBlockLibrary?: boolean;
  showBlockControls?: boolean;
  registerCanvasBlockRef?: (id: string, node: HTMLElement | null) => void;
}

interface ParagraphEditorProps {
  html: string;
  editable: boolean;
  onChange: (nextHtml: string) => void;
  onFocus?: () => void;
}

interface InlineTextToolbarProps {
  visible: boolean;
  onSetType: (type: "paragraph" | "h1" | "h2" | "h3") => void;
}

function ParagraphEditor({ html, editable, onChange, onFocus }: ParagraphEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editable || !ref.current) return;
    if (ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [editable, html]);

  if (!editable) {
    return <p className="text-[17px] leading-8 text-gray-800" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={onFocus}
      onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
      className="text-[17px] leading-8 text-gray-800 focus:outline-none"
    />
  );
}

function runFormatCommand(command: string, value?: string) {
  if (typeof document === "undefined") return;
  document.execCommand(command, false, value);
}

function applyLinkCommand() {
  if (typeof window === "undefined") return;
  const link = window.prompt("Enter URL");
  if (!link) return;
  runFormatCommand("createLink", link);
}

function InlineTextToolbar({ visible, onSetType }: InlineTextToolbarProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="mb-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          runFormatCommand("bold");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          runFormatCommand("italic");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          runFormatCommand("underline");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Underline"
      >
        <Underline className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          applyLinkCommand();
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Link"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          runFormatCommand("insertUnorderedList");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Bulleted list"
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          runFormatCommand("insertOrderedList");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          runFormatCommand("formatBlock", "blockquote");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Quote"
      >
        <Quote className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          runFormatCommand("hiliteColor", "#FDE68A");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Highlight"
      >
        <Highlighter className="h-3.5 w-3.5" />
      </button>
      <div className="mx-1 h-4 w-px bg-slate-200" />
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          onSetType("paragraph");
        }}
        className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        P
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          onSetType("h1");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          onSetType("h2");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          onSetType("h3");
        }}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Heading 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function replaceAt(blocks: ArticleBlock[], index: number, nextBlock: ArticleBlock): ArticleBlock[] {
  return blocks.map((block, currentIndex) => (currentIndex === index ? nextBlock : block));
}

function uploadImage(onUploaded: (url: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      try {
        if (!input.files?.length) {
          resolve();
          return;
        }

        const formData = new FormData();
        formData.append("file", input.files[0]);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const payload = (await response.json()) as { url?: string };
        if (!payload.url) {
          throw new Error("Upload did not return URL");
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

function getCanvasSectionClass(isSelected: boolean, editable: boolean, hidden: boolean) {
  return cn(
    "my-6 rounded-xl transition-colors",
    editable ? "cursor-text border border-transparent p-2 hover:border-slate-200" : "",
    isSelected ? "border-blue-300 bg-blue-50/35 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]" : "",
    hidden ? "opacity-50" : "",
  );
}

export default function BlockCanvas({
  blocks,
  editable = false,
  onChange,
  ctaUrl = "#",
  className,
  selectedBlockId = null,
  onSelectBlock,
  showBlockLibrary = editable,
  showBlockControls = false,
  registerCanvasBlockRef,
}: BlockCanvasProps) {
  const updateBlocks = (nextBlocks: ArticleBlock[]) => {
    if (!editable || !onChange) return;
    onChange(nextBlocks);
  };

  const renderedBlocks = useMemo(() => blocks, [blocks]);

  return (
    <div className={className}>
      {renderedBlocks.map((block, index) => {
        if (!editable && block.hidden) {
          return null;
        }

        const isSelected = selectedBlockId === block.id;
        const selectBlock = () => {
          if (editable && onSelectBlock) {
            onSelectBlock(block.id);
          }
        };

        const onRemove = () => updateBlocks(renderedBlocks.filter((_, current) => current !== index));
        const registerBlockRef = (node: HTMLElement | null) => {
          registerCanvasBlockRef?.(block.id, node);
        };

        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level}` as "h1" | "h2" | "h3";
            const setFromToolbar = (type: "paragraph" | "h1" | "h2" | "h3") => {
              if (type === "paragraph") {
                updateBlocks(
                  replaceAt(renderedBlocks, index, {
                    id: block.id,
                    hidden: block.hidden,
                    type: "paragraph",
                    html: block.text,
                  }),
                );
                return;
              }

              const level: 1 | 2 | 3 = type === "h1" ? 1 : type === "h3" ? 3 : 2;
              updateBlocks(replaceAt(renderedBlocks, index, { ...block, level }));
            };

            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                {editable ? (
                  <>
                    <InlineTextToolbar visible={isSelected} onSetType={setFromToolbar} />
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={selectBlock}
                      onInput={(event) =>
                        updateBlocks(
                          replaceAt(renderedBlocks, index, {
                            ...block,
                            text: (event.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim(),
                          }),
                        )
                      }
                      className={cn(
                        "w-full bg-transparent font-serif font-bold leading-tight text-gray-900 focus:outline-none",
                        block.level === 1 ? "text-4xl" : block.level === 2 ? "text-3xl" : "text-2xl",
                      )}
                    >
                      {block.text}
                    </div>
                  </>
                ) : (
                  <Tag
                    className={cn(
                      "font-serif font-bold leading-tight text-gray-900",
                      block.level === 1 ? "text-4xl" : block.level === 2 ? "text-3xl" : "text-2xl",
                    )}
                  >
                    {block.text}
                  </Tag>
                )}
                {editable && showBlockControls ? (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove();
                      }}
                      className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                      aria-label="Delete block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </section>
            );
          }

          case "paragraph": {
            const setFromToolbar = (type: "paragraph" | "h1" | "h2" | "h3") => {
              if (type === "paragraph") {
                return;
              }

              const level: 1 | 2 | 3 = type === "h1" ? 1 : type === "h3" ? 3 : 2;
              updateBlocks(
                replaceAt(renderedBlocks, index, {
                  id: block.id,
                  hidden: block.hidden,
                  type: "heading",
                  level,
                  text: stripTags(block.html),
                }),
              );
            };

            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                <InlineTextToolbar visible={editable && isSelected} onSetType={setFromToolbar} />
                <ParagraphEditor
                  html={block.html}
                  editable={editable}
                  onFocus={selectBlock}
                  onChange={(nextHtml) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, html: nextHtml }))}
                />
                {editable && showBlockControls ? (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove();
                      }}
                      className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                      aria-label="Delete block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </section>
            );
          }

          case "blockquote":
            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                {editable ? (
                  <textarea
                    value={block.text}
                    onFocus={selectBlock}
                    onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, text: event.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-lg border-l-4 border-blue-400 bg-blue-50 px-4 py-3 text-lg italic text-gray-700 focus:outline-none"
                  />
                ) : (
                  <blockquote className="border-l-4 border-blue-400 bg-blue-50 px-4 py-3 text-lg italic text-gray-700">
                    {block.text}
                  </blockquote>
                )}
              </section>
            );

          case "icon_list":
            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                {editable ? (
                  <div className="mb-3 flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500">Columns</label>
                    <select
                      value={block.columns}
                      onChange={(event) => {
                        const parsedColumns = Number(event.target.value);
                        const nextColumns: 1 | 2 | 3 = parsedColumns === 1 || parsedColumns === 3 ? parsedColumns : 2;
                        updateBlocks(
                          replaceAt(renderedBlocks, index, {
                            ...block,
                            columns: nextColumns,
                          }),
                        );
                      }}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                ) : null}

                <div
                  className={cn(
                    "grid gap-4",
                    block.columns === 1
                      ? "grid-cols-1"
                      : block.columns === 3
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2",
                  )}
                >
                  {block.items.map((item, itemIndex) => {
                    const IconComponent = getIconComponent(item.icon);
                    return (
                      <div key={`${block.id}_${itemIndex}`} className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                        <div className="mb-3 flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50">
                            <IconComponent className="h-5 w-5 text-emerald-600" />
                          </div>
                          {editable ? (
                            <input
                              value={item.icon}
                              onChange={(event) => {
                                const nextItems = [...block.items];
                                nextItems[itemIndex] = { ...nextItems[itemIndex], icon: event.target.value };
                                updateBlocks(replaceAt(renderedBlocks, index, { ...block, items: nextItems }));
                              }}
                              className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs font-mono"
                              placeholder="icon keyword"
                            />
                          ) : null}
                        </div>
                        {editable ? (
                          <input
                            value={item.title}
                            onChange={(event) => {
                              const nextItems = [...block.items];
                              nextItems[itemIndex] = { ...nextItems[itemIndex], title: event.target.value };
                              updateBlocks(replaceAt(renderedBlocks, index, { ...block, items: nextItems }));
                            }}
                            className="mb-2 w-full rounded-md border border-gray-200 px-2 py-1 text-base font-semibold"
                            placeholder="Title"
                          />
                        ) : (
                          <h4 className="mb-2 text-base font-bold text-gray-900">{item.title}</h4>
                        )}
                        {editable ? (
                          <textarea
                            value={item.text}
                            onChange={(event) => {
                              const nextItems = [...block.items];
                              nextItems[itemIndex] = { ...nextItems[itemIndex], text: event.target.value };
                              updateBlocks(replaceAt(renderedBlocks, index, { ...block, items: nextItems }));
                            }}
                            rows={3}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-600">{item.text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {editable ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateBlocks(
                        replaceAt(renderedBlocks, index, {
                          ...block,
                          items: [...block.items, { icon: "check", title: "New item", text: "Describe this item." }],
                        }),
                      )
                    }
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </button>
                ) : null}
              </section>
            );

          case "comparison_table":
            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                <div className="overflow-hidden rounded-xl border-2 border-emerald-500/20 bg-emerald-50/30">
                  <div className="grid grid-cols-[100px_1fr_100px] border-b border-emerald-100 bg-white">
                    <div className="border-r border-emerald-100 bg-emerald-50/50 p-3 text-center text-xs font-black uppercase text-emerald-800">
                      {editable ? (
                        <input
                          value={block.ourBrand}
                          onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, ourBrand: event.target.value }))}
                          className="w-full bg-transparent text-center"
                        />
                      ) : (
                        block.ourBrand
                      )}
                    </div>
                    <div className="p-3 text-center text-sm font-bold text-gray-900">Feature</div>
                    <div className="border-l border-emerald-100 bg-gray-50/50 p-3 text-center text-xs font-bold uppercase text-gray-500">
                      {editable ? (
                        <input
                          value={block.theirBrand}
                          onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, theirBrand: event.target.value }))}
                          className="w-full bg-transparent text-center"
                        />
                      ) : (
                        block.theirBrand
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-emerald-100/50 bg-white">
                    {block.features.map((feature, featureIndex) => (
                      <div key={`${block.id}_feature_${featureIndex}`} className="grid grid-cols-[100px_1fr_100px] items-center">
                        <div className="flex justify-center border-r border-emerald-100/50 bg-emerald-50/30 p-2">
                          {editable ? (
                            <input
                              type="checkbox"
                              checked={feature.us}
                              onChange={(event) => {
                                const next = [...block.features];
                                next[featureIndex] = { ...next[featureIndex], us: event.target.checked };
                                updateBlocks(replaceAt(renderedBlocks, index, { ...block, features: next }));
                              }}
                            />
                          ) : (
                            <span className="text-sm font-bold text-emerald-700">{feature.us ? "✓" : "✕"}</span>
                          )}
                        </div>
                        <div className="p-2">
                          {editable ? (
                            <input
                              value={feature.name}
                              onChange={(event) => {
                                const next = [...block.features];
                                next[featureIndex] = { ...next[featureIndex], name: event.target.value };
                                updateBlocks(replaceAt(renderedBlocks, index, { ...block, features: next }));
                              }}
                              className="w-full text-center text-sm"
                            />
                          ) : (
                            <p className="text-center text-sm text-gray-700">{feature.name}</p>
                          )}
                        </div>
                        <div className="flex justify-center border-l border-emerald-100/50 p-2">
                          {editable ? (
                            <input
                              type="checkbox"
                              checked={feature.them}
                              onChange={(event) => {
                                const next = [...block.features];
                                next[featureIndex] = { ...next[featureIndex], them: event.target.checked };
                                updateBlocks(replaceAt(renderedBlocks, index, { ...block, features: next }));
                              }}
                            />
                          ) : (
                            <span className="text-sm font-bold text-gray-500">{feature.them ? "✓" : "✕"}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {editable ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateBlocks(
                        replaceAt(renderedBlocks, index, {
                          ...block,
                          features: [...block.features, { name: "New feature", us: true, them: false }],
                        }),
                      )
                    }
                    className="mt-2 inline-flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Feature
                  </button>
                ) : null}
              </section>
            );

          case "timeline":
            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                {editable ? (
                  <input
                    value={block.title}
                    onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, title: event.target.value }))}
                    className="mb-4 w-full rounded-md border border-gray-200 px-2 py-1 text-xl font-bold"
                  />
                ) : (
                  <h3 className="mb-6 text-xl font-bold text-gray-900">{block.title}</h3>
                )}
                <div className="space-y-4">
                  {block.weeks.map((week, weekIndex) => (
                    <div key={`${block.id}_week_${weekIndex}`} className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                      <div className="mb-2 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
                        Week {week.week}
                      </div>
                      {editable ? (
                        <div className="space-y-2">
                          <input
                            type="number"
                            value={week.week}
                            onChange={(event) => {
                              const next = [...block.weeks];
                              next[weekIndex] = {
                                ...next[weekIndex],
                                week: Number.parseInt(event.target.value, 10) || 1,
                              };
                              updateBlocks(replaceAt(renderedBlocks, index, { ...block, weeks: next }));
                            }}
                            className="w-24 rounded-md border border-gray-200 px-2 py-1 text-xs"
                          />
                          <input
                            value={week.title}
                            onChange={(event) => {
                              const next = [...block.weeks];
                              next[weekIndex] = { ...next[weekIndex], title: event.target.value };
                              updateBlocks(replaceAt(renderedBlocks, index, { ...block, weeks: next }));
                            }}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 font-semibold"
                          />
                          <textarea
                            value={week.description}
                            onChange={(event) => {
                              const next = [...block.weeks];
                              next[weekIndex] = { ...next[weekIndex], description: event.target.value };
                              updateBlocks(replaceAt(renderedBlocks, index, { ...block, weeks: next }));
                            }}
                            rows={3}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className="mb-1 text-lg font-bold text-gray-900">{week.title}</h4>
                          <p className="text-sm text-gray-600">{week.description}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {editable ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateBlocks(
                        replaceAt(renderedBlocks, index, {
                          ...block,
                          weeks: [...block.weeks, { week: block.weeks.length + 1, title: "New week", description: "Describe progress." }],
                        }),
                      )
                    }
                    className="mt-2 inline-flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Week
                  </button>
                ) : null}
              </section>
            );

          case "testimonial":
            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8">
                  {editable ? (
                    <>
                      <input
                        value={block.helpedWith}
                        onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, helpedWith: event.target.value }))}
                        className="mb-3 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900"
                      />
                      <input
                        value={block.title}
                        onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, title: event.target.value }))}
                        className="mb-3 w-full rounded-md border border-gray-200 px-2 py-1 text-xl font-bold"
                      />
                      <textarea
                        value={block.body}
                        onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, body: event.target.value }))}
                        rows={4}
                        className="mb-3 w-full rounded-md border border-gray-200 px-2 py-1 text-lg"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={block.author}
                          onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, author: event.target.value }))}
                          className="rounded-md border border-gray-200 px-2 py-1"
                        />
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={block.verified}
                            onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, verified: event.target.checked }))}
                          />
                          Verified
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-4 inline-flex rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                        Helped with {block.helpedWith}
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-gray-900">{block.title}</h3>
                      <p className="mb-4 text-lg text-gray-700">{block.body}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {block.author} {block.verified ? "• Verified Purchase" : ""}
                      </p>
                    </>
                  )}
                </div>
              </section>
            );

          case "image":
            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                  {block.imageUrl ? (
                    <Image
                      unoptimized
                      src={block.imageUrl}
                      alt={block.alt ?? block.searchQuery}
                      width={1600}
                      height={900}
                      className="w-full rounded-lg shadow-md"
                    />
                  ) : (
                    <p className="text-center text-sm text-slate-500">Suggested image: {block.searchQuery}</p>
                  )}
                  {editable ? (
                    <div className="mt-3 space-y-2">
                      <input
                        value={block.searchQuery}
                        onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, searchQuery: event.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                        placeholder="Search query"
                      />
                      <input
                        value={block.alt ?? ""}
                        onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, alt: event.target.value || null }))}
                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                        placeholder="Alt text"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            uploadImage((url) => {
                              updateBlocks(replaceAt(renderedBlocks, index, { ...block, imageUrl: url }));
                            }).catch((error) => {
                              console.error(error);
                              alert("Failed to upload image");
                            });
                          }}
                          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium"
                        >
                          <Upload className="h-3.5 w-3.5" /> Upload
                        </button>
                        {block.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => updateBlocks(replaceAt(renderedBlocks, index, { ...block, imageUrl: null }))}
                            className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600"
                          >
                            Clear image
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            );

          case "takeaways":
            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                <div className="rounded-r-lg border-l-4 border-[#0F4C81] bg-blue-50/50 p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-bold uppercase tracking-wide text-[#0F4C81]">Key Takeaways</h3>
                  <ul className="space-y-3">
                    {block.items.map((item, itemIndex) => (
                      <li key={`${block.id}_takeaway_${itemIndex}`} className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0F4C81]" />
                        <div className="w-full">
                          {editable ? (
                            <>
                              <input
                                value={item.title}
                                onChange={(event) => {
                                  const next = [...block.items];
                                  next[itemIndex] = { ...next[itemIndex], title: event.target.value };
                                  updateBlocks(replaceAt(renderedBlocks, index, { ...block, items: next }));
                                }}
                                className="mb-1 w-full rounded-md border border-gray-200 px-2 py-1 text-sm font-semibold"
                              />
                              <textarea
                                value={item.content}
                                onChange={(event) => {
                                  const next = [...block.items];
                                  next[itemIndex] = { ...next[itemIndex], content: event.target.value };
                                  updateBlocks(replaceAt(renderedBlocks, index, { ...block, items: next }));
                                }}
                                rows={2}
                                className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                              />
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-gray-900">{item.title}</p>
                              <p className="text-sm text-gray-800">{item.content}</p>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {editable ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateBlocks(
                          replaceAt(renderedBlocks, index, {
                            ...block,
                            items: [...block.items, { title: "New takeaway", content: "Add detail." }],
                          }),
                        )
                      }
                      className="mt-3 inline-flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Takeaway
                    </button>
                  ) : null}
                </div>
              </section>
            );

          case "inline_cta":
            return (
              <section
                key={block.id}
                ref={registerBlockRef}
                data-block-id={block.id}
                onClick={selectBlock}
                className={getCanvasSectionClass(isSelected, editable, block.hidden)}
              >
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-8 text-center shadow-sm">
                  {editable ? (
                    <>
                      <input
                        value={block.title}
                        onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, title: event.target.value }))}
                        className="mb-3 w-full rounded-md border border-gray-200 px-2 py-1 text-center text-xl"
                      />
                      <input
                        value={block.buttonText}
                        onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, buttonText: event.target.value }))}
                        className="mb-3 w-full rounded-md border border-gray-200 px-2 py-1 text-center font-semibold"
                      />
                      <textarea
                        value={block.description}
                        onChange={(event) => updateBlocks(replaceAt(renderedBlocks, index, { ...block, description: event.target.value }))}
                        rows={2}
                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-center text-xs"
                      />
                    </>
                  ) : (
                    <>
                      <p className="mb-4 text-xl font-medium text-gray-900">{block.title}</p>
                      <a
                        href={ctaUrl}
                        className="inline-block rounded-lg bg-[#0F4C81] px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-[#0a3b66]"
                      >
                        {block.buttonText}
                      </a>
                      <p className="mt-4 text-xs text-gray-500">{block.description}</p>
                    </>
                  )}
                </div>
              </section>
            );

          default:
            return null;
        }
      })}

      {editable && showBlockLibrary ? (
        <div className="mt-8 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-gray-300 p-3">
          {ADDABLE_BLOCK_TYPES.map((candidate) => (
            <button
              key={candidate.type}
              type="button"
              onClick={() => updateBlocks([...renderedBlocks, createDefaultBlock(candidate.type)])}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-3 w-3" /> {candidate.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
