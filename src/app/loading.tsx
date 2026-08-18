export default function GlobalLoading() {
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-16" role="status" aria-live="polite">
      <div className="text-center">
        <div className="relative mx-auto h-20 w-20">
          <span className="absolute inset-0 rounded-2xl bg-brand-soft motion-safe:animate-ping" />
          <span className="relative grid h-20 w-20 place-items-center rounded-2xl bg-brand font-display text-3xl font-bold text-white shadow-pop motion-safe:animate-[loading-float_1.4s_ease-in-out_infinite]">
            V
          </span>
        </div>
        <p className="mt-6 font-display text-lg font-semibold">Preparando tudo para você</p>
        <p className="mt-1 text-sm text-ink-muted">Só um instante...</p>
        <div className="mx-auto mt-5 flex w-28 gap-1.5">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="h-1.5 flex-1 rounded-full bg-brand motion-safe:animate-pulse"
              style={{ animationDelay: `${item * 180}ms` }}
            />
          ))}
        </div>
        <span className="sr-only">Carregando página</span>
      </div>
    </div>
  );
}
