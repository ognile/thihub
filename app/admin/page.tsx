'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    FileText,
    Plus,
    Settings,
    ExternalLink,
    Pencil,
    Trash2,
    MessageSquare,
    Save,
    BarChart3,
    Search,
    X,
} from 'lucide-react';
import CommentEditor from '@/components/admin/CommentEditor';
import { CommentData } from '@/components/FBComments';

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
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<Config | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter articles based on search query
    const filteredArticles = articles.filter(article => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            article.title.toLowerCase().includes(query) ||
            article.slug.toLowerCase().includes(query)
        );
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [configRes, articlesRes] = await Promise.all([
                fetch('/api/config'),
                fetch('/api/articles')
            ]);

            if (configRes.ok) {
                const data = await configRes.json();
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

            if (articlesRes.ok) {
                const data = await articlesRes.json();
                setArticles(data);
            }
        } catch (e) {
            console.error('Failed to fetch data', e);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!config) return;
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                toast.success('Configuration saved successfully');
                setIsConfigDialogOpen(false);
            } else {
                toast.error('Failed to save configuration');
            }
        } catch {
            toast.error('Failed to save configuration');
        }
    };

    const handleSaveArticle = async (article: Article) => {
        try {
            const res = await fetch('/api/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: article.slug,
                    comments: article.comments,
                    ctaText: article.ctaText,
                    ctaTitle: article.ctaTitle,
                    ctaDescription: article.ctaDescription
                }),
            });

            if (res.ok) {
                toast.success('Article saved successfully');
                setArticles(articles.map(a => a.slug === article.slug ? article : a));
            } else {
                toast.error('Failed to save article');
            }
        } catch {
            toast.error('Failed to save article');
        }
    };

    const handleDeleteArticle = async () => {
        if (!articleToDelete) return;

        try {
            const res = await fetch(`/api/articles?slug=${articleToDelete}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Article deleted successfully');
                setArticles(articles.filter(a => a.slug !== articleToDelete));
                if (selectedArticle?.slug === articleToDelete) {
                    setSelectedArticle(null);
                }
            } else {
                toast.error('Failed to delete article');
            }
        } catch {
            toast.error('Failed to delete article');
        } finally {
            setIsDeleteDialogOpen(false);
            setArticleToDelete(null);
        }
    };

    const updateGlobalConfig = (key: 'defaultPixelId' | 'defaultCtaUrl', value: string) => {
        if (config) {
            setConfig({ ...config, [key]: value });
        }
    };

    const getArticleConfigValue = (slug: string, key: 'pixelId' | 'ctaUrl') => {
        const articleConfig = config?.articles?.[slug];
        if (!articleConfig) return '';
        if (typeof articleConfig === 'string') return key === 'pixelId' ? articleConfig : '';
        return articleConfig[key] || '';
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

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Manage your articles and settings</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" onClick={() => setIsConfigDialogOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </Button>
                    <Button asChild>
                        <Link href="/admin/create">
                            <Plus className="mr-2 h-4 w-4" />
                            New Article
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Articles</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{articles.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Comments</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {articles.reduce((acc, a) => acc + (a.comments?.length || 0), 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Pixels</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set([config?.defaultPixelId, ...Object.values(config?.articles || {}).map(a => typeof a === 'string' ? a : a.pixelId)].filter(Boolean)).size}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Articles Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Article List */}
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                        <CardTitle>Articles</CardTitle>
                        <CardDescription>Select an article to edit</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Search Input */}
                        <div className="px-4 pb-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search articles..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-9"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <ScrollArea className="h-[450px]">
                            <div className="px-4 pb-4 space-y-1">
                                {filteredArticles.map(article => (
                                    <div
                                        key={article.slug}
                                        onClick={() => setSelectedArticle(article)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedArticle?.slug === article.slug
                                            ? 'bg-accent border-primary/20'
                                            : 'hover:bg-accent/50 border-transparent'
                                            }`}
                                    >
                                        <p className="font-medium text-sm line-clamp-2 leading-snug">{article.title}</p>
                                        <div className="flex items-center justify-between gap-2 mt-2">
                                            <span className="text-xs text-muted-foreground truncate">/{article.slug}</span>
                                            <Badge variant="secondary" className="text-[10px] shrink-0">
                                                {article.comments?.length || 0}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {filteredArticles.length === 0 && searchQuery && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No articles match "{searchQuery}"</p>
                                        <button 
                                            onClick={() => setSearchQuery('')}
                                            className="text-xs text-primary hover:underline mt-1"
                                        >
                                            Clear search
                                        </button>
                                    </div>
                                )}
                                {articles.length === 0 && !searchQuery && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No articles yet</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Article Editor */}
                <Card className="lg:col-span-2">
                    {selectedArticle ? (
                        <>
                            <CardHeader className="pb-4">
                                <div className="flex gap-2 mb-3">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/articles/${selectedArticle.slug}`} target="_blank">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View
                                        </Link>
                                    </Button>
                                    <Button size="sm" asChild>
                                        <Link href={`/admin/articles/${selectedArticle.slug}`}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit
                                        </Link>
                                    </Button>
                                </div>
                                <CardTitle className="text-base leading-tight">{selectedArticle.title}</CardTitle>
                                <CardDescription>/{selectedArticle.slug}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Tracking Config */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4" />
                                        Tracking Configuration
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Pixel ID Override</Label>
                                            <Input
                                                placeholder={config?.defaultPixelId || 'Use default'}
                                                value={getArticleConfigValue(selectedArticle.slug, 'pixelId')}
                                                onChange={(e) => updateArticleConfig(selectedArticle.slug, 'pixelId', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">CTA URL Override</Label>
                                            <Input
                                                placeholder={config?.defaultCtaUrl || 'Use default'}
                                                value={getArticleConfigValue(selectedArticle.slug, 'ctaUrl')}
                                                onChange={(e) => updateArticleConfig(selectedArticle.slug, 'ctaUrl', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={handleSaveConfig}>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Tracking Config
                                    </Button>
                                </div>

                                <Separator />

                                {/* CTA Customization */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">CTA Customization</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs">CTA Title</Label>
                                            <Input
                                                placeholder="Curious about the science?"
                                                value={selectedArticle.ctaTitle || ''}
                                                onChange={(e) => setSelectedArticle({ ...selectedArticle, ctaTitle: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">CTA Button Text</Label>
                                            <Input
                                                placeholder="Check Availability »"
                                                value={selectedArticle.ctaText || ''}
                                                onChange={(e) => setSelectedArticle({ ...selectedArticle, ctaText: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">CTA Subtext</Label>
                                            <Input
                                                placeholder="Secure, verified link..."
                                                value={selectedArticle.ctaDescription || ''}
                                                onChange={(e) => setSelectedArticle({ ...selectedArticle, ctaDescription: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => handleSaveArticle(selectedArticle)}>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save CTA Settings
                                    </Button>
                                </div>

                                <Separator />

                                {/* Danger Zone */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
                                    <p className="text-xs text-muted-foreground">Once deleted, this article cannot be recovered.</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                            setArticleToDelete(selectedArticle.slug);
                                            setIsDeleteDialogOpen(true);
                                        }}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Article
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                            <FileText className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-sm">Select an article to edit</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Comments Section - Below */}
            {selectedArticle && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Comments Manager
                        </CardTitle>
                        <CardDescription>Manage Facebook-style comments for this article</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CommentEditor
                            comments={selectedArticle.comments || []}
                            onChange={(newComments) => {
                                const updated = { ...selectedArticle, comments: newComments };
                                setSelectedArticle(updated);
                                handleSaveArticle(updated);
                            }}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Global Settings Dialog */}
            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Global Settings</DialogTitle>
                        <DialogDescription>
                            Configure default tracking and CTA settings for all articles.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Default Pixel ID</Label>
                            <Input
                                value={config?.defaultPixelId || ''}
                                onChange={(e) => updateGlobalConfig('defaultPixelId', e.target.value)}
                                placeholder="123456789"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Default CTA URL</Label>
                            <Input
                                value={config?.defaultCtaUrl || ''}
                                onChange={(e) => updateGlobalConfig('defaultCtaUrl', e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveConfig}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Article</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this article? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteArticle}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
