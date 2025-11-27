import React from 'react';

interface CinematicHeroProps {
    image: string;
    title: string;
    subtitle: string;
    author: string;
    date: string;
    authorImage?: string;
}

export default function CinematicHero({ image, title, subtitle, author, date, authorImage }: CinematicHeroProps) {
    return (
        <div className="relative w-full min-h-[85vh] sm:min-h-[85vh] flex items-end pb-24 sm:pb-20 overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src={image}
                    alt="Hero Background"
                    className="w-full h-full object-cover object-center"
                />
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-3xl mx-auto px-5 sm:px-6">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-sm">
                        Investigative Report
                    </span>
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white/90 text-[10px] font-bold uppercase tracking-widest rounded-sm border border-white/20">
                        5 Min Read
                    </span>
                    {/* Integrated Trust Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 uppercase tracking-wider">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Fact Checked
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 uppercase tracking-wider">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Medically Reviewed
                        </span>
                    </div>
                </div>

                <h1 className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-black text-white leading-[1.2] mb-6 tracking-tight drop-shadow-lg break-words hyphens-auto">
                    {title}
                </h1>

                <p className="text-lg sm:text-xl text-gray-200 font-sans font-light leading-relaxed mb-8 max-w-xl drop-shadow-md">
                    {subtitle}
                </p>

                {/* Byline */}
                <div className="flex items-center gap-4 border-t border-white/20 pt-6">
                    <div className="w-12 h-12 rounded-full ring-2 ring-white/30 p-0.5 bg-black/20 backdrop-blur-sm flex-shrink-0">
                        <img
                            src={authorImage || "https://picsum.photos/seed/doc/100"}
                            alt={author}
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm tracking-wide">{author}</span>
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400" aria-label="Verified">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
                            <span>{date}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
