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
  const [attachment, setAttachment] = useState<{ url: string; type: "IMAGE" | "AUDIO"; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
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

  async function uploadFile(file: File, type: "IMAGE" | "AUDIO") {
    setMediaError(null);
    setUploading(true);
    try {
      const blob = await upload(`chat/${orderId}/${file.name}`, file, { access: "public", handleUploadUrl: "/api/chat/upload", clientPayload: JSON.stringify({ orderId }) });
      setAttachment({ url: blob.url, type, name: file.name });
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

  async function toggleRecording() {
    if (recording) { recorderRef.current?.stop(); return; }
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = []; const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => { stream.getTracks().forEach((track) => track.stop()); setRecording(false); const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" }); await uploadFile(new File([blob], `audio-${Date.now()}.webm`, { type: blob.type }), "AUDIO"); };
      recorderRef.current = recorder; recorder.start(); setRecording(true);
    } catch { setMediaError("Não foi possível acessar o microfone. Verifique a permissão do navegador."); }
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-pop">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-brand-dark px-5 py-4 text-white">
        <div><p className="font-display font-semibold">Chat do pedido</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/65"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Atualização automática ativa</p></div>
        <div className="flex items-center gap-3">
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
      {liveNotice && <button type="button" onClick={() => setLiveNotice(false)} className="mb-3 flex w-full items-center justify-between rounded-xl border border-brand/20 bg-brand-soft px-3 py-2 text-left text-xs font-semibold text-brand-dark"><span><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />Nova mensagem recebida automaticamente</span><span>×</span></button>}

      {closeState.error && <p className="mb-3 text-xs text-red-600">{closeState.error}</p>}

      {closed && (
        <p className="mb-3 rounded-xl border border-line bg-mist px-3 py-2 text-xs text-ink-muted">
          Esta conversa foi encerrada{mode === "staff" ? " (manualmente ou por 3 dias sem resposta do cliente)" : ""}.
          Enviar uma nova mensagem reabre o chat automaticamente.
        </p>
      )}

      <div className="mb-4 flex min-h-72 max-h-[32rem] flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-gradient-to-b from-mist to-white p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-muted">Ainda não há mensagens nesta compra.</p>
        ) : (
          messages.map((message) => {
            const isClient = message.senderRole === "CLIENTE";
            return (
              <div
                key={message.id}
                className={`flex ${isClient ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm ${
                    isClient
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-brand/30 bg-brand text-white"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <strong className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${isClient ? "text-amber-700" : "text-white/80"}`}>
                      {formatSender(message.senderRole)}
                    </strong>
                    <span className={`text-[10px] ${isClient ? "text-amber-700/80" : "text-white/70"}`}>
                      {new Date(message.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <RichMessage text={message.text} />
                  {message.attachmentType === "IMAGE" && message.attachmentUrl && <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer"><img src={message.attachmentUrl} alt={message.attachmentName ?? "Imagem anexada"} className="mt-2 max-h-72 w-full rounded-xl object-cover" /></a>}
                  {message.attachmentType === "AUDIO" && message.attachmentUrl && <audio controls preload="metadata" src={message.attachmentUrl} className="mt-2 h-10 w-full min-w-56" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state.success && (
          <p className="text-xs text-green-600">Mensagem enviada com sucesso.</p>
        )}
        {state.fieldErrors?.text && (
          <p className="text-xs text-red-600">{state.fieldErrors.text[0]}</p>
        )}
        <input type="hidden" name="attachmentUrl" value={attachment?.url ?? ""} /><input type="hidden" name="attachmentType" value={attachment?.type ?? ""} /><input type="hidden" name="attachmentName" value={attachment?.name ?? ""} />
        <div className="overflow-hidden rounded-2xl border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
        <div className="flex items-center gap-1 border-b border-line bg-mist/70 px-2 py-1.5"><button type="button" onClick={boldSelection} title="Negrito" className="grid h-8 w-8 place-items-center rounded-lg font-serif font-bold hover:bg-white">B</button><label title="Anexar imagem" className="grid h-8 cursor-pointer place-items-center rounded-lg px-2 text-sm hover:bg-white">▧<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadFile(file, "IMAGE"); event.target.value = ""; }} /></label><button type="button" onClick={toggleRecording} title={recording ? "Parar gravação" : "Gravar áudio"} className={`grid h-8 place-items-center rounded-lg px-2 text-sm ${recording ? "bg-red-100 font-semibold text-red-700" : "hover:bg-white"}`}>{recording ? "■ Gravando..." : "● Áudio"}</button><span className="ml-auto px-2 text-[10px] text-ink-muted">Use **texto** para negrito</span></div>
        <textarea
          ref={textareaRef}
          name="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder={
            mode === "customer"
              ? "Escreva uma mensagem para a equipe sobre seu pedido..."
              : "Responder ao cliente sobre o pedido..."
          }
          className="w-full resize-none border-0 bg-white px-4 py-3 text-sm outline-none"
        />
        </div>
        {uploading && <p className="text-xs font-medium text-brand"><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />Enviando anexo com segurança...</p>}
        {mediaError && <p className="text-xs text-red-600">{mediaError}</p>}
        {attachment && <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">{attachment.type === "AUDIO" ? "●" : "▧"}</span><span className="min-w-0 flex-1 truncate text-xs font-medium">{attachment.name}</span>{attachment.type === "AUDIO" && <audio controls src={attachment.url} className="h-8 max-w-40" />}<button type="button" onClick={() => setAttachment(null)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white">×</button></div>}
        <Button type="submit" disabled={pending || uploading || recording || (!text.trim() && !attachment)} className="w-full">
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
