'use client';

import { Shield, Users, Lock, FileText } from 'lucide-react';

const footerSections = [
    {
        title: 'Editorial Standards',
        icon: FileText,
        links: [
            'Evidence-Based Research',
            'Medical Review Process',
            'Citation Guidelines',
            'Fact-Checking Protocol',
        ],
    },
    {
        title: 'Medical Review Board',
        icon: Users,
        links: [
            'Dr. Sarah Chen, MD - Endocrinology',
            'Dr. Maria Rodriguez, PhD - Women\'s Health',
            'Dr. James Wilson, MD - Internal Medicine',
            'Advisory Council',
        ],
    },
    {
        title: 'Trust & Privacy',
        icon: Lock,
        links: [
            'Privacy Policy',
            'Data Protection',
            'Cookie Preferences',
            'Accessibility Statement',
        ],
    },
    {
        title: 'About Us',
        icon: Shield,
        links: [
            'Our Mission',
            'Editorial Team',
            'Contact',
            'Partnerships',
        ],
    },
];

export default function EditorialFooter() {
    return (
        <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16">
            <div className="max-w-7xl mx-auto px-4">
                {/* Main Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {footerSections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <div key={section.title}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-red-600 rounded-lg">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold font-serif">{section.title}</h3>
                                </div>
                                <ul className="space-y-3">
                                    {section.links.map((link) => (
                                        <li key={link}>
                                            <button className="text-gray-300 hover:text-white transition-colors text-sm text-left">
                                                {link}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700 pt-8">
                    {/* Medical Disclaimer */}
                    <div className="bg-gray-800/50 rounded-lg p-6 mb-8">
                        <h4 className="text-sm font-bold mb-3 text-red-400 uppercase tracking-wide">
                            Medical Disclaimer
                        </h4>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            The information provided on this site is for educational purposes only and is not intended as a substitute
                            for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other
                            qualified health provider with any questions you may have regarding a medical condition. Never disregard
                            professional medical advice or delay in seeking it because of something you have read on this website.
                        </p>
                    </div>

                    {/* Certifications & Trust Badges */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                            <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">HIPAA Compliant</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                            <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Peer Reviewed</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                            <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Expert Verified</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                            <Lock className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">256-bit SSL</p>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="text-center text-sm text-gray-500">
                        <p>© 2024 Top Health Insider. All rights reserved.</p>
                        <p className="mt-2 text-xs">
                            A trusted resource for evidence-based women&apos;s health information.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
