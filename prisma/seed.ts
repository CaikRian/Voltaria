import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Imagens de placeholder estáveis (picsum). Troque pelas fotos reais dos produtos.
const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/800`;

async function main() {
  console.log("🌱 Limpando dados antigos...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log("🌱 Criando categorias...");
  const categorias = await Promise.all(
    [
      { name: "Smartphones", slug: "smartphones", icon: "📱" },
      { name: "Notebooks", slug: "notebooks", icon: "💻" },
      { name: "Áudio", slug: "audio", icon: "🎧" },
      { name: "Casa & Cozinha", slug: "casa-cozinha", icon: "🏠" },
      { name: "Acessórios", slug: "acessorios", icon: "🔌" },
      { name: "Games", slug: "games", icon: "🎮" },
    ].map((c) => prisma.category.create({ data: c }))
  );
  const cat = Object.fromEntries(categorias.map((c) => [c.slug, c.id]));

  console.log("🌱 Criando usuários de teste (senha: Senha123)...");
  const senhaHash = await bcrypt.hash("Senha123", 12);
  await prisma.user.createMany({
    data: [
      { email: "admin@voltaria.com", name: "Ana Admin", role: "ADMIN", passwordHash: senhaHash },
      { email: "gerente@voltaria.com", name: "Gabriel Gerente", role: "GERENTE", passwordHash: senhaHash },
      { email: "vendedor@voltaria.com", name: "Vera Vendedora", role: "VENDEDOR", passwordHash: senhaHash },
      { email: "cliente@voltaria.com", name: "Carlos Cliente", role: "CLIENTE", passwordHash: senhaHash },
    ],
  });

  console.log("🌱 Criando produtos...");
  const produtos = [
    {
      name: "Smartphone Aurora 5G 256GB",
      slug: "smartphone-aurora-5g-256gb",
      brand: "Nordika",
      description:
        "Tela AMOLED de 6,7\" a 120Hz, câmera tripla de 108MP e bateria de 5000mAh com carga rápida de 67W. Desempenho de topo para o dia a dia e jogos.",
      priceCents: 329900,
      compareCents: 399900,
      categoryId: cat["smartphones"],
      imageUrl: img("phone-aurora"),
      featured: true,
      variants: [
        { name: "256GB / Preto", sku: "AUR-256-PRE", stock: 12 },
        { name: "256GB / Azul", sku: "AUR-256-AZU", stock: 7 },
        { name: "512GB / Preto", sku: "AUR-512-PRE", priceCents: 379900, stock: 4 },
      ],
    },
    {
      name: "Notebook UltraBook Pro 14",
      slug: "notebook-ultrabook-pro-14",
      brand: "Kernel",
      description:
        "Processador de 8 núcleos, 16GB de RAM e SSD de 512GB. Tela IPS de 14\" com 100% sRGB e 14h de bateria. Corpo em alumínio de 1,2kg.",
      priceCents: 549900,
      compareCents: 629900,
      categoryId: cat["notebooks"],
      imageUrl: img("notebook-pro"),
      featured: true,
      variants: [
        { name: "16GB / 512GB SSD", sku: "UBP-16-512", stock: 9 },
        { name: "32GB / 1TB SSD", sku: "UBP-32-1TB", priceCents: 699900, stock: 3 },
      ],
    },
    {
      name: "Fone Bluetooth NoiseZero ANC",
      slug: "fone-bluetooth-noisezero-anc",
      brand: "Sonora",
      description:
        "Cancelamento ativo de ruído, até 40h de bateria e conexão multiponto. Estojo compacto com carga sem fio.",
      priceCents: 89900,
      compareCents: 119900,
      categoryId: cat["audio"],
      imageUrl: img("headphone-anc"),
      featured: true,
      stock: 30,
    },
    {
      name: "Smartwatch Pulse Fit",
      slug: "smartwatch-pulse-fit",
      brand: "Nordika",
      description:
        "Monitoramento de batimentos, SpO2, sono e mais de 100 modos esportivos. GPS integrado e à prova d'água (5ATM).",
      priceCents: 74900,
      categoryId: cat["acessorios"],
      imageUrl: img("smartwatch"),
      featured: true,
      variants: [
        { name: "Preto", sku: "PF-PRE", stock: 18 },
        { name: "Prata", sku: "PF-PRA", stock: 11 },
      ],
    },
    {
      name: "Console GameStation X",
      slug: "console-gamestation-x",
      brand: "Vertex",
      description:
        "Jogos em 4K a 120fps, SSD ultrarrápido de 1TB e controle sem fio com resposta háptica. Retrocompatível.",
      priceCents: 429900,
      categoryId: cat["games"],
      imageUrl: img("console"),
      featured: true,
      stock: 6,
    },
    {
      name: "Cafeteira Expresso Barista",
      slug: "cafeteira-expresso-barista",
      brand: "CasaViva",
      description:
        "Pressão de 20 bar, vaporizador para cappuccino e reservatório de 1,5L. Café de padaria em casa.",
      priceCents: 64900,
      compareCents: 79900,
      categoryId: cat["casa-cozinha"],
      imageUrl: img("coffee-machine"),
      stock: 15,
    },
    {
      name: "Aspirador Robô CleanBot",
      slug: "aspirador-robo-cleanbot",
      brand: "CasaViva",
      description:
        "Mapeamento a laser, controle por app e esvaziamento automático. Aspira e passa pano na mesma passada.",
      priceCents: 189900,
      compareCents: 229900,
      categoryId: cat["casa-cozinha"],
      imageUrl: img("robot-vacuum"),
      featured: true,
      stock: 8,
    },
    {
      name: "Teclado Mecânico Compact 65%",
      slug: "teclado-mecanico-compact-65",
      brand: "Kernel",
      description:
        "Switches hot-swap, iluminação RGB e conexão tri-mode (USB-C, Bluetooth e 2.4GHz). Layout ABNT2.",
      priceCents: 44900,
      categoryId: cat["acessorios"],
      imageUrl: img("keyboard"),
      variants: [
        { name: "Switch Marrom", sku: "TM65-MAR", stock: 22 },
        { name: "Switch Vermelho", sku: "TM65-VER", stock: 14 },
      ],
    },
    {
      name: "Caixa de Som Portátil BoomGo",
      slug: "caixa-de-som-portatil-boomgo",
      brand: "Sonora",
      description:
        "Som 360° com graves potentes, resistente à água (IP67) e 24h de bateria. Pareamento estéreo.",
      priceCents: 34900,
      compareCents: 44900,
      categoryId: cat["audio"],
      imageUrl: img("speaker"),
      stock: 40,
    },
    {
      name: "Monitor 27\" QHD 165Hz",
      slug: "monitor-27-qhd-165hz",
      brand: "Vertex",
      description:
        "Painel IPS QHD, 165Hz, 1ms e HDR400. Suporte ajustável em altura e VESA. Ideal para trabalho e games.",
      priceCents: 159900,
      categoryId: cat["notebooks"],
      imageUrl: img("monitor"),
      stock: 10,
    },
    {
      name: "Power Bank 20.000mAh USB-C PD",
      slug: "power-bank-20000mah-usb-c-pd",
      brand: "Nordika",
      description:
        "Carga rápida de 65W, três saídas e display digital. Carrega notebook, tablet e celular.",
      priceCents: 24900,
      compareCents: 32900,
      categoryId: cat["acessorios"],
      imageUrl: img("powerbank"),
      stock: 50,
    },
    {
      name: "Air Fryer Digital 5L",
      slug: "air-fryer-digital-5l",
      brand: "CasaViva",
      description:
        "12 programas pré-definidos, painel touch e cesto antiaderente de 5L. Comida crocante com menos óleo.",
      priceCents: 39900,
      compareCents: 54900,
      categoryId: cat["casa-cozinha"],
      imageUrl: img("airfryer"),
      featured: true,
      stock: 20,
    },
  ];

  for (const p of produtos) {
    const { variants, ...data } = p;
    await prisma.product.create({
      data: {
        ...data,
        variants: variants ? { create: variants } : undefined,
      },
    });
  }

  console.log(`✅ ${produtos.length} produtos criados em ${categorias.length} categorias.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
