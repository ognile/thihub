'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CommentEditor from '@/components/admin/CommentEditor';
import { CommentData } from '@/components/FBComments';

interface ArticleConfig {
    pixelId: string;
    ctaUrl: string;
}

interface Article {
    id: string;
    slug: string;
    title: string;
    ctaText?: string;
    ctaTitle?: string;
    ctaDescription?: string;
    comments?: CommentData[];
}

interface Config {
    defaultPixelId: string;
    defaultCtaUrl: string;
    articles: Record<string, ArticleConfig | string>;
}

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<Config | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState('');
    const router = useRouter();

    useEffect(() => {
        checkAuth();
        fetchConfig();
        fetchArticles();
    }, []);

    const checkAuth = async () => {
        try {
            setIsAuthenticated(true);
        } catch (e) {
            router.push('/admin/login');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                if (data.default && !data.defaultPixelId) {
                    const migratedConfig: Config = {
                        defaultPixelId: data.default,
                        defaultCtaUrl: 'https://mynuora.com/products/feminine-balance-gummies-1',
                        articles: {}
                    };
                    Object.entries(data.articles || {}).forEach(([slug, val]) => {
                        if (typeof val === 'string') {
                            migratedConfig.articles[slug] = { pixelId: val, ctaUrl: '' };
                        } else {
                            migratedConfig.articles[slug] = val as ArticleConfig;
                        }
                    });
                    setConfig(migratedConfig);
                } else {
                    setConfig(data);
                }
            }
        } catch (e) {
            console.error('Failed to fetch config', e);
        }
    };

    const fetchArticles = async () => {
        try {
            const res = await fetch('/api/articles');
            if (res.ok) {
                const data = await res.json();
                setArticles(data);
            }
        } catch (e) {
            console.error('Failed to fetch articles', e);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/login', { method: 'DELETE' });
        router.push('/admin/login');
    };

    const handleSaveConfig = async () => {
        if (!config) return;
        setSaveStatus('Saving config...');
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                setSaveStatus('Config saved!');
                setTimeout(() => setSaveStatus(''), 2000);
            } else {
                setSaveStatus('Error saving config');
            }
        } catch (e) {
            setSaveStatus('Error saving config');
        }
    };

    const handleSaveComments = async (slug: string, comments: CommentData[], ctaText?: string, ctaTitle?: string, ctaDescription?: string) => {
        setSaveStatus('Saving article...');
        try {
            const res = await fetch('/api/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, comments, ctaText, ctaTitle, ctaDescription }),
            });

            if (res.ok) {
                setSaveStatus('Article saved!');
                setArticles(articles.map(a => a.slug === slug ? { ...a, comments, ctaText, ctaTitle, ctaDescription } : a));
                setTimeout(() => setSaveStatus(''), 2000);
            } else {
                setSaveStatus('Error saving article');
            }
        } catch (e) {
            setSaveStatus('Error saving article');
        }
    };

    const handleDeleteArticle = async (slug: string) => {
        if (!window.confirm(`Are you sure you want to delete the article "${slug}"? This action cannot be undone.`)) {
            return;
        }

        setSaveStatus('Deleting article...');
        try {
            const res = await fetch(`/api/articles?slug=${slug}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setSaveStatus('Article deleted!');
                setArticles(articles.filter(a => a.slug !== slug));
                if (selectedArticle === slug) {
                    setSelectedArticle(null);
                }
                setTimeout(() => setSaveStatus(''), 2000);
            } else {
                setSaveStatus('Error deleting article');
            }
        } catch (e) {
            setSaveStatus('Error deleting article');
        }
    };

    const updateGlobalConfig = (key: 'defaultPixelId' | 'defaultCtaUrl', value: string) => {
        if (config) {
            setConfig({ ...config, [key]: value });
        }
    };

    const updateArticleConfig = (slug: string, key: 'pixelId' | 'ctaUrl', value: string) => {
        if (!config) return;
        const currentArticleConfig = config.articles?.[slug];

        let baseConfig: ArticleConfig;
        if (typeof currentArticleConfig === 'string') {
            baseConfig = { pixelId: currentArticleConfig, ctaUrl: '' };
        } else {
            baseConfig = (currentArticleConfig as ArticleConfig) || { pixelId: '', ctaUrl: '' };
        }

        const newArticleConfig: ArticleConfig = { ...baseConfig, [key]: value };

        setConfig({
            ...config,
            articles: {
                ...config.articles,
                [slug]: newArticleConfig
            }
        });
    };

    const getArticleConfigValue = (slug: string, key: 'pixelId' | 'ctaUrl') => {
        const articleConfig = config?.articles?.[slug];
        if (!articleConfig) return '';
        if (typeof articleConfig === 'string') return key === 'pixelId' ? articleConfig : '';
        return articleConfig[key] || '';
    };

    if (isLoading) return <div className="p-10 text-center">Loading...</div>;
    if (!isAuthenticated) return null;

    const selectedArticleData = articles.find(a => a.slug === selectedArticle);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
                <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">Logout</button>
            </nav>

            <main className="max-w-6xl mx-auto p-6">
                {/* Global Settings */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Global Defaults</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Default Pixel ID</label>
                            <input
                                type="text"
                                value={config?.defaultPixelId || ''}
                                onChange={(e) => updateGlobalConfig('defaultPixelId', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Default CTA URL</label>
                            <input
                                type="text"
                                value={config?.defaultCtaUrl || ''}
                                onChange={(e) => updateGlobalConfig('defaultCtaUrl', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleSaveConfig}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Save Global Config
                        </button>
                    </div>
                </div>

                {/* Article Management */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-800">Article Management</h2>
                        <div className="flex items-center gap-4">
                            {saveStatus && <span className="text-green-600 font-medium text-sm animate-pulse">{saveStatus}</span>}
                            <Link
                                href="/admin/create"
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Create New Article
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 min-h-[600px]">
                        {/* Article List Sidebar */}
                        <div className="border-r border-gray-100 bg-gray-50/50 p-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Articles</h3>
                            <div className="space-y-2">
                                {articles.map(article => (
                                    <div
                                        key={article.slug}
                                        onClick={() => setSelectedArticle(article.slug)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all ${selectedArticle === article.slug
                                            ? 'bg-white shadow-md border border-blue-100 ring-1 ring-blue-500'
                                            : 'hover:bg-white hover:shadow-sm border border-transparent'
                                            }`}
                                    >
                                        <div className="font-medium text-gray-900 text-sm truncate">{article.title}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                            <span>/{article.slug}</span>
                                            <span className="bg-gray-200 px-1.5 rounded text-[10px]">{article.comments?.length || 0} comments</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Editor Area */}
                        <div className="col-span-2 p-6 bg-white">
                            {selectedArticle && selectedArticleData ? (
                                <div className="space-y-8">
                                    {/* Config Section */}
                                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            Tracking & CTA Configuration
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Pixel ID Override</label>
                                                <input
                                                    type="text"
                                                    placeholder={`Default: ${config?.defaultPixelId}`}
                                                    value={getArticleConfigValue(selectedArticle, 'pixelId')}
                                                    onChange={(e) => updateArticleConfig(selectedArticle, 'pixelId', e.target.value)}
                                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">CTA URL Override</label>
                                                <input
                                                    type="text"
                                                    placeholder={`Default: ${config?.defaultCtaUrl}`}
                                                    value={getArticleConfigValue(selectedArticle, 'ctaUrl')}
                                                    onChange={(e) => updateArticleConfig(selectedArticle, 'ctaUrl', e.target.value)}
                                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <button onClick={handleSaveConfig} className="text-xs text-blue-600 hover:underline font-medium">Save Configuration</button>
                                        </div>
                                    </div>

                                    {/* Content Customization */}
                                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            Content Customization
                                        </h3>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">CTA Title</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Curious about the science?"
                                                value={selectedArticleData.ctaTitle || ''}
                                                onChange={(e) => {
                                                    const newArticles = articles.map(a =>
                                                        a.slug === selectedArticle ? { ...a, ctaTitle: e.target.value } : a
                                                    );
                                                    setArticles(newArticles);
                                                }}
                                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-3"
                                            />

                                            <label className="block text-xs font-medium text-gray-500 mb-1">CTA Button Text</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Watch The Video »"
                                                value={selectedArticleData.ctaText || ''}
                                                onChange={(e) => {
                                                    const newArticles = articles.map(a =>
                                                        a.slug === selectedArticle ? { ...a, ctaText: e.target.value } : a
                                                    );
                                                    setArticles(newArticles);
                                                }}
                                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-3"
                                            />

                                            <label className="block text-xs font-medium text-gray-500 mb-1">CTA Subtext</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Secure, verified link to official research."
                                                value={selectedArticleData.ctaDescription || ''}
                                                onChange={(e) => {
                                                    const newArticles = articles.map(a =>
                                                        a.slug === selectedArticle ? { ...a, ctaDescription: e.target.value } : a
                                                    );
                                                    setArticles(newArticles);
                                                }}
                                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-3"
                                            />
                                            <div className="flex items-center gap-3 mb-4">
                                                <a
                                                    href={`/articles/${selectedArticle}`}
                                                    target="_blank"
                                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    View Live <span className="text-xs">↗</span>
                                                </a>
                                                <Link
                                                    href={`/admin/articles/${selectedArticle}`}
                                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    Open Visual Editor
                                                </Link>
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleSaveComments(
                                                        selectedArticle,
                                                        selectedArticleData.comments || [],
                                                        selectedArticleData.ctaText,
                                                        selectedArticleData.ctaTitle,
                                                        selectedArticleData.ctaDescription
                                                    )}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                                >
                                                    Save Content
                                                </button>
                                            </div>

                                            <div className="mt-8 pt-6 border-t border-gray-200">
                                                <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Danger Zone</h4>
                                                <p className="text-xs text-gray-500 mb-3">Once you delete an article, there is no going back. Please be certain.</p>
                                                <button
                                                    onClick={() => handleDeleteArticle(selectedArticle)}
                                                    className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    Delete Article
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comments Editor */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                            Comments Manager
                                        </h3>
                                        <CommentEditor
                                            comments={selectedArticleData.comments || []}
                                            onChange={(newComments) => handleSaveComments(
                                                selectedArticle,
                                                newComments,
                                                selectedArticleData.ctaText,
                                                selectedArticleData.ctaTitle,
                                                selectedArticleData.ctaDescription
                                            )}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                                    <p>Select an article to edit settings and comments</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
