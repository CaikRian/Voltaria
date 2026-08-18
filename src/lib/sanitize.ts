// Sanitização mínima sem dependências. Toda renderização no app usa interpolação
// JSX ({texto}), que já escapa <, >, &, aspas — o XSS já é neutralizado no render.
// Isto é defesa em profundidade: garante que NENHUMA tag HTML sobreviva no dado
// persistido, útil se o conteúdo um dia for usado fora do JSX (e-mail, export).
// Removemos os caracteres em vez de HTML-encodar (&lt;) pra evitar "double escaping"
// — encodar faria o JSX escapar o & de novo na exibição, mostrando "&lt;" literal.
export function sanitizeText(input: string): string {
  return input.replace(/[<>]/g, "").trim();
}
