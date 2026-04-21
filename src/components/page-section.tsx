import type { PropsWithChildren, ReactNode } from 'react';

type PageSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
}>;

export function PageSection({ title, description, action, children }: PageSectionProps) {
  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
