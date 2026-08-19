"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type SiteLanguage = "pt-BR" | "en" | "es";
type Preferences = { theme: ThemePreference; language: SiteLanguage; setTheme(value:ThemePreference):void; setLanguage(value:SiteLanguage):void };
const KEY = "heca-site-preferences-v1";
const Context = createContext<Preferences | null>(null);

function apply(theme:ThemePreference, language:SiteLanguage) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = theme;
  document.documentElement.lang = language;
}

export function SitePreferencesProvider({children}:{children:React.ReactNode}) {
  const [theme,setThemeState] = useState<ThemePreference>("system");
  const [language,setLanguageState] = useState<SiteLanguage>("pt-BR");
  useEffect(()=>{ try { const saved=JSON.parse(localStorage.getItem(KEY)??"null"); const nextTheme:[ThemePreference][number]=["system","light","dark"].includes(saved?.theme)?saved.theme:"system"; const nextLanguage:[SiteLanguage][number]=["pt-BR","en","es"].includes(saved?.language)?saved.language:"pt-BR"; setThemeState(nextTheme); setLanguageState(nextLanguage); apply(nextTheme,nextLanguage); } catch { apply("system","pt-BR"); } },[]);
  useEffect(()=>{ const media=matchMedia("(prefers-color-scheme: dark)"); const sync=()=>apply(theme,language); media.addEventListener("change",sync); apply(theme,language); return()=>media.removeEventListener("change",sync); },[theme,language]);
  function save(nextTheme:ThemePreference,nextLanguage:SiteLanguage){localStorage.setItem(KEY,JSON.stringify({theme:nextTheme,language:nextLanguage}));apply(nextTheme,nextLanguage);}
  const setTheme=(value:ThemePreference)=>{setThemeState(value);save(value,language)}; const setLanguage=(value:SiteLanguage)=>{setLanguageState(value);save(theme,value)};
  return <Context.Provider value={{theme,language,setTheme,setLanguage}}>{children}</Context.Provider>;
}
export function useSitePreferences(){const value=useContext(Context);if(!value)throw new Error("SitePreferencesProvider ausente");return value;}

const labels={"pt-BR":{button:"Aparência e idioma",appearance:"Aparência",language:"Idioma",system:"Padrão",light:"Claro",dark:"Noturno",portuguese:"Português",english:"English",spanish:"Español"},en:{button:"Appearance and language",appearance:"Appearance",language:"Language",system:"System",light:"Light",dark:"Dark",portuguese:"Português",english:"English",spanish:"Español"},es:{button:"Apariencia e idioma",appearance:"Apariencia",language:"Idioma",system:"Sistema",light:"Claro",dark:"Nocturno",portuguese:"Português",english:"English",spanish:"Español"}};
export function SitePreferencesMenu(){const {theme,language,setTheme,setLanguage}=useSitePreferences();const [open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);const l=labels[language];useEffect(()=>{const close=(event:MouseEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);return <div ref={ref} className="relative"><button type="button" onClick={()=>setOpen(v=>!v)} aria-label={l.button} title={l.button} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-paper text-lg hover:bg-brand-soft">{theme==="dark"?"☾":theme==="light"?"☀":"◐"}</button>{open&&<div className="fixed left-3 right-3 top-[68px] z-[70] rounded-2xl border border-line bg-paper p-4 text-ink shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-72"><p className="text-[10px] font-black uppercase tracking-wider text-ink-muted">{l.appearance}</p><div className="mt-2 grid grid-cols-3 gap-2">{([['system','◐',l.system],['light','☀',l.light],['dark','☾',l.dark]] as const).map(([value,icon,label])=><button key={value} onClick={()=>setTheme(value)} className={`rounded-xl border px-2 py-2 text-xs font-bold ${theme===value?'border-brand bg-brand text-white':'border-line bg-mist hover:border-brand'}`}><span className="block text-lg">{icon}</span>{label}</button>)}</div><p className="mt-4 text-[10px] font-black uppercase tracking-wider text-ink-muted">{l.language}</p><div className="mt-2 space-y-1">{([['pt-BR','🇧🇷',l.portuguese],['en','🇺🇸',l.english],['es','🇪🇸',l.spanish]] as const).map(([value,flag,label])=><button key={value} onClick={()=>setLanguage(value)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold ${language===value?'bg-brand-soft text-brand':'hover:bg-mist'}`}><span>{flag}</span><span className="flex-1">{label}</span>{language===value&&<span>✓</span>}</button>)}</div></div>}</div>}
