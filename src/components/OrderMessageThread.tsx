"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/Button";
import { sendOrderMessageAction, sendOrderReplyAction, closeOrderChatAction } from "@/lib/actions/orders";

type MessageUser = {
  name?: string | null;
  email?: string | null;
};

type Message = {
  id: string;
  text: string;
  senderRole: string;
  createdAt: Date;
  user?: MessageUser | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
};

type Props = {
  orderId: string;
  mode: "customer" | "staff";
  messages: Message[];
  closed?: boolean;
};

const formatSender = (role: string) => {
  switch (role) {
    case "CLIENTE":
      return "Cliente";
    case "VENDEDOR":
      return "Vendedor";
    case "GERENTE":
      return "Gerente";
    case "ADMIN":
      return "Admin";
    default:
      return "Equipe";
  }
};

export function OrderMessageThread({ orderId, mode, messages, closed = false }: Props) {
  const router = useRouter();
  const latestId = messages.at(-1)?.id ?? null;
  const knownLatest = useRef<string | null>(latestId);
  const [liveNotice, setLiveNotice] = useState(false);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<{ url: string; type: "IMAGE"; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const action =
    mode === "customer"
      ? sendOrderMessageAction.bind(null, orderId)
      : sendOrderReplyAction.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, {});
  const [closeState, closeAction, closePending] = useActionState(
    closeOrderChatAction.bind(null, orderId),
    {}
  );

  useEffect(() => { knownLatest.current = latestId; }, [latestId]);
  useEffect(() => { if (state.success) { setText(""); setAttachment(null); } }, [state.success]);
  useEffect(() => { const area = messageAreaRef.current; if (area && !query) area.scrollTop = area.scrollHeight; }, [messages.length, query]);
  useEffect(() => {
    let active = true;
    async function syncMessages() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/pedidos/${orderId}/mensagens`, { cache: "no-store" });
        if (!response.ok || !active) return;
        const data = await response.json() as { last: { id: string } | null };
        if (data.last?.id && knownLatest.current && data.last.id !== knownLatest.current) {
          knownLatest.current = data.last.id;
          setLiveNotice(true);
          router.refresh();
        }
      } catch { /* uma falha momentânea não interrompe o chat */ }
    }
    const timer = window.setInterval(syncMessages, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderId, router]);

  async function uploadFile(file: File) {
    setMediaError(null);
    setUploading(true);
    try {
      const blob = await upload(`chat/${orderId}/${file.name}`, file, { access: "public", handleUploadUrl: "/api/chat/upload", clientPayload: JSON.stringify({ orderId }) });
      setAttachment({ url: blob.url, type: "IMAGE", name: file.name });
    } catch (error) { setMediaError(error instanceof Error ? error.message : "Não foi possível anexar o arquivo."); }
    finally { setUploading(false); }
  }

  function boldSelection() {
    const input = textareaRef.current; if (!input) return;
    const start = input.selectionStart; const end = input.selectionEnd;
    const selected = text.slice(start, end) || "texto em negrito";
    setText(`${text.slice(0, start)}**${selected}**${text.slice(end)}`);
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + 2, start + 2 + selected.length); });
  }

  const visibleMessages = query.trim() ? messages.filter((message) => message.text.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))) : messages;
  const quickReplies = ["Olá! Já estamos verificando para você.", "Seu pedido está em preparação e avisaremos assim que for enviado.", "Obrigado pelas informações. Retornaremos com uma atualização em breve."];
  function addEmoji(emoji: string) { setText((current) => `${current}${emoji}`); textareaRef.current?.focus(); }
  async function copyMessage(message: Message) { await navigator.clipboard.writeText(message.text); setCopiedId(message.id); window.setTimeout(() => setCopiedId(null), 1500); }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-pop">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-brand-dark px-5 py-4 text-white">
        <div><p className="font-display font-semibold">Chat do pedido</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/65"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Atualização automática ativa</p></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowSearch((value) => !value)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-sm hover:bg-white/20" title="Buscar na conversa">⌕</button>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/75">
            {messages.length} {messages.length === 1 ? "mensagem" : "mensagens"}
          </span>
          {mode === "staff" && !closed && (
            <form action={closeAction}>
              <button
                type="submit"
                disabled={closePending}
                className="text-xs font-medium text-white/65 hover:text-white hover:underline"
              >
                {closePending ? "Fechando..." : "Fechar conversa"}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5">
      {showSearch && <div className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-mist px-3"><span className="text-ink-muted">⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar uma mensagem..." className="h-10 flex-1 bg-transparent text-sm outline-none" /><span className="text-xs text-ink-muted">{visibleMessages.length} resultado(s)</span><button type="button" onClick={() => { setQuery(""); setShowSearch(false); }} className="h-7 w-7 rounded-lg hover:bg-white">×</button></div>}
      {liveNotice && <button type="button" onClick={() => setLiveNotice(false)} className="mb-3 flex w-full items-center justify-between rounded-xl border border-brand/20 bg-brand-soft px-3 py-2 text-left text-xs font-semibold text-brand-dark"><span><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />Nova mensagem recebida automaticamente</span><span>×</span></button>}

      {closeState.error && <p className="mb-3 text-xs text-red-600">{closeState.error}</p>}

      {closed && (
        <p className="mb-3 rounded-xl border border-line bg-mist px-3 py-2 text-xs text-ink-muted">
          Esta conversa foi encerrada{mode === "staff" ? " (manualmente ou por 3 dias sem resposta do cliente)" : ""}.
          Enviar uma nova mensagem reabre o chat automaticamente.
        </p>
      )}

      <div ref={messageAreaRef} className="mb-4 flex min-h-72 max-h-[32rem] flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-gradient-to-b from-mist to-white p-4 scroll-smooth">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-muted">Ainda não há mensagens nesta compra.</p>
        ) : visibleMessages.length === 0 ? (
          <div className="m-auto text-center"><p className="font-medium">Nenhuma mensagem encontrada</p><p className="mt-1 text-xs text-ink-muted">Tente buscar por outro termo.</p></div>
        ) : (
          visibleMessages.map((message, index) => {
            const isClient = message.senderRole === "CLIENTE";
            const isOwn = mode === "customer" ? isClient : !isClient;
            const dateLabel = new Date(message.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
            const previousDate = index ? new Date(visibleMessages[index - 1].createdAt).toDateString() : null;
            const showDate = previousDate !== new Date(message.createdAt).toDateString();
            return (
              <div key={message.id}>
              {showDate && <div className="my-3 flex items-center gap-3"><span className="h-px flex-1 bg-line" /><span className="rounded-full border border-line bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{dateLabel}</span><span className="h-px flex-1 bg-line" /></div>}
              <div
                className={`group flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm ${
                    isOwn
                      ? "rounded-br-md border-brand/30 bg-brand text-white"
                      : "rounded-bl-md border-line bg-white text-ink"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <strong className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${isOwn ? "text-white/80" : "text-ink-muted"}`}>
                      {formatSender(message.senderRole)}
                    </strong>
                    <span className={`text-[10px] ${isOwn ? "text-white/70" : "text-ink-muted"}`}>
                      {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <RichMessage text={message.text} />
                  {message.attachmentType === "IMAGE" && message.attachmentUrl && <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer"><img src={message.attachmentUrl} alt={message.attachmentName ?? "Imagem anexada"} className="mt-2 max-h-72 w-full rounded-xl object-cover" /></a>}
                  <button type="button" onClick={() => copyMessage(message)} className={`mt-2 text-[10px] font-semibold opacity-0 transition group-hover:opacity-100 ${isOwn ? "text-white/70" : "text-brand"}`}>{copiedId === message.id ? "Copiada ✓" : "Copiar mensagem"}</button>
                </div>
              </div>
              </div>
            );
          })
        )}
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state.success && (
          <p className="text-xs text-green-600">Mensagem enviada com sucesso.</p>
        )}
        {state.fieldErrors?.text && (
          <p className="text-xs text-red-600">{state.fieldErrors.text[0]}</p>
        )}
        <input type="hidden" name="attachmentUrl" value={attachment?.url ?? ""} /><input type="hidden" name="attachmentType" value={attachment?.type ?? ""} /><input type="hidden" name="attachmentName" value={attachment?.name ?? ""} />
        {mode === "staff" && <div className="flex gap-2 overflow-x-auto pb-1">{quickReplies.map((reply) => <button key={reply} type="button" onClick={() => { setText(reply); textareaRef.current?.focus(); }} className="shrink-0 rounded-full border border-brand/20 bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-dark hover:bg-brand hover:text-white">{reply}</button>)}</div>}
        <div className="overflow-hidden rounded-2xl border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
        <div className="flex items-center gap-1 border-b border-line bg-mist/70 px-2 py-1.5"><button type="button" onClick={boldSelection} title="Negrito" className="grid h-8 w-8 place-items-center rounded-lg font-serif font-bold hover:bg-white">B</button><label title="Anexar imagem" className="grid h-8 cursor-pointer place-items-center rounded-lg px-2 text-sm hover:bg-white">▧ Imagem<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadFile(file); event.target.value = ""; }} /></label><span className="mx-1 h-5 w-px bg-line" />{["😊", "👍", "✅", "📦", "🙏"].map((emoji) => <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white">{emoji}</button>)}<span className="ml-auto hidden px-2 text-[10px] text-ink-muted sm:block">Ctrl + Enter para enviar</span></div>
        <textarea
          ref={textareaRef}
          name="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); formRef.current?.requestSubmit(); } }}
          maxLength={2000}
          rows={3}
          placeholder={
            mode === "customer"
              ? "Escreva uma mensagem para a equipe sobre seu pedido..."
              : "Responder ao cliente sobre o pedido..."
          }
          className="w-full resize-none border-0 bg-white px-4 py-3 text-sm outline-none"
        />
        <div className="flex justify-end px-3 pb-2 text-[10px] text-ink-muted">{text.length}/2000</div>
        </div>
        {uploading && <p className="text-xs font-medium text-brand"><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />Enviando anexo com segurança...</p>}
        {mediaError && <p className="text-xs text-red-600">{mediaError}</p>}
        {attachment && <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft p-3"><img src={attachment.url} alt="Prévia" className="h-14 w-14 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-xs font-medium">{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white">×</button></div>}
        <Button type="submit" disabled={pending || uploading || (!text.trim() && !attachment)} className="w-full">
          {pending
            ? mode === "customer"
              ? "Enviando..."
              : "Respondendo..."
            : mode === "customer"
              ? "Enviar mensagem"
              : "Responder no chat"}
        </Button>
      </form>
      </div>
    </div>
  );
}

function RichMessage({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <p className="whitespace-pre-wrap leading-relaxed">{parts.map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part}</span>)}</p>;
}
