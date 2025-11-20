
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
        const { slug, comments } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
        }

        if (fs.existsSync(articlesPath)) {
            const fileContents = fs.readFileSync(articlesPath, 'utf8');
            let articles = JSON.parse(fileContents);

            const articleIndex = articles.findIndex((a: any) => a.slug === slug);

            if (articleIndex !== -1) {
                // Update existing article
                if (comments) {
                    articles[articleIndex].comments = comments;
                }
                // Can add other fields here if needed

                fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 4));
                return NextResponse.json({ success: true, article: articles[articleIndex] });
            } else {
                return NextResponse.json({ error: 'Article not found' }, { status: 404 });
            }
        }
        return NextResponse.json({ error: 'Database not found' }, { status: 500 });
    } catch (e) {
        console.error('Error updating article:', e);
        return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }
}

