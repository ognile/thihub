'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import {
    Plus,
    Settings,
    Pencil,
    Trash2,
    MessageSquare,
    Search,
    X,
    MoreHorizontal,
    Eye,
} from 'lucide-react';
import { CommentData } from '@/components/FBComments';
import GlobalSettingsSheet from '@/components/admin/GlobalSettingsSheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AdminPageHeader from '@/components/admin/ui/AdminPageHeader';
import AdminDataTableShell from '@/components/admin/ui/AdminDataTableShell';

interface Article {
    id: string;
    slug: string;
    title: string;
    ctaUrl?: string;
    ctaText?: string;
    ctaTitle?: string;
    ctaDescription?: string;
    comments?: CommentData[];
    created_at?: string;
}

export default function AdminDashboard() {
    const [isLoading, setIsLoading] = useState(true);
    const [articles, setArticles] = useState<Article[]>([]);
    const [isConfigSheetOpen, setIsConfigSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const articlesRes = await fetch('/api/articles');
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

    const handleDeleteArticle = async () => {
        if (!articleToDelete) return;

        try {
            const res = await fetch(`/api/articles/${articleToDelete}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Article deleted successfully');
                setArticles(articles.filter(a => a.slug !== articleToDelete));
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

    // Filter articles based on search query
    const filteredArticles = articles.filter(article => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            article.title.toLowerCase().includes(query) ||
            article.slug.toLowerCase().includes(query)
        );
    });

    if (isLoading) {
        return (
            <div className="space-y-6" data-admin-chrome="true">
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
        <div className="space-y-6" data-admin-chrome="true">
            <AdminPageHeader
                title="Dashboard"
                description="Manage your articles and settings"
                actions={
                    <>
                    <Button variant="outline" onClick={() => setIsConfigSheetOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </Button>
                    <Button asChild>
                        <Link href="/admin/create">
                            <Plus className="mr-2 h-4 w-4" />
                            New Article
                        </Link>
                    </Button>
                    </>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Articles</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground" />
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
                {/* Removed "Active Pixels" card as it's less relevant now that we have a central management */}
            </div>

            {/* Search and Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Articles</CardTitle>
                            <CardDescription>Manage your content</CardDescription>
                        </div>
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-9"
                            />
                            {searchQuery && (
                                <Button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    variant="ghost"
                                    size="icon-sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border-t">
                        <AdminDataTableShell minWidthClassName="min-w-[760px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Article Name</TableHead>
                                    <TableHead className="w-[20%]">Slug</TableHead>
                                    <TableHead className="w-[20%]">CTA URL</TableHead>
                                    <TableHead className="w-[10%] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredArticles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No articles found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredArticles.map((article) => (
                                        <TableRow key={article.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-[300px]" title={article.title}>
                                                        {article.title}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare className="h-3 w-3" />
                                                            {article.comments?.length || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                /{article.slug}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px] block" title={article.ctaUrl}>
                                                    {article.ctaUrl || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" asChild title="View Live" aria-label="View live article">
                                                        <Link href={`/articles/${article.slug}`} target="_blank">
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" asChild title="Edit" aria-label="Edit article">
                                                        <Link href={`/admin/articles/${article.slug}`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" aria-label="Open actions">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem className="text-destructive" onClick={() => {
                                                                setArticleToDelete(article.slug);
                                                                setIsDeleteDialogOpen(true);
                                                            }}>
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        </AdminDataTableShell>
                    </div>
                </CardContent>
            </Card>

            <GlobalSettingsSheet 
                open={isConfigSheetOpen} 
                onOpenChange={setIsConfigSheetOpen} 
            />

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
