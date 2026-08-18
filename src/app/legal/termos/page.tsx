import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
export const metadata: Metadata = { title: "Termos de uso" };
export default function Page() { return <InfoPage eyebrow="Legal · atualizados em 18/08/2026" title="Termos de uso" description="Estas condições organizam o uso da plataforma e as compras realizadas na Voltaria. Ao usar o site, você concorda em agir de forma lícita e fornecer informações verdadeiras." sections={[
  { title: "Conta e acesso", text: "Você é responsável pela veracidade dos dados, pela confidencialidade da senha e pelas atividades em sua conta. Avise pelo canal de contato caso suspeite de acesso indevido." },
  { title: "Oferta e pedido", text: "Descrições, preços, estoque, frete e prazos são apresentados durante a compra. O pedido depende da confirmação do pagamento e da disponibilidade. Erros evidentes poderão ser corrigidos com informação clara e restituição integral quando cabível." },
  { title: "Pagamento", text: "As transações são processadas pelo Mercado Pago segundo as opções exibidas no checkout. Uma tentativa recusada, pendente ou cancelada não equivale a pagamento aprovado." },
  { title: "Entrega", text: "O prazo informado é uma estimativa baseada no destino e na operação logística. O cliente deve fornecer endereço completo e acompanhar tentativas de entrega e atualizações na área do pedido." },
  { title: "Trocas, devoluções e garantias", text: "Aplicam-se a política da loja e os direitos previstos na legislação brasileira de consumo. Solicitações devem ser abertas no pedido para preservar o contexto e permitir instruções seguras." },
  { title: "Uso permitido", text: "Não é permitido tentar acessar contas ou áreas restritas, interferir no funcionamento, explorar falhas, automatizar uso abusivo ou utilizar conteúdo e marca da Voltaria sem autorização, ressalvados usos admitidos por lei." },
  { title: "Alterações e contato", text: "Os termos podem ser atualizados para refletir mudanças legais ou operacionais. A versão e a data vigentes ficam nesta página. Dúvidas podem ser encaminhadas pelos canais indicados em Contato." }
]} />; }
