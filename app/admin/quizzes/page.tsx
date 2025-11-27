'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    MoreVertical,
    ExternalLink,
    Pencil,
    Trash2,
    Copy,
    BarChart3,
    ListChecks,
    Users,
    Layers,
} from 'lucide-react';

interface Quiz {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: 'draft' | 'published' | 'archived';
    slideCount: number;
    responseCount: number;
    created_at: string;
    updated_at: string;
}

export default function QuizDashboard() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
    const [newQuizName, setNewQuizName] = useState('');
    const [newQuizSlug, setNewQuizSlug] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const res = await fetch('/api/quizzes');
            if (res.ok) {
                const data = await res.json();
                setQuizzes(data);
            }
        } catch (e) {
            console.error('Failed to fetch quizzes:', e);
            toast.error('Failed to load quizzes');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateQuiz = async () => {
        if (!newQuizName.trim() || !newQuizSlug.trim()) {
            toast.error('Name and slug are required');
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch('/api/quizzes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newQuizName,
                    slug: newQuizSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                }),
            });

            if (res.ok) {
                const quiz = await res.json();
                toast.success('Quiz created!');
                router.push(`/admin/quizzes/${quiz.id}`);
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to create quiz');
            }
        } catch (e) {
            toast.error('Failed to create quiz');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteQuiz = async () => {
        if (!quizToDelete) return;

        try {
            const res = await fetch(`/api/quizzes/${quizToDelete.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Quiz deleted');
                setQuizzes(quizzes.filter(q => q.id !== quizToDelete.id));
            } else {
                toast.error('Failed to delete quiz');
            }
        } catch (e) {
            toast.error('Failed to delete quiz');
        } finally {
            setIsDeleteDialogOpen(false);
            setQuizToDelete(null);
        }
    };

    const handleDuplicateQuiz = async (quiz: Quiz) => {
        try {
            // Fetch the full quiz with slides
            const res = await fetch(`/api/quizzes/${quiz.id}`);
            if (!res.ok) throw new Error('Failed to fetch quiz');
            const fullQuiz = await res.json();

            // Create a new quiz with duplicated slides
            const createRes = await fetch('/api/quizzes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${quiz.name} (Copy)`,
                    slug: `${quiz.slug}-copy-${Date.now()}`,
                }),
            });

            if (createRes.ok) {
                const newQuiz = await createRes.json();
                
                // Update with the slides
                if (fullQuiz.slides?.length > 0) {
                    await fetch(`/api/quizzes/${newQuiz.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slides: fullQuiz.slides }),
                    });
                }

                toast.success('Quiz duplicated!');
                fetchQuizzes();
            }
        } catch (e) {
            toast.error('Failed to duplicate quiz');
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'draft':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'archived':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Quiz Funnels</h1>
                    <p className="text-muted-foreground">Create and manage your quiz funnels</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Quiz
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Quizzes</CardTitle>
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{quizzes.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Responses</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {quizzes.reduce((acc, q) => acc + (q.responseCount || 0), 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {quizzes.filter(q => q.status === 'published').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quiz Grid */}
            {quizzes.length === 0 ? (
                <Card className="py-16">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <ListChecks className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
                        <p className="text-muted-foreground mb-4 max-w-sm">
                            Create your first quiz funnel to start capturing leads and engaging your audience.
                        </p>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Quiz
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map(quiz => (
                        <Card key={quiz.id} className="group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 min-w-0 flex-1 pr-2">
                                        <CardTitle className="text-base truncate">{quiz.name}</CardTitle>
                                        <CardDescription className="truncate">/{quiz.slug}</CardDescription>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/quizzes/${quiz.id}`}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </Link>
                                            </DropdownMenuItem>
                                            {quiz.status === 'published' && (
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/quiz/${quiz.slug}`} target="_blank">
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        View Live
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => handleDuplicateQuiz(quiz)}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                onClick={() => {
                                                    setQuizToDelete(quiz);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 mb-4">
                                    <Badge variant="outline" className={getStatusColor(quiz.status)}>
                                        {quiz.status}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Slides</span>
                                        <p className="font-medium">{quiz.slideCount || 0}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Responses</span>
                                        <p className="font-medium">{quiz.responseCount || 0}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t flex gap-2">
                                    <Button asChild variant="outline" size="sm" className="flex-1">
                                        <Link href={`/admin/quizzes/${quiz.id}`}>
                                            <Pencil className="mr-2 h-3 w-3" />
                                            Edit
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" size="sm" className="flex-1">
                                        <Link href={`/admin/quizzes/${quiz.id}/analytics`}>
                                            <BarChart3 className="mr-2 h-3 w-3" />
                                            Analytics
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Quiz Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Quiz</DialogTitle>
                        <DialogDescription>
                            Give your quiz a name and URL slug. You can change these later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Quiz Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Biofilm Reset Assessment"
                                value={newQuizName}
                                onChange={(e) => {
                                    setNewQuizName(e.target.value);
                                    setNewQuizSlug(generateSlug(e.target.value));
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">URL Slug</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">/quiz/</span>
                                <Input
                                    id="slug"
                                    placeholder="biofilm-reset"
                                    value={newQuizSlug}
                                    onChange={(e) => setNewQuizSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateQuiz} disabled={isCreating}>
                            {isCreating ? 'Creating...' : 'Create Quiz'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Quiz</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{quizToDelete?.name}"? This action cannot be undone and will delete all slides and responses.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteQuiz}>
                            Delete Quiz
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

