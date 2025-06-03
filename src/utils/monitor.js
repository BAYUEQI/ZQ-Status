/**
 * 监控数据处理工具模块
 * @module monitor
 */

/**
 * 监控数据处理相关常量
 * @constant {Object}
 * @property {number} THIRTY_DAYS - 30天的天数
 * @property {number} MS_PER_DAY - 每天的毫秒数
 * @property {number} DOWNTIME_TYPE - 停机类型标识
 * @property {number} HOURS_IN_DAY - 每天的小时数
 */
const CONSTANTS = {
  THIRTY_DAYS: 30,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  DOWNTIME_TYPE: 1,
  HOURS_IN_DAY: 24
}

/**
 * 数据验证工具类
 * @class
 */
class Validator {
  /**
   * 验证数值是否有效
   * @static
   * @param {*} value - 要验证的值
   * @returns {boolean} 是否为有效数值
   */
  static isValidNumber(value) {
    return value != null && !isNaN(value) && value > 0
  }

  /**
   * 验证数组是否有效
   * @static
   * @param {Array} arr - 要验证的数组
   * @returns {boolean} 是否为有效数组
   */
  static isValidArray(arr) {
    return Array.isArray(arr) && arr.length > 0
  }
  
  /**
   * 验证时间戳是否有效
   * @static
   * @param {number} timestamp - 要验证的时间戳
   * @returns {boolean} 是否为有效时间戳
   */
  static isValidTimestamp(timestamp) {
    return this.isValidNumber(timestamp) && timestamp > 0
  }
}

/**
 * 时间处理工具类
 * @class
 */
class TimeUtils {
  /**
   * 获取30天前的时间戳
   * @static
   * @returns {number} UNIX时间戳
   */
  static getThirtyDaysAgo() {
    return Math.floor((Date.now() - CONSTANTS.THIRTY_DAYS * CONSTANTS.MS_PER_DAY) / 1000)
  }

  /**
   * 生成时间范围字符串
   * @static
   * @returns {string} 格式化的时间范围字符串
   */
  static generateTimeRanges() {
    return Array.from({ length: CONSTANTS.THIRTY_DAYS }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const start = new Date(date).setHours(0, 0, 0, 0)
      const end = new Date(date).setHours(23, 59, 59, 999)
      return `${Math.floor(start / 1000)}_${Math.floor(end / 1000)}`
    }).join('-')
  }
}

/**
 * 监控数据处理类
 * @class
 */
class MonitorDataProcessor {
  /**
   * 计算平均响应时间
   * @static
   * @param {Object} monitor - 监控数据对象
   * @returns {number|null} 平均响应时间或null
   */
  static calculateAvgResponseTime(monitor) {
    try {
      if (Validator.isValidArray(monitor.response_times)) {
        // 获取24小时前的时间戳
        const twentyFourHoursAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
        
        // 只计算最近24小时的响应时间
        const validTimes = monitor.response_times.filter(time => 
          time && 
          Validator.isValidNumber(time.value) && 
          time.datetime >= twentyFourHoursAgo
        )
        
        return validTimes.length > 0
          ? Math.round(validTimes.reduce((sum, time) => sum + time.value, 0) / validTimes.length)
          : null
      }
      
      // 如果没有详细的响应时间数据，则使用 average_response_time
      return Validator.isValidNumber(monitor.average_response_time)
        ? Math.round(monitor.average_response_time)
        : null
    } catch (error) {
      console.error('计算平均响应时间出错:', error)
      return null
    }
  }

  static processDowntimeLogs(logs = []) {
    const thirtyDaysAgo = TimeUtils.getThirtyDaysAgo()
    const recentLogs = logs.filter(log => 
      log.type === CONSTANTS.DOWNTIME_TYPE && log.datetime >= thirtyDaysAgo
    )
    
    return {
      logs: recentLogs.sort((a, b) => b.datetime - a.datetime),
      totalDowntime: recentLogs.reduce((total, log) => total + (log.duration || 0), 0)
    }
  }

  static processUptimeData(uptimeRanges) {
    const dailyUptimes = uptimeRanges?.split('-').map(Number).reverse() || []
    const validUptimes = dailyUptimes.filter(Validator.isValidNumber)
    
    return {
      dailyUptimes,
      uptime: validUptimes.length > 0
        ? validUptimes.reduce((sum, value) => sum + value, 0) / validUptimes.length
        : 0
    }
  }

  static processDailyResponseTimes(monitor) {
    try {
      // 创建24个小时的数组
      const hourlyResponseTimes = Array(CONSTANTS.HOURS_IN_DAY).fill(null)
      
      if (!Validator.isValidArray(monitor.response_times)) {
        return hourlyResponseTimes
      }

      // 按小时分组响应时间
      const hourlyGroups = monitor.response_times.reduce((groups, time) => {
        if (!time || !Validator.isValidNumber(time.value)) return groups
        
        const date = new Date(time.datetime * 1000)
        const hourIndex = Math.floor((Date.now() - date.getTime()) / (60 * 60 * 1000))
        
        if (hourIndex >= 0 && hourIndex < CONSTANTS.HOURS_IN_DAY) {
          if (!groups[hourIndex]) groups[hourIndex] = []
          groups[hourIndex].push(time.value)
        }
        
        return groups
      }, {})

      // 计算每小时的平均响应时间
      Object.entries(hourlyGroups).forEach(([hourIndex, times]) => {
        if (times.length > 0) {
          hourlyResponseTimes[hourIndex] = Math.round(
            times.reduce((sum, value) => sum + value, 0) / times.length
          )
        }
      })

      return hourlyResponseTimes
    } catch (error) {
      console.error('处理响应时间数据出错:', error)
      return Array(CONSTANTS.HOURS_IN_DAY).fill(null)
    }
  }
}

/**
 * 处理监控数据
 * @param {Object} monitor - 原始监控数据
 * @returns {Object} 处理后的监控数据
 * @throws {Error} 处理失败时抛出错误
 */
export const processMonitorData = (monitor) => {
  try {
    const avgResponseTime = MonitorDataProcessor.calculateAvgResponseTime(monitor)
    const dailyResponseTimes = MonitorDataProcessor.processDailyResponseTimes(monitor)
    const { logs: downtimeLogs, totalDowntime } = MonitorDataProcessor.processDowntimeLogs(
      monitor.logs
    )
    const { dailyUptimes, uptime } = MonitorDataProcessor.processUptimeData(
      monitor.custom_uptime_ranges
    )

    return {
      ...monitor,
      stats: {
        avgResponseTime,
        dailyResponseTimes,
        uptime,
        dailyUptimes,
        downtimeLogs,
        totalDowntime
      }
    }
  } catch (error) {
    console.error('处理监控数据失败:', error)
    throw new Error('处理监控数据失败: ' + error.message)
  }
}

/** 导出工具函数 */
export const generateTimeRanges = TimeUtils.generateTimeRanges