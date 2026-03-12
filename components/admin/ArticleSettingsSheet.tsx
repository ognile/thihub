import React, { useState } from 'react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BarChart3, Copy, Globe, Settings, ShieldCheck } from 'lucide-react';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import GlobalSettingsSheet from '@/components/admin/GlobalSettingsSheet';
import AdminStateView from '@/components/admin/ui/AdminStateView';
import AdminSheetScaffold from '@/components/admin/ui/AdminSheetScaffold';
import type { ArticleBlock, HeroMetaV1, StylePreset } from '@/lib/articles/schema';

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
  ctaText?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaUrl?: string;
  pixelId?: string;
  keyTakeaways?: { title: string; content: string }[] | null;
  comments?: unknown[];
  stickyCTAEnabled?: boolean;
  stickyCTAText?: string;
  stickyCTAPrice?: string;
  stickyCTAOriginalPrice?: string;
  stickyCTAProductName?: string;
}

interface ArticleSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: Article;
  setArticle: React.Dispatch<React.SetStateAction<Article>>;
}

async function copyValue(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
}

function SelectedValueRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) {
    return (
      <p className="text-xs text-muted-foreground">Using default {label.toLowerCase()}.</p>
    );
  }

  return (
    <div className="admin-row grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[var(--admin-outline-soft)] px-3 py-2.5">
      <div className="min-w-0">
        <p className="admin-value truncate text-xs text-muted-foreground" title={value}>
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => copyValue(value, label)}
      >
        <Copy className="h-3.5 w-3.5" />
        Copy
      </Button>
    </div>
  );
}

export default function ArticleSettingsSheet({ open, onOpenChange, article, setArticle }: ArticleSettingsSheetProps) {
  const { pixels, ctaUrls, isLoading, error, refresh } = useAdminSettings();
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  const selectedPixel = pixels.find((pixel) => pixel.pixel_id === article.pixelId);
  const selectedCta = ctaUrls.find((cta) => cta.url === article.ctaUrl);
  const ctaSelectValue =
    selectedCta?.id ?? (article.ctaUrl ? 'custom' : 'default');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <AdminSheetScaffold
          title="Article Settings"
          description="Configure tracking, destination, and article metadata."
        >
          <section className="admin-section space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-text-strong)]">
                <BarChart3 className="h-4 w-4" />
                Tracking &amp; Destination
              </h3>
              <Button
                type="button"
                variant="outline"
                className="h-9 px-3 text-xs"
                onClick={() => setIsGlobalSettingsOpen(true)}
              >
                <Settings className="h-3.5 w-3.5" />
                Manage Global Config
              </Button>
            </div>

            {isLoading ? (
              <AdminStateView state="loading" title="Loading tracking settings" />
            ) : error ? (
              <AdminStateView
                state="error"
                title="Unable to load tracking settings"
                description={error}
                actionLabel="Retry"
                onAction={refresh}
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="admin-field-label">Pixel ID</Label>
                  <Select
                    value={article.pixelId || 'default'}
                    onValueChange={(value) =>
                      setArticle((prev) => ({
                        ...prev,
                        pixelId: value === 'default' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select a pixel..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use Default</SelectItem>
                      {pixels.map((pixel) => (
                        <SelectItem key={pixel.id} value={pixel.pixel_id}>
                          {pixel.name} ({pixel.pixel_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <SelectedValueRow label="Pixel ID" value={selectedPixel?.pixel_id || article.pixelId} />
                </div>

                <div className="space-y-2">
                  <Label className="admin-field-label">CTA URL</Label>
                  <Select
                    value={ctaSelectValue}
                    onValueChange={(value) => {
                      if (value === 'default') {
                        setArticle((prev) => ({ ...prev, ctaUrl: '' }));
                        return;
                      }

                      if (value === 'custom') {
                        return;
                      }

                      const selected = ctaUrls.find((cta) => cta.id === value);
                      if (selected) {
                        setArticle((prev) => ({ ...prev, ctaUrl: selected.url }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select a URL..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use Default</SelectItem>
                      {article.ctaUrl && !selectedCta ? <SelectItem value="custom">Custom URL</SelectItem> : null}
                      {ctaUrls.map((urlItem) => (
                        <SelectItem key={urlItem.id} value={urlItem.id}>
                          {urlItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={article.ctaUrl || ''}
                    onChange={(event) => setArticle((prev) => ({ ...prev, ctaUrl: event.target.value }))}
                    placeholder="https://..."
                    className="h-9 font-mono text-xs"
                  />
                  <SelectedValueRow label="CTA URL" value={article.ctaUrl} />
                </div>
              </div>
            )}
          </section>

          <section className="admin-section space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-text-strong)]">
                <ShieldCheck className="h-4 w-4" />
                Sticky CTA
              </h3>
            </div>

            <div className="space-y-4">
              <div className="admin-row grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[var(--admin-outline-soft)] px-3 py-2.5">
                <div className="space-y-1">
                  <Label htmlFor="sticky-enabled" className="text-sm font-medium text-[var(--admin-text-strong)]">
                    Enable Sticky CTA
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show a persistent CTA bar at the bottom of the article.
                  </p>
                </div>
                <Switch
                  id="sticky-enabled"
                  checked={article.stickyCTAEnabled || false}
                  onCheckedChange={(checked) => setArticle((prev) => ({ ...prev, stickyCTAEnabled: checked }))}
                />
              </div>

              {article.stickyCTAEnabled ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="admin-field-label">Product Name</Label>
                    <Input
                      value={article.stickyCTAProductName || ''}
                      onChange={(event) => setArticle((prev) => ({ ...prev, stickyCTAProductName: event.target.value }))}
                      placeholder="e.g., Gut Health Formula"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="admin-field-label">Button Text</Label>
                    <Input
                      value={article.stickyCTAText || 'Try Risk-Free'}
                      onChange={(event) => setArticle((prev) => ({ ...prev, stickyCTAText: event.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="admin-field-label">Price</Label>
                    <Input
                      value={article.stickyCTAPrice || ''}
                      onChange={(event) => setArticle((prev) => ({ ...prev, stickyCTAPrice: event.target.value }))}
                      placeholder="$49.99"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="admin-field-label">Original Price</Label>
                    <Input
                      value={article.stickyCTAOriginalPrice || ''}
                      onChange={(event) =>
                        setArticle((prev) => ({
                          ...prev,
                          stickyCTAOriginalPrice: event.target.value,
                        }))
                      }
                      placeholder="$79.99"
                      className="h-9"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="admin-section space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-text-strong)]">
                <Globe className="h-4 w-4" />
                General Information
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="admin-field-label">Slug</Label>
                <Input value={article.slug} disabled className="h-9 bg-muted font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="admin-field-label">Date</Label>
                <Input
                  value={article.date}
                  onChange={(event) => setArticle((prev) => ({ ...prev, date: event.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="admin-field-label">Author</Label>
                <Input
                  value={article.author}
                  onChange={(event) => setArticle((prev) => ({ ...prev, author: event.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="admin-field-label">Reviewer</Label>
                <Input
                  value={article.reviewer}
                  onChange={(event) => setArticle((prev) => ({ ...prev, reviewer: event.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
          </section>

          <section className="admin-section space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-text-strong)]">
                <ShieldCheck className="h-4 w-4" />
                Hero Presentation
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="admin-field-label">Report Label</Label>
                <Input
                  value={article.heroMeta.reportLabel}
                  onChange={(event) =>
                    setArticle((prev) => ({
                      ...prev,
                      heroMeta: { ...prev.heroMeta, reportLabel: event.target.value },
                    }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="admin-field-label">Fact Checked Label</Label>
                <Input
                  value={article.heroMeta.factCheckedLabel}
                  onChange={(event) =>
                    setArticle((prev) => ({
                      ...prev,
                      heroMeta: { ...prev.heroMeta, factCheckedLabel: event.target.value },
                    }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="admin-field-label">Medically Reviewed Label</Label>
                <Input
                  value={article.heroMeta.medicallyReviewedLabel}
                  onChange={(event) =>
                    setArticle((prev) => ({
                      ...prev,
                      heroMeta: { ...prev.heroMeta, medicallyReviewedLabel: event.target.value },
                    }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="admin-field-label">Read Time Mode</Label>
                <Select
                  value={article.heroMeta.readTimeMode}
                  onValueChange={(value) =>
                    setArticle((prev) => ({
                      ...prev,
                      heroMeta: {
                        ...prev.heroMeta,
                        readTimeMode: value === 'override' ? 'override' : 'auto',
                        readTimeOverrideMinutes:
                          value === 'override' ? prev.heroMeta.readTimeOverrideMinutes : null,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="override">Override</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="admin-field-label">Read Time Override (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={article.heroMeta.readTimeOverrideMinutes ?? ''}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    setArticle((prev) => ({
                      ...prev,
                      heroMeta: {
                        ...prev.heroMeta,
                        readTimeOverrideMinutes:
                          Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                      },
                    }));
                  }}
                  disabled={article.heroMeta.readTimeMode !== 'override'}
                  className="h-9"
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label className="admin-field-label">Author Image URL</Label>
                <Input
                  value={article.authorImage || ''}
                  onChange={(event) =>
                    setArticle((prev) => ({
                      ...prev,
                      authorImage: event.target.value || null,
                    }))
                  }
                  className="h-9"
                  placeholder="https://..."
                />
              </div>
            </div>
          </section>
        </AdminSheetScaffold>
      </Sheet>

      <GlobalSettingsSheet open={isGlobalSettingsOpen} onOpenChange={setIsGlobalSettingsOpen} />
    </>
  );
}
