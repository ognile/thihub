
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

const articlesPath = path.join(process.cwd(), 'data', 'articles.json');

export async function GET() {
    try {
        if (fs.existsSync(articlesPath)) {
            const fileContents = fs.readFileSync(articlesPath, 'utf8');
            const articles = JSON.parse(fileContents);
            return NextResponse.json(articles);
        }
        return NextResponse.json([]);
    } catch (e) {
        console.error('Error reading articles:', e);
        return NextResponse.json({ error: 'Failed to read articles' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { slug, comments, ctaText, ctaTitle, ctaDescription, title, subtitle, content, author, reviewer, date, image } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
        }

        // Ensure the articles file exists before attempting to read
        if (!fs.existsSync(articlesPath)) {
            return NextResponse.json({ error: 'Database not found' }, { status: 500 });
        }

        const fileContents = fs.readFileSync(articlesPath, 'utf8');
        let articles = JSON.parse(fileContents);

        const articleIndex = articles.findIndex((a: any) => a.slug === slug);

        if (articleIndex !== -1) {
            // Update fields if provided
            if (comments) articles[articleIndex].comments = comments;
            if (ctaText) articles[articleIndex].ctaText = ctaText;
            if (ctaTitle) articles[articleIndex].ctaTitle = ctaTitle;
            if (ctaDescription) articles[articleIndex].ctaDescription = ctaDescription;
            if (title) articles[articleIndex].title = title;
            if (subtitle) articles[articleIndex].subtitle = subtitle;
            if (content) articles[articleIndex].content = content;
            if (author) articles[articleIndex].author = author;
            if (reviewer) articles[articleIndex].reviewer = reviewer;
            if (date) articles[articleIndex].date = date;
            if (image) articles[articleIndex].image = image;

            fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 4));

            // Revalidate the article page
            revalidatePath(`/articles/${slug}`);

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }
    } catch (e) {
        console.error('Error updating article:', e);
        return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }
}

