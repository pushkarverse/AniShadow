export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-sm font-medium text-white/40">{label}</span>
    </div>
  );
}

export default PageLoader;
