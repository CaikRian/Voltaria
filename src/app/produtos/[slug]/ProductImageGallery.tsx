"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductImageGallery({ name, images, discount, hasStock }: { name: string; images: string[]; discount: number; hasStock: boolean }) {
  const uniqueImages = [...new Set(images.filter(Boolean))];
  const [selected, setSelected] = useState(0);
  const current = uniqueImages[selected] ?? uniqueImages[0];

  return <div>
    <div className="relative aspect-square overflow-hidden rounded-xl2 border border-line bg-paper shadow-card">
      {current && <Image key={current} src={current} alt={`${name}${selected ? ` — imagem ${selected + 1}` : ""}`} fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover transition-transform duration-500 hover:scale-[1.02]" priority={selected === 0} />}
      {discount > 0 && <span className="absolute left-4 top-4 rounded-full bg-deal px-3 py-1.5 text-sm font-bold text-white shadow-pop">{discount}% OFF</span>}
      <span className={`absolute bottom-4 left-4 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm ${hasStock ? "text-ok" : "text-deal"}`}>{hasStock ? "Disponível para envio" : "Produto esgotado"}</span>
      {uniqueImages.length > 1 && <span className="absolute bottom-4 right-4 rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">{selected + 1}/{uniqueImages.length}</span>}
    </div>
    {uniqueImages.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Imagens do produto">{uniqueImages.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setSelected(index)} aria-label={`Visualizar imagem ${index + 1}`} aria-pressed={selected === index} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-paper transition ${selected === index ? "border-brand shadow-card ring-2 ring-brand/10" : "border-line opacity-70 hover:border-brand/50 hover:opacity-100"}`}><Image src={image} alt="" fill sizes="80px" className="object-cover" /></button>)}</div>}
  </div>;
}
