export type AsyncState = 'idle' | 'loading' | 'success' | 'error';

export type StatusKind =
  | 'default'
  | 'draft'
  | 'published'
  | 'archived'
  | 'completed'
  | 'in-progress'
  | 'error';

export interface AdminActionMeta {
  label: string;
  disabled?: boolean;
  loading?: boolean;
}
