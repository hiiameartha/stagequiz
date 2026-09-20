import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type PanelProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "div" | "section" | "article" | "aside";
  padding?: "sm" | "md" | "lg" | "none";
};

const padClass = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6 md:p-8",
} as const;

export function Panel({
  children,
  as: Tag = "div",
  padding = "md",
  className,
  ...rest
}: PanelProps) {
  return (
    <Tag className={cn("neu-panel", padClass[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Chip({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("neu-chip", className)} {...rest}>
      {children}
    </div>
  );
}

export function Inset({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("neu-inset", className)} {...rest}>
      {children}
    </div>
  );
}
