export default function ProdutosLoading() {
  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-7 w-48 animate-pulse rounded-lg bg-mist" />
          <div className="mt-2 h-4 w-24 animate-pulse rounded bg-mist" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-lg bg-mist" />
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="mb-3 h-4 w-20 animate-pulse rounded bg-mist" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-mist" />
            ))}
          </div>
        </aside>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-xl2 border border-line bg-paper">
              <div className="aspect-square animate-pulse bg-mist" />
              <div className="flex flex-col gap-2 p-4">
                <div className="h-3 w-16 animate-pulse rounded bg-mist" />
                <div className="h-4 w-full animate-pulse rounded bg-mist" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-mist" />
                <div className="mt-2 h-5 w-20 animate-pulse rounded bg-mist" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
