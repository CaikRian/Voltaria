// Busca de endereço por CEP via ViaCEP — API pública, gratuita, sem chave.
// Chamada direto do browser (fetch), sem proxy por server action: são dados
// públicos, sem custo nem segredo envolvido — manter simples (baixo custo,
// sem complexidade desnecessária, conforme CLAUDE.md).

export type ViaCepResult = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

export async function lookupCep(rawCep: string): Promise<ViaCepResult | null> {
  const digits = rawCep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null; // ViaCEP retorna { erro: true } pra CEP inexistente
    return {
      cep: digits,
      street: data.logradouro ?? "",
      neighborhood: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  } catch {
    return null; // rede fora do ar / CORS / timeout — form continua editável manualmente
  }
}
