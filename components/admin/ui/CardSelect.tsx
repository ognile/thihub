import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CardSelectProps {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  badges?: string[];
}

export default function CardSelect({
  selected,
  onClick,
  icon,
  title,
  description,
  badges,
}: CardSelectProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-admin-chrome="true"
      className={cn(
        'relative rounded-lg border p-4 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-accent/40'
      )}
      aria-pressed={selected}
    >
      <div className={cn('mb-3 inline-flex rounded-md p-2', selected ? 'bg-primary/10' : 'bg-muted')}>
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      {badges?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {badges.map((badge) => (
            <span key={badge} className="rounded-md border bg-muted px-2 py-0.5 text-[10px] font-medium">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      {selected ? (
        <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      ) : null}
    </button>
  );
}
