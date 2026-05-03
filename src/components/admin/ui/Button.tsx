import React, { type ButtonHTMLAttributes, type CSSProperties } from "react";
import { T } from "../../../data/constants";

export type ButtonVariant = "primary" | "default" | "destructive";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  block?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function variantStyle(variant: ButtonVariant, disabled: boolean): CSSProperties {
  if (variant === "primary") {
    return {
      background: disabled ? T.muted : T.ink,
      color: T.bg,
      border: `1px solid ${disabled ? T.muted : T.ink}`,
    };
  }
  if (variant === "destructive") {
    return {
      background: "transparent",
      color: T.brand,
      border: "none",
      padding: 0,
      textDecoration: "underline",
      textUnderlineOffset: 3,
      fontWeight: 600,
    };
  }
  return {
    background: T.bg,
    color: T.ink,
    border: `1px solid ${T.line}`,
  };
}

function sizeStyle(size: "sm" | "md", variant: ButtonVariant): CSSProperties {
  if (variant === "destructive") return { fontSize: 13, padding: 0, lineHeight: 1.4 };
  if (size === "sm") return { padding: "5px 10px", fontSize: 13 };
  return { padding: "8px 14px", fontSize: 13 };
}

export function Button({ variant = "default", size = "md", block, disabled, style, children, ...rest }: ButtonProps) {
  const baseStyle: CSSProperties = {
    fontFamily: T.sans,
    fontWeight: variant === "primary" ? 600 : 600,
    borderRadius: variant === "destructive" ? 0 : 2,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: block ? "100%" : undefined,
    opacity: disabled && variant !== "primary" ? 0.6 : 1,
    whiteSpace: "nowrap",
    ...sizeStyle(size, variant),
    ...variantStyle(variant, !!disabled),
    ...style,
  };

  return (
    <button {...rest} disabled={disabled} style={baseStyle}>
      {children}
    </button>
  );
}
