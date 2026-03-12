import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminSectionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  contentClassName?: string;
}

export default function AdminSectionCard({
  title,
  description,
  children,
  contentClassName,
}: AdminSectionCardProps) {
  return (
    <Card>
      {title || description ? (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
