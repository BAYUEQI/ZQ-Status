<template>
  <div class="flex justify-between items-center">
    <div class="flex items-center gap-3">
      <img 
        src="/logo.svg" 
        alt="Logo" 
        class="w-8 h-8 sm:w-10 sm:h-10"
      />
      <h1 class="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
        {{ title }}
      </h1>
    </div>
    <div class="flex items-center gap-3">
      <button
        @click="refreshData"
        :disabled="isRefreshing"
        class="flex items-center gap-2 px-3 h-9 rounded-full transition-all duration-200
          bg-emerald-50 dark:bg-emerald-900/30 
          text-emerald-600 dark:text-emerald-400
          shadow-sm shadow-emerald-500/10 dark:shadow-emerald-900/20
          hover:bg-emerald-100 dark:hover:bg-emerald-900/40
          disabled:opacity-75 disabled:cursor-not-allowed disabled:shadow-none"
      >
        <Icon 
          icon="ph:arrows-counter-clockwise-bold" 
          class="w-4 h-4 transition-all"
          :class="isRefreshing ? 'animate-spin' : ''"
        />
        <span class="hidden sm:block text-sm font-medium">
          {{ `${formatTime(countdown)}后刷新` }}
        </span>
      </button>
      <button
        @click="toggleTheme"
        class="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200
          bg-white dark:bg-gray-800
          text-gray-600 dark:text-gray-300
          shadow-sm shadow-gray-200/50 dark:shadow-gray-900/30
          hover:bg-gray-50 dark:hover:bg-gray-700
          group overflow-hidden"
      >
        <div class="relative h-5 w-5">
          <Icon 
            icon="bi:sun" 
            class="w-5 h-5 absolute transition-all duration-500 transform"
            :class="isDark ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'"
          />
          <Icon 
            icon="bi:moon"
            class="w-5 h-5 absolute transition-all duration-500 transform"
            :class="isDark ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'"
          />
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  isRefreshing: {
    type: Boolean,
    default: false
  },
  isDark: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['refresh', 'toggle-theme'])

/**
 * 刷新间隔
 */
const REFRESH_INTERVAL = 300 // 5分钟 = 300秒
const countdown = ref(REFRESH_INTERVAL)
let timer = null

/**
 * 启动计时器
 */
const startTimer = () => {
  clearInterval(timer) // 确保只有一个计时器在运行
  countdown.value = REFRESH_INTERVAL
  timer = setInterval(() => {
    if (!props.isRefreshing && countdown.value > 0) {
      countdown.value--
      if (countdown.value === 0) {
        emit('refresh')
        countdown.value = REFRESH_INTERVAL
      }
    }
  }, 1000)
}

/**
 * 刷新数据
 */
const refreshData = () => (emit('refresh'), countdown.value = REFRESH_INTERVAL)

/**
 * 切换主题
 */
const toggleTheme = () => {
  emit('toggle-theme')
}

onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>