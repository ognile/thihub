import type { ReactNode } from 'react';
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface AdminSheetScaffoldProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
}

export default function AdminSheetScaffold({
  title,
  description,
  actions,
  children,
  contentClassName,
  bodyClassName,
}: AdminSheetScaffoldProps) {
  return (
    <SheetContent
      className={cn(
        'w-full sm:w-[560px] sm:max-w-[560px] overflow-y-auto p-0 gap-0',
        contentClassName
      )}
      data-admin-chrome="true"
      data-testid="admin-sheet"
    >
      <SheetHeader
        className="border-b border-[var(--admin-outline-soft)] px-6 py-5"
        data-testid="admin-sheet-header"
      >
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0 space-y-1">
            <SheetTitle className="text-[var(--admin-text-strong)]">{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </SheetHeader>

      <div className={cn('space-y-5 px-6 py-5', bodyClassName)} data-testid="admin-sheet-body">
        {children}
      </div>
    </SheetContent>
  );
}
