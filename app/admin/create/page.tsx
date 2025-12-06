'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import GenerationOverlay from '@/components/admin/GenerationOverlay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Sparkles, Plus, X, FileText, FlaskConical } from 'lucide-react';

export default function CreateArticlePage() {
    const router = useRouter();
    const [rawText, setRawText] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [generationStage, setGenerationStage] = useState(0);
    const stageTimersRef = useRef<NodeJS.Timeout[]>([]);

    // Theme State (V1 or V2)
    const [articleTheme, setArticleTheme] = useState<'v1' | 'v2'>('v1');

    // Pixel State
    const [pixels, setPixels] = useState<string[]>([]);
    const [selectedPixel, setSelectedPixel] = useState('');
    const [newPixel, setNewPixel] = useState('');
    const [isAddingPixel, setIsAddingPixel] = useState(false);

    // CTA State
    const [ctas, setCtas] = useState<string[]>([]);
    const [selectedCta, setSelectedCta] = useState('');
    const [newCta, setNewCta] = useState('');
    const [isAddingCta, setIsAddingCta] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [articlesRes, configRes] = await Promise.all([
                    fetch('/api/articles'),
                    fetch('/api/config')
                ]);

                const articles = await articlesRes.json();
                const config = await configRes.json();

                // Extract unique Pixels
                const articlePixels = articles.map((a: any) => a.pixelId).filter(Boolean);
                const allPixels = Array.from(new Set([config.defaultPixelId, ...articlePixels])).filter(Boolean);
                setPixels(allPixels as string[]);
                if (allPixels.length > 0) setSelectedPixel(allPixels[0] as string);

                // Extract unique CTAs
                const articleCtas = articles.map((a: any) => a.ctaUrl).filter(Boolean);
                const allCtas = Array.from(new Set([config.defaultCtaUrl, ...articleCtas])).filter(Boolean);
                setCtas(allCtas as string[]);
                if (allCtas.length > 0) setSelectedCta(allCtas[0] as string);

            } catch (err) {
                console.error('Failed to load data', err);
            }
        };
        fetchData();
    }, []);

    const handleGenerate = async () => {
        if (!rawText) {
            toast.error('Please enter the article text');
            return;
        }

        const finalPixel = isAddingPixel ? newPixel : selectedPixel;
        const finalCta = isAddingCta ? newCta : selectedCta;

        if (!finalPixel) {
            toast.error('Please select or add a Pixel ID');
            return;
        }
        if (!finalCta) {
            toast.error('Please select or add a CTA URL');
            return;
        }

        setLoading(true);
        setGenerationStage(0);

        // Clear any existing timers
        stageTimersRef.current.forEach(timer => clearTimeout(timer));
        stageTimersRef.current = [];

        // Progress through stages while API call is processing
        const stageDurations = [3000, 4000, 4000];
        stageDurations.forEach((duration, index) => {
            const timer = setTimeout(() => {
                setGenerationStage(index + 1);
            }, stageDurations.slice(0, index + 1).reduce((a, b) => a + b, 0));
            stageTimersRef.current.push(timer);
        });

        try {
            const res = await fetch('/api/generate-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText,
                    slug,
                    pixelId: finalPixel,
                    ctaUrl: finalCta,
                    theme: articleTheme // Add theme to the request
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate article');
            }

            // Wait a moment for blob storage to propagate
            await new Promise(resolve => setTimeout(resolve, 1500));

            toast.success('Article generated successfully!');
            router.push(`/admin/articles/${data.slug}`);

        } catch (err: any) {
            stageTimersRef.current.forEach(timer => clearTimeout(timer));
            stageTimersRef.current = [];
            
            // Handle schema error specifically
            if (err.message && (err.message.includes('PGRST204') || err.message.includes('article_theme'))) {
                toast.error(
                    <div className="flex flex-col gap-2">
                        <span>Database migration required for V2 features.</span>
                        <a 
                            href="/api/setup-v2-schema" 
                            target="_blank" 
                            className="underline font-bold text-white hover:text-gray-200"
                        >
                            Click here to update database
                        </a>
                    </div>,
                    { duration: 10000 }
                );
            } else {
                toast.error(err.message || 'Failed to generate article');
            }
            
            setLoading(false);
            setGenerationStage(0);
        }
    };

    const handleAddPixel = () => {
        if (newPixel.trim()) {
            setPixels([...pixels, newPixel.trim()]);
            setSelectedPixel(newPixel.trim());
            setNewPixel('');
            setIsAddingPixel(false);
        }
    };

    const handleAddCta = () => {
        if (newCta.trim()) {
            setCtas([...ctas, newCta.trim()]);
            setSelectedCta(newCta.trim());
            setNewCta('');
            setIsAddingCta(false);
        }
    };

    return (
        <>
            {loading && <GenerationOverlay stage={generationStage} />}

            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Create Article</h1>
                        <p className="text-muted-foreground">Generate a new article with AI</p>
                    </div>
                </div>

                {/* Theme Selection Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Article Theme</CardTitle>
                        <CardDescription>
                            Choose the style and components for your article
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            {/* V1 Option */}
                            <button
                                onClick={() => setArticleTheme('v1')}
                                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                                    articleTheme === 'v1'
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                                    articleTheme === 'v1' ? 'bg-blue-100' : 'bg-gray-100'
                                }`}>
                                    <FileText className={`w-5 h-5 ${articleTheme === 'v1' ? 'text-blue-600' : 'text-gray-500'}`} />
                                </div>
                                <h3 className="font-semibold text-gray-900">Standard Blog (V1)</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Clean article format with basic HTML formatting
                                </p>
                                {articleTheme === 'v1' && (
                                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* V2 Option */}
                            <button
                                onClick={() => setArticleTheme('v2')}
                                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                                    articleTheme === 'v2'
                                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                                    articleTheme === 'v2' ? 'bg-emerald-100' : 'bg-gray-100'
                                }`}>
                                    <FlaskConical className={`w-5 h-5 ${articleTheme === 'v2' ? 'text-emerald-600' : 'text-gray-500'}`} />
                                </div>
                                <h3 className="font-semibold text-gray-900">Scientific Advertorial (V2)</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Rich components: tables, timelines, icon lists
                                </p>
                                {articleTheme === 'v2' && (
                                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">Tables</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">Timelines</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">Icons</span>
                                </div>
                            </button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Article Content</CardTitle>
                        <CardDescription>
                            Paste your raw text and let AI format it into a polished article
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Slug Input */}
                        <div className="space-y-2">
                            <Label>Custom Slug (Optional)</Label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                                    /articles/
                                </span>
                                <Input
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    className="rounded-l-none"
                                    placeholder="my-article-slug"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Leave blank to auto-generate from title
                            </p>
                        </div>

                        {/* Raw Text Input */}
                        <div className="space-y-2">
                            <Label>Advertorial Text</Label>
                            <Textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="min-h-[250px] resize-y"
                                placeholder="Paste your raw article text here. The AI will format it, generate a title, and create comments..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tracking & CTA</CardTitle>
                        <CardDescription>
                            Configure the Facebook Pixel and call-to-action for this article
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Pixel Selection */}
                        <div className="space-y-2">
                            <Label>Facebook Pixel ID</Label>
                            {!isAddingPixel ? (
                                <div className="flex gap-2">
                                    <Select value={selectedPixel} onValueChange={setSelectedPixel}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a pixel" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pixels.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" onClick={() => setIsAddingPixel(true)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        value={newPixel}
                                        onChange={(e) => setNewPixel(e.target.value)}
                                        placeholder="Enter new Pixel ID"
                                        className="flex-1"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddPixel()}
                                    />
                                    <Button onClick={handleAddPixel}>Add</Button>
                                    <Button variant="ghost" size="icon" onClick={() => setIsAddingPixel(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* CTA URL Selection */}
                        <div className="space-y-2">
                            <Label>CTA URL</Label>
                            {!isAddingCta ? (
                                <div className="flex gap-2">
                                    <Select value={selectedCta} onValueChange={setSelectedCta}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a CTA URL" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ctas.map(c => (
                                                <SelectItem key={c} value={c}>
                                                    <span className="truncate max-w-[300px] block">{c}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" onClick={() => setIsAddingCta(true)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        value={newCta}
                                        onChange={(e) => setNewCta(e.target.value)}
                                        placeholder="https://..."
                                        className="flex-1"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCta()}
                                    />
                                    <Button onClick={handleAddCta}>Add</Button>
                                    <Button variant="ghost" size="icon" onClick={() => setIsAddingCta(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    size="lg"
                    className="w-full"
                >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate {articleTheme === 'v2' ? 'V2 Advertorial' : 'Article'} with AI
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                    Powered by Google Gemini. {articleTheme === 'v2' 
                        ? 'Generates rich components, title, and comments automatically.'
                        : 'Generates title, content, and comments automatically.'}
                </p>
            </div>
        </>
    );
}
