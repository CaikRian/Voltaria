"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; badge?: number };

export function PanelNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return <nav aria-label="Navegação do painel" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
    {items.map((item) => {
      const active = item.href === "/painel" ? pathname === item.href : pathname.startsWith(item.href);
      return <Link key={item.href} href={item.href} className={`flex min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-brand text-white shadow-card" : "text-ink-soft hover:bg-brand-soft hover:text-brand-dark"}`}>
        <span aria-hidden className={`grid h-7 w-7 place-items-center rounded-lg text-xs ${active ? "bg-white/15" : "bg-mist"}`}>{item.icon}</span>
        <span>{item.label}</span>
        {!!item.badge && <span className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${active ? "bg-white text-brand" : "bg-deal text-white"}`}>{item.badge > 99 ? "99+" : item.badge}</span>}
      </Link>;
    })}
  </nav>;
}
