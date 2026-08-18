import { STATUS_META } from "@/lib/order-status";

export function OrderStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as keyof typeof STATUS_META] ?? {
    label: status,
    badgeColor: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-block rounded px-2.5 py-1 text-xs font-semibold ${meta.badgeColor}`}>
      {meta.label}
    </span>
  );
}
