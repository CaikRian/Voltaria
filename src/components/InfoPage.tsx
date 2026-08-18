import Link from "next/link";

export type InfoSection = {
  title: string;
  text: string;
  items?: string[];
};

export function InfoPage({
  eyebrow,
  title,
  description,
  sections,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: InfoSection[];
  action?: { href: string; label: string; secondary?: string };
}) {
  return (
    <div className="container-x max-w-6xl py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-dark via-brand to-indigo-500 px-6 py-10 text-white shadow-pop sm:px-10 sm:py-14">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">{description}</p>
          {action && (
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href={action.href} className="inline-flex h-12 items-center rounded-xl bg-white px-5 text-sm font-bold text-brand-dark shadow-card transition hover:-translate-y-0.5">
                {action.label} <span className="ml-2">→</span>
              </Link>
              {action.secondary && <span className="text-sm text-white/75">{action.secondary}</span>}
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {sections.map((section, index) => (
          <section key={section.title} className={`rounded-xl2 border border-line bg-paper p-6 shadow-card ${sections.length % 2 === 1 && index === sections.length - 1 ? "md:col-span-2" : ""}`}>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-sm font-bold text-brand">{String(index + 1).padStart(2, "0")}</div>
            <h2 className="mt-4 font-display text-xl font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-7 text-ink-muted">{section.text}</p>
            {section.items && (
              <ul className="mt-4 space-y-3">
                {section.items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-ink-soft"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />{item}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
