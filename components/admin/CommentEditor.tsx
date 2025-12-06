'use client';

import React, { useState, useEffect } from 'react';
import { CommentData } from '@/components/FBComments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Sparkles, Check, X, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentEditorProps {
    comments: CommentData[];
    onChange: (comments: CommentData[]) => void;
}

const MOCK_PROFILES = [
    { name: 'Sarah Jenkins', avatar: 'https://picsum.photos/seed/sarah/100' },
    { name: 'Michael Ross', avatar: 'https://picsum.photos/seed/mike/100' },
    { name: 'Jennifer Wu', avatar: 'https://picsum.photos/seed/jen/100' },
    { name: 'David Miller', avatar: 'https://picsum.photos/seed/dave/100' },
    { name: 'Emily Chen', avatar: 'https://picsum.photos/seed/emily/100' },
    { name: 'James Wilson', avatar: 'https://picsum.photos/seed/james/100' },
    { name: 'Jessica Taylor', avatar: 'https://picsum.photos/seed/jess/100' },
    { name: 'Daniel Anderson', avatar: 'https://picsum.photos/seed/dan/100' },
];

export default function CommentEditor({ comments, onChange }: CommentEditorProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<CommentData | null>(null);

    useEffect(() => {
        if (editingId) {
            const comment = comments.find(c => c.id === editingId);
            if (comment) setEditForm(comment);
        } else {
            setEditForm(null);
        }
    }, [editingId, comments]);

    const handleAdd = () => {
        const newId = `c${Date.now()}`;
        const randomProfile = MOCK_PROFILES[Math.floor(Math.random() * MOCK_PROFILES.length)];
        const newComment: CommentData = {
            id: newId,
            author: randomProfile.name,
            avatar: randomProfile.avatar,
            content: 'This is a new comment. Click to edit.',
            time: '1h',
            likes: Math.floor(Math.random() * 50),
            hasReplies: false,
            isLiked: false
        };
        onChange([...comments, newComment]);
        setEditingId(newId);
    };

    const handleDelete = (id: string) => {
        onChange(comments.filter(c => c.id !== id));
        if (editingId === id) setEditingId(null);
    };

    const handleSave = () => {
        if (editForm) {
            onChange(comments.map(c => c.id === editForm.id ? editForm : c));
            setEditingId(null);
        }
    };

    const handleMagicProfile = () => {
        if (!editForm) return;
        const randomProfile = MOCK_PROFILES[Math.floor(Math.random() * MOCK_PROFILES.length)];
        setEditForm({
            ...editForm,
            author: randomProfile.name,
            avatar: randomProfile.avatar
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comment List / Editor */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">
                        {comments.length} comment{comments.length !== 1 ? 's' : ''}
                    </h4>
                    <Button size="sm" onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Comment
                    </Button>
                </div>

                {editingId && editForm ? (
                    <Card className="border-primary">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">Edit Comment</h4>
                                <Button size="sm" variant="ghost" onClick={handleMagicProfile}>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Random Profile
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Author Name</Label>
                                    <Input
                                        value={editForm.author}
                                        onChange={e => setEditForm({ ...editForm, author: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Avatar URL</Label>
                                    <Input
                                        value={editForm.avatar}
                                        onChange={e => setEditForm({ ...editForm, avatar: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Content</Label>
                                <Textarea
                                    value={editForm.content}
                                    onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Time</Label>
                                    <Input
                                        value={editForm.time}
                                        onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Likes</Label>
                                    <Input
                                        type="number"
                                        value={editForm.likes}
                                        onChange={e => setEditForm({ ...editForm, likes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Status</Label>
                                    <Button
                                        variant={editForm.isLiked ? "default" : "outline"}
                                        size="sm"
                                        className="w-full"
                                        onClick={() => setEditForm({ ...editForm, isLiked: !editForm.isLiked })}
                                    >
                                        <ThumbsUp className="h-4 w-4 mr-1" />
                                        {editForm.isLiked ? 'Liked' : 'Not Liked'}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button onClick={handleSave} className="flex-1">
                                    <Check className="h-4 w-4 mr-1" />
                                    Save
                                </Button>
                                <Button variant="outline" onClick={() => setEditingId(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-2">
                            {comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    onClick={() => setEditingId(comment.id)}
                                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={comment.avatar} alt={comment.author} />
                                        <AvatarFallback>{comment.author[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{comment.author}</div>
                                        <div className="text-xs text-muted-foreground truncate">{comment.content}</div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">No comments yet. Click "Add Comment" to start.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </div>

            {/* Live Preview */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h4 className="text-sm font-medium text-muted-foreground">Live Preview</h4>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <h3 className="font-bold text-foreground mb-4">Comments</h3>
                        <div className="space-y-4">
                            {(editingId && editForm ? [editForm] : comments).map(comment => (
                                <PreviewComment key={comment.id} {...comment} />
                            ))}
                            {comments.length === 0 && !editForm && (
                                <p className="text-sm text-muted-foreground italic">No comments to preview</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function PreviewComment({ author, avatar, content, time, likes, isLiked }: CommentData) {
    return (
        <div className="flex gap-2">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarImage src={avatar} alt={author} />
                <AvatarFallback>{author[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="bg-muted rounded-2xl px-3 py-2 inline-block relative">
                    <div className="font-semibold text-[13px] leading-snug">{author}</div>
                    <p className="text-[15px] leading-snug">{content}</p>
                    {likes > 0 && (
                        <div className="absolute -bottom-2 right-1 bg-background rounded-full shadow-md px-1.5 py-0.5 flex items-center gap-1 border">
                            <div className="bg-blue-500 rounded-full p-[3px]">
                                <ThumbsUp className="h-2 w-2 text-white" fill="white" />
                            </div>
                            <span className="text-[11px] text-muted-foreground">{likes}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1 ml-3">
                    <span className={cn("text-[12px] font-semibold cursor-pointer", isLiked ? "text-blue-500" : "text-muted-foreground")}>
                        Like
                    </span>
                    <span className="text-[12px] font-semibold text-muted-foreground cursor-pointer">Reply</span>
                    <span className="text-[12px] text-muted-foreground">{time}</span>
                </div>
            </div>
        </div>
    );
}
