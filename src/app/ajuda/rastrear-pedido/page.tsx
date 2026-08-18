import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
export const metadata: Metadata = { title: "Rastrear pedido" };
export default function Page() { return <InfoPage eyebrow="Acompanhe sua compra" title="Do pagamento até a sua porta" description="Consulte a linha do tempo, as atualizações com data e hora e, após o envio, o rastreamento da transportadora." action={{ href: "/conta/pedidos", label: "Rastrear meu pedido", secondary: "É necessário entrar na conta usada na compra." }} sections={[
  { title: "1. Abra seus pedidos", text: "Entre com a mesma conta usada no checkout. Essa proteção impede que terceiros consultem seus dados de entrega." },
  { title: "2. Escolha a compra", text: "A lista mostra o status atual, itens e valor. Abra o pedido desejado para visualizar todos os detalhes." },
  { title: "3. Acompanhe a entrega", text: "Quando o pedido for despachado, o código e o botão de rastreamento aparecem automaticamente na tela.", items: ["Pagamento confirmado", "Preparação do produto", "Envio e rota de entrega", "Confirmação de entrega"] },
  { title: "Precisa de ajuda?", text: "Dentro do próprio pedido, solicite a abertura do atendimento. Assim sua mensagem já chega associada à compra correta." }
]} />; }
