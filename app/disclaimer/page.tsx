import Link from 'next/link';

export default function DisclaimerPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white font-serif text-gray-800">
            {/* Sticky Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 flex items-center justify-center font-serif font-bold text-xl rounded-sm bg-[#0F4C81] text-white">
                            T
                        </div>
                        <span className="font-serif font-bold text-lg tracking-tight text-gray-900">
                            Top Health Insider
                        </span>
                    </Link>
                    <Link href="/" className="text-sm font-sans font-medium text-blue-600 hover:underline">
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-5 py-12 sm:py-16">
                <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-8 relative">
                    Disclaimers
                    <span className="block absolute bottom-0 left-0 w-20 h-1 bg-blue-600 mt-2"></span>
                </h1>

                <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                    <p>
                        All content contained on or available through the Top Health Insider website, including text, graphics, images, and information, is for general information purposes only and should not be relied on for medical or personal advice. The information on our website is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Never disregard professional medical advice or delay seeking medical treatment because of something you have read on the Health Insider website.
                    </p>
                    <p>
                        Medical information and research are constantly evolving. Health Insider makes no representation and assumes no responsibility for the accuracy of the information contained on or available through this website, and such information is subject to change without notice. You are encouraged to confirm any information obtained from or through this website with other sources and to review all information regarding any medical condition or treatment with your physician.
                    </p>
                    <p>
                        Top Health Insider does not recommend, endorse or make any representations about the efficacy, appropriateness, or suitability of any specific tests, diets, products, procedures, treatments, services, testimonials, opinions, health care providers, or other information that may be contained on or available through this website. Top Health Insider is not responsible nor liable for any advice, course of treatment, diagnosis, or any other information or products that you obtain through this website.
                    </p>
                </div>
            </main>

            <footer className="bg-gray-50 border-t border-gray-200 py-8 text-center text-sm text-gray-500 font-sans">
                Copyright © 2025 Top Health Insider. All rights reserved.
            </footer>
        </div>
    );
}

