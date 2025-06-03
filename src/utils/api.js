/**
 * API 请求相关工具函数
 * 主要用于处理与 UptimeRobot API 的通信
 */

import axios from 'axios'
import { processMonitorData, generateTimeRanges } from './monitor'

/** API 配置常量 */
const API_URL = import.meta.env.VITE_UPTIMEROBOT_API_URL
const API_KEY = import.meta.env.VITE_UPTIMEROBOT_API_KEY

/**
 * 获取监控数据
 * @async
 * @returns {Promise<Array>} 处理后的监控数据数组
 * @throws {Error} 当 API 请求失败时抛出错误
 */
export const fetchMonitorData = async () => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await axios.post(
      API_URL,
      {
        api_key: API_KEY,
        format: 'json',
        response_times: 1,
        logs: 1,
        custom_uptime_ranges: generateTimeRanges(),
        response_times_start_date: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000),
        response_times_end_date: Math.floor(Date.now() / 1000)
      },
      {
        signal: controller.signal,
        timeout: 30000
      }
    )

    if (response.data?.stat !== 'ok') {
      throw new Error('API 请求失败: ' + response.data?.message || '未知错误')
    }

    return response.data.monitors
      .sort((a, b) => b.create_datetime - a.create_datetime)
      .map(processMonitorData)

  } catch (error) {
    console.error('获取监控数据失败:', error)
    throw new Error('获取监控数据失败: ' + error.message)
  } finally {
    clearTimeout(timeoutId)
  }
}