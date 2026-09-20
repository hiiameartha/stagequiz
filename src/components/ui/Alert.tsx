import type { ReactNode } from "react";
import { cn } from "./cn";

type AlertTone = "error" | "success" | "info";

const toneClass: Record<AlertTone, string> = {
  error:
    "bg-gradient-to-br from-[#e85a5a]/25 to-[#a33232]/20 text-[#7a1f1f] shadow-[inset_3px_3px_8px_rgba(51,50,55,0.12)]",
  success:
    "bg-gradient-to-br from-[#6bcf8e]/30 to-[#3fa86a]/25 text-[#2d7a4f] shadow-[inset_3px_3px_8px_rgba(51,50,55,0.1)]",
  info: "neu-inset text-muted",
};

export function Alert({
  children,
  tone = "error",
  className,
}: {
  children: ReactNode;
  tone?: AlertTone;
  className?: string;
}) {
  return (
    <p className={cn("rounded-xl px-4 py-2 text-sm", toneClass[tone], className)}>
      {children}
    </p>
  );
}
