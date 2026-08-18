import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
export const metadata: Metadata = { title: "Trabalhe conosco" };
export default function Page() { return <InfoPage eyebrow="Talentos" title="Construa experiências que dão vontade de voltar" description="Buscamos pessoas curiosas, responsáveis e apaixonadas por resolver problemas reais de quem compra online." sections={[
  { title: "Como pensamos", text: "Tecnologia só faz sentido quando deixa a vida mais simples. Valorizamos comunicação direta, atenção aos detalhes e decisões baseadas na experiência do cliente." },
  { title: "Áreas de interesse", text: "As futuras oportunidades poderão envolver diferentes partes da operação.", items: ["Tecnologia e produto digital", "Experiência e atendimento ao cliente", "Operações e logística", "Conteúdo, criação e crescimento"] },
  { title: "Vagas abertas", text: "No momento não há processo seletivo público ativo. Quando novas posições forem abertas, esta página será atualizada com cargo, requisitos e um canal oficial de candidatura. Não solicitamos pagamento em processos seletivos." }
]} />; }
