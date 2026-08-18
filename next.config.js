/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Imagem de produto é só URL (ver CLAUDE.md — sem upload ainda), preenchida
    // por quem tem product:create/product:update (VENDEDOR/GERENTE/ADMIN, nunca
    // input público). O Zod já aceita qualquer URL válida em imageUrl, então
    // restringir aqui a uma lista fixa de hosts só ia gerar essa mesma tela de
    // erro toda vez que alguém colasse uma URL de um domínio novo — liberamos
    // qualquer host https, coerente com quem já pode preencher esse campo.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

module.exports = nextConfig;
