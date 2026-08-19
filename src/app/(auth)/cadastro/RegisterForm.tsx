"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction, type FormState } from "@/lib/actions/auth";
import { lookupCep } from "@/lib/cep";
import { Button } from "@/components/ui/Button";

const initial: FormState = {};
const inputClass = "h-12 rounded-xl border border-line bg-white/80 px-4 text-sm outline-none transition duration-200 placeholder:text-ink-muted/70 hover:border-brand/40 focus:-translate-y-0.5 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <span className="text-xs text-deal">{errors[0]}</span> : null;
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  const fe = state.fieldErrors ?? {};
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [challenge, setChallenge] = useState(() => Math.floor(Math.random() * 4) + 5);

  async function handleCepBlur() {
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepStatus("loading");
    const result = await lookupCep(cep);
    setCepStatus(result ? "found" : "notfound");
    if (!result) return;
    for (const [name, value] of [["street", result.street], ["neighborhood", result.neighborhood], ["city", result.city], ["state", result.state]]) {
      const field = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
      if (field) field.value = value;
    }
  }

  return (
    <form action={action} className="grid gap-6 sm:grid-cols-2">
      {state.error && <p className="rounded-xl bg-deal/10 px-4 py-3 text-sm text-deal sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2"><p className="text-xs font-black uppercase tracking-[.18em] text-brand">Comece por aqui</p><h2 className="mt-2 font-display text-2xl font-bold">Uma conta feita para você</h2><p className="mt-1 text-sm text-ink-soft">Preencha seus dados e deixe suas próximas compras mais rápidas.</p></div>

      <section className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <h3 className="text-sm font-bold sm:col-span-2">Seus dados</h3>
        <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="text-sm font-medium">Nome completo</span><input name="name" autoComplete="name" required className={inputClass} placeholder="Como podemos chamar você?" /><FieldError errors={fe.name} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">CPF</span><input name="cpf" inputMode="numeric" required value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} maxLength={14} className={inputClass} placeholder="000.000.000-00" /><FieldError errors={fe.cpf} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Celular com DDD</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} maxLength={15} className={inputClass} placeholder="(11) 99999-9999" /><FieldError errors={fe.phone} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Data de nascimento</span><input name="dateOfBirth" type="date" autoComplete="bday" required className={inputClass} /><FieldError errors={fe.dateOfBirth} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Sexo</span><select name="gender" required defaultValue="" className={inputClass}><option value="" disabled>Selecione uma opção</option><option>Feminino</option><option>Masculino</option><option>Não binário</option><option>Outro</option><option>Prefiro não informar</option></select><FieldError errors={fe.gender} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Como conheceu a Voltaria?</span><select name="referralSource" required defaultValue="" className={inputClass}><option value="" disabled>Selecione uma opção</option><option>Busca na internet</option><option>Instagram ou TikTok</option><option>Indicação de alguém</option><option>Publicidade</option><option>Outro</option></select><FieldError errors={fe.referralSource} /></label>
        <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="text-sm font-medium">E-mail</span><input name="email" type="email" autoComplete="email" required className={inputClass} placeholder="voce@email.com" /><FieldError errors={fe.email} /></label>
      </section>

      <section className="grid gap-4 border-t border-line pt-5 sm:col-span-2 sm:grid-cols-2">
        <h3 className="text-sm font-bold sm:col-span-2">Seu endereço principal</h3>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">CEP</span><input name="cep" inputMode="numeric" autoComplete="postal-code" required value={cep} onChange={(e) => setCep(formatCep(e.target.value))} onBlur={handleCepBlur} maxLength={9} className={inputClass} placeholder="00000-000" /><FieldError errors={fe.cep} />{cepStatus === "loading" && <span className="text-xs text-ink-muted">Buscando endereço...</span>}{cepStatus === "notfound" && <span className="text-xs text-deal">CEP não encontrado. Confira os dados.</span>}</label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Número</span><input name="number" required className={inputClass} placeholder="Ex.: 120" /><FieldError errors={fe.number} /></label>
        <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="text-sm font-medium">Rua</span><input name="street" required className={inputClass} placeholder="Preenchida automaticamente pelo CEP" /><FieldError errors={fe.street} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Complemento <span className="font-normal text-ink-muted">(opcional)</span></span><input name="complement" className={inputClass} placeholder="Apto, bloco..." /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Bairro</span><input name="neighborhood" required className={inputClass} /><FieldError errors={fe.neighborhood} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Cidade</span><input name="city" required className={inputClass} /><FieldError errors={fe.city} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">UF</span><select name="state" required defaultValue="" className={inputClass}><option value="" disabled>Selecione o estado</option>{brazilianStates.map(([acronym, name]) => <option key={acronym} value={acronym}>{acronym} - {name}</option>)}</select><FieldError errors={fe.state} /></label>
      </section>

      <section className="grid gap-4 border-t border-line pt-5 sm:col-span-2 sm:grid-cols-2">
        <h3 className="text-sm font-bold sm:col-span-2">Proteja sua conta</h3>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Senha</span><input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required className={inputClass} placeholder="Mínimo 8 caracteres" /><FieldError errors={fe.password} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Confirmar senha</span><input name="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" required className={inputClass} placeholder="Repita a senha" /><FieldError errors={fe.confirm} /></label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft sm:col-span-2"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="h-4 w-4 accent-brand" />Mostrar senhas</label>
        <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-4 sm:col-span-2"><p className="text-sm font-bold">Confirme que você é uma pessoa</p><p className="mt-1 text-xs text-ink-muted">Quanto é <strong>{challenge - 2} + 2</strong>?</p><input type="hidden" name="captchaChallenge" value={challenge} /><input name="captchaAnswer" inputMode="numeric" required className={`${inputClass} mt-3 w-full sm:w-40`} placeholder="Sua resposta" /><FieldError errors={fe.captchaAnswer} /><button type="button" onClick={() => setChallenge(Math.floor(Math.random() * 4) + 5)} className="mt-2 block text-xs font-medium text-brand hover:underline">Gerar outro desafio</button></div>
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
      </section>

      <fieldset className="space-y-2 rounded-xl border border-line bg-mist/60 p-4 sm:col-span-2"><legend className="px-1 text-xs font-black uppercase tracking-[.12em] text-ink-muted">Preferências de comunicação</legend><p className="mb-3 text-xs text-ink-muted">As duas opções começam ativas. Você pode desmarcar qualquer uma agora ou depois.</p><label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm shadow-sm"><input type="checkbox" name="allowWhatsappUpdates" defaultChecked className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" /><span><strong className="block">WhatsApp</strong><small className="text-ink-muted">Atualizações e novidades no celular informado.</small></span></label><label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm shadow-sm"><input type="checkbox" name="allowEmailUpdates" defaultChecked className="mt-0.5 h-4 w-4 shrink-0 accent-brand" /><span><strong className="block">E-mail</strong><small className="text-ink-muted">Atualizações e novidades no e-mail da conta.</small></span></label></fieldset>
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full shadow-pop sm:col-span-2">{pending ? "Criando conta..." : "Criar minha conta"}</Button>
      <p className="text-center text-xs text-ink-muted sm:col-span-2">Ao criar a conta, você concorda com a Política de Privacidade e o tratamento dos seus dados conforme a LGPD.</p>
      <p className="text-center text-sm text-ink-soft sm:col-span-2">Já tem conta? <Link href="/login" className="font-medium text-brand hover:underline">Entrar</Link></p>
    </form>
  );
}

function formatCpf(value: string) { return value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }
function formatPhone(value: string) { const digits = value.replace(/\D/g, "").slice(0, 11); if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2"); return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2"); }
function formatCep(value: string) { const digits = value.replace(/\D/g, "").slice(0, 8); return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits; }
const brazilianStates = [["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]] as const;
