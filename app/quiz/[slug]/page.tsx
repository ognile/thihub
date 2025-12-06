'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Loader2, ChevronLeft, Check } from 'lucide-react';

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
    settings: {
        primaryColor: string;
        backgroundColor: string;
        showProgressBar: boolean;
        allowBack: boolean;
    };
    slides: Slide[];
}

interface Answer {
    slideId: string;
    slideType: string;
    selectedOptions: string[];
    timestamp: number;
}

function generateSessionId() {
    return `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export default function QuizPlayer({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [sessionId, setSessionId] = useState<string>('');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [loadingItemIndex, setLoadingItemIndex] = useState(0);

    useEffect(() => {
        // Get or create session ID
        const storedSession = localStorage.getItem(`quiz_session_${slug}`);
        if (storedSession) {
            const session = JSON.parse(storedSession);
            setSessionId(session.sessionId);
            setAnswers(session.answers || []);
            setCurrentSlideIndex(session.currentSlide || 0);
        } else {
            const newSessionId = generateSessionId();
            setSessionId(newSessionId);
            localStorage.setItem(`quiz_session_${slug}`, JSON.stringify({
                sessionId: newSessionId,
                answers: [],
                currentSlide: 0,
            }));
        }
    }, [slug]);

    useEffect(() => {
        fetchQuiz();
    }, [slug]);

    const fetchQuiz = async () => {
        try {
            const res = await fetch(`/api/quizzes/by-slug/${slug}`);
            if (res.ok) {
                const data = await res.json();
                const slides = (data.slides || []).map((s: any) => ({
                    id: s.id,
                    type: s.type,
                    content: s.content,
                    conditionalLogic: s.conditional_logic || null,
                }));
                setQuiz({ ...data, slides });
            } else if (res.status === 404) {
                setError('Quiz not found');
            } else {
                setError('Failed to load quiz');
            }
        } catch (e) {
            setError('Failed to load quiz');
        } finally {
            setIsLoading(false);
        }
    };

    const saveProgress = useCallback(async (newAnswers: Answer[], newSlideIndex: number, completed = false) => {
        if (!quiz || !sessionId) return;

        // Save to localStorage
        localStorage.setItem(`quiz_session_${slug}`, JSON.stringify({
            sessionId,
            answers: newAnswers,
            currentSlide: newSlideIndex,
        }));

        // Save to backend
        try {
            await fetch(`/api/quizzes/${quiz.id}/responses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    answers: newAnswers,
                    currentSlide: newSlideIndex,
                    completed,
                }),
            });
        } catch (e) {
            console.error('Failed to save progress:', e);
        }
    }, [quiz, sessionId, slug]);

    const goToNextSlide = useCallback((selectedOpts: string[] = []) => {
        if (!quiz) return;

        const currentSlide = quiz.slides[currentSlideIndex];
        
        // Save answer
        const newAnswer: Answer = {
            slideId: currentSlide.id,
            slideType: currentSlide.type,
            selectedOptions: selectedOpts,
            timestamp: Date.now(),
        };
        const newAnswers = [...answers, newAnswer];
        setAnswers(newAnswers);

        // Find next slide (handle conditional logic later)
        let nextIndex = currentSlideIndex + 1;
        
        // Check if we're at the end
        if (nextIndex >= quiz.slides.length) {
            saveProgress(newAnswers, nextIndex, true);
            return;
        }

        // Skip slides based on conditional logic
        while (nextIndex < quiz.slides.length) {
            const nextSlide = quiz.slides[nextIndex];
            if (nextSlide.conditionalLogic?.showIf) {
                const condition = nextSlide.conditionalLogic.showIf;
                const relevantAnswer = newAnswers.find(a => a.slideId === condition.slideId);
                if (!relevantAnswer || !relevantAnswer.selectedOptions.includes(condition.optionId)) {
                    nextIndex++;
                    continue;
                }
            }
            break;
        }

        // Transition animation
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentSlideIndex(nextIndex);
            setSelectedOptions([]);
            setIsTransitioning(false);
            saveProgress(newAnswers, nextIndex, nextIndex >= quiz.slides.length);
        }, 300);
    }, [quiz, currentSlideIndex, answers, saveProgress]);

    const goToPrevSlide = useCallback(() => {
        if (!quiz?.settings.allowBack || currentSlideIndex === 0) return;
        
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentSlideIndex(currentSlideIndex - 1);
            // Remove the last answer
            setAnswers(answers.slice(0, -1));
            setSelectedOptions([]);
            setIsTransitioning(false);
        }, 300);
    }, [quiz, currentSlideIndex, answers]);

    const handleOptionSelect = (optionId: string) => {
        const currentSlide = quiz?.slides[currentSlideIndex];
        if (!currentSlide) return;

        if (currentSlide.type === 'multi-select') {
            // Toggle selection for multi-select
            setSelectedOptions(prev => 
                prev.includes(optionId)
                    ? prev.filter(id => id !== optionId)
                    : [...prev, optionId]
            );
        } else {
            // Single select - immediately advance
            goToNextSlide([optionId]);
        }
    };

    const handleContinue = () => {
        goToNextSlide(selectedOptions);
    };

    // Loading slide animation
    useEffect(() => {
        const currentSlide = quiz?.slides[currentSlideIndex];
        if (currentSlide?.type !== 'loading' || !currentSlide.content.items) return;

        const items = currentSlide.content.items;
        let currentIndex = 0;

        const runLoadingSequence = () => {
            if (currentIndex >= items.length) {
                // All items complete, advance to next slide
                setTimeout(() => goToNextSlide([]), 500);
                return;
            }

            setLoadingItemIndex(currentIndex);
            const duration = items[currentIndex].duration || 2000;
            
            setTimeout(() => {
                currentIndex++;
                runLoadingSequence();
            }, duration);
        };

        runLoadingSequence();
    }, [quiz, currentSlideIndex]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !quiz) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-xl font-semibold text-gray-900 mb-2">Quiz Not Found</h1>
                    <p className="text-gray-600">{error || 'This quiz does not exist or has been removed.'}</p>
                </div>
            </div>
        );
    }

    const currentSlide = quiz.slides[currentSlideIndex];
    const progress = ((currentSlideIndex + 1) / quiz.slides.length) * 100;
    const primaryColor = quiz.settings.primaryColor || '#0F4C81';

    // Completed state
    if (currentSlideIndex >= quiz.slides.length) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: quiz.settings.backgroundColor }}>
                <div className="text-center p-8">
                    <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: `${primaryColor}20` }}
                    >
                        <Check className="h-8 w-8" style={{ color: primaryColor }} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
                    <p className="text-gray-600">Your response has been recorded.</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen flex flex-col"
            style={{ backgroundColor: quiz.settings.backgroundColor }}
        >
            {/* Progress Bar */}
            {quiz.settings.showProgressBar && (
                <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
                    <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                    />
                </div>
            )}

            {/* Back Button */}
            {quiz.settings.allowBack && currentSlideIndex > 0 && (
                <button
                    onClick={goToPrevSlide}
                    className="fixed top-4 left-4 z-50 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
            )}

            {/* Slide Content */}
            <main className={cn(
                'flex-1 flex items-center justify-center p-6 transition-opacity duration-300',
                isTransitioning ? 'opacity-0' : 'opacity-100'
            )}>
                <div className="w-full max-w-md mx-auto">
                    <SlideRenderer
                        slide={currentSlide}
                        primaryColor={primaryColor}
                        selectedOptions={selectedOptions}
                        onOptionSelect={handleOptionSelect}
                        onContinue={handleContinue}
                        loadingItemIndex={loadingItemIndex}
                        answers={answers}
                    />
                </div>
            </main>
        </div>
    );
}

// Slide Renderer Component
function SlideRenderer({
    slide,
    primaryColor,
    selectedOptions,
    onOptionSelect,
    onContinue,
    loadingItemIndex,
    answers,
}: {
    slide: Slide;
    primaryColor: string;
    selectedOptions: string[];
    onOptionSelect: (id: string) => void;
    onContinue: () => void;
    loadingItemIndex: number;
    answers: Answer[];
}) {
    const content = slide.content;

    return (
        <div className="space-y-6">
            {/* Image */}
            {content.imageUrl && (
                <div className="rounded-2xl overflow-hidden shadow-lg">
                    <img src={content.imageUrl} alt="" className="w-full h-48 object-cover" />
                </div>
            )}

            {/* Headline */}
            {content.headline && (
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                    {content.headline}
                </h1>
            )}

            {/* Subheadline */}
            {content.subheadline && (
                <p className="text-gray-600">{content.subheadline}</p>
            )}

            {/* Body Text */}
            {content.body && (
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {content.body}
                </div>
            )}

            {/* Options - Text Choice / Image Choice / Multi-Select */}
            {content.options && (
                <div className="space-y-3">
                    {content.options.map((option) => {
                        const isSelected = selectedOptions.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                onClick={() => onOptionSelect(option.id)}
                                className={cn(
                                    'w-full p-4 text-left border-2 rounded-2xl transition-all duration-200',
                                    isSelected
                                        ? 'shadow-md scale-[1.02]'
                                        : 'hover:border-gray-300 hover:shadow-sm'
                                )}
                                style={{
                                    borderColor: isSelected ? primaryColor : '#e5e7eb',
                                    backgroundColor: isSelected ? `${primaryColor}08` : 'white',
                                }}
                            >
                                {slide.type === 'image-choice' && option.imageUrl && (
                                    <img 
                                        src={option.imageUrl} 
                                        alt="" 
                                        className="w-full h-24 object-cover rounded-xl mb-3" 
                                    />
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">{option.text}</span>
                                    {slide.type === 'multi-select' && (
                                        <div 
                                            className={cn(
                                                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                                                isSelected ? 'border-transparent' : 'border-gray-300'
                                            )}
                                            style={{ backgroundColor: isSelected ? primaryColor : 'transparent' }}
                                        >
                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Loading Animation */}
            {slide.type === 'loading' && content.items && (
                <div className="space-y-4 py-8">
                    {content.items.map((item, index) => (
                        <div 
                            key={index}
                            className={cn(
                                'flex items-center gap-3 transition-all duration-500',
                                index <= loadingItemIndex ? 'opacity-100' : 'opacity-30'
                            )}
                        >
                            {index < loadingItemIndex ? (
                                <div 
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Check className="h-4 w-4 text-white" />
                                </div>
                            ) : index === loadingItemIndex ? (
                                <Loader2 
                                    className="h-6 w-6 animate-spin" 
                                    style={{ color: primaryColor }} 
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                            )}
                            <span className={cn(
                                'text-gray-700',
                                index <= loadingItemIndex ? 'font-medium' : ''
                            )}>
                                {item.text}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Bullets - Offer Slide */}
            {content.bullets && (
                <div className="space-y-3">
                    {content.bullets.map((bullet, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div 
                                className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${primaryColor}20` }}
                            >
                                <Check className="h-3 w-3" style={{ color: primaryColor }} />
                            </div>
                            <span className="text-gray-700">{bullet}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Offer Box */}
            {content.offerText && (
                <div 
                    className="p-4 rounded-xl text-center font-semibold"
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                    {content.offerText}
                </div>
            )}

            {/* Guarantee Text */}
            {content.guaranteeText && (
                <p className="text-center text-sm text-gray-500">
                    {content.guaranteeText}
                </p>
            )}

            {/* Continue Button - for info, multi-select slides */}
            {content.buttonText && (
                <button
                    onClick={onContinue}
                    disabled={slide.type === 'multi-select' && selectedOptions.length === 0}
                    className={cn(
                        'w-full py-4 px-6 rounded-xl text-white font-semibold transition-all',
                        slide.type === 'multi-select' && selectedOptions.length === 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:opacity-90 hover:shadow-lg active:scale-[0.98]'
                    )}
                    style={{ backgroundColor: primaryColor }}
                >
                    {content.buttonText}
                </button>
            )}

            {/* CTA Button - for offer slides */}
            {content.ctaText && (
                <a
                    href={content.ctaUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 px-6 rounded-xl text-white font-bold text-lg text-center transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
                    style={{ backgroundColor: primaryColor }}
                >
                    {content.ctaText}
                </a>
            )}
        </div>
    );
}

