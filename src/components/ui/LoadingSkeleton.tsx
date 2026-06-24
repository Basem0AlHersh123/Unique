export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-3/4 shimmer rounded-xl" />
      <div className="h-4 w-1/2 shimmer rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 shimmer rounded-2xl" />
        ))}
      </div>
      <div className="h-64 shimmer rounded-2xl" />
    </div>
  );
}