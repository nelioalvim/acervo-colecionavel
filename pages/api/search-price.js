export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { itemName } = req.body
  if (!itemName) return res.status(400).json({ error: 'itemName required' })

  const prompt = `Você é um especialista em games e eletrônicos retrô colecionáveis, com profundo conhecimento de nomenclaturas alternativas usadas por colecionadores.

Pesquise os preços atuais de mercado para o item: "${itemName}"

Se a busca pelo nome exato não retornar resultados, tente variações: remova palavras entre parênteses como "(Loose)", "(CIB)"; tente só o nome principal; tente termos em inglês para o exterior e português para o Brasil. Faça pelo menos 2 buscas diferentes antes de desistir. Mercado Livre Brasil para BRL; eBay ou PriceCharting para USD. Não é erro não encontrar em um dos mercados — use null nesse caso, mas só após tentar variações.

Responda APENAS com JSON: {"marketBR": numero_ou_null, "marketExt": numero_ou_null}`

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
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
    const match = text.match(/\{[^{}]*"marketBR"[^{}]*\}/)
    if (match) return res.status(200).json(JSON.parse(match[0]))
    try { return res.status(200).json(JSON.parse(text.replace(/```json|```/g, '').trim())) }
    catch { return res.status(200).json({ marketBR: null, marketExt: null }) }
  } catch {
    return res.status(200).json({ marketBR: null, marketExt: null })
  }
}
