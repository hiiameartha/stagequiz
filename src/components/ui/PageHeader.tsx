import type { ReactNode } from "react";
import { cn } from "./cn";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  titleClassName,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className
      )}
    >
      <div>
        <p className="accent-label text-sm uppercase tracking-[0.2em]">
          {eyebrow}
        </p>
        <h1 className={cn("font-display text-4xl text-ink", titleClassName)}>
          {title}
        </h1>
        {description != null && (
          <div className="mt-1 text-sm text-muted">{description}</div>
        )}
      </div>
      {actions != null && (
        <div className="flex flex-wrap gap-2">{actions}</div>
      )}
    </header>
  );
}

export function AccentLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("accent-label text-sm uppercase tracking-[0.2em]", className)}>
      {children}
    </p>
  );
}
