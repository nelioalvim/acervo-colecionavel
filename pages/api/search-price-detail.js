export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { itemName } = req.body
  if (!itemName) return res.status(400).json({ error: 'itemName required' })

  const prompt = `Você é um especialista em games e eletrônicos retrô colecionáveis, com profundo conhecimento de nomenclaturas alternativas, abreviações e termos usados por colecionadores brasileiros e internacionais.

Pesquise os preços atuais de mercado para o item: "${itemName}"

INSTRUÇÕES IMPORTANTES PARA MAXIMIZAR RESULTADOS:
- Se a busca pelo nome exato não retornar resultados, tente variações: remova palavras entre parênteses como "(Loose)", "(CIB)", "(Novo)"; tente só o nome principal do produto; tente sinônimos comuns (ex: "TecToy" pode ser omitido nas buscas internacionais); tente termos em inglês para o mercado exterior e em português para o Brasil.
- Para o Mercado Livre Brasil: busque tanto anúncios atuais quanto vendidos recentemente. Termos como "CIB" (Complete In Box) podem não existir no Brasil — busque por "completo na caixa" ou apenas o nome do item.
- Para o mercado exterior: tente eBay, PriceCharting.com, e se for um console ou jogo retro também considere lojas especializadas como Retroplace ou GameValueNow.
- Faça pelo menos 2-3 buscas diferentes antes de desistir de um item. Varie os termos a cada tentativa.
- Itens muito específicos de colecionador (peças raras, variantes regionais) podem ter poucos resultados — nesse caso, estime um preço baseado em itens similares e explique a estimativa na nota.
- Só retorne null se tiver certeza, após múltiplas tentativas, que não há nenhuma base de preço disponível.

Responda APENAS com JSON válido, sem texto antes ou depois:
{
  "marketBR": { "price": 999.00, "source": "Mercado Livre", "note": "breve nota sobre a faixa de preço encontrada ou estimativa" },
  "marketExt": { "price": 99.00, "source": "eBay", "note": "breve nota sobre a faixa de preço encontrada ou estimativa" },
  "summary": "resumo de 1-2 frases sobre o mercado deste item, mencionando se algum valor é estimado"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
    const match = text.match(/\{[\s\S]*"marketBR"[\s\S]*\}/)
    if (match) {
      try { return res.status(200).json(JSON.parse(match[0])) }
      catch { return res.status(200).json({ marketBR: null, marketExt: null, summary: 'Erro ao processar resposta da busca.' }) }
    }
    return res.status(200).json({ marketBR: null, marketExt: null, summary: 'Nenhum resultado encontrado.' })
  } catch (e) {
    return res.status(200).json({ marketBR: null, marketExt: null, summary: 'Erro na busca: ' + (e.message || 'desconhecido') })
  }
}
