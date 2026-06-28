export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { itemName } = req.body
  if (!itemName) return res.status(400).json({ error: 'itemName required' })

  const prompt = `Você é um especialista em games e eletrônicos retrô colecionáveis. Pesquise os preços atuais de mercado para o item: "${itemName}". Busque: 1) Mercado Livre Brasil preço médio em BRL; 2) eBay OU PriceCharting preço médio em USD. Não é erro não encontrar em um dos mercados. Responda APENAS com JSON: {"marketBR":{"price":999,"source":"Mercado Livre","note":"nota"},"marketExt":{"price":99,"source":"eBay","note":"nota"},"summary":"resumo"}`

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
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
    const match = text.match(/\{[\s\S]*"marketBR"[\s\S]*\}/)
    if (match) return res.status(200).json(JSON.parse(match[0]))
    return res.status(200).json({ marketBR: null, marketExt: null, summary: '' })
  } catch {
    return res.status(200).json({ marketBR: null, marketExt: null, summary: '' })
  }
}
