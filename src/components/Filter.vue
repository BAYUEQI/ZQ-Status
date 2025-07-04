<template>
    <div class="filter-container bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      <!-- 筛选按钮组 -->
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <button
          v-for="filter in filterOptions"
          :key="filter.value"
          @click="setFilter(filter.value)"
          :class="[
            'px-5 py-2 rounded-full font-semibold text-sm transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
            'shadow-md',
            'transform',
            currentFilter === filter.value
              ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white scale-105 shadow-lg'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gradient-to-r hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900 dark:hover:to-cyan-900 hover:scale-105 hover:shadow-lg'
          ]"
          style="will-change: transform;"
        >
          <span class="inline-flex items-center gap-2">
            <span>{{ filter.label }}</span>
            <span v-if="filter.count !== undefined" class="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/30 dark:bg-gray-900/30">
              {{ filter.count }}
            </span>
          </span>
        </button>
      </div>
  
      <!-- 搜索输入框 -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索网站名称..."
          class="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg
            bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-all duration-200"
          @input="onSearchInput"
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <svg class="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
  
      <!-- 筛选结果统计 -->
      <div v-if="showStats" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        显示 {{ filteredCount }} 个网站，共 {{ totalCount }} 个
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue'
  
  // Props
  const props = defineProps({
    monitors: {
      type: Array,
      default: () => []
    },
    showStats: {
      type: Boolean,
      default: true
    }
  })
  
  // Emits
  const emit = defineEmits(['filter-change'])
  
  // 响应式状态
  const currentFilter = ref('all')
  const searchQuery = ref('')
  
  // 筛选选项（与原面板一致，兼容数字和字符串status）
  const filterOptions = computed(() => [
    {
      label: '全部网站',
      value: 'all',
      count: props.monitors.length
    },
    {
      label: '正常网站',
      value: 'online',
      count: props.monitors.filter(m => m.status == 2 || m.status == 1).length
    },
    {
      label: '异常网站',
      value: 'offline',
      count: props.monitors.filter(m => m.status == 9 || m.status == 0).length
    }
  ])
  
  // 计算属性
  const filteredCount = computed(() => {
    const filtered = getFilteredMonitors()
    return filtered.length
  })
  
  const totalCount = computed(() => props.monitors.length)
  
  // 筛选逻辑
  const getFilteredMonitors = () => {
    let filtered = [...props.monitors]
    if (currentFilter.value === 'online') {
      filtered = filtered.filter(m => m.status == 2 || m.status == 1)
    } else if (currentFilter.value === 'offline') {
      filtered = filtered.filter(m => m.status == 9 || m.status == 0)
    }
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      filtered = filtered.filter(m =>
        m.friendly_name.toLowerCase().includes(query) ||
        m.url.toLowerCase().includes(query)
      )
    }
    return filtered
  }
  
  // 方法
  const setFilter = (filter) => {
    currentFilter.value = filter
    emitFilterChange()
  }
  
  const onSearchInput = () => {
    emitFilterChange()
  }
  
  const clearSearch = () => {
    searchQuery.value = ''
    emitFilterChange()
  }
  
  const emitFilterChange = () => {
    const filtered = getFilteredMonitors()
    emit('filter-change', {
      filter: currentFilter.value,
      search: searchQuery.value,
      filteredMonitors: filtered
    })
  }
  
  // 监听monitors变化，重新计算筛选结果
  watch(() => props.monitors, () => {
    emitFilterChange()
  }, { deep: true })
  
  // 初始化时发出筛选事件
  emitFilterChange()
  </script>
  
  <style scoped>
  .filter-container {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  </style>
  
