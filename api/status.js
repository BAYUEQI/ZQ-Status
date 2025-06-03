export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' })
  }

  try {
    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })

    const data = await response.json()
    return res.status(200).json(data)

  } catch (error) {
    return res.status(500).json({ error: '请求失败' })
  }
} 