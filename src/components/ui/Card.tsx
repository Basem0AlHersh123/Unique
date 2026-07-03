import { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  withGlass?: boolean;
  withHover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  style,
  withGlass = false,
  withHover = true,
  onClick,
}: CardProps) {
  const base = "rounded-2xl p-6 transition-all duration-300 bg-surface border border-border";
  const glass = withGlass ? "glass border-border/50" : "";
  const hover = withHover
    ? "hover:bg-surface-hover hover:border-primary/10 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
    : "";
  const clickable = onClick ? "cursor-pointer" : "";

  return (
    <div
      className={`${base} ${glass} ${hover} ${clickable} ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}