import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base Skeleton component with premium breathing pulse and SOFT background
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-skeleton-pulse rounded-md bg-slate-100/60 dark:bg-slate-900/40",
        className
      )}
      {...props}
    />
  );
}

/**
 * Shimmer primitive with a smooth subtle horizontal sweep
 */
export function Shimmer({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-50/50 dark:bg-slate-900/30",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-skeleton-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/5 dark:before:via-white/2 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/**
 * Premium Glassmorphism Skeleton for high-end UI parts - Light variant
 */
export function GlassSkeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[2px]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-skeleton-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/3 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/**
 * Realistic Text Skeleton with staggered widths and softer opacity
 */
export function SkeletonText({ className, lines = 1, width = "100%", ...props }: SkeletonProps & { lines?: number; width?: string | number }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-2.5 rounded-full"
          style={{ 
            width: lines > 1 && i === lines - 1 ? "60%" : width,
            opacity: Math.max(0.3, 1 - (i * 0.2))
          }}
        />
      ))}
    </div>
  );
}

/**
 * Circular Avatar Skeleton - Softer
 */
export function SkeletonAvatar({ size = 40, className, ...props }: SkeletonProps & { size?: number }) {
  return (
    <Skeleton
      className={cn("rounded-full flex-shrink-0 opacity-60", className)}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}

/**
 * Card Skeleton with minimal depth
 */
export function SkeletonCard({ className, children, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-slate-100/50 bg-white/40 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.01)]",
        className
      )}
      {...props}
    >
      {children || (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <SkeletonAvatar size={36} />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-16 opacity-50" />
            </div>
          </div>
          <SkeletonText lines={2} />
        </div>
      )}
    </div>
  );
}

/**
 * Premium Button Skeleton - Light
 */
export function SkeletonButton({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn("h-10 rounded-xl w-32 opacity-70", className)}
      {...props}
    />
  );
}
