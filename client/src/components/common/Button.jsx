import React from "react";
import { ClipLoader } from "react-spinners";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  onClick,
  icon: Icon,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 min-h-[36px] gap-1.5",
    md: "text-sm px-4 py-2 min-h-[42px] gap-2",
    lg: "text-base px-6 py-3 min-h-[48px] gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-cyan-900 hover:bg-cyan-800 text-white focus:ring-cyan-600 shadow-sm",
    secondary:
      "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 focus:ring-gray-600",
    outline:
      "bg-transparent border border-gray-400/40 hover:bg-white/10 text-current focus:ring-gray-500",
    danger:
      "bg-red-600 hover:bg-red-500 text-white focus:ring-red-500 shadow-sm",
    ghost:
      "bg-transparent hover:bg-white/10 text-current focus:ring-gray-400",
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
    >
      {loading ? (
        <ClipLoader size={size === "sm" ? 14 : size === "lg" ? 20 : 16} color="currentColor" />
      ) : (
        Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
      )}
      <span>{children}</span>
    </button>
  );
}

