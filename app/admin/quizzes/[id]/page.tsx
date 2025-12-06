'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ArrowLeft,
    Save,
    Eye,
    Settings,
    Plus,
    Trash2,
    GripVertical,
    Copy,
    MoreVertical,
    Loader2,
    Smartphone,
    Monitor,
    ChevronUp,
    ChevronDown,
    Image as ImageIcon,
    Type,
    CheckSquare,
    FileText,
    Loader,
    Award,
    ShoppingCart,
    Upload,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Types
interface SlideOption {
    id: string;
    text: string;
    imageUrl?: string;
    nextSlide?: string | 'next' | 'end';
}

interface SlideContent {
    headline?: string;
    subheadline?: string;
    body?: string;
    imageUrl?: string;
    videoUrl?: string;
    buttonText?: string;
    options?: SlideOption[];
    items?: { text: string; duration?: number }[];
    summaryTemplate?: string;
    dynamicFields?: string[];
    bullets?: string[];
    offerText?: string;
    ctaText?: string;
    ctaUrl?: string;
    guaranteeText?: string;
}

interface Slide {
    id: string;
    type: 'text-choice' | 'image-choice' | 'multi-select' | 'info' | 'loading' | 'results' | 'offer';
    content: SlideContent;
    conditionalLogic?: { showIf?: { slideId: string; optionId: string } } | null;
}

interface Quiz {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: 'draft' | 'published' | 'archived';
    settings: {
        primaryColor: string;
        backgroundColor: string;
        showProgressBar: boolean;
        allowBack: boolean;
    };
    slides: Slide[];
}

const SLIDE_TYPES = [
    { value: 'text-choice', label: 'Text Choice', icon: Type, description: 'Multiple choice with text options' },
    { value: 'image-choice', label: 'Image Choice', icon: ImageIcon, description: 'Options with images' },
    { value: 'multi-select', label: 'Multi Select', icon: CheckSquare, description: 'Select multiple options' },
    { value: 'info', label: 'Info / Story', icon: FileText, description: 'Educational content slide' },
    { value: 'loading', label: 'Loading', icon: Loader, description: 'Animated analysis screen' },
    { value: 'results', label: 'Results', icon: Award, description: 'Dynamic results page' },
    { value: 'offer', label: 'Offer / CTA', icon: ShoppingCart, description: 'Final offer slide' },
];

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

function getDefaultContent(type: string): SlideContent {
    switch (type) {
        case 'text-choice':
        case 'image-choice':
            return {
                headline: 'Your question here?',
                subheadline: '',
                options: [
                    { id: generateId(), text: 'Option 1' },
                    { id: generateId(), text: 'Option 2' },
                    { id: generateId(), text: 'Option 3' },
                ],
            };
        case 'multi-select':
            return {
                headline: 'Select all that apply',
                subheadline: '',
                options: [
                    { id: generateId(), text: 'Option 1' },
                    { id: generateId(), text: 'Option 2' },
                    { id: generateId(), text: 'Option 3' },
                ],
                buttonText: 'Continue',
            };
        case 'info':
            return {
                headline: 'Important Information',
                body: 'Add your story or educational content here...',
                imageUrl: '',
                buttonText: 'Continue',
            };
        case 'loading':
            return {
                headline: 'Analyzing your answers...',
                items: [
                    { text: 'Processing responses...', duration: 2000 },
                    { text: 'Calculating results...', duration: 2000 },
                    { text: 'Preparing your report...', duration: 2000 },
                ],
            };
        case 'results':
            return {
                headline: 'Your Results',
                body: 'Based on your answers, here is what we found...',
                summaryTemplate: '',
                dynamicFields: [],
            };
        case 'offer':
            return {
                headline: 'Special Offer Just For You',
                bullets: ['Benefit 1', 'Benefit 2', 'Benefit 3'],
                offerText: 'Get 50% OFF today only!',
                ctaText: 'Claim Your Discount',
                ctaUrl: '',
                guaranteeText: '90-day money-back guarantee',
            };
        default:
            return { headline: '' };
    }
}

export default function QuizBuilder({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAddSlideOpen, setIsAddSlideOpen] = useState(false);

    useEffect(() => {
        fetchQuiz();
    }, [id]);

    const fetchQuiz = async () => {
        try {
            const res = await fetch(`/api/quizzes/${id}`);
            if (res.ok) {
                const data = await res.json();
                // Transform slides to include id if missing
                const slides = (data.slides || []).map((s: any, i: number) => ({
                    id: s.id || generateId(),
                    type: s.type,
                    content: s.content,
                    conditionalLogic: s.conditional_logic || null,
                }));
                setQuiz({ ...data, slides });
            } else if (res.status === 404) {
                toast.error('Quiz not found');
                router.push('/admin/quizzes');
            }
        } catch (e) {
            toast.error('Failed to load quiz');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!quiz) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/quizzes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: quiz.name,
                    slug: quiz.slug,
                    description: quiz.description,
                    settings: quiz.settings,
                    status: quiz.status,
                    slides: quiz.slides,
                }),
            });

            if (res.ok) {
                toast.success('Quiz saved!');
            } else {
                toast.error('Failed to save quiz');
            }
        } catch (e) {
            toast.error('Failed to save quiz');
        } finally {
            setIsSaving(false);
        }
    };

    const addSlide = (type: Slide['type']) => {
        if (!quiz) return;
        const newSlide: Slide = {
            id: generateId(),
            type,
            content: getDefaultContent(type),
        };
        const newSlides = [...quiz.slides, newSlide];
        setQuiz({ ...quiz, slides: newSlides });
        setSelectedSlideIndex(newSlides.length - 1);
        setIsAddSlideOpen(false);
    };

    const duplicateSlide = (index: number) => {
        if (!quiz) return;
        const slide = quiz.slides[index];
        const newSlide: Slide = {
            ...slide,
            id: generateId(),
            content: { ...slide.content },
        };
        const newSlides = [...quiz.slides];
        newSlides.splice(index + 1, 0, newSlide);
        setQuiz({ ...quiz, slides: newSlides });
        setSelectedSlideIndex(index + 1);
    };

    const deleteSlide = (index: number) => {
        if (!quiz || quiz.slides.length <= 1) return;
        const newSlides = quiz.slides.filter((_, i) => i !== index);
        setQuiz({ ...quiz, slides: newSlides });
        if (selectedSlideIndex >= newSlides.length) {
            setSelectedSlideIndex(newSlides.length - 1);
        }
    };

    const moveSlide = (index: number, direction: 'up' | 'down') => {
        if (!quiz) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= quiz.slides.length) return;
        
        const newSlides = [...quiz.slides];
        [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
        setQuiz({ ...quiz, slides: newSlides });
        setSelectedSlideIndex(newIndex);
    };

    const updateSlideContent = (key: string, value: any) => {
        if (!quiz) return;
        const newSlides = [...quiz.slides];
        newSlides[selectedSlideIndex] = {
            ...newSlides[selectedSlideIndex],
            content: {
                ...newSlides[selectedSlideIndex].content,
                [key]: value,
            },
        };
        setQuiz({ ...quiz, slides: newSlides });
    };

    const updateOption = (optionIndex: number, key: string, value: any) => {
        if (!quiz) return;
        const options = [...(quiz.slides[selectedSlideIndex].content.options || [])];
        options[optionIndex] = { ...options[optionIndex], [key]: value };
        updateSlideContent('options', options);
    };

    const addOption = () => {
        if (!quiz) return;
        const options = [...(quiz.slides[selectedSlideIndex].content.options || [])];
        options.push({ id: generateId(), text: `Option ${options.length + 1}` });
        updateSlideContent('options', options);
    };

    const removeOption = (optionIndex: number) => {
        if (!quiz) return;
        const options = quiz.slides[selectedSlideIndex].content.options?.filter((_, i) => i !== optionIndex);
        updateSlideContent('options', options);
    };

    const selectedSlide = quiz?.slides[selectedSlideIndex];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!quiz) {
        return null;
    }

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col">
            {/* Top Toolbar */}
            <div className="sticky top-0 z-50 bg-background border-b">
                <div className="flex items-center justify-between px-4 h-14">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/quizzes" className="text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <Input
                            value={quiz.name}
                            onChange={(e) => setQuiz({ ...quiz, name: e.target.value })}
                            className="font-medium border-none bg-transparent h-8 px-2 w-auto max-w-[300px] focus-visible:ring-1"
                        />
                        <Badge variant={quiz.status === 'published' ? 'default' : 'secondary'}>
                            {quiz.status}
                        </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Preview Mode Toggle */}
                        <div className="flex items-center bg-muted rounded-lg p-1">
                            <Button
                                variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setPreviewMode('mobile')}
                                className="h-8 px-3"
                            >
                                <Smartphone className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setPreviewMode('desktop')}
                                className="h-8 px-3"
                            >
                                <Monitor className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Button>

                        {quiz.status === 'published' && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/quiz/${quiz.slug}`} target="_blank">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Preview
                                </Link>
                            </Button>
                        )}

                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Slides */}
                <div className="w-64 bg-background border-r flex flex-col">
                    <div className="p-4 border-b">
                        <Button onClick={() => setIsAddSlideOpen(true)} className="w-full" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Slide
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {quiz.slides.map((slide, index) => (
                                <div
                                    key={slide.id}
                                    onClick={() => setSelectedSlideIndex(index)}
                                    className={cn(
                                        'group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                                        selectedSlideIndex === index
                                            ? 'bg-accent'
                                            : 'hover:bg-accent/50'
                                    )}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-xs text-muted-foreground w-4 shrink-0">{index + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {slide.content.headline || 'Untitled'}
                                            </p>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {slide.type.replace('-', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => moveSlide(index, 'up')} disabled={index === 0}>
                                                <ChevronUp className="mr-2 h-4 w-4" />
                                                Move Up
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => moveSlide(index, 'down')} disabled={index === quiz.slides.length - 1}>
                                                <ChevronDown className="mr-2 h-4 w-4" />
                                                Move Down
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => duplicateSlide(index)}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => deleteSlide(index)}
                                                disabled={quiz.slides.length <= 1}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Center - Phone Preview */}
                <div className="flex-1 flex items-center justify-center p-8 bg-muted/50">
                    <div className={cn(
                        'bg-white rounded-[3rem] shadow-2xl overflow-hidden transition-all duration-300',
                        previewMode === 'mobile'
                            ? 'w-[375px]'
                            : 'w-full max-w-2xl rounded-xl'
                    )}>
                        {previewMode === 'mobile' && (
                            <div className="bg-black h-6 flex items-center justify-center">
                                <div className="w-20 h-4 bg-black rounded-full" />
                            </div>
                        )}
                        <div className={cn(
                            'overflow-y-auto',
                            previewMode === 'mobile' ? 'h-[700px]' : 'h-[600px]'
                        )}>
                            <SlidePreview
                                slide={selectedSlide}
                                quiz={quiz}
                                onContentChange={updateSlideContent}
                                onOptionChange={updateOption}
                            />
                        </div>
                        {previewMode === 'mobile' && (
                            <div className="bg-black h-5 flex items-center justify-center">
                                <div className="w-32 h-1 bg-gray-600 rounded-full" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar - Properties */}
                <div className="w-80 bg-background border-l flex flex-col">
                    <div className="p-4 border-b">
                        <h3 className="font-semibold">Slide Properties</h3>
                        <p className="text-sm text-muted-foreground">
                            {SLIDE_TYPES.find(t => t.value === selectedSlide?.type)?.label || 'Select a slide'}
                        </p>
                    </div>
                    <ScrollArea className="flex-1">
                        {selectedSlide && (
                            <SlidePropertiesPanel
                                slide={selectedSlide}
                                onContentChange={updateSlideContent}
                                onOptionChange={updateOption}
                                onAddOption={addOption}
                                onRemoveOption={removeOption}
                            />
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* Add Slide Dialog */}
            <Dialog open={isAddSlideOpen} onOpenChange={setIsAddSlideOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add New Slide</DialogTitle>
                        <DialogDescription>Choose a slide type to add to your quiz.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-4">
                        {SLIDE_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => addSlide(type.value as Slide['type'])}
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:border-primary hover:bg-accent transition-colors text-left"
                                >
                                    <Icon className="h-6 w-6 text-primary" />
                                    <div className="text-center">
                                        <p className="font-medium text-sm">{type.label}</p>
                                        <p className="text-xs text-muted-foreground">{type.description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Settings Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Quiz Settings</DialogTitle>
                        <DialogDescription>Configure your quiz settings and publishing status.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Quiz Name</Label>
                            <Input
                                value={quiz.name}
                                onChange={(e) => setQuiz({ ...quiz, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>URL Slug</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">/quiz/</span>
                                <Input
                                    value={quiz.slug}
                                    onChange={(e) => setQuiz({ ...quiz, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={quiz.status}
                                onValueChange={(value) => setQuiz({ ...quiz, status: value as Quiz['status'] })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Primary Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={quiz.settings.primaryColor}
                                    onChange={(e) => setQuiz({
                                        ...quiz,
                                        settings: { ...quiz.settings, primaryColor: e.target.value }
                                    })}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                    value={quiz.settings.primaryColor}
                                    onChange={(e) => setQuiz({
                                        ...quiz,
                                        settings: { ...quiz.settings, primaryColor: e.target.value }
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Slide Preview Component
function SlidePreview({
    slide,
    quiz,
    onContentChange,
    onOptionChange,
}: {
    slide?: Slide;
    quiz: Quiz;
    onContentChange: (key: string, value: any) => void;
    onOptionChange: (index: number, key: string, value: any) => void;
}) {
    if (!slide) return null;

    const primaryColor = quiz.settings.primaryColor;

    return (
        <div className="min-h-full p-6" style={{ backgroundColor: quiz.settings.backgroundColor }}>
            {/* Progress Bar */}
            {quiz.settings.showProgressBar && (
                <div className="mb-6">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full transition-all"
                            style={{
                                width: `${((quiz.slides.findIndex(s => s.id === slide.id) + 1) / quiz.slides.length) * 100}%`,
                                backgroundColor: primaryColor,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Headline - Inline Editable */}
            {slide.content.headline !== undefined && (
                <h1
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onContentChange('headline', e.currentTarget.textContent || '')}
                    className="text-2xl font-bold text-gray-900 mb-3 outline-none focus:bg-blue-50 rounded px-1 -mx-1"
                >
                    {slide.content.headline}
                </h1>
            )}

            {/* Subheadline - Inline Editable */}
            {slide.content.subheadline !== undefined && (
                <p
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onContentChange('subheadline', e.currentTarget.textContent || '')}
                    className="text-gray-600 mb-6 outline-none focus:bg-blue-50 rounded px-1 -mx-1"
                >
                    {slide.content.subheadline || 'Add a subheadline...'}
                </p>
            )}

            {/* Body - for info slides */}
            {slide.content.body !== undefined && (
                <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onContentChange('body', e.currentTarget.textContent || '')}
                    className="text-gray-700 leading-relaxed mb-6 outline-none focus:bg-blue-50 rounded px-1 -mx-1 whitespace-pre-wrap"
                >
                    {slide.content.body || 'Add body text...'}
                </div>
            )}

            {/* Image */}
            {slide.content.imageUrl && (
                <div className="mb-6 rounded-lg overflow-hidden">
                    <img src={slide.content.imageUrl} alt="" className="w-full h-48 object-cover" />
                </div>
            )}

            {/* Options - for choice slides */}
            {slide.content.options && (
                <div className="space-y-3 mb-6">
                    {slide.content.options.map((option, index) => (
                        <button
                            key={option.id}
                            className="w-full p-4 text-left border-2 rounded-xl transition-all hover:border-gray-400 group relative"
                            style={{ borderColor: '#e5e7eb' }}
                        >
                            {slide.type === 'image-choice' && option.imageUrl && (
                                <img src={option.imageUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
                            )}
                            <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => onOptionChange(index, 'text', e.currentTarget.textContent || '')}
                                className="font-medium outline-none focus:bg-blue-50 rounded"
                            >
                                {option.text}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Loading Items */}
            {slide.type === 'loading' && slide.content.items && (
                <div className="space-y-4">
                    {slide.content.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin" style={{ color: primaryColor }} />
                            <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                    const items = [...(slide.content.items || [])];
                                    items[index] = { ...items[index], text: e.currentTarget.textContent || '' };
                                    onContentChange('items', items);
                                }}
                                className="text-gray-700 outline-none focus:bg-blue-50 rounded"
                            >
                                {item.text}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Bullets - for offer slides */}
            {slide.content.bullets && (
                <div className="space-y-2 mb-6">
                    {slide.content.bullets.map((bullet, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <span style={{ color: primaryColor }}>✓</span>
                            <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                    const bullets = [...(slide.content.bullets || [])];
                                    bullets[index] = e.currentTarget.textContent || '';
                                    onContentChange('bullets', bullets);
                                }}
                                className="text-gray-700 outline-none focus:bg-blue-50 rounded"
                            >
                                {bullet}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Offer Text */}
            {slide.content.offerText && (
                <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onContentChange('offerText', e.currentTarget.textContent || '')}
                    className="text-center text-lg font-semibold mb-4 p-4 rounded-lg outline-none focus:bg-blue-50"
                    style={{ backgroundColor: `${primaryColor}15` }}
                >
                    {slide.content.offerText}
                </div>
            )}

            {/* Button Text */}
            {slide.content.buttonText && (
                <button
                    className="w-full py-3 px-6 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                >
                    <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onContentChange('buttonText', e.currentTarget.textContent || '')}
                        className="outline-none"
                    >
                        {slide.content.buttonText}
                    </span>
                </button>
            )}

            {/* CTA Button */}
            {slide.content.ctaText && (
                <button
                    className="w-full py-4 px-6 rounded-xl text-white font-bold text-lg transition-transform hover:scale-[1.02]"
                    style={{ backgroundColor: primaryColor }}
                >
                    <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onContentChange('ctaText', e.currentTarget.textContent || '')}
                        className="outline-none"
                    >
                        {slide.content.ctaText}
                    </span>
                </button>
            )}

            {/* Guarantee Text */}
            {slide.content.guaranteeText && (
                <p
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onContentChange('guaranteeText', e.currentTarget.textContent || '')}
                    className="text-center text-sm text-gray-500 mt-4 outline-none focus:bg-blue-50 rounded"
                >
                    {slide.content.guaranteeText}
                </p>
            )}
        </div>
    );
}

// Slide Properties Panel Component
function SlidePropertiesPanel({
    slide,
    onContentChange,
    onOptionChange,
    onAddOption,
    onRemoveOption,
}: {
    slide: Slide;
    onContentChange: (key: string, value: any) => void;
    onOptionChange: (index: number, key: string, value: any) => void;
    onAddOption: () => void;
    onRemoveOption: (index: number) => void;
}) {
    const handleImageUpload = async (key: string, file: File) => {
        // TODO: Implement actual upload
        const reader = new FileReader();
        reader.onload = (e) => {
            onContentChange(key, e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="p-4 space-y-6">
            {/* Image Upload for relevant slides */}
            {(slide.type === 'info' || slide.type === 'results') && (
                <div className="space-y-2">
                    <Label>Slide Image</Label>
                    {slide.content.imageUrl ? (
                        <div className="relative">
                            <img src={slide.content.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6"
                                onClick={() => onContentChange('imageUrl', '')}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">Upload Image</span>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload('imageUrl', file);
                                }}
                            />
                        </label>
                    )}
                </div>
            )}

            {/* Options Editor for choice slides */}
            {slide.content.options && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        <Button variant="ghost" size="sm" onClick={onAddOption}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>
                    {slide.content.options.map((option, index) => (
                        <div key={option.id} className="flex items-center gap-2">
                            <Input
                                value={option.text}
                                onChange={(e) => onOptionChange(index, 'text', e.target.value)}
                                className="flex-1"
                            />
                            {slide.type === 'image-choice' && (
                                <label className="cursor-pointer">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (evt) => {
                                                    onOptionChange(index, 'imageUrl', evt.target?.result);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => onRemoveOption(index)}
                                disabled={slide.content.options!.length <= 2}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Loading Items Editor */}
            {slide.type === 'loading' && slide.content.items && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Loading Steps</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const items = [...(slide.content.items || [])];
                                items.push({ text: 'New step...', duration: 2000 });
                                onContentChange('items', items);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>
                    {slide.content.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                value={item.text}
                                onChange={(e) => {
                                    const items = [...(slide.content.items || [])];
                                    items[index] = { ...items[index], text: e.target.value };
                                    onContentChange('items', items);
                                }}
                                className="flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    const items = slide.content.items?.filter((_, i) => i !== index);
                                    onContentChange('items', items);
                                }}
                                disabled={(slide.content.items?.length || 0) <= 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Bullets Editor for Offer slides */}
            {slide.content.bullets && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Benefits/Bullets</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const bullets = [...(slide.content.bullets || [])];
                                bullets.push('New benefit');
                                onContentChange('bullets', bullets);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>
                    {slide.content.bullets.map((bullet, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                value={bullet}
                                onChange={(e) => {
                                    const bullets = [...(slide.content.bullets || [])];
                                    bullets[index] = e.target.value;
                                    onContentChange('bullets', bullets);
                                }}
                                className="flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    const bullets = slide.content.bullets?.filter((_, i) => i !== index);
                                    onContentChange('bullets', bullets);
                                }}
                                disabled={(slide.content.bullets?.length || 0) <= 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* CTA URL for Offer slides */}
            {slide.type === 'offer' && (
                <div className="space-y-2">
                    <Label>CTA Link URL</Label>
                    <Input
                        value={slide.content.ctaUrl || ''}
                        onChange={(e) => onContentChange('ctaUrl', e.target.value)}
                        placeholder="https://..."
                    />
                </div>
            )}
        </div>
    );
}

