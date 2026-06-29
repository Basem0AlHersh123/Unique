import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-extrabold gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">الصفحة غير موجودة</h1>
        <p className="text-text-secondary mb-8">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 font-medium"
          >
            العودة للرئيسية
          </Link>
          <Link
            href="/colleges"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface border border-border text-text-primary hover:bg-surface-hover transition-all duration-300 font-medium"
          >
            تصفح الكليات
          </Link>
        </div>
      </div>
    </div>
  );
}
