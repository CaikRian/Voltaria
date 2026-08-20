import "server-only";

function senderFromEnv(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  return match ? { name: match[1].trim() || "Heca Store", email: match[2].trim() } : { name: "Heca Store", email: value.trim() };
}

export function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

export async function sendBrevoEmail(input: { to: string; toName?: string | null; subject: string; html: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, error: "BREVO_API_KEY ou EMAIL_FROM ausente." };
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender: senderFromEnv(from), to: [{ email: input.to, ...(input.toName ? { name: input.toName } : {}) }], subject: input.subject, htmlContent: input.html }),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: `Brevo respondeu HTTP ${response.status}: ${(await response.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha desconhecida ao acessar a Brevo." };
  }
}
