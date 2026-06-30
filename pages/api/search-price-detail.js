export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { itemName } = req.body
  if (!itemName) return res.status(400).json({ error: 'itemName required' })

  const prompt = `Você é um especialista em games e eletrônicos retrô colecionáveis. Pesquise o preço atual de mercado no Brasil para o item: "${itemName}".

Foque exclusivamente no Mercado Livre Brasil (BRL). Use até 4 buscas, variando os termos se a primeira tentativa não trouxer um preço claro (ex: tente sem "(CIB)"/"(Loose)", tente só o nome principal do produto, tente "preço" ou "valor" no termo de busca). Busque tanto anúncios atuais quanto vendidos recentemente. Se encontrar uma página de listagem com vários preços de itens similares, pode estimar uma faixa/média e marcar como estimativa na nota. Só retorne null se realmente não houver nenhuma base de preço após tentar variações.

Responda APENAS com JSON válido, sem texto antes ou depois:
{
  "marketBR": { "price": 999.00, "source": "Mercado Livre", "note": "breve nota, indique se é estimativa" },
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
        model: 'claude-haiku-4-5',
        max_tokens: 1200,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(200).json({
        marketBR: null,
        summary: 'ERRO API status ' + response.status + ': ' + JSON.stringify(data).slice(0, 300)
      })
    }

    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''

    if (!text) {
      return res.status(200).json({
        marketBR: null,
        summary: 'SEM TEXTO NA RESPOSTA: ' + JSON.stringify(data).slice(0, 300)
      })
    }

    const match = text.match(/\{[\s\S]*"marketBR"[\s\S]*\}/)
    if (match) {
      try { return res.status(200).json(JSON.parse(match[0])) }
      catch (parseErr) {
        return res.status(200).json({
          marketBR: null,
          summary: 'ERRO AO PARSEAR JSON: ' + parseErr.message
        })
      }
    }

    return res.status(200).json({
      marketBR: null,
      summary: 'JSON NAO ENCONTRADO: ' + text.slice(0, 300)
    })
  } catch (e) {
    return res.status(200).json({
      marketBR: null,
      summary: 'ERRO EXCEPTION: ' + (e.message || 'desconhecido')
    })
  }
}
