export default function ProdutoLoading() {
  return (
    <div className="container-x py-8">
      <div className="mb-6 h-4 w-64 animate-pulse rounded bg-mist" />

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-xl2 border border-line bg-mist" />

        <div className="flex flex-col gap-4">
          <div className="h-3 w-20 animate-pulse rounded bg-mist" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-mist" />
          <div className="h-6 w-32 animate-pulse rounded bg-mist" />
          <div className="mt-2 flex flex-col gap-2">
            <div className="h-4 w-full animate-pulse rounded bg-mist" />
            <div className="h-4 w-full animate-pulse rounded bg-mist" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-mist" />
          </div>
          <div className="mt-4 h-12 w-48 animate-pulse rounded-xl bg-mist" />
        </div>
      </div>
    </div>
  );
}
