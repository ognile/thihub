'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            <Sidebar 
                collapsed={sidebarCollapsed} 
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
            />
            <main className={cn(
                'transition-all duration-300 ease-in-out',
                sidebarCollapsed ? 'pl-[68px]' : 'pl-[240px]'
            )}>
                <div className="container py-6 px-6 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
