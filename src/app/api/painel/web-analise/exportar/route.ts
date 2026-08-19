import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getWebAnalytics, getWebAnalyticsRange } from "@/lib/web-analytics";

const formats = ["pdf", "xlsx", "csv", "json"] as const;
const clean = (value: unknown) => String(value ?? "").replace(/[\r\n]+/g, " ");
const date = (value: Date) => value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" });
const seconds = (ms: number) => Math.round(ms / 1000);

export async function GET(request: Request) {
  await requireStaff();
  const params = new URL(request.url).searchParams;
  const format = formats.includes(params.get("formato") as typeof formats[number]) ? params.get("formato") as typeof formats[number] : "pdf";
  const period = params.get("periodo") || "30"; const from = params.get("de") || undefined; const to = params.get("ate") || undefined;
  const range = getWebAnalyticsRange(period, from, to);
  const [analytics, visits] = await Promise.all([
    getWebAnalytics({ period, from, to, pageSize: 1 }),
    prisma.websiteVisit.findMany({ where: { startedAt: { gte: range.start, lte: range.end } }, orderBy: { startedAt: "desc" }, take: 100000 }),
  ]);
  const rows = visits.map((visit) => ({
    "Data e hora": date(visit.startedAt), Página: visit.productName || visit.path, Caminho: visit.path,
    Origem: visit.utmSource || visit.referrerHost || "Acesso direto", Dispositivo: visit.device,
    Navegador: visit.browser, "Permanência (segundos)": seconds(visit.durationMs),
    "Sessão anônima": visit.sessionId.slice(0, 8), "Visitante anônimo": visit.visitorId.slice(0, 8),
  }));
  const summary = {
    período: analytics.range.label, geradoEm: date(new Date()), visualizações: analytics.total, visitantes: analytics.visitors,
    sessões: analytics.sessions, permanênciaMédiaSegundos: seconds(analytics.avgDurationMs), rejeiçãoPercentual: analytics.bounceRate,
    funil: analytics.funnel, páginas: analytics.pages, produtos: analytics.products, dispositivos: analytics.devices,
    navegadores: analytics.browsers, origens: analytics.sources, entradas: analytics.entries, saídas: analytics.exits, evoluçãoDiária: analytics.daily,
  };
  const filename = `heca-store-web-analise-${new Date().toISOString().slice(0,10)}`;
  if (format === "json") return download(JSON.stringify({ resumo: summary, acessos: rows, limitado: analytics.total > visits.length }, null, 2), "application/json; charset=utf-8", `${filename}.json`);
  const headers = Object.keys(rows[0] ?? { Informação: "Sem acessos" });
  if (format === "csv") {
    const lines = [["Relatório Web análise Heca - Store"], ["Período", analytics.range.label], ["Visualizações", analytics.total], ["Visitantes", analytics.visitors], ["Sessões", analytics.sessions], [], headers, ...rows.map((row) => headers.map((header) => row[header as keyof typeof row] ?? ""))];
    const csv = lines.map((line) => line.map((cell) => `"${clean(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    return download(`\uFEFF${csv}`, "text/csv; charset=utf-8", `${filename}.csv`);
  }
  if (format === "xlsx") {
    const writeXlsxFile = (await import("write-excel-file/node")).default;
    const title = (value: string) => ({ value, fontWeight: "bold" as const, backgroundColor: "#A100FF", color: "#FFFFFF" });
    const insightRows = [
      ["Funil", `Sessões ${analytics.funnel.sessions} · Produtos ${analytics.funnel.product} · Checkout ${analytics.funnel.checkout} · Sucesso ${analytics.funnel.purchase}`],
      ["Páginas", analytics.pages.map((item)=>`${item.label}: ${item.views}`).join(" · ")],
      ["Produtos", analytics.products.map((item)=>`${item.name}: ${item.views}`).join(" · ")],
      ["Dispositivos", analytics.devices.map((item)=>`${item.name}: ${item.count}`).join(" · ")],
      ["Navegadores", analytics.browsers.map((item)=>`${item.name}: ${item.count}`).join(" · ")],
      ["Origens", analytics.sources.map((item)=>`${item.name}: ${item.count}`).join(" · ")],
    ];
    const sheet = [[title("Relatório Web análise Heca - Store")], [{value:"Período",fontWeight:"bold" as const},{value:analytics.range.label}], [{value:"Visualizações",fontWeight:"bold" as const},{value:analytics.total}], [{value:"Visitantes",fontWeight:"bold" as const},{value:analytics.visitors}], [{value:"Sessões",fontWeight:"bold" as const},{value:analytics.sessions}], ...insightRows.map(([label,value])=>[{value:label,fontWeight:"bold" as const},{value,wrap:true}]), [], headers.map(title), ...rows.map((row) => headers.map((header) => ({ value: String(row[header as keyof typeof row] ?? ""), wrap: true })))]
    const file = await writeXlsxFile(sheet, { columns: headers.map((header) => ({ width: Math.min(38, Math.max(15, header.length + 4)) })) });
    const buffer = await file.toBuffer(); return new NextResponse(new Uint8Array(buffer), { headers: fileHeaders("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `${filename}.xlsx`) });
  }
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib"); const pdf = await PDFDocument.create(); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([842,595]); let y = 490;
  const header = () => { page.drawRectangle({x:0,y:515,width:842,height:80,color:rgb(.18,0,.28)}); page.drawText("Heca - Store - Relatorio de Web Analise",{x:36,y:555,size:21,font:bold,color:rgb(1,1,1)}); page.drawText(clean(analytics.range.label).normalize("NFD").replace(/[\u0300-\u036f]/g,""),{x:36,y:532,size:10,font:regular,color:rgb(.82,.88,1)}); y=490; }; header();
  const draw = (value:string,size=9,strong=false) => { if(y<38){page=pdf.addPage([842,595]);header();} page.drawText(clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g," ").slice(0,145),{x:36,y,size,font:strong?bold:regular,color:rgb(.1,.13,.2)}); y-=size+7; };
  draw(`Visualizacoes: ${analytics.total}   Visitantes: ${analytics.visitors}   Sessoes: ${analytics.sessions}   Rejeicao: ${analytics.bounceRate}%`,11,true); draw(`Permanencia media: ${seconds(analytics.avgDurationMs)}s   Produto > checkout > sucesso: ${analytics.funnel.product} > ${analytics.funnel.checkout} > ${analytics.funnel.purchase}`); y-=8;
  draw("Paginas mais acessadas",11,true); analytics.pages.forEach((item)=>draw(`${item.label}: ${item.views} visualizacoes, ${item.visitors} visitantes, media ${seconds(item.avgDurationMs)}s`)); y-=6;
  draw("Produtos mais visualizados",11,true); analytics.products.forEach((item)=>draw(`${item.name}: ${item.views} visualizacoes, ${item.visitors} visitantes`)); y-=6;
  draw("Origens",11,true); analytics.sources.forEach((item)=>draw(`${item.name}: ${item.count}`)); y-=6;
  draw("Dispositivos e navegadores",11,true); analytics.devices.forEach((item)=>draw(`${item.name}: ${item.count}`)); analytics.browsers.forEach((item)=>draw(`${item.name}: ${item.count}`)); y-=6;
  draw("Evolucao diaria",11,true); analytics.daily.forEach((item)=>draw(`${item.date}: ${item.views} visualizacoes, ${item.visitors} visitantes`)); y-=6;
  draw("Acessos detalhados",11,true);
  rows.forEach((row)=>draw(`${row["Data e hora"]} | ${row.Página} | ${row.Origem} | ${row.Dispositivo}/${row.Navegador} | ${row["Permanência (segundos)"]}s`,8));
  const bytes = await pdf.save(); return new NextResponse(bytes as BodyInit,{headers:fileHeaders("application/pdf",`${filename}.pdf`)});
}
function fileHeaders(type:string,filename:string){return{"Content-Type":type,"Content-Disposition":`attachment; filename="${filename}"`,"Cache-Control":"no-store"};}
function download(body:string,type:string,filename:string){return new NextResponse(body,{headers:fileHeaders(type,filename)});}
