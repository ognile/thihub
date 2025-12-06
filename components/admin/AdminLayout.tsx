'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';
    const [collapsed, setCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) {
                setCollapsed(true);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // For login page, render without sidebar
    if (isLoginPage) {
        return (
            <div className="min-h-screen bg-background">
                {children}
                <Toaster position="bottom-right" richColors />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop Sidebar */}
            {!isMobile && (
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            )}

            {/* Mobile Header */}
            {isMobile && (
                <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-50 flex items-center px-4">
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="mr-3">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[240px]">
                            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
                        </SheetContent>
                    </Sheet>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-xs">T</span>
                        </div>
                        <span className="font-semibold text-foreground text-sm">Admin</span>
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main
                className={cn(
                    'transition-all duration-300 ease-in-out min-h-screen',
                    isMobile ? 'pt-14' : collapsed ? 'pl-[68px]' : 'pl-[240px]'
                )}
            >
                <div className="p-6 max-w-6xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Toast notifications */}
            <Toaster position="bottom-right" richColors />
        </div>
    );
}
