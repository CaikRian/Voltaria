import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
export const metadata: Metadata = { title: "Sobre nós", description: "Conheça a proposta da Heca Store." };
export default function Page() { return <InfoPage eyebrow="Institucional" title="Tecnologia que aproxima possibilidades" description="A Heca Store nasceu para tornar a escolha de eletrônicos e produtos para o dia a dia mais simples, transparente e agradável." action={{ href: "/produtos", label: "Conhecer produtos" }} sections={[
  { title: "Nossa proposta", text: "Reunir produtos úteis em uma experiência digital direta: informações claras, compra protegida e acompanhamento do pedido do início à entrega." },
  { title: "O que valorizamos", text: "Boas relações começam com clareza.", items: ["Descrição honesta e preço visível", "Atualizações do pedido em cada etapa", "Privacidade e controle dos seus dados", "Atendimento conectado à sua compra"] },
  { title: "Uma loja em evolução", text: "A Heca Store é uma operação digital em desenvolvimento contínuo. Melhoramos a plataforma a partir da experiência real de quem compra, sem esconder os próximos passos." }
]} />; }
