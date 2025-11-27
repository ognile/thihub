'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    PlusCircle,
    LogOut,
    ChevronLeft,
    Menu,
    ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const navItems = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
    },
    {
        title: 'Create Article',
        href: '/admin/create',
        icon: PlusCircle,
    },
    {
        title: 'Quiz Funnels',
        href: '/admin/quizzes',
        icon: ListChecks,
    },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/admin') {
            return pathname === '/admin';
        }
        return pathname.startsWith(href);
    };

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col',
                    collapsed ? 'w-[68px]' : 'w-[240px]'
                )}
            >
                {/* Header */}
                <div className={cn(
                    'h-16 flex items-center border-b border-sidebar-border px-4',
                    collapsed ? 'justify-center' : 'justify-between'
                )}>
                    {!collapsed && (
                        <Link href="/admin" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-sm">T</span>
                            </div>
                            <span className="font-semibold text-sidebar-foreground">Admin</span>
                        </Link>
                    )}
                    {collapsed && (
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">T</span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        if (collapsed) {
                            return (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                'flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors',
                                                active
                                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="font-medium">
                                        {item.title}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 h-10 rounded-lg transition-colors text-sm font-medium',
                                    active
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                )}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </nav>

                <Separator className="bg-sidebar-border" />

                {/* Footer */}
                <div className="p-3 space-y-1">
                    {collapsed ? (
                        <>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onToggle}
                                        className="w-10 h-10 mx-auto flex text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                    >
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Expand sidebar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href="/admin/login"
                                        className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">Logout</TooltipContent>
                            </Tooltip>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={onToggle}
                                className="w-full justify-start gap-3 h-10 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                <span className="text-sm font-medium">Collapse</span>
                            </Button>
                            <Link
                                href="/admin/login"
                                className="flex items-center gap-3 px-3 h-10 rounded-lg text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors text-sm font-medium"
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Logout</span>
                            </Link>
                        </>
                    )}
                </div>
            </aside>
        </TooltipProvider>
    );
}

