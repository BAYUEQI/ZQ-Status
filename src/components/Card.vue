<template>
  <!-- 加载状态和错误提示 -->
  <div v-if="!monitors?.length" class="flex items-center justify-center p-12">
    <Icon v-if="!error"
      icon="svg-spinners:180-ring-with-bg" 
      class="w-12 h-12 text-gray-400 dark:text-gray-300 animate-spin"
    />
    <div v-else 
         class="flex flex-col items-center gap-4 p-8 rounded-2xl
           bg-red-50/50 dark:bg-red-900/20 
           border-2 border-red-100 dark:border-red-800/50
           backdrop-blur-sm animate-fade"
    >
      <div class="relative">
        <Icon 
          icon="carbon:warning-filled" 
          class="w-12 h-12 text-red-500/90 dark:text-red-400/90"
        />
        <div class="absolute inset-0 w-12 h-12 bg-red-500/20 dark:bg-red-400/20 rounded-full animate-ping" />
      </div>
      <div class="text-center">
        <div class="text-red-600 dark:text-red-400 font-medium mb-1">
          {{ error }}
        </div>
      </div>
    </div>
  </div>

  <!-- 监控卡片网格布局 -->
  <div v-else class="grid gap-6 grid-cols-1 md:grid-cols-2">
    <!-- 单个监控卡片 -->
    <div v-for="monitor in sortedMonitors" 
         :key="monitor.id"
         class="card-base animated-border p-6 rounded-2xl backdrop-blur-sm animate-fade"
         :class="[
           monitor.status === 0 || monitor.status === 1 
             ? 'after:border-yellow-500/50 dark:after:border-yellow-400/50'
             : `after:border-${STATUS_CONFIG[monitor.status]?.color}-500/50 dark:after:border-${STATUS_CONFIG[monitor.status]?.color}-400/50`
         ]"
         @mouseenter="$event.target.classList.add('hovered')"
    >
      <!-- 卡片头部：标题和状态指示器 -->
      <div class="flex items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="text-lg sm:text-xl font-bold truncate text-gray-800 dark:text-gray-100">
              {{ monitor.friendly_name }}
            </h2>
            <Icon 
              icon="bi:link-45deg" 
              class="w-5 h-5 p-1.5 rounded-full transition-colors duration-200
                text-gray-400 hover:text-gray-600 hover:bg-gray-100
                dark:text-gray-500 dark:hover:text-gray-400 dark:hover:bg-gray-700/50
                box-content"
              @click="openUrl(monitor.url)"
            />
          </div>
        </div>
        <div class="shrink-0">
          <div v-if="typeof monitor.status !== 'undefined'"
               :class="[
                 'inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium text-sm whitespace-nowrap',
                 STATUS_CONFIG[monitor.status]?.classes
               ]"
          >
            <div class="relative flex">
              <div :class="[
                'w-3 h-3 rounded-full',
                getStatusClasses(monitor.status).dot
              ]"></div>
              <div :class="[
                'absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75',
                getStatusClasses(monitor.status).dotPing
              ]"></div>
            </div>
            <span>{{ STATUS_CONFIG[monitor.status]?.text }}</span>
          </div>
        </div>
      </div>

      <!-- 卡片主体：统计数据和图表 -->
      <div class="space-y-4">
        <!-- 响应时间和运行时间统计卡片 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="inner-card relative">
            <Icon 
              icon="ri:line-chart-line"
              :class="[
                'absolute top-3 right-3 w-4 h-4 p-1 rounded-full transition-colors duration-200 box-content cursor-pointer',
                getStatusClasses(monitor.status).text,
                getStatusClasses(monitor.status).hover.text,
                getStatusClasses(monitor.status).hover.bg
              ]"
              @click="openResponseTimeModal(monitor)"
            />
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">平均响应时间</div>
            <div class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatters.responseTime(monitor.stats?.avgResponseTime) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              最近24小时
            </div>
          </div>
          <div class="inner-card">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">平均运行时间</div>
            <div class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatters.uptime(monitor.stats?.uptime) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              最近{{ getValidDays(monitor) }}天
            </div>
          </div>
        </div>

        <!-- 状态时间线图表 -->
        <div class="inner-card">
          <!-- 监控类型和状态指示器 -->
          <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
            <div class="flex items-center gap-1">
              <div class="relative flex">
                <div :class="[
                  'w-2 h-2 rounded-full',
                  getStatusClasses(monitor.status).dot
                ]"></div>
                <div :class="[
                  'absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75',
                  getStatusClasses(monitor.status).dotPing
                ]"></div>
              </div>
              <span class="text-xs">{{ getMonitorType(monitor) }} / {{ Math.floor(monitor.interval / 60) }}m</span>
              <div class="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span :class="[
                'text-xs font-medium',
                getStatusClasses(monitor.status).text
              ]">
                {{ STATUS_CONFIG[monitor.status]?.text }}
              </span>
            </div>
          </div>

          <!-- 时间线散点图 -->
          <div class="h-12">
            <Scatter
              v-if="getChartConfig(monitor).data"
              :data="getChartConfig(monitor).data"
              :options="getChartConfig(monitor).options"
            />
          </div>
          <div class="flex justify-between text-xs text-gray-400 mt-2">
            <span>30天前</span>
            <span class="text-gray-500">
              {{ getDowntimeStats(monitor) }}
            </span>
            <span>今日</span>
          </div>
        </div>

        <!-- 故障记录下拉列表 -->
        <div class="relative">
          <button 
            @click="toggleDowntimeList(monitor.id)" 
            :data-monitor-id="monitor.id.toString()"
            class="w-full px-4 py-3 flex items-center justify-between text-left
              bg-gray-50 dark:bg-gray-800/50
              rounded-lg transition-colors duration-200
              hover:bg-gray-100 dark:hover:bg-gray-700/50
              focus:outline-none"
          >
            <span class="text-xs text-gray-500 dark:text-gray-400">故障记录</span>
            <Icon 
              icon="bi:chevron-up"
              class="w-4 h-4 text-gray-400 transition-transform duration-200"
              :class="{ 'rotate-180': showDowntimeList === monitor.id }"
            />
          </button>
          
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-[10px] scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-[10px] scale-95"
          >
            <div v-if="showDowntimeList === monitor.id" 
                 class="absolute bottom-full left-0 right-0 mb-2
                   bg-white dark:bg-gray-800 border-[1.5px] border-gray-200 dark:border-gray-700 
                   rounded-lg downtime-list"
            >
              <div class="p-4 max-h-[280px] overflow-y-auto">
                <TransitionGroup 
                  tag="div"
                  class="space-y-2"
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 scale-95"
                  enter-to-class="opacity-100 scale-100"
                  leave-active-class="transition duration-200 ease-in"
                  leave-from-class="opacity-100 scale-100"
                  leave-to-class="opacity-0 scale-95"
                  move-class="transition duration-200"
                >
                  <div v-if="getDowntimeLogs(monitor)?.length" 
                       v-for="log in getDowntimeLogs(monitor)" 
                       :key="log.id"
                       class="p-3 bg-red-50/90 dark:bg-red-900/20 rounded-lg
                         border border-red-200/80 dark:border-red-800/80"
                  >
                    <div class="flex justify-between">
                      <span class="text-red-600/90 dark:text-red-400/90 text-xs">{{ getErrorMessage(log.reason) }}</span>
                      <span class="text-red-600/80 dark:text-red-400/80 text-xs">{{ formatters.dateTime(log.datetime) }}</span>
                    </div>
                    <div class="mt-1 text-red-600/80 dark:text-red-400/80 text-xs">
                      持续时间: {{ formatters.duration(log.duration) }}
                    </div>
                  </div>
                  <div v-else 
                       key="empty"
                       class="text-center text-3xs text-gray-400"
                  >
                    近期无故障记录
                  </div>
                </TransitionGroup>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>

  <!-- 响应时间详情模态框 -->
  <Teleport to="body">
    <div v-if="modalMounted" 
         class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <!-- 背景遮罩 -->
      <Transition
        appear
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        enter-active-class="transition-opacity duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        leave-active-class="transition-opacity duration-300"
      >
        <div v-show="showResponseTimeModal"
             class="absolute inset-0 bg-black/60" 
             @click="closeModal"
        ></div>
      </Transition>
      
      <!-- 模态框内容 -->
      <Transition
        appear
        enter-from-class="opacity-0 translate-y-4 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        enter-active-class="transition-all duration-300 transform"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-4 scale-95"
        leave-active-class="transition-all duration-300 transform"
        @after-leave="onAfterLeave"
      >
        <div v-show="showResponseTimeModal"
             class="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-3xl
                    shadow-xl border border-gray-200 dark:border-gray-700
                    max-h-[90vh] overflow-y-auto"
             @click.stop
        >
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">
              响应时间趋势
            </h3>
            <button @click="closeModal"
                    class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full 
                           transition-colors duration-200">
              <Icon icon="carbon:close" 
                    class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          <div class="h-[300px]">
            <!-- 无数据状态 -->
            <div v-if="!selectedMonitor?.stats?.avgResponseTime" 
                 class="h-full flex flex-col items-center justify-center gap-4">
              <Icon 
                icon="carbon:chart-line" 
                class="w-12 h-12 text-gray-400 dark:text-gray-500"
              />
              <div class="text-gray-500 dark:text-gray-400 text-sm">
                暂无数据
              </div>
            </div>
            <!-- 数据图表 -->
            <Line v-else
                  :data="getResponseTimeChartData(selectedMonitor)"
                  :options="responseTimeChartOptions"
            />
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { format } from 'date-fns'
import { Icon } from '@iconify/vue'
import { Scatter, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js'
import { 
  getStatusChartConfig,
  getResponseTimeChartData, 
  responseTimeChartOptions 
} from '@/utils/chartConfig'

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

const props = defineProps({
  monitors: Array,
  error: String
})

/**
 * 排序监控列表
 */
const sortedMonitors = computed(() => {
  if (!props.monitors) return []
  return [...props.monitors].sort((a, b) => {
    // 如果状态相同，保持原有顺序
    if (a.status === b.status) return 0
    // 将离线状态(9)排到最后
    if (a.status === 9) return 1
    if (b.status === 9) return -1
    // 其他状态保持原有顺序
    return 0
  })
})

/**
 * 状态常量定义
 */
const STATUS = {
  ONLINE: 2,    // 在线状态
  PAUSED: 0,    // 暂停状态
  PREPARING: 1, // 准备中状态
  OFFLINE: 9    // 离线状态
}

/**
 * 状态配置映射
 */
const STATUS_CONFIG = {
  2: { 
    text: '在线', color: 'green',
    classes: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
  },
  0: {
    text: '暂停', color: 'yellow', 
    classes: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
  },
  1: {
    text: '准备中', color: 'yellow',
    classes: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
  },
  9: {
    text: '离线', color: 'red',
    classes: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
  }
}

/**
 * 格式化工具函数
 */
const formatters = {
  /** 格式化响应时间 */
  responseTime: time => `${Math.round(time || 0)} ms`,
  /** 格式化运行时间 */
  uptime: uptime => `${Number(uptime || 0).toFixed(2)}%`,
  /** 格式化持续时间 */
  duration: seconds => {
    if (!seconds) return '0秒'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    
    // 如果超过100小时，只显示小时
    if (h >= 100) {
      return `约${h}小时`
    }
    
    return [
      h && `${h}小时`,
      m && `${m}分钟`, 
      (!h && !m && s) && `${s}秒`
    ].filter(Boolean).join('')
  },
  /** 格式化日期时间 */
  dateTime: ts => format(new Date(ts * 1000), 'MM-dd HH:mm')
}

/**
 * 获取状态对应的样式类
 */
const getStatusClasses = computed(() => (status) => {
  return {
    dot: {
      'bg-green-500 dark:bg-green-400': status === STATUS.ONLINE,
      'bg-yellow-500 dark:bg-yellow-400': status === STATUS.PAUSED || status === STATUS.PREPARING,
      'bg-red-500 dark:bg-red-400': status === STATUS.OFFLINE
    },
    dotPing: {
      'bg-green-500 dark:bg-green-400': status === STATUS.ONLINE,
      'bg-yellow-500 dark:bg-yellow-400': status === STATUS.PAUSED || status === STATUS.PREPARING,
      'bg-red-500 dark:bg-red-400': status === STATUS.OFFLINE
    },
    text: {
      'text-green-500': status === STATUS.ONLINE,
      'text-yellow-500': status === STATUS.PAUSED || status === STATUS.PREPARING,
      'text-red-500': status === STATUS.OFFLINE
    },
    hover: {
      text: {
        'hover:text-green-600 dark:hover:text-green-300': status === STATUS.ONLINE,
        'hover:text-yellow-600 dark:hover:text-yellow-300': status === STATUS.PAUSED || status === STATUS.PREPARING,
        'hover:text-red-600 dark:hover:text-red-300': status === STATUS.OFFLINE
      },
      bg: {
        'hover:bg-green-50 dark:hover:bg-green-900/30': status === STATUS.ONLINE,
        'hover:bg-yellow-50 dark:hover:bg-yellow-900/30': status === STATUS.PAUSED || status === STATUS.PREPARING,
        'hover:bg-red-50 dark:hover:bg-red-900/30': status === STATUS.OFFLINE
      }
    }
  }
})

/**
 * 监控类型映射
 */
const monitorTypeMap = {
  1: 'HTTPS',
  2: 'Keyword',
  3: 'PING',
  4: 'Port',
  default: 'HTTP'
}

/**
 * 获取监控类型
 */
const getMonitorType = computed(() => (monitor) => {
  return monitorTypeMap[monitor.type] || monitorTypeMap.default
})

/**
 * 错误消息映射
 */
const ERROR_MESSAGES = {
  333333: '连接超时',
  444444: '无响应',
  100001: 'DNS解析失败',
  98: '离线状态',
  99: '失联状态',
  default: '连接异常'
}

/**
 * 获取错误消息
 */
const getErrorMessage = computed(() => (code) => {
  const errorCode = typeof code === 'object' ? code.code : code
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default
})

/**
 * 获取宕机统计信息
 */
const getDowntimeStats = computed(() => (monitor) => {
  const downtimeLogs = monitor.stats?.downtimeLogs || []
  const downtimeCount = downtimeLogs.length
  const totalDowntime = formatters.duration(monitor.stats?.totalDowntime)
  const validDays = getValidDays(monitor)

  if (validDays <= 0) return '暂无数据'
  
  if (downtimeCount > 0 || monitor.status === STATUS.OFFLINE) {
    if (downtimeCount > 0) {
      return `最近${validDays}天 ${downtimeCount} 次故障，总计${totalDowntime}`
    }
    return '当前离线'
  }
  return `最近${validDays}天运行正常`
})

/**
 * 响应式状态
 */
const showDowntimeList = ref(null)
const showResponseTimeModal = ref(false)
const selectedMonitor = ref(null)
const isMobile = ref(window.innerWidth < 768)

/**
 * URL 处理函数
 */
const openUrl = (url) => {
  if (!url) return
  const finalUrl = !url.startsWith('http://') && !url.startsWith('https://')
    ? 'http://' + url
    : url
  window.open(finalUrl, '_blank', 'noopener,noreferrer')
}

/**
 * 图表相关配置
 */
const dateRange = computed(() => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (29 - i))
    return date
  })
  return { startDate: dates[0], dates }
})

/**
 * 宕机日志获取
 */
const getDowntimeLogs = (monitor) => (monitor.stats?.downtimeLogs || []).slice(0, 15)

/**
 * 计算有效监控天数
 */
const getValidDays = monitor => {
  if (!monitor.stats?.dailyUptimes) return 0
  
  // 添加时间验证逻辑
  const createTime = monitor.create_datetime * 1000
  const now = Date.now()
  const effectiveCreateTime = createTime > now ? now : createTime
  
  const daysSinceStart = Math.max(0, Math.floor(
    (new Date(effectiveCreateTime) - dateRange.value.startDate) / 86400000
  ))
  
  return monitor.stats.dailyUptimes
    .slice(daysSinceStart)
    .filter(v => v != null && !isNaN(v))
    .length
}

/**
 * 获取图表配置
 */
const getChartConfig = (monitor) => getStatusChartConfig(monitor, dateRange.value, isMobile.value)

/**
 * 事件监听
 */
const closeOnClickOutside = (e) => {
  if (showDowntimeList.value) {
    const path = e.composedPath()
    const isClickInside = path.some(element => {
      return element.classList?.contains('downtime-list') || 
              element.dataset?.monitorId === showDowntimeList.value.toString()
    })
    if (!isClickInside) {
      showDowntimeList.value = null
    }
  }
}

const toggleDowntimeList = (id) => {
  showDowntimeList.value = showDowntimeList.value === id ? null : id
}

/**
 * 控制模态框挂载状态
 */
const modalMounted = ref(false)

// 打开模态框
const openResponseTimeModal = (monitor) => {
  selectedMonitor.value = monitor
  modalMounted.value = true
  showResponseTimeModal.value = true
}

// 关闭模态框
const closeModal = () => {
  showResponseTimeModal.value = false
}

// 在动画结束后卸载组件
const onAfterLeave = () => {
  modalMounted.value = false
}

/**
 * 更新移动端状态
 */
const updateMobileState = () => isMobile.value = window.innerWidth < 768

/**
 * 生命周期钩子
 */
onMounted(() => {
  document.addEventListener('click', closeOnClickOutside)
  window.addEventListener('resize', updateMobileState)
})

onUnmounted(() => {
  document.removeEventListener('click', closeOnClickOutside)
  window.removeEventListener('resize', updateMobileState)
})
</script>