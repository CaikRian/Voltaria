import { formatBRL, discountPercent, installments } from "@/lib/format";

export function Price({
  priceCents,
  compareCents,
  size = "md",
  showInstallments = false,
}: {
  priceCents: number;
  compareCents?: number | null;
  size?: "sm" | "md" | "lg";
  showInstallments?: boolean;
}) {
  const off = discountPercent(priceCents, compareCents);
  const parc = installments(priceCents);

  const priceClass =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`font-display font-semibold text-ink ${priceClass}`}>
          {formatBRL(priceCents)}
        </span>
        {compareCents && off ? (
          <span className="text-sm text-ink-muted line-through">{formatBRL(compareCents)}</span>
        ) : null}
        {off ? (
          <span className="rounded-md bg-deal/10 px-1.5 py-0.5 text-xs font-semibold text-deal">
            -{off}%
          </span>
        ) : null}
      </div>
      {showInstallments && (
        <p className="mt-1 text-sm text-ink-muted">
          em até {parc.count}x de {formatBRL(parc.cents)} sem juros
        </p>
      )}
    </div>
  );
}
