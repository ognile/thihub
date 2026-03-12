import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminIconToggleProps {
  icon: LucideIcon;
  label: string;
  pressed: boolean;
  onPressedChange: () => void;
}

export default function AdminIconToggle({
  icon: Icon,
  label,
  pressed,
  onPressedChange,
}: AdminIconToggleProps) {
  return (
    <Button
      type="button"
      variant={pressed ? 'secondary' : 'ghost'}
      size="sm"
      className="h-8 px-3"
      onClick={onPressedChange}
      aria-label={label}
      aria-pressed={pressed}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
