import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
export const metadata: Metadata = { title: "Formas de pagamento" };
export default function Page() { return <InfoPage eyebrow="Pagamento seguro" title="Você escolhe como pagar" description="O pagamento é processado no ambiente do Mercado Pago. A Heca Store recebe o status da transação, sem armazenar os dados completos do seu cartão." action={{ href: "/produtos", label: "Ver produtos" }} sections={[
  { title: "Cartão de crédito", text: "Use as opções e condições de parcelamento exibidas pelo Mercado Pago no checkout. Quantidade de parcelas, juros e aprovação são informados antes da confirmação." },
  { title: "Pix", text: "Quando disponibilizado no checkout, o pagamento por Pix é identificado após a confirmação da instituição financeira. Conclua dentro do prazo mostrado na tela." },
  { title: "Análise e confirmação", text: "A criação do pedido não significa aprovação automática. Você acompanha a mudança do status em Meus pedidos assim que o processador confirmar o pagamento." },
  { title: "Compra protegida", text: "Nunca faça transferências para contas enviadas por mensagens. Confira o valor e o recebedor no ambiente oficial antes de pagar." }
]} />; }
