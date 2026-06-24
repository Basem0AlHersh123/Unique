import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  withGlass?: boolean;
  withTilt?: boolean;
  withHover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  withGlass = false,
  withTilt = false,
  withHover = true,
  onClick,
}: CardProps) {
  const base = "rounded-2xl p-6 transition-all duration-300";
  const glass = withGlass ? "glass" : "bg-surface border border-border";
  const hover = withHover ? "hover:shadow-lg hover:-translate-y-1" : "";
  const tilt = withTilt ? "card-tilt" : "";
  const clickable = onClick ? "cursor-pointer" : "";

  return (
    <div
      className={`${base} ${glass} ${hover} ${tilt} ${clickable} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
    </div>
  );
}