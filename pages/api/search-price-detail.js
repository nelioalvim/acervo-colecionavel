export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { itemName } = req.body
  if (!itemName) return res.status(400).json({ error: 'itemName required' })

  const prompt = `Você é um especialista em games e eletrônicos retrô colecionáveis. Pesquise os preços atuais de mercado para o item: "${itemName}". Mercado Livre Brasil para BRL; eBay ou PriceCharting para USD.

Responda APENAS com JSON válido, sem texto antes ou depois:
{
  "marketBR": { "price": 999.00, "source": "Mercado Livre", "note": "breve nota" },
  "marketExt": { "price": 99.00, "source": "eBay", "note": "breve nota" },
  "summary": "resumo de 1 frase"
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
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(200).json({
        marketBR: null, marketExt: null,
        summary: 'ERRO API status ' + response.status + ': ' + JSON.stringify(data).slice(0, 300)
      })
    }

    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''

    if (!text) {
      return res.status(200).json({
        marketBR: null, marketExt: null,
        summary: 'SEM TEXTO NA RESPOSTA: ' + JSON.stringify(data).slice(0, 300)
      })
    }

    const match = text.match(/\{[\s\S]*"marketBR"[\s\S]*\}/)
    if (match) {
      try { return res.status(200).json(JSON.parse(match[0])) }
      catch (parseErr) {
        return res.status(200).json({
          marketBR: null, marketExt: null,
          summary: 'ERRO AO PARSEAR JSON: ' + parseErr.message
        })
      }
    }

    return res.status(200).json({
      marketBR: null, marketExt: null,
      summary: 'JSON NAO ENCONTRADO: ' + text.slice(0, 300)
    })
  } catch (e) {
    return res.status(200).json({
      marketBR: null, marketExt: null,
      summary: 'ERRO EXCEPTION: ' + (e.message || 'desconhecido')
    })
  }
}
