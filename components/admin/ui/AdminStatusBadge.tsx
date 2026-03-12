import { Badge } from '@/components/ui/badge';
import type { StatusKind } from '@/lib/admin/types';

const STATUS_STYLES: Record<StatusKind, string> = {
  default: 'admin-status-default',
  draft: 'admin-status-draft',
  published: 'admin-status-published',
  archived: 'admin-status-archived',
  completed: 'admin-status-completed',
  'in-progress': 'admin-status-in-progress',
  error: 'admin-status-error',
};

const LABELS: Partial<Record<StatusKind, string>> = {
  'in-progress': 'In Progress',
};

interface AdminStatusBadgeProps {
  status: StatusKind | string;
}

export default function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, '-') as StatusKind;
  const style = STATUS_STYLES[normalized] ?? STATUS_STYLES.default;
  const label = LABELS[normalized] ?? status;

  return (
    <Badge variant="outline" className={style}>
      {label}
    </Badge>
  );
}
