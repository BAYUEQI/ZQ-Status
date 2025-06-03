/**
 * API 代理实现
 * 这是一个边缘函数，运行在边缘节点上
 * 用于代理 UptimeRobot API 请求，避免跨域问题
 * 
 * 支持以下部署平台：
 * - 腾讯云 EdgeOne Pages
 * - Cloudflare Pages
 * 
 * 环境变量配置说明：
 * 在 .env 文件中设置 VITE_UPTIMEROBOT_API_URL:
 * - 使用默认配置：设置为 "/api/status"
 * - 其他部署方式：设置为你的完整代理地址
 */

export async function onRequest(context) {
  // 设置 CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }

  // 处理 OPTIONS 请求
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 从请求中获取数据
    const data = await context.request.json()

    // 转发请求到 UptimeRobot API
    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const newResponse = new Response(response.body, response)
    newResponse.headers.set('Access-Control-Allow-Origin', '*')
    return newResponse

  } catch (error) {
    return new Response('请求失败', { status: 500 })
  }
} 