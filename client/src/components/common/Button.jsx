import React from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Loading\u2026",
  disabled = false,
  className = "",
  type = "button",
  onClick,
  icon: Icon,
  ...props
}) {
  const baseStyles =
    "ui-button inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5b3cc4] focus:ring-offset-2 active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none";

  const sizeStyles = {
    sm: "text-xs px-3.5 py-1.5 min-h-[38px] gap-1.5",
    md: "text-xs sm:text-sm px-4 py-2.5 min-h-[44px] gap-2",
    lg: "text-sm sm:text-base px-6 py-3 min-h-[48px] gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-[#5b3cc4] hover:bg-[#38256f] text-white",
    secondary:
      "bg-white hover:bg-[#f5f7f4] text-[#1c1917] border border-[#d6d3c9]",
    outline:
      "bg-transparent border border-[#d6d3c9] hover:bg-[#f2efe9] text-[#1c1917]",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500",
    ghost:
      "bg-transparent hover:bg-[#f2efe9] text-[#44403c] hover:text-[#1c1917]",
    subtle:
      "bg-[#f1edff] hover:bg-[#e5defc] text-[#5b3cc4] border border-[#d8cdf7]",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <LoadingSpinner size={size} label={loadingLabel} />
      ) : (
        Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
      )}
      <span>{children}</span>
    </button>
  );
}

