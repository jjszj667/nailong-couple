export default function Loading() {
  return (
    <main className="page-shell py-8">
      <div className="mb-6 h-36 animate-pulse rounded-[2rem] bg-amber-100/70" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-36 animate-pulse rounded-[1.75rem] bg-white/80" />)}
      </div>
    </main>
  );
}
