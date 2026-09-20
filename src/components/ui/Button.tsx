import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "default" | "primary" | "accent" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
  display?: boolean;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  type?: never;
  disabled?: boolean;
  onClick?: never;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const sizeClass: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

const variantClass: Record<ButtonVariant, string> = {
  default: "",
  primary: "btn-primary",
  accent: "btn-accent",
  danger: "btn-danger",
  ghost: "btn-ghost",
};

export function Button(props: ButtonProps) {
  const {
    children,
    variant = "default",
    size = "md",
    block,
    className,
    display,
  } = props;

  const faceClass = cn(
    "btn-face",
    variantClass[variant],
    sizeClass[size],
    block && "btn-block",
    display && "font-display",
    className
  );

  const shellClass = cn(
    "btn-shell",
    `btn-shell-${variant === "ghost" ? "ghost" : "marquee"}`,
    sizeClass[size],
    block && "btn-block"
  );

  if ("href" in props && props.href) {
    const { href, target, rel, disabled } = props;
    return (
      <span className={shellClass} data-disabled={disabled || undefined}>
        <Link
          href={href}
          target={target}
          rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
          className={faceClass}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : undefined}
          onClick={disabled ? (e) => e.preventDefault() : undefined}
        >
          {children}
        </Link>
      </span>
    );
  }

  const {
    type = "button",
    disabled,
    onClick,
    children: _children,
    variant: _variant,
    size: _size,
    block: _block,
    className: _className,
    display: _display,
    href: _href,
    ...rest
  } = props as ButtonAsButton;

  return (
    <span className={shellClass} data-disabled={disabled || undefined}>
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={faceClass}
        {...rest}
      >
        {children}
      </button>
    </span>
  );
}
