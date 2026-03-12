import type { ReactNode } from 'react';

interface AdminDataTableShellProps {
  children: ReactNode;
  minWidthClassName?: string;
}

export default function AdminDataTableShell({
  children,
  minWidthClassName = 'min-w-[720px]',
}: AdminDataTableShellProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div className={minWidthClassName}>{children}</div>
    </div>
  );
}
