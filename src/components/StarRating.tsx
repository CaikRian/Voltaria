export function StarRating({ value, outOf = 5 }: { value: number; outOf?: number }) {
  const rounded = Math.round(value);
  return (
    <span aria-label={`${value.toFixed(1)} de ${outOf} estrelas`} className="text-brand">
      {Array.from({ length: outOf }, (_, i) => (i < rounded ? "★" : "☆")).join("")}
    </span>
  );
}
