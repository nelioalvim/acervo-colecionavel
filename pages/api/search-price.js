export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { itemName } = req.body
  if (!itemName) return res.status(400).json({ error: 'itemName required' })

  const prompt = `Você é um especialista em games e eletrônicos retrô colecionáveis. Pesquise o preço atual de mercado no Brasil (BRL) para o item USADO: "${itemName}".

Use até 5 buscas web, distribuindo entre estas fontes: Mercado Livre (site:mercadolivre.com.br), OLX (site:olx.com.br), Amazon Brasil (site:amazon.com.br) e Google Shopping Brasil. Priorize anúncios de itens USADOS/seminovos — o item é colecionável retrô e o dono vende usados, evite cotar preço de produto novo/lacrado quando houver opção usada disponível. Varie os termos se necessário (remova "(CIB)"/"(Loose)", tente só o nome principal). Considere os preços encontrados em todas as fontes disponíveis e calcule a MÉDIA entre eles. Pode estimar com base em itens similares se não achar preço exato. Não é erro não encontrar — use null só após tentar variações em pelo menos 2 fontes diferentes.

Responda APENAS com JSON: {"marketBR": numero_ou_null}`

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
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      return res.status(200).json({ marketBR: null })
    }

    const data = await response.json()
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
    const match = text.match(/\{[^{}]*"marketBR"[^{}]*\}/)
    if (match) return res.status(200).json(JSON.parse(match[0]))
    try { return res.status(200).json(JSON.parse(text.replace(/```json|```/g, '').trim())) }
    catch { return res.status(200).json({ marketBR: null }) }
  } catch {
    return res.status(200).json({ marketBR: null })
  }
}
