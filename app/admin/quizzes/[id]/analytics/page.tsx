'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Users,
    CheckCircle,
    Clock,
    TrendingDown,
    Download,
    RefreshCw,
    ChevronRight,
    BarChart3,
    Eye,
} from 'lucide-react';

interface Quiz {
    id: string;
    name: string;
    slug: string;
    slides: { id: string; type: string; content: { headline?: string } }[];
}

interface Response {
    id: string;
    session_id: string;
    answers: { slideId: string; selectedOptions: string[]; timestamp: number }[];
    current_slide: number;
    started_at: string;
    completed_at: string | null;
    user_agent: string | null;
}

export default function QuizAnalytics({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [responses, setResponses] = useState<Response[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [quizRes, responsesRes] = await Promise.all([
                fetch(`/api/quizzes/${id}`),
                fetch(`/api/quizzes/${id}/responses`),
            ]);

            if (quizRes.ok) {
                const quizData = await quizRes.json();
                setQuiz(quizData);
            }

            if (responsesRes.ok) {
                const responsesData = await responsesRes.json();
                setResponses(responsesData);
            }
        } catch (e) {
            toast.error('Failed to load analytics');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
    };

    const handleExportCSV = () => {
        if (!quiz || responses.length === 0) return;

        // Build CSV header
        const headers = ['Session ID', 'Started At', 'Completed At', 'Status'];
        quiz.slides.forEach((slide, i) => {
            headers.push(`Slide ${i + 1}: ${slide.content.headline || slide.type}`);
        });

        // Build CSV rows
        const rows = responses.map(response => {
            const row = [
                response.session_id,
                new Date(response.started_at).toLocaleString(),
                response.completed_at ? new Date(response.completed_at).toLocaleString() : 'Not completed',
                response.completed_at ? 'Completed' : 'In Progress',
            ];

            quiz.slides.forEach(slide => {
                const answer = response.answers.find(a => a.slideId === slide.id);
                row.push(answer ? answer.selectedOptions.join(', ') : '-');
            });

            return row;
        });

        // Convert to CSV
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quiz.slug}-responses-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Calculate stats
    const totalResponses = responses.length;
    const completedResponses = responses.filter(r => r.completed_at).length;
    const completionRate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;
    const avgTimeToComplete = completedResponses > 0
        ? Math.round(
            responses
                .filter(r => r.completed_at)
                .reduce((sum, r) => {
                    const start = new Date(r.started_at).getTime();
                    const end = new Date(r.completed_at!).getTime();
                    return sum + (end - start);
                }, 0) / completedResponses / 1000 / 60
        )
        : 0;

    // Calculate funnel data
    const funnelData = quiz?.slides.map((slide, index) => {
        const reachedCount = responses.filter(r => 
            r.answers.some(a => a.slideId === slide.id) || r.current_slide >= index
        ).length;
        const dropOffCount = index === 0 
            ? totalResponses - reachedCount
            : (quiz?.slides[index - 1] 
                ? responses.filter(r => r.answers.some(a => a.slideId === quiz.slides[index - 1].id)).length 
                : totalResponses) - reachedCount;
        const dropOffRate = totalResponses > 0 ? Math.round((dropOffCount / totalResponses) * 100) : 0;
        
        return {
            slide,
            slideIndex: index,
            reached: reachedCount,
            dropOff: dropOffCount,
            dropOffRate,
            percentage: totalResponses > 0 ? Math.round((reachedCount / totalResponses) * 100) : 0,
        };
    }) || [];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Quiz not found</p>
                <Button asChild className="mt-4">
                    <Link href="/admin/quizzes">Back to Quizzes</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/quizzes/${id}`} className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{quiz.name}</h1>
                        <p className="text-muted-foreground">Analytics & Responses</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExportCSV} disabled={responses.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Responses</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalResponses}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedResponses}</div>
                        <p className="text-xs text-muted-foreground">{completionRate}% completion rate</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgTimeToComplete}m</div>
                        <p className="text-xs text-muted-foreground">to complete</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Drop-off Rate</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{100 - completionRate}%</div>
                        <p className="text-xs text-muted-foreground">did not complete</p>
                    </CardContent>
                </Card>
            </div>

            {/* Funnel Visualization */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Funnel Analysis
                    </CardTitle>
                    <CardDescription>See where users drop off in your quiz</CardDescription>
                </CardHeader>
                <CardContent>
                    {funnelData.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No data yet</p>
                    ) : (
                        <div className="space-y-4">
                            {funnelData.map((item, index) => (
                                <div key={item.slide.id} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground w-6">{index + 1}.</span>
                                            <span className="font-medium truncate max-w-[300px]">
                                                {item.slide.content.headline || item.slide.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-muted-foreground">
                                                {item.reached} reached
                                            </span>
                                            {item.dropOff > 0 && (
                                                <Badge variant="outline" className="text-red-600 border-red-200">
                                                    -{item.dropOff} ({item.dropOffRate}%)
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                                        <div
                                            className="absolute inset-y-0 left-0 bg-primary/80 rounded-lg transition-all duration-500"
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                                            {item.percentage}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Responses */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Recent Responses
                    </CardTitle>
                    <CardDescription>Individual response details</CardDescription>
                </CardHeader>
                <CardContent>
                    {responses.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No responses yet</p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Session</TableHead>
                                        <TableHead>Started</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {responses.slice(0, 20).map((response) => {
                                        const progress = Math.round(
                                            (response.answers.length / quiz.slides.length) * 100
                                        );
                                        return (
                                            <TableRow key={response.id}>
                                                <TableCell className="font-mono text-xs">
                                                    {response.session_id.slice(0, 12)}...
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(response.started_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary rounded-full"
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {progress}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={response.completed_at ? 'default' : 'secondary'}>
                                                        {response.completed_at ? 'Completed' : 'In Progress'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm">
                                                        View
                                                        <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

