import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
export const metadata: Metadata = { title: "Contato" };
export default function Page() { return <InfoPage eyebrow="Fale com a Heca Store" title="Ajuda no lugar certo, sem perder o contexto" description="Escolha o canal de acordo com sua necessidade. Assuntos de pedidos ficam registrados na própria compra para oferecer um atendimento mais seguro." action={{ href: "/conta/pedidos", label: "Acessar meus pedidos", secondary: "Abra o pedido e solicite atendimento." }} sections={[
  { title: "Pedido em andamento", text: "Entre em Meus pedidos, abra a compra e use a opção de falar com o atendimento. A equipe verá o pedido e todo o histórico no mesmo lugar." },
  { title: "Dúvida sobre um produto", text: "Na página de cada produto, use a área de perguntas. Assim a resposta também ajuda outras pessoas interessadas no mesmo item." },
  { title: "Privacidade e dados", text: "Na área Privacidade (LGPD) da sua conta você pode consultar informações, exportar seus dados ou solicitar a exclusão da conta.", items: ["Acesso protegido pela sua conta", "Exportação em arquivo", "Preferências de cookies ajustáveis a qualquer momento"] },
  { title: "Antes de chamar", text: "Tenha o número do pedido em mãos e não envie senhas ou dados completos de cartão. A Heca Store nunca precisa dessas informações para atender você." }
]} />; }
