/**
 * 图表配置工具模块
 * @module chartConfig
 */

import { format } from 'date-fns'

/**
 * 图表基础配置对象
 * @constant {Object}
 * @property {Object} styles - 图表样式配置
 * @property {Object} points - 数据点样式配置
 * @property {Object} colors - 图表颜色配置
 */
const CHART_CONFIG = {
  styles: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    interaction: {
      intersect: false,
      mode: 'nearest'
    }
  },
  
  points: {
    pointBackgroundColor: '#fff',
    pointBorderColor: '#10b981',
    pointBorderWidth: 1.5,
    pointHoverBorderWidth: 1.5,
    pointHoverBackgroundColor: '#fff'
  },
  
  colors: {
    success: '#10b981',
    warning: '#eab308',
    error: '#ef4444',
    orange: '#ff7a45',
    gray: 'rgb(120, 120, 120, 0.3)',
    paused: '#eab308'
  }
}

/**
 * 根据可用率值获取对应的图表颜色
 * @param {number} value - 可用率值
 * @param {boolean} isBeforeCreation - 是否为创建前的数据
 * @param {number} status - 监控状态 (2: 在线, 0: 暂停, 9: 离线)
 * @returns {string} 颜色代码
 */
export const getChartColor = (value, isBeforeCreation, status) => {
  if (isBeforeCreation) return CHART_CONFIG.colors.gray
  if (status === 0) return CHART_CONFIG.colors.paused  // 使用 status 判断暂停状态
  if (value === null || isNaN(value)) return CHART_CONFIG.colors.error
  
  const thresholds = [
    { min: 99.9, color: CHART_CONFIG.colors.success },  // ≥99.9% 绿色
    { min: 90, color: CHART_CONFIG.colors.warning },    // ≥90% 黄色
    { min: 0.1, color: CHART_CONFIG.colors.orange }     // >0% 橙色
  ]
  
  // 等于0时显示红色，其他情况按阈值判断
  if (value === 0) return CHART_CONFIG.colors.error
  return thresholds.find(t => value >= t.min)?.color || CHART_CONFIG.colors.orange
}

/**
 * 获取状态时间线图表配置
 * @param {Object} monitor - 监控数据对象
 * @param {Object} dateRange - 日期范围对象
 * @param {boolean} isMobile - 是否为移动设备
 * @returns {Object} 图表配置对象
 */
export const getStatusChartConfig = (monitor, dateRange, isMobile) => {
  const data = monitor.stats?.dailyUptimes ?? Array(30).fill(null)

  // 添加时间验证逻辑
  const createTime = monitor.create_datetime * 1000
  const now = Date.now()
  const effectiveCreateTime = createTime > now ? now : createTime

  const daysSinceStart = Math.max(0, Math.floor(
    (new Date(effectiveCreateTime) - dateRange.startDate) / 86400000
  ))

  const pointSize = isMobile ? { radius: 4, hoverRadius: 5 } : { radius: 8, hoverRadius: 10 }

  return {
    data: {
      datasets: [{
        data: data.map((value, i) => ({
          x: i,
          y: 50,
          value: i < daysSinceStart ? null : (value ?? null),
          date: dateRange.dates[i],
          status: monitor.status,
          isBeforeCreation: i < daysSinceStart  // 添加创建前标记
        })),
        backgroundColor: data.map((v, i) => 
          getChartColor(v, i < daysSinceStart, monitor.status)
        ),
        borderColor: 'transparent',
        ...pointSize,
        pointStyle: 'rectRounded'
      }]
    },
    options: {
      ...CHART_CONFIG.styles,
      plugins: {
        ...CHART_CONFIG.styles.plugins,
        tooltip: {
          callbacks: {
            title: items => format(items[0].raw.date, 'yyyy-MM-dd'),
            label: context => {
              if (context.raw.isBeforeCreation) {
                return '无数据'  // 创建前显示"无数据"
              }
              if (context.raw.status === 0) {
                return '已暂停'  // 然后再判断暂停状态
              }
              if (context.raw.value === null) {
                return '无数据'
              }
              return `可用率：${context.raw.value.toFixed(2)}%`
            }
          }
        }
      },
      scales: {
        x: { display: false, min: -0.5, max: 29.5 },
        y: { display: false, min: 45, max: 55 }
      },
      animation: { duration: 200 },
      elements: {
        point: {
          ...pointSize,
          borderWidth: 0,
          borderRadius: 4
        }
      }
    }
  }
}

/**
 * 获取响应时间图表数据
 * @param {Object} monitor - 监控数据对象
 * @returns {Object} 图表数据配置对象
 */
export const getResponseTimeChartData = (monitor) => {
  const hourLabels = Array.from({ length: 24 }, (_, i) => {
    const date = new Date()
    date.setHours(date.getHours() - i)
    return format(date, 'HH:mm')
  }).reverse()

  // 处理数据
  const validData = [...(monitor?.stats?.dailyResponseTimes || [])]
    .reverse()
    .slice(-24) // 只取最近24小时的数据
    .map(time => {
      // 严格的数值检查
      if (typeof time !== 'number' || isNaN(time) || time < 0 || time > 60000) {
        return null
      }
      return time
    })

  return {
    labels: hourLabels,
    datasets: [{
      label: '响应时间',
      data: validData,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.05)',
      borderWidth: 1.5,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      ...CHART_CONFIG.points
    }]
  }
}

/**
 * 响应时间图表配置对象
 * @constant {Object}
 */
export const responseTimeChartOptions = {
  ...CHART_CONFIG.styles,
  plugins: {
    ...CHART_CONFIG.styles.plugins,
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      callbacks: {
        title: items => items[0]?.label || '',
        label: context => context.raw ? `响应时间：${context.raw} ms` : '无数据'
      }
    }
  },
  scales: {
    x: {
      grid: { display: false, drawBorder: false },
      ticks: {
        maxRotation: 0,
        color: 'rgb(156, 163, 175)',
        padding: 8,
        maxTicksLimit: 12,
        font: { size: 11 }
      }
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: {
        color: 'rgba(229, 231, 235, 0.5)',
        drawBorder: false,
        lineWidth: 1
      },
      ticks: {
        color: 'rgb(156, 163, 175)',
        padding: 8,
        font: { size: 11 },
        callback: value => `${value} ms`,
        maxTicksLimit: 8
      }
    }
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 1.5,
      borderCapStyle: 'round',
      borderJoinStyle: 'round',
      capBezierPoints: true
    }
  },
  animation: {
    duration: 600,
    easing: 'easeInOutCubic',
    delay: (context) => context.dataIndex * 20
  }
} 