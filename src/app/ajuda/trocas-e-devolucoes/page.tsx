import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
export const metadata: Metadata = { title: "Trocas e devoluções" };
export default function Page() { return <InfoPage eyebrow="Compra tranquila" title="Trocas e devoluções, passo a passo" description="Se algo não saiu como esperado, registre a solicitação pelo pedido. O histórico fica protegido e a análise começa com todas as informações necessárias." action={{ href: "/conta/pedidos", label: "Selecionar um pedido" }} sections={[
  { title: "Direito de arrependimento", text: "Em compras online, você pode solicitar a desistência em até 7 dias corridos contados do recebimento, conforme o artigo 49 do Código de Defesa do Consumidor." },
  { title: "Produto com problema", text: "Avise assim que identificar avaria, defeito ou item diferente do comprado. Descreva o ocorrido e preserve produto, acessórios, manuais e embalagem quando possível." },
  { title: "Como solicitar", text: "Abra Meus pedidos, selecione a compra e solicite atendimento no próprio pedido.", items: ["Informe o item e o motivo", "Aguarde as instruções antes de postar", "Use a autorização ou etiqueta fornecida", "Acompanhe a análise pelo atendimento"] },
  { title: "Reembolso", text: "Depois do recebimento e da conferência, o reembolso elegível é solicitado pelo meio compatível com o pagamento. O prazo de visualização pode depender do Mercado Pago, banco ou emissor do cartão." },
  { title: "Condições importantes", text: "Sinais de mau uso podem exigir análise. Esta orientação não reduz as garantias e os demais direitos assegurados pela legislação de consumo.", items: ["Não envie o produto sem orientação", "Apague contas e dados pessoais de dispositivos", "Guarde o comprovante de postagem"] }
]} />; }
