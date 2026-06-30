export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { itemName } = req.body
  if (!itemName) return res.status(400).json({ error: 'itemName required' })

  const prompt = `Você é um especialista em games e eletrônicos retrô colecionáveis. Pesquise os preços atuais de mercado para o item: "${itemName}". Mercado Livre Brasil para BRL; eBay ou PriceCharting para USD. Seja direto e eficiente: use no máximo 2 buscas no total. Não é erro não encontrar em um dos mercados — use null.

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
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      return res.status(200).json({ marketBR: null, marketExt: null })
    }

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
