<template>
  <div class="home">
    <div v-if="!currentChild" class="empty-state">
      <el-empty description="还没有添加儿童信息">
        <el-button type="primary" @click="goToSettings">去添加</el-button>
      </el-empty>
    </div>
    <div v-else class="child-info">
      <div class="child-selector">
        <span class="selector-label">选择儿童</span>
        <el-select
          v-model="selectedChildId"
          @change="handleChildChange"
          placeholder="请选择要查看的儿童"
          class="child-select"
        >
          <el-option
            v-for="child in childrenStore.children"
            :key="child.id"
            :label="child.name"
            :value="child.id"
          />
        </el-select>
      </div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="出生日期">{{ currentChild.birthDate }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ calculateAgeText(new Date().toISOString(), currentChild.birthDate) }}</el-descriptions-item>
      </el-descriptions>
      <div class="chart-container">
        <div class="chart-header">
          <el-select v-model="chartType">
            <el-option label="身高" value="height" />
            <el-option label="体重" value="weight" />
          </el-select>
          <el-button type="primary" @click="goToRecords">
            <el-icon><Plus /></el-icon>添加记录
          </el-button>
        </div>
        <div ref="chartRef" class="chart"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { useChartConfigStore } from '../stores/chartConfig'
import { Plus } from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  TimelineComponent,
  DataZoomComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { formatDate, calculateAge, calculateAgeText } from '../utils/dateUtils'
import { ElEmpty, ElButton, ElDescriptions, ElDescriptionsItem, ElSelect, ElOption } from 'element-plus'

const router = useRouter()
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()
const chartConfigStore = useChartConfigStore()

const selectedChildId = ref(childrenStore.currentChildId)
const hasChildren = computed(() => childrenStore.hasChildren)
const currentChild = computed(() => childrenStore.currentChild)
const chartType = ref('height')
const chartRef = ref(null)
const chartData = ref([])
const chartOptions = ref(null)
let chart = null

async function goToSettings() {
  try {
    await router.push({ name: 'settings' })
    await router.isReady()
  } catch (error) {
    console.error('导航失败:', error)
  }
}

async function goToRecords() {
  try {
    await router.push({ name: 'records' })
    await router.isReady()
  } catch (error) {
    console.error('导航失败:', error)
  }
}

const formatAgeDisplay = (age) => {
  const years = Math.floor(age)
  const months = Math.round((age - years) * 12)
  if (months === 12) {
    return `${years + 1}岁`
  }
  return months > 0 ? `${years}岁${months}个月` : `${years}岁`
}

// 统一管理 dataZoom 配置
const getDataZoomConfig = () => ([
  {
    type: 'inside',
    xAxisIndex: 0,
    filterMode: 'none',
    minSpan: 5,
    maxSpan: 100,
    start: 0,
    end: 100,
    throttle: 600,
    rangeMode: ['value', 'value'],
    preventDefault: true,
    zoomLock: false,
    moveOnMouseMove: false,
    zoomOnMouseWheel: true,
    moveOnMouseWheel: false
  }
])

// 更新图表数据的核心函数
const updateChartData = () => {
  if (!currentChild.value || !chartType.value) return

  const records = recordsStore.getChildRecords(currentChild.value.id) || []
  const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date))

  chartData.value = sortedRecords.map(record => ({
    age: calculateAge(record.date, currentChild.value.birthDate),
    value: record[chartType.value],
    date: record.date
  })).sort((a, b) => a.age - b.age)

  updateChartOptions()
}

const updateChartOptions = () => {
  const currentConfig = chartConfigStore.config[chartType.value]
  console.log('[Chart] 开始更新图表配置', { chartType: chartType.value, currentConfig })

  // 获取WHO标准数据并处理
  const whoData = chartConfigStore.whoStandardsData?.[chartType.value]?.[currentChild.value.gender] || []
  const whoSeries = []
  console.log('[Chart] WHO标准数据', { whoDataLength: whoData.length, gender: currentChild.value.gender })

  if (whoData.length > 0) {
    const percentiles = ['p3', 'p50', 'p97']
    const percentileNames = {
      p3: '3%',
      p50: '50%',
      p97: '97%'
    }

    percentiles.forEach(percentile => {
      if (currentConfig.whoStandardsConfig[`show${percentile.toUpperCase()}`]) {
        console.log('[Chart] 添加百分位线', { percentile })
        whoSeries.push({
          name: `${percentileNames[percentile]}`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          legendHoverLink: true,
          data: whoData.map(item => [item.ageInMonths / 12, item[percentile]]),
          lineStyle: {
            ...currentConfig.whoStandardsConfig.lineStyle,
            color: currentConfig.whoStandardsConfig.colors[percentile]
          }
        })
      }
    })
  }

  console.log('[Chart] 图例配置', {
    legendCount: whoSeries.length,
    legendNames: whoSeries.map(s => s.name)
  })

  chartOptions.value = {
    animation: false,
    legend: {
      show: true,
      type: 'plain',
      orient: 'vertical',
      right: '2%',
      top: 'middle',
      textStyle: {
        color: '#2F2F38',
        fontSize: 12,
        lineHeight: 14
      },
      itemWidth: 20,
      itemHeight: 12,
      itemGap: 6,
      padding: [3, 3],
      backgroundColor: 'transparent',
      borderRadius: 4,
      z: 100,
      selectedMode: false
    },
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        if (params[0] && chartData.value[params[0].dataIndex]) {
          const date = new Date(chartData.value[params[0].dataIndex].date)
          const formattedDate = formatDate(date, 'YYYY年MM月DD日')
          const age = params[0].value[0]
          return `${formattedDate}<br/>年龄: ${formatAgeDisplay(age)}<br/>${params[0].seriesName}: ${params[0].value[1]}${chartType.value === 'height' ? 'cm' : 'kg'}`
        }
        return ''
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#807CA5',
      borderWidth: 1,
      textStyle: {
        color: '#2F2F38'
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: 30,
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '年龄（岁）',
      nameLocation: 'middle',
      nameGap: 30,
      min: currentConfig.xAxisMin,
      max: currentConfig.xAxisMax,
      axisLabel: {
        formatter: function (value) {
          return formatAgeDisplay(value)
        }
      }
    },
    yAxis: {
      type: 'value',
      name: chartType.value === 'height' ? '身高（cm）' : '体重（kg）',
      nameLocation: 'middle',
      nameGap: 55,
      min: currentConfig.yAxisMin,
      max: currentConfig.yAxisMax,
      axisLabel: {
        formatter: function(value) {
          return value + (chartType.value === 'height' ? 'cm' : 'kg')
        }
      }
    },
    series: [
      ...whoSeries,
      {
      name: chartType.value === 'height' ? '身高' : '体重',
      type: 'line',
      smooth: true,
      showSymbol: true,
      data: chartData.value.map(item => [item.age, item.value]) || [],
      itemStyle: {
        color: '#807CA5'
      },
      lineStyle: {
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0,
            color: 'rgba(128, 124, 165, 0.3)'
          }, {
            offset: 1,
            color: 'rgba(128, 124, 165, 0)'
          }]
        }
      }
    }]
  }

  chart?.setOption(chartOptions.value, {
    replaceMerge: ['series', 'xAxis', 'yAxis'],
    lazyUpdate: true
  })
  console.log('[Chart] 图表选项已更新', {
    hasLegend: !!chartOptions.value.legend,
    legendData: chartOptions.value.legend.data,
    seriesCount: chartOptions.value.series.length
  })
}

// 确保组件正确注册
const registerComponents = () => {
  echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    TimelineComponent,
    DataZoomComponent,
    LegendComponent,
    LineChart,
    CanvasRenderer
  ])
}

// 处理儿童切换
const handleChildChange = async (childId) => {
  try {
    selectedChildId.value = childId
    await childrenStore.setCurrentChild(childId)
    await nextTick()
    updateChartData()
  } catch (error) {
    console.error('切换儿童失败:', error)
  }
}

// 初始化图表
const initChart = () => {
  console.log('[Chart] 开始初始化图表')
  if (chart) {
    console.log('[Chart] 清理旧图表实例')
    chart.dispose()
  }
  
  if (!chartRef.value) {
    console.warn('[Chart] 图表容器未就绪')
    return
  }
  
  chart = echarts.init(chartRef.value, null, {
    renderer: 'canvas',
    useDirtyRect: false
  })
  
  chart.setOption({
    animation: false,
    dataZoom: getDataZoomConfig()
  }, true)
  console.log('[Chart] 图表实例创建完成')

  chart.on('datazoom', function () {
    const currentTime = Date.now()
    if (this.lastZoomTime && currentTime - this.lastZoomTime < 200) {
      return
    }
    this.lastZoomTime = currentTime
  })
}

// 组件挂载时的初始化
onMounted(async () => {
  try {
    await chartConfigStore.loadFromLocal()
    await chartConfigStore.loadWHOStandards()
    registerComponents()
    initChart()
    
    // 确保初始状态正确
    if (childrenStore.currentChildId) {
      selectedChildId.value = childrenStore.currentChildId
      await nextTick()
      updateChartData()
    }
    
    // resize处理
    const handleResize = () => {
      if (chart) {
        chart.resize()
      }
    }
    
    window.addEventListener('resize', handleResize)
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      if (chart) {
        chart.off('datazoom')
        chart.dispose()
      }
      chart = null
    })
  } catch (error) {
    console.error('初始化失败:', error)
  }
})

// 监听相关状态变化
watch([
  () => childrenStore.currentChildId,
  () => chartType.value,
  () => recordsStore.records,
  () => chartConfigStore.config
], async () => {
  if (currentChild.value) {
    selectedChildId.value = childrenStore.currentChildId
    await nextTick()
    updateChartData()
  }
}, { deep: true, immediate: true })

// 确保选择器状态同步
watch(() => childrenStore.currentChildId, (newId) => {
  if (newId && newId !== selectedChildId.value) {
    selectedChildId.value = newId
    updateChartData()
  }
}, { immediate: true })
</script>

<style scoped>
.home-container {
  padding: 0;
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  background-color: #F6F6FB;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.home-header {
  padding: var(--spacing-base, 1rem);
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: var(--spacing-base, 1rem);
}

.center-title {
  text-align: center;
  margin: 0;
  color: #2F2F38;
  font-size: clamp(1rem, 2vw, 1.25rem);
  font-weight: 500;
}

.child-info {
  margin: 0;
  padding: 4px;
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.chart-container {
  background: #FFFFFF;
  padding: 8px;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  isolation: isolate;
  overflow: visible;
  min-width: 320px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  gap: 8px;
  
  @media screen and (max-width: 576px) {
    flex-direction: row;
    align-items: center;
  }
  
  :deep(.el-button) {
    margin-left: 0;
    background: transparent;
    border: 1.5px solid #807CA5;
    color: #807CA5;
    width: 50%;
    border-radius: 0;
    padding: 8px 16px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-weight: 500;
    
    .el-icon {
      font-size: 14px;
      transition: transform 0.2s ease;
    }
    
    &:hover {
      background: rgba(128, 124, 165, 0.1);
      border-color: #9DA0C5;
      color: #9DA0C5;
      
      .el-icon {
        transform: scale(1.1);
      }
    }
    
    @media screen and (max-width: 576px) {
      width: 50%;
    }
  }
  
  :deep(.el-select) {
    width: 50%;
    
    @media screen and (max-width: 576px) {
      width: 50%;
    }

    .el-input__wrapper {
      border-radius: 0;
    }
  }
}

.chart {
  flex: 1;
  width: 100%;
  min-height: clamp(250px, 50vh, 500px);
  position: relative;
  z-index: 1;
  overflow: visible;
  margin-right: 0;
}

:deep(.el-descriptions) {
  width: 100%;
  padding: 0;
  margin: 0;
  
  .el-descriptions__body {
    padding: 0;
    width: 100%;
  }
  
  .el-descriptions__label {
    padding: 2px 4px;
    background-color: #F6F6FB;
  }
  
  .el-descriptions__content {
    padding: 2px 4px;
  }
}

:deep(.el-empty) {
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

/* 修改图表的默认配色 */
:deep(.echarts) {
  .line-chart {
    color: #807CA5;
  }
  
  .grid-line {
    stroke: #F4F5F7;
  }
}

:deep(.el-button--primary) {
  background: transparent !important;
  border: 1.5px solid #807CA5 !important;
  color: #807CA5 !important;
  border-radius: 0 !important;
  padding: 8px 16px !important;
  transition: all 0.2s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-weight: 500 !important;
  
  .el-icon {
    font-size: 14px;
    transition: transform 0.2s ease;
  }
  
  &:hover {
    background: rgba(128, 124, 165, 0.1) !important;
    border-color: #9DA0C5 !important;
    color: #9DA0C5 !important;
    
    .el-icon {
      transform: scale(1.1);
    }
  }
}

.child-selector {
  margin-bottom: 12px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}

.child-select {
  flex: 1;
}

:deep(.child-select .el-input__wrapper) {
  border-radius: 0;
  background-color: #F6F6FB;
  border: 1px solid #E4E7ED;
  box-shadow: none;
}

:deep(.child-select .el-input__wrapper:hover) {
  border-color: #807CA5;
}

:deep(.child-select .el-input__wrapper.is-focus) {
  border-color: #807CA5;
  box-shadow: 0 0 0 1px #807CA5;
}

/* 添加图例样式 */
:deep(.echarts-legend) {
  background: transparent !important;
  
  .legend-item {
    margin: 5px 0;
    display: flex;
    align-items: center;
    
    .legend-marker {
      width: 25px;
      height: 14px;
      margin-right: 8px;
    }
    
    .legend-text {
      font-size: 12px;
      line-height: 14px;
      color: #2F2F38;
    }
  }
}
</style>

<script>
import { ElEmpty, ElButton, ElDescriptions, ElDescriptionsItem, ElSelect, ElOption } from 'element-plus'

export default {
  name: 'HomeView',
  components: {
    ElEmpty,
    ElButton,
    ElDescriptions,
    ElDescriptionsItem,
    ElSelect,
    ElOption
  },
  // ... existing code ...
}
</script>