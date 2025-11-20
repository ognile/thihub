import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { put, head } from '@vercel/blob';

const articlesPath = path.join(process.cwd(), 'data', 'articles.json');
const BLOB_URL = 'articles.json';
const isProduction = process.env.VERCEL_ENV === 'production';

async function getArticles() {
    if (isProduction) {
        try {
            const blobExists = await head(BLOB_URL).catch(() => null);
            if (blobExists) {
                const response = await fetch(blobExists.url);
                return await response.json();
            }
            return [];
        } catch (e) {
            console.error('Error reading from blob:', e);
            return [];
        }
    } else {
        if (fs.existsSync(articlesPath)) {
            const fileContents = fs.readFileSync(articlesPath, 'utf8');
            return JSON.parse(fileContents);
        }
        return [];
    }
}

async function saveArticles(articles: any[]) {
    if (isProduction) {
        await put(BLOB_URL, JSON.stringify(articles, null, 4), {
            access: 'public',
            contentType: 'application/json',
        });
    } else {
        fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 4));
    }
}

export async function GET() {
    try {
        const articles = await getArticles();
        return NextResponse.json(articles);
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

        let articles = await getArticles();

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

            await saveArticles(articles);

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

