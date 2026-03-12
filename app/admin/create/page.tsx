'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import GenerationOverlay from '@/components/admin/GenerationOverlay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useAdminSettings } from '@/hooks/useAdminSettings';

interface AdminConfigPayload {
    defaultPixelId?: string | null;
    defaultCtaUrl?: string | null;
}

export default function CreateArticlePage() {
    const router = useRouter();
    const { pixels, ctaUrls, isLoading: settingsLoading, error: settingsError, refresh } = useAdminSettings();

    const [rawText, setRawText] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [generationStage, setGenerationStage] = useState(0);
    const stageTimersRef = useRef<NodeJS.Timeout[]>([]);

    const [config, setConfig] = useState<AdminConfigPayload>({});
    const [configError, setConfigError] = useState<string | null>(null);

    const [selectedPixelId, setSelectedPixelId] = useState('default');
    const [selectedCtaId, setSelectedCtaId] = useState('default');
    const [customPixel, setCustomPixel] = useState('');
    const [customCta, setCustomCta] = useState('');

    const loadConfig = useCallback(async () => {
        try {
            setConfigError(null);
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error('Unable to load defaults');
            }
            const payload = (await response.json()) as AdminConfigPayload;
            setConfig(payload);
        } catch (error) {
            console.error('Failed to load config', error);
            setConfigError('Failed to load defaults. You can still enter custom values.');
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    useEffect(() => {
        if (pixels.length === 0) return;

        const defaultPixel = config.defaultPixelId;
        const matched = pixels.find((pixel) => pixel.pixel_id === defaultPixel);
        if (matched) {
            setSelectedPixelId(matched.id);
            return;
        }

        if (selectedPixelId === 'default') {
            setSelectedPixelId(pixels[0].id);
        }
    }, [config.defaultPixelId, pixels, selectedPixelId]);

    useEffect(() => {
        if (ctaUrls.length === 0) return;

        const defaultCta = config.defaultCtaUrl;
        const matched = ctaUrls.find((cta) => cta.url === defaultCta);
        if (matched) {
            setSelectedCtaId(matched.id);
            return;
        }

        if (selectedCtaId === 'default') {
            setSelectedCtaId(ctaUrls[0].id);
        }
    }, [config.defaultCtaUrl, ctaUrls, selectedCtaId]);

    const selectedPixel = useMemo(
        () => pixels.find((pixel) => pixel.id === selectedPixelId),
        [pixels, selectedPixelId],
    );

    const selectedCta = useMemo(
        () => ctaUrls.find((cta) => cta.id === selectedCtaId),
        [ctaUrls, selectedCtaId],
    );

    const handleGenerate = async () => {
        if (!rawText.trim()) {
            toast.error('Please enter the article text');
            return;
        }

        const finalPixel = customPixel.trim() || selectedPixel?.pixel_id || config.defaultPixelId || '';
        const finalCta = customCta.trim() || selectedCta?.url || config.defaultCtaUrl || '';

        if (!finalPixel) {
            toast.error('Please select a pixel or provide a custom pixel ID');
            return;
        }

        if (!finalCta) {
            toast.error('Please select a CTA URL or provide a custom URL');
            return;
        }

        setLoading(true);
        setGenerationStage(0);

        stageTimersRef.current.forEach((timer) => clearTimeout(timer));
        stageTimersRef.current = [];

        const stageDurations = [3000, 4000, 4000];
        stageDurations.forEach((duration, index) => {
            const timer = setTimeout(() => {
                setGenerationStage(index + 1);
            }, stageDurations.slice(0, index + 1).reduce((total, current) => total + current, 0));
            stageTimersRef.current.push(timer);
        });

        try {
            const response = await fetch('/api/generate-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText,
                    slug,
                    pixelId: finalPixel,
                    ctaUrl: finalCta,
                    stylePreset: 'core-polished',
                }),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to generate article');
            }

            toast.success('Article generated successfully');
            router.push(`/admin/articles/${payload.slug}`);
        } catch (error) {
            stageTimersRef.current.forEach((timer) => clearTimeout(timer));
            stageTimersRef.current = [];
            const message = error instanceof Error ? error.message : 'Failed to generate article';
            toast.error(message);
            setLoading(false);
            setGenerationStage(0);
        }
    };

    return (
        <>
            {loading ? <GenerationOverlay stage={generationStage} /> : null}

            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Create Article</h1>
                        <p className="text-muted-foreground">Paste input text once and generate a production-ready article document.</p>
                    </div>
                </div>

                {settingsError || configError ? (
                    <Alert variant="destructive">
                        <AlertDescription className="flex items-center justify-between gap-3">
                            <span>{settingsError || configError}</span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    refresh();
                                    loadConfig();
                                }}
                            >
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                ) : null}

                <Card>
                    <CardHeader>
                        <CardTitle>Article Content</CardTitle>
                        <CardDescription>
                            The generator keeps wording verbatim and structures it into canonical content blocks.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="slug">Custom Slug (Optional)</Label>
                            <div className="flex">
                                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                                    /articles/
                                </span>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    className="rounded-l-none"
                                    placeholder="my-article-slug"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="raw-text">Input Text</Label>
                            <Textarea
                                id="raw-text"
                                value={rawText}
                                onChange={(event) => setRawText(event.target.value)}
                                className="min-h-[280px] resize-y"
                                placeholder="Paste article source text here..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tracking & Destination</CardTitle>
                        <CardDescription>Choose managed defaults or provide custom values for this article.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Pixel</Label>
                            <Select value={selectedPixelId} onValueChange={setSelectedPixelId} disabled={settingsLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a pixel" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pixels.map((pixel) => (
                                        <SelectItem key={pixel.id} value={pixel.id}>
                                            {pixel.name} ({pixel.pixel_id})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                value={customPixel}
                                onChange={(event) => setCustomPixel(event.target.value)}
                                placeholder="Or enter custom pixel ID"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>CTA URL</Label>
                            <Select value={selectedCtaId} onValueChange={setSelectedCtaId} disabled={settingsLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a CTA URL" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ctaUrls.map((cta) => (
                                        <SelectItem key={cta.id} value={cta.id}>
                                            {cta.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                value={customCta}
                                onChange={(event) => setCustomCta(event.target.value)}
                                placeholder="Or enter custom CTA URL"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Button onClick={handleGenerate} disabled={loading} size="lg" className="w-full">
                    <Sparkles className="mr-2 h-5 w-5" /> Generate Article
                </Button>
            </div>
        </>
    );
}
