import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminStateViewProps {
  state: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export default function AdminStateView({
  state,
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: AdminStateViewProps) {
  if (state === 'loading') {
    return (
      <div className="space-y-3 py-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-3/4" />
      </div>
    );
  }

  const resolvedIcon =
    icon ?? (state === 'error' ? <AlertCircle className="h-5 w-5" /> : <Inbox className="h-5 w-5" />);

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
      <div className="text-muted-foreground mb-2">{resolvedIcon}</div>
      <p className="font-medium">{title}</p>
      {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="outline" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
