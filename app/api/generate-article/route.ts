import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { put, head } from '@vercel/blob';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const isProduction = process.env.VERCEL_ENV === 'production';
const BLOB_URL = 'articles.json';

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
        const filePath = path.join(process.cwd(), 'data', 'articles.json');
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(fileData);
        }
        return [];
    }
}

async function saveArticles(articles: any[]) {
    if (isProduction) {
        await put(BLOB_URL, JSON.stringify(articles, null, 4), {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: true,
        });
    } else {
        const filePath = path.join(process.cwd(), 'data', 'articles.json');
        fs.writeFileSync(filePath, JSON.stringify(articles, null, 4));
    }
}

export async function POST(request: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY is not set in environment variables.' },
                { status: 500 }
            );
        }

        const { rawText, pixelId, ctaUrl, slug: customSlug } = await request.json();

        if (!rawText) {
            return NextResponse.json({ error: 'Raw text is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `
            You are an expert content formatter and HTML structurer.
            
            YOUR TASK:
            Take the provided RAW TEXT and format it into a JSON object for a health news site.
            
            CRITICAL RULE: ** DO NOT REWRITE THE CONTENT.**
            -   You must use the EXACT wording from the raw text.
            - Do NOT summarize, do NOT "optimize", do NOT change the tone.
            - Your ONLY job is to apply HTML tags and extract the structure.
            
            INSTRUCTIONS FOR PARSING:
        1. ** Headline **: Identify the main headline(usually the first line).Extract it exactly.
            2. ** Subheadline **: Identify the subheadline(usually the second line).Extract it exactly.
            3. ** Body Content **:
        -   Take the rest of the text and format it as clean, semantic HTML.
                - Use<h2> for major section breaks.
                - Use<h3> for sub - sections.
                - Use<blockquote> for testimonials, key quotes, or "callout" boxes.
                - Use < ul > or<ol> for lists.
                - Use < strong > and<em> for emphasis.
                -   ** DO NOT ** include the title or subtitle in the "content" field.
                -   ** DO NOT CHANGE A SINGLE WORD OF THE BODY TEXT.**
            4. ** Key Takeaways **: Extract 3 distinct, punchy "Key Takeaways" from the text. (You may summarize here, but keep it close to the text).
            5. ** Comments **: Generate 4 - 7 realistic comments from women(ages 35 - 65) discussing the topic / product.They should sound natural, not like bots.

            OUTPUT JSON SCHEMA:
        {
            "title": "The Main Headline (Exact Match)",
                "subtitle": "The Subheadline (Exact Match)",
                    "author": "Female Name (e.g. Sarah Jenkins)",
                        "reviewer": "Medical Doctor Name (e.g. Dr. A. Peterson, MD)",
                            "date": "Updated: 2 hours ago",
                                "content": "<p>First paragraph...</p>...",
                                    "keyTakeaways": [
                                        { "title": "Short Title", "content": "One sentence summary" }
                                    ],
                                        "comments": [
                                            {
                                                "id": "c1",
                                                "author": "Name",
                                                "avatar": "https://picsum.photos/seed/c1/100",
                                                "content": "Comment text",
                                                "time": "2h",
                                                "likes": 45,
                                                "hasReplies": false,
                                                "isLiked": true
                                            }
                                        ]
        }

            RAW TEXT:
            ${rawText}
        `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = result.response;
        const text = response.text();
        const generatedData = JSON.parse(text);

        // Determine Slug
        let slug = customSlug;
        if (!slug) {
            slug = generatedData.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
        } else {
            // Sanitize custom slug
            slug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
        }

        const newArticle = {
            id: slug,
            slug: slug,
            ...generatedData,
            image: "https://picsum.photos/seed/" + slug + "/800/600", // Placeholder
            ctaText: "Check Availability »",
            ctaTitle: "Curious about the science?",
            ctaDescription: "Secure, verified link to official research.",
            pixelId: pixelId || "",
            ctaUrl: ctaUrl || ""
        };

        // Get existing articles
        const articles = await getArticles();

        // Check if slug exists and append random string if so (only if auto-generated or collision)
        let finalSlug = slug;
        if (articles.some((a: any) => a.slug === finalSlug)) {
            finalSlug = `${slug}-${Math.random().toString(36).substring(7)}`;
            newArticle.slug = finalSlug;
            newArticle.id = finalSlug;
        }

        articles.push(newArticle);
        await saveArticles(articles);

        return NextResponse.json({ success: true, slug: finalSlug });

    } catch (error) {
        console.error('Error generating article:', error);
        return NextResponse.json(
            { error: 'Failed to generate article' },
            { status: 500 }
        );
    }
}
