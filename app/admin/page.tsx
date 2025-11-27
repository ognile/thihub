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
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    MoreHorizontal,
    X,
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
    created_at?: string;
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
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [savingConfig, setSavingConfig] = useState(false);
    const [savingArticle, setSavingArticle] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
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
                toast.success('Settings saved');
                setSettingsOpen(false);
            } else {
                toast.error('Failed to save settings');
            }
        } catch (e) {
            toast.error('Failed to save settings');
        } finally {
            setSavingConfig(false);
        }
    };

    const handleSaveArticle = async () => {
        if (!selectedArticle) return;
        setSavingArticle(true);
        try {
            const res = await fetch('/api/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: selectedArticle.slug,
                    comments: selectedArticle.comments,
                    ctaText: selectedArticle.ctaText,
                    ctaTitle: selectedArticle.ctaTitle,
                    ctaDescription: selectedArticle.ctaDescription
                }),
            });

            if (res.ok) {
                toast.success('Article saved');
                setArticles(articles.map(a => 
                    a.slug === selectedArticle.slug ? selectedArticle : a
                ));
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || 'Failed to save article');
            }
        } catch (e) {
            toast.error('Failed to save article');
        } finally {
            setSavingArticle(false);
        }
    };

    const handleDeleteArticle = async () => {
        if (!articleToDelete) return;
        setDeleting(true);
        
        try {
            const res = await fetch(`/api/articles?slug=${articleToDelete}`, { 
                method: 'DELETE' 
            });

            if (res.ok) {
                toast.success('Article deleted');
                setArticles(articles.filter(a => a.slug !== articleToDelete));
                if (selectedArticle?.slug === articleToDelete) {
                    setSelectedArticle(null);
                    setSheetOpen(false);
                }
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || 'Failed to delete article');
            }
        } catch (e) {
            toast.error('Failed to delete article');
        } finally {
            setDeleting(false);
            setDeleteDialogOpen(false);
            setArticleToDelete(null);
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

    const openArticlePanel = (article: Article) => {
        setSelectedArticle({ ...article });
        setSheetOpen(true);
    };

    const confirmDelete = (slug: string) => {
        setArticleToDelete(slug);
        setDeleteDialogOpen(true);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-10" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                <Skeleton className="h-10 w-64" />
                <div className="border rounded-lg">
                    <div className="p-4 border-b">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-4 border-b">
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                        <h1 className="text-2xl font-semibold text-zinc-900">Articles</h1>
                        <p className="text-sm text-zinc-500 mt-1">{articles.length} total articles</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Settings Button */}
                        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="border-zinc-200">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Global Settings</DialogTitle>
                                    <DialogDescription>
                                        Default tracking and CTA settings for all articles
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="defaultPixelId">Default Pixel ID</Label>
                                        <Input
                                            id="defaultPixelId"
                                value={config?.defaultPixelId || ''}
                                onChange={(e) => updateGlobalConfig('defaultPixelId', e.target.value)}
                                            placeholder="Enter Facebook Pixel ID"
                            />
                        </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="defaultCtaUrl">Default CTA URL</Label>
                                        <Input
                                            id="defaultCtaUrl"
                                value={config?.defaultCtaUrl || ''}
                                onChange={(e) => updateGlobalConfig('defaultCtaUrl', e.target.value)}
                                            placeholder="https://..."
                            />
                        </div>
                    </div>
                                <DialogFooter>
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
                                                Save Settings
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        
                        {/* Create Article Button */}
                        <Button asChild className="bg-zinc-900 hover:bg-zinc-800">
                            <Link href="/admin/create">
                                <Plus className="h-4 w-4 mr-2" />
                                New Article
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search by title or slug..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 border-zinc-200"
                    />
                    </div>

                {/* Table */}
                <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                                <TableHead className="font-semibold text-zinc-700 w-[50%]">Title</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-[25%]">Slug</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-[10%] text-center">Comments</TableHead>
                                <TableHead className="font-semibold text-zinc-700 w-[15%] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredArticles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-zinc-400">
                                        {searchQuery ? 'No articles match your search' : 'No articles yet'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredArticles.map((article) => (
                                    <TableRow 
                                        key={article.slug}
                                        className="cursor-pointer hover:bg-zinc-50 transition-colors"
                                        onClick={() => openArticlePanel(article)}
                                    >
                                        <TableCell className="truncate">
                                            <span className="font-medium text-zinc-900">
                                                {article.title}
                                            </span>
                                        </TableCell>
                                        <TableCell className="truncate">
                                            <span className="text-zinc-500 text-sm font-mono truncate block">
                                                /{article.slug}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 hover:bg-zinc-100">
                                                {article.comments?.length || 0}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
                                                    asChild
                                                >
                                                    <a href={`/articles/${article.slug}`} target="_blank">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
                                                    asChild
                                                >
                                                    <Link href={`/admin/articles/${article.slug}`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-red-600"
                                                    onClick={() => confirmDelete(article.slug)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                        </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                            </div>
                        </div>

            {/* Article Config Slide Panel */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto px-6 sm:px-8">
                    {selectedArticle && (
                        <>
                            <SheetHeader className="mb-8">
                                <SheetTitle className="text-xl font-semibold line-clamp-2 pr-8">
                                    {selectedArticle.title}
                                </SheetTitle>
                                <SheetDescription className="font-mono text-xs text-zinc-400 truncate">
                                    /{selectedArticle.slug}
                                </SheetDescription>
                            </SheetHeader>

                                <div className="space-y-8">
                                {/* Quick Actions */}
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" asChild className="flex-1">
                                        <a href={`/articles/${selectedArticle.slug}`} target="_blank">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            View Live
                                        </a>
                                    </Button>
                                    <Button size="sm" asChild className="flex-1 bg-zinc-900 hover:bg-zinc-800">
                                        <Link href={`/admin/articles/${selectedArticle.slug}`}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Visual Editor
                                        </Link>
                                    </Button>
                                </div>

                                <Separator />

                                {/* Two column layout for tracking and CTA */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                                    {/* Tracking Override */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                                            <Settings className="h-4 w-4 text-zinc-500" />
                                            Tracking Override
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-500">Pixel ID</Label>
                                                <Input
                                                    placeholder={`Default: ${config?.defaultPixelId || 'Not set'}`}
                                                    value={getArticleConfigValue(selectedArticle.slug, 'pixelId')}
                                                    onChange={(e) => updateArticleConfig(selectedArticle.slug, 'pixelId', e.target.value)}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-500">CTA URL</Label>
                                                <Input
                                                    placeholder={`Default: ${config?.defaultCtaUrl || 'Not set'}`}
                                                    value={getArticleConfigValue(selectedArticle.slug, 'ctaUrl')}
                                                    onChange={(e) => updateArticleConfig(selectedArticle.slug, 'ctaUrl', e.target.value)}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSaveConfig}
                                                disabled={savingConfig}
                                                className="w-full"
                                            >
                                                {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Tracking Config'}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* CTA Content */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-zinc-500" />
                                            CTA Content
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-500">Title</Label>
                                                <Input
                                                    placeholder="e.g. Curious about the science?"
                                                    value={selectedArticle.ctaTitle || ''}
                                                    onChange={(e) => setSelectedArticle({ ...selectedArticle, ctaTitle: e.target.value })}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-500">Button Text</Label>
                                                <Input
                                                    placeholder="e.g. Check Availability »"
                                                    value={selectedArticle.ctaText || ''}
                                                    onChange={(e) => setSelectedArticle({ ...selectedArticle, ctaText: e.target.value })}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-zinc-500">Subtext</Label>
                                                <Input
                                                    placeholder="e.g. Secure, verified link..."
                                                    value={selectedArticle.ctaDescription || ''}
                                                    onChange={(e) => setSelectedArticle({ ...selectedArticle, ctaDescription: e.target.value })}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Comments Manager */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-zinc-500" />
                                        Comments ({selectedArticle.comments?.length || 0})
                                        </h3>
                                        <CommentEditor
                                        comments={selectedArticle.comments || []}
                                        onChange={(newComments) => setSelectedArticle({ ...selectedArticle, comments: newComments })}
                                        />
                                    </div>

                                <Separator />

                                {/* Save Button */}
                                <Button
                                    onClick={handleSaveArticle}
                                    disabled={savingArticle}
                                    className="w-full bg-zinc-900 hover:bg-zinc-800"
                                >
                                    {savingArticle ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Article
                                        </>
                                    )}
                                </Button>

                                {/* Danger Zone */}
                                <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                                        Danger Zone
                                    </h4>
                                    <p className="text-xs text-zinc-500 mb-3">
                                        Permanently delete this article. This cannot be undone.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => confirmDelete(selectedArticle.slug)}
                                        className="border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Article
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Article</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong className="text-zinc-900">/{articleToDelete}</strong>? 
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteArticle}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
