import React from 'react';
import Header from '@/components/Header';
import Post from '@/components/Post';
import Link from 'next/link';

// Mock data function - in a real app this would fetch from an API/DB
async function getArticle(slug: string) {
    // Simulating data fetch
    return {
        id: slug,
        author: 'Top Health Daily',
        time: '2h',
        content: `This is the full article content for ${slug}. \n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
        image: 'https://picsum.photos/seed/article/800/600',
        likes: 1205,
        comments: 45,
        shares: 12
    };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = await getArticle(slug);

    return (
        <div className="min-h-screen bg-fb-bg pb-10">
            <Header />

            <main className="pt-16 px-0 sm:px-4 max-w-xl mx-auto">
                <div className="mb-4 px-4 sm:px-0">
                    <Link href="/" className="flex items-center text-fb-text-secondary hover:text-fb-blue transition-colors text-sm font-medium">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        Back to Feed
                    </Link>
                </div>

                <Post
                    id={article.id}
                    author={article.author}
                    time={article.time}
                    content={article.content}
                    image={article.image}
                    likes={article.likes}
                    comments={article.comments}
                    shares={article.shares}
                />

                <div className="bg-fb-card p-4 shadow-sm rounded-none sm:rounded-lg mt-4">
                    <h4 className="font-semibold text-fb-text-main mb-2">More from Top Health Daily</h4>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Link key={i} href={`/articles/related-article-${i}`} className="flex gap-3 group">
                                <div className="w-20 h-20 bg-gray-200 flex-shrink-0">
                                    <img src={`https://picsum.photos/seed/${i}/200`} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h5 className="font-medium text-fb-text-main leading-snug group-hover:text-fb-blue transition-colors">
                                        5 Tips for a Healthier Lifestyle That You Can Start Today
                                    </h5>
                                    <span className="text-xs text-fb-text-secondary mt-1 block">Top Health Daily • 5h ago</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
