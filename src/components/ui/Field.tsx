import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "./cn";

export function Field({
  label,
  children,
  className,
  ...rest
}: {
  label: string;
  children: ReactNode;
} & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block space-y-1", className)} {...rest}>
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export function FieldInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn("neu-input px-3 py-2 text-base", className)} {...props} />
  );
}

export function FieldTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("neu-input px-3 py-2 text-base", className)}
      {...props}
    />
  );
}

export function FieldSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("neu-input neu-input-auto px-2.5 py-2 text-base", className)}
      {...props}
    >
      {children}
    </select>
  );
}
