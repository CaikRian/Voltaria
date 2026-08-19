import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const PROVIDER = "MELHOR_ENVIO";
const SCOPES = [
  "cart-read", "cart-write", "orders-read", "purchases-read",
  "shipping-calculate", "shipping-companies", "shipping-checkout",
  "shipping-generate", "shipping-preview", "shipping-print", "shipping-tracking",
].join(" ");

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

export function melhorEnvioBaseUrl() {
  return process.env.MELHOR_ENVIO_SANDBOX === "true"
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";
}

function encryptionKey() {
  return createHash("sha256").update(required("AUTH_SECRET")).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function createOAuthState() {
  const payload = Buffer.from(JSON.stringify({ expiresAt: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", required("AUTH_SECRET")).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function validateOAuthState(state: string) {
  try {
    const [payload, signature] = state.split(".");
    const expected = createHmac("sha256", required("AUTH_SECRET")).update(payload).digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now();
  } catch { return false; }
}

export function getAuthorizationUrl() {
  const params = new URLSearchParams({
    client_id: required("MELHOR_ENVIO_CLIENT_ID"),
    redirect_uri: required("MELHOR_ENVIO_REDIRECT_URI"),
    response_type: "code",
    state: createOAuthState(),
    scope: SCOPES,
  });
  return `${melhorEnvioBaseUrl()}/oauth/authorize?${params}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch(`${melhorEnvioBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`Melhor Envio OAuth falhou (${response.status}).`);
  return data as TokenResponse;
}

async function saveTokens(tokens: TokenResponse, previousRefresh?: string) {
  const refresh = tokens.refresh_token ?? previousRefresh;
  await prisma.integrationCredential.upsert({
    where: { provider: PROVIDER },
    create: {
      provider: PROVIDER,
      encryptedAccessToken: encrypt(tokens.access_token),
      encryptedRefreshToken: refresh ? encrypt(refresh) : null,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
    update: {
      encryptedAccessToken: encrypt(tokens.access_token),
      encryptedRefreshToken: refresh ? encrypt(refresh) : null,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
}

export async function exchangeAuthorizationCode(code: string) {
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    client_id: required("MELHOR_ENVIO_CLIENT_ID"),
    client_secret: required("MELHOR_ENVIO_CLIENT_SECRET"),
    redirect_uri: required("MELHOR_ENVIO_REDIRECT_URI"),
    code,
  });
  await saveTokens(tokens);
}

export async function getMelhorEnvioAccessToken() {
  const credential = await prisma.integrationCredential.findUnique({ where: { provider: PROVIDER } });
  if (!credential) throw new Error("Melhor Envio ainda não foi autorizado.");
  if (credential.expiresAt.getTime() > Date.now() + 5 * 60 * 1000) return decrypt(credential.encryptedAccessToken);
  if (!credential.encryptedRefreshToken) throw new Error("Melhor Envio precisa ser autorizado novamente.");
  const refreshToken = decrypt(credential.encryptedRefreshToken);
  const tokens = await tokenRequest({
    grant_type: "refresh_token",
    client_id: required("MELHOR_ENVIO_CLIENT_ID"),
    client_secret: required("MELHOR_ENVIO_CLIENT_SECRET"),
    refresh_token: refreshToken,
  });
  await saveTokens(tokens, refreshToken);
  return tokens.access_token;
}

export async function melhorEnvioFetch(path: string, init: RequestInit = {}) {
  const token = await getMelhorEnvioAccessToken();
  return fetch(`${melhorEnvioBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": required("MELHOR_ENVIO_USER_AGENT"),
      ...init.headers,
    },
    cache: "no-store",
  });
}
