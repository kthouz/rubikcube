import type { ReactNode } from 'react';

interface PlaceholderViewProps {
  title: string;
  description: string;
  status?: string;
  children?: ReactNode;
}

/**
 * Shared scaffold for the planned views. Each feature view renders a
 * PlaceholderView until its real implementation lands.
 */
export default function PlaceholderView({
  title,
  description,
  status = 'Planned',
  children,
}: PlaceholderViewProps) {
  return (
    <section className="view">
      <div className="view__header">
        <h1 className="view__title">{title}</h1>
        <span className="badge">{status}</span>
      </div>
      <p className="view__description">{description}</p>
      {children}
    </section>
  );
}
