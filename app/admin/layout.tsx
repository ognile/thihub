'use client';

import { usePathname } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Don't wrap login page with admin layout
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Don't wrap article editor with admin layout (it has its own full-screen layout)
    if (pathname.startsWith('/admin/articles/')) {
        return <>{children}</>;
    }

    // Don't wrap quiz builder with admin layout (it has its own full-screen layout)
    if (pathname.match(/^\/admin\/quizzes\/[^/]+$/) && pathname !== '/admin/quizzes') {
        return <>{children}</>;
    }

    return <AdminLayout>{children}</AdminLayout>;
}


