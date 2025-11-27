'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CommentEditor from '@/components/admin/CommentEditor';
import { CommentData } from '@/components/FBComments';
import { cn } from '@/lib/utils';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
    Search,
    Settings,
    FileText,
    MessageSquare,
    ExternalLink,
    Pencil,
    Trash2,
    Plus,
    Save,
    Loader2,
} from 'lucide-react';

interface ArticleConfig {
    pixelId: string;
    ctaUrl: string;
}

interface Article {
    id: string;
    slug: string;
    title: string;
    ctaText?: string;
    ctaTitle?: string;
    ctaDescription?: string;
    comments?: CommentData[];
}

interface Config {
    defaultPixelId: string;
    defaultCtaUrl: string;
    articles: Record<string, ArticleConfig | string>;
}

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<Config | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [savingConfig, setSavingConfig] = useState(false);
    const [savingArticle, setSavingArticle] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
        fetchConfig();
        fetchArticles();
    }, []);

    const checkAuth = async () => {
        try {
            setIsAuthenticated(true);
        } catch (e) {
            router.push('/admin/login');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                if (data.default && !data.defaultPixelId) {
                    const migratedConfig: Config = {
                        defaultPixelId: data.default,
                        defaultCtaUrl: 'https://mynuora.com/products/feminine-balance-gummies-1',
                        articles: {}
                    };
                    Object.entries(data.articles || {}).forEach(([slug, val]) => {
                        if (typeof val === 'string') {
                            migratedConfig.articles[slug] = { pixelId: val, ctaUrl: '' };
                        } else {
                            migratedConfig.articles[slug] = val as ArticleConfig;
                        }
                    });
                    setConfig(migratedConfig);
                } else {
                    setConfig(data);
                }
            }
        } catch (e) {
            console.error('Failed to fetch config', e);
        }
    };

    const fetchArticles = async () => {
        try {
            const res = await fetch('/api/articles');
            if (res.ok) {
                const data = await res.json();
                setArticles(data);
            }
        } catch (e) {
            console.error('Failed to fetch articles', e);
        }
    };

    const handleSaveConfig = async () => {
        if (!config) return;
        setSavingConfig(true);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                toast.success('Configuration saved successfully');
            } else {
                toast.error('Failed to save configuration');
            }
        } catch (e) {
            toast.error('Failed to save configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    const handleSaveComments = async (slug: string, comments: CommentData[], ctaText?: string, ctaTitle?: string, ctaDescription?: string) => {
        setSavingArticle(true);
        try {
            const res = await fetch('/api/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, comments, ctaText, ctaTitle, ctaDescription }),
            });

            if (res.ok) {
                toast.success('Article saved successfully');
                setArticles(articles.map(a => a.slug === slug ? { ...a, comments, ctaText, ctaTitle, ctaDescription } : a));
            } else {
                toast.error('Failed to save article');
            }
        } catch (e) {
            toast.error('Failed to save article');
        } finally {
            setSavingArticle(false);
        }
    };

    const handleDeleteArticle = async (slug: string) => {
        if (!window.confirm(`Are you sure you want to delete "${slug}"? This cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/articles?slug=${slug}`, { method: 'DELETE' });

            if (res.ok) {
                toast.success('Article deleted');
                setArticles(articles.filter(a => a.slug !== slug));
                if (selectedArticle === slug) {
                    setSelectedArticle(null);
                }
            } else {
                toast.error('Failed to delete article');
            }
        } catch (e) {
            toast.error('Failed to delete article');
        }
    };

    const updateGlobalConfig = (key: 'defaultPixelId' | 'defaultCtaUrl', value: string) => {
        if (config) {
            setConfig({ ...config, [key]: value });
        }
    };

    const updateArticleConfig = (slug: string, key: 'pixelId' | 'ctaUrl', value: string) => {
        if (!config) return;
        const currentArticleConfig = config.articles?.[slug];

        let baseConfig: ArticleConfig;
        if (typeof currentArticleConfig === 'string') {
            baseConfig = { pixelId: currentArticleConfig, ctaUrl: '' };
        } else {
            baseConfig = (currentArticleConfig as ArticleConfig) || { pixelId: '', ctaUrl: '' };
        }

        const newArticleConfig: ArticleConfig = { ...baseConfig, [key]: value };

        setConfig({
            ...config,
            articles: {
                ...config.articles,
                [slug]: newArticleConfig
            }
        });
    };

    const getArticleConfigValue = (slug: string, key: 'pixelId' | 'ctaUrl') => {
        const articleConfig = config?.articles?.[slug];
        if (!articleConfig) return '';
        if (typeof articleConfig === 'string') return key === 'pixelId' ? articleConfig : '';
        return articleConfig[key] || '';
    };

    // Filter articles by search query
    const filteredArticles = useMemo(() => {
        if (!searchQuery.trim()) return articles;
        const query = searchQuery.toLowerCase();
        return articles.filter(a => 
            a.title.toLowerCase().includes(query) || 
            a.slug.toLowerCase().includes(query)
        );
    }, [articles, searchQuery]);

    const selectedArticleData = articles.find(a => a.slug === selectedArticle);

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                            <div className="col-span-2">
                                <Skeleton className="h-64 w-full" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">Admin Dashboard</h1>
                    <p className="text-sm text-zinc-500 mt-1">Manage articles, tracking, and content</p>
                </div>
                <Button asChild className="bg-zinc-900 hover:bg-zinc-800">
                    <Link href="/admin/create">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Article
                    </Link>
                </Button>
            </div>

            {/* Global Defaults Card */}
            <Card className="border-zinc-200">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-zinc-500" />
                        Global Defaults
                    </CardTitle>
                    <CardDescription className="text-zinc-500">
                        Default tracking and CTA settings for all articles
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="defaultPixelId" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Default Pixel ID
                            </Label>
                            <Input
                                id="defaultPixelId"
                                value={config?.defaultPixelId || ''}
                                onChange={(e) => updateGlobalConfig('defaultPixelId', e.target.value)}
                                placeholder="Enter Facebook Pixel ID"
                                className="border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="defaultCtaUrl" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Default CTA URL
                            </Label>
                            <Input
                                id="defaultCtaUrl"
                                value={config?.defaultCtaUrl || ''}
                                onChange={(e) => updateGlobalConfig('defaultCtaUrl', e.target.value)}
                                placeholder="https://..."
                                className="border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button 
                            onClick={handleSaveConfig} 
                            disabled={savingConfig}
                            className="bg-zinc-900 hover:bg-zinc-800"
                        >
                            {savingConfig ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Global Config
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Article Management Card */}
            <Card className="border-zinc-200">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-zinc-500" />
                                Article Management
                            </CardTitle>
                            <CardDescription className="text-zinc-500">
                                {articles.length} articles total
                            </CardDescription>
                        </div>
                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[500px]">
                        {/* Article List Sidebar */}
                        <div className="border-r border-zinc-100 bg-zinc-50/50">
                            <div className="p-3 border-b border-zinc-100">
                                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    Articles
                                </span>
                            </div>
                            <ScrollArea className="h-[450px]">
                                <div className="p-2 space-y-1">
                                    {filteredArticles.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-zinc-400">
                                            {searchQuery ? 'No articles match your search' : 'No articles yet'}
                                        </div>
                                    ) : (
                                        filteredArticles.map(article => (
                                            <button
                                                key={article.slug}
                                                onClick={() => setSelectedArticle(article.slug)}
                                                className={cn(
                                                    'w-full text-left p-3 rounded-lg transition-all',
                                                    selectedArticle === article.slug
                                                        ? 'bg-white shadow-sm border border-zinc-200 ring-1 ring-zinc-900/5'
                                                        : 'hover:bg-white hover:shadow-sm border border-transparent'
                                                )}
                                            >
                                                <div className="font-medium text-zinc-900 text-sm line-clamp-2 mb-1">
                                                    {article.title}
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs text-zinc-500 truncate flex-1 min-w-0">
                                                        /{article.slug}
                                                    </span>
                                                    <Badge variant="secondary" className="text-[10px] shrink-0 bg-zinc-100 text-zinc-600 hover:bg-zinc-100">
                                                        {article.comments?.length || 0} comments
                                                    </Badge>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Editor Area */}
                        <div className="lg:col-span-2 p-6 bg-white">
                            {selectedArticle && selectedArticleData ? (
                                <div className="space-y-6">
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Button variant="outline" size="sm" asChild className="border-zinc-200">
                                            <a href={`/articles/${selectedArticle}`} target="_blank">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View Live
                                            </a>
                                        </Button>
                                        <Button size="sm" asChild className="bg-zinc-900 hover:bg-zinc-800">
                                            <Link href={`/admin/articles/${selectedArticle}`}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Open Visual Editor
                                            </Link>
                                        </Button>
                                    </div>

                                    {/* Tracking & CTA Configuration */}
                                    <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                            <Settings className="h-4 w-4 text-zinc-500" />
                                            Tracking & CTA Configuration
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500">Pixel ID Override</Label>
                                                <Input
                                                    placeholder={`Default: ${config?.defaultPixelId || 'Not set'}`}
                                                    value={getArticleConfigValue(selectedArticle, 'pixelId')}
                                                    onChange={(e) => updateArticleConfig(selectedArticle, 'pixelId', e.target.value)}
                                                    className="text-sm border-zinc-200"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500">CTA URL Override</Label>
                                                <Input
                                                    placeholder={`Default: ${config?.defaultCtaUrl || 'Not set'}`}
                                                    value={getArticleConfigValue(selectedArticle, 'ctaUrl')}
                                                    onChange={(e) => updateArticleConfig(selectedArticle, 'ctaUrl', e.target.value)}
                                                    className="text-sm border-zinc-200"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <Button 
                                                variant="link" 
                                                size="sm" 
                                                onClick={handleSaveConfig}
                                                className="text-zinc-600 hover:text-zinc-900 p-0 h-auto"
                                            >
                                                Save Configuration
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Content Customization */}
                                    <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-zinc-500" />
                                            Content Customization
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500">CTA Title</Label>
                                                <Input
                                                    placeholder="e.g. Curious about the science?"
                                                    value={selectedArticleData.ctaTitle || ''}
                                                    onChange={(e) => {
                                                        setArticles(articles.map(a =>
                                                            a.slug === selectedArticle ? { ...a, ctaTitle: e.target.value } : a
                                                        ));
                                                    }}
                                                    className="text-sm border-zinc-200"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500">CTA Button Text</Label>
                                                <Input
                                                    placeholder="e.g. Check Availability »"
                                                    value={selectedArticleData.ctaText || ''}
                                                    onChange={(e) => {
                                                        setArticles(articles.map(a =>
                                                            a.slug === selectedArticle ? { ...a, ctaText: e.target.value } : a
                                                        ));
                                                    }}
                                                    className="text-sm border-zinc-200"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500">CTA Subtext</Label>
                                                <Input
                                                    placeholder="e.g. Secure, verified link to official website."
                                                    value={selectedArticleData.ctaDescription || ''}
                                                    onChange={(e) => {
                                                        setArticles(articles.map(a =>
                                                            a.slug === selectedArticle ? { ...a, ctaDescription: e.target.value } : a
                                                        ));
                                                    }}
                                                    className="text-sm border-zinc-200"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <Button 
                                                onClick={() => handleSaveComments(
                                                    selectedArticle,
                                                    selectedArticleData.comments || [],
                                                    selectedArticleData.ctaText,
                                                    selectedArticleData.ctaTitle,
                                                    selectedArticleData.ctaDescription
                                                )}
                                                disabled={savingArticle}
                                                className="bg-zinc-900 hover:bg-zinc-800"
                                            >
                                                {savingArticle ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Save Content
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Danger Zone */}
                                    <div className="border border-red-100 bg-red-50/50 p-4 rounded-lg">
                                        <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                                            Danger Zone
                                        </h4>
                                        <p className="text-xs text-zinc-500 mb-3">
                                            Once you delete an article, there is no going back. Please be certain.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteArticle(selectedArticle)}
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Article
                                        </Button>
                                    </div>

                                    <Separator className="bg-zinc-100" />

                                    {/* Comments Manager */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-zinc-500" />
                                            Comments Manager
                                        </h3>
                                        <CommentEditor
                                            comments={selectedArticleData.comments || []}
                                            onChange={(newComments) => handleSaveComments(
                                                selectedArticle,
                                                newComments,
                                                selectedArticleData.ctaText,
                                                selectedArticleData.ctaTitle,
                                                selectedArticleData.ctaDescription
                                            )}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-20">
                                    <FileText className="h-12 w-12 mb-4 text-zinc-200" />
                                    <p className="text-sm">Select an article to edit</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
