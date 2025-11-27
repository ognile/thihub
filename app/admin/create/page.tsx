'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateArticlePage() {
    const router = useRouter();
    const [rawText, setRawText] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pixel State
    const [pixels, setPixels] = useState<string[]>([]);
    const [selectedPixel, setSelectedPixel] = useState('');
    const [newPixel, setNewPixel] = useState('');
    const [isAddingPixel, setIsAddingPixel] = useState(false);

    // CTA State
    const [ctas, setCtas] = useState<string[]>([]);
    const [selectedCta, setSelectedCta] = useState('');
    const [newCta, setNewCta] = useState('');
    const [isAddingCta, setIsAddingCta] = useState(false);

    useEffect(() => {
        // Fetch existing data to populate dropdowns
        const fetchData = async () => {
            try {
                const [articlesRes, configRes] = await Promise.all([
                    fetch('/api/articles'),
                    fetch('/api/config')
                ]);

                const articles = await articlesRes.json();
                const config = await configRes.json();

                // Extract unique Pixels
                const articlePixels = articles.map((a: any) => a.pixelId).filter(Boolean);
                const allPixels = Array.from(new Set([config.defaultPixelId, ...articlePixels])).filter(Boolean);
                setPixels(allPixels as string[]);
                if (allPixels.length > 0) setSelectedPixel(allPixels[0] as string);

                // Extract unique CTAs
                const articleCtas = articles.map((a: any) => a.ctaUrl).filter(Boolean);
                const allCtas = Array.from(new Set([config.defaultCtaUrl, ...articleCtas])).filter(Boolean);
                setCtas(allCtas as string[]);
                if (allCtas.length > 0) setSelectedCta(allCtas[0] as string);

            } catch (err) {
                console.error('Failed to load data', err);
            }
        };
        fetchData();
    }, []);

    const handleGenerate = async () => {
        if (!rawText) {
            setError('Please enter the article text.');
            return;
        }

        const finalPixel = isAddingPixel ? newPixel : selectedPixel;
        const finalCta = isAddingCta ? newCta : selectedCta;

        if (!finalPixel) {
            setError('Please select or add a Pixel ID.');
            return;
        }
        if (!finalCta) {
            setError('Please select or add a CTA URL.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/generate-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText,
                    slug,
                    pixelId: finalPixel,
                    ctaUrl: finalCta
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate article');
            }

            // Wait a moment for blob storage to propagate
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Redirect to editor
            router.push(`/admin/articles/${data.slug}`);

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-gray-500 hover:text-gray-900 transition-colors">
                            ← Back to Dashboard
                        </Link>
                        <h1 className="text-xl font-bold text-gray-900">Create New Article</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-10">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Slug Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            Custom Slug (Optional)
                        </label>
                        <div className="flex items-center">
                            <span className="text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm">
                                /articles/
                            </span>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                className="flex-1 bg-white border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g. adv-3"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Leave blank to auto-generate from title.
                        </p>
                    </div>

                    {/* Raw Text Input */}
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            Advertorial Text
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                            Paste the raw text here. The AI will format it, generate a title, and create comments.
                        </p>
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm leading-relaxed"
                            placeholder="Paste your article text here..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Pixel Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                                Facebook Pixel ID
                            </label>
                            {!isAddingPixel ? (
                                <div className="flex gap-2">
                                    <select
                                        value={selectedPixel}
                                        onChange={(e) => setSelectedPixel(e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        {pixels.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setIsAddingPixel(true)}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        + New
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newPixel}
                                        onChange={(e) => setNewPixel(e.target.value)}
                                        placeholder="Enter Pixel ID"
                                        className="flex-1 bg-white border border-blue-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => setIsAddingPixel(false)}
                                        className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* CTA URL Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                                CTA URL
                            </label>
                            {!isAddingCta ? (
                                <div className="flex gap-2">
                                    <select
                                        value={selectedCta}
                                        onChange={(e) => setSelectedCta(e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        {ctas.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setIsAddingCta(true)}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        + New
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCta}
                                        onChange={(e) => setNewCta(e.target.value)}
                                        placeholder="https://..."
                                        className="flex-1 bg-white border border-blue-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => setIsAddingCta(false)}
                                        className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform hover:-translate-y-0.5 ${loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-200'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating Article...
                            </span>
                        ) : (
                            'Generate Article with AI ✨'
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-4">
                        Powered by Google Gemini Flash. Generates title, content, and comments automatically.
                    </p>
                </div>
            </main>
        </div>
    );
}
