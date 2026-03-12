import React from 'react';
import ArticleHero from '@/components/article/ArticleHero';
import { DEFAULT_HERO_META } from '@/lib/articles/schema';
import { computeReadTimeMinutes } from '@/lib/articles/read-time';

interface CinematicHeroProps {
    image: string;
    title: string;
    subtitle: string;
    author: string;
    reviewer?: string;
    date: string;
    authorImage?: string;
}

export default function CinematicHero({ image, title, subtitle, author, reviewer, date, authorImage }: CinematicHeroProps) {
    const readTimeMinutes = computeReadTimeMinutes({
        title,
        subtitle,
        blocks: [],
    });

    return (
        <ArticleHero
            image={image}
            title={title}
            subtitle={subtitle}
            author={author}
            reviewer={reviewer}
            date={date}
            authorImage={authorImage}
            heroMeta={DEFAULT_HERO_META}
            readTimeMinutes={readTimeMinutes}
            mode="public"
        />
    );
}
