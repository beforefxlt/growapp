<template>
  <div class="home">
    <div v-if="!currentChild" class="empty-state">
      <el-empty description="还没有添加儿童信息">
        <el-button type="primary" @click="goToSettings">去添加</el-button>
      </el-empty>
    </div>
    <div v-else class="child-info">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="姓名">{{ currentChild.name }}</el-descriptions-item>
        <el-descriptions-item label="出生日期">{{ currentChild.birthDate }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ calculateAge(currentChild.birthDate) }}</el-descriptions-item>
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
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { Plus } from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  TimelineComponent,
  DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { formatDate, calculateAge } from '../utils/dateUtils'
import { ElEmpty, ElButton, ElDescriptions, ElDescriptionsItem, ElSelect, ElOption } from 'element-plus'

const router = useRouter()
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()

const hasChildren = computed(() => childrenStore.hasChildren)
const currentChild = computed(() => childrenStore.currentChild)
const chartType = ref('height')
const chartRef = ref(null)
let chart = null

async function goToSettings() {
  try {
    await router.push({ name: 'settings', replace: true })
    await router.isReady()
    await new Promise(resolve => setTimeout(resolve, 100))
  } catch (error) {
    console.error('导航失败:', error)
  }
}

async function goToRecords() {
  try {
    await router.push({ name: 'records', replace: true })
    await router.isReady()
    await new Promise(resolve => setTimeout(resolve, 100))
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

const initChart = () => {
  if (chart) {
    chart.dispose()
  }
  chart = echarts.init(chartRef.value, null, {
    renderer: 'canvas',
    useDirtyRect: false
  })
  
  // 设置全局配置，只包含 X 轴的 dataZoom
  chart.setOption({
    animation: false,
    dataZoom: getDataZoomConfig()
  }, true)

  // 监听 dataZoom，实现缩放间隔限制
  chart.on('datazoom', function () {
    const currentTime = Date.now()
    if (this.lastZoomTime && currentTime - this.lastZoomTime < 200) {
      return
    }
    this.lastZoomTime = currentTime
  })
}

const chartOptions = ref(null)
const chartData = ref([])

const updateChartData = () => {
  if (!currentChild.value) return

  const records = recordsStore.getChildRecords(currentChild.value.id)
  const sortedRecords = records.sort((a, b) => new Date(a.date) - new Date(b.date))

  chartData.value = sortedRecords.map(record => ({
    age: calculateAge(record.date, currentChild.value.birthDate),
    value: record[chartType.value],
    date: record.date
  })).sort((a, b) => a.age - b.age)

  updateChartOptions()
}

const updateChartOptions = () => {
  if (!chartData.value.length) return

  chartOptions.value = {
    animation: false,
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        const date = new Date(chartData.value[params[0].dataIndex].date)
        const formattedDate = formatDate(date, 'YYYY年MM月DD日')
        const age = params[0].value[0]
        return `${formattedDate}<br/>年龄: ${formatAgeDisplay(age)}<br/>${params[0].seriesName}: ${params[0].value[1]}${chartType.value === 'height' ? 'cm' : 'kg'}`
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
      right: '5%',
      top: 20,
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '年龄（岁）',
      nameLocation: 'middle',
      nameGap: 30,
      min: 3,
      max: Math.ceil(Math.max(...chartData.value.map(item => item.age))),
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
      min: chartType.value === 'height' ? 50 : null,
      max: function(value) {
        const maxDataValue = Math.max(...chartData.value.map(item => item.value));
        if (chartType.value === 'height') {
          return Math.ceil((maxDataValue + 20) / 10) * 10;
        } else {
          return Math.ceil((maxDataValue + 5) / 5) * 5;
        }
      },
      axisLabel: {
        formatter: function(value) {
          return value + (chartType.value === 'height' ? 'cm' : 'kg')
        }
      }
    },
    series: [{
      name: chartType.value === 'height' ? '身高' : '体重',
      type: 'line',
      smooth: true,
      showSymbol: true,
      data: chartData.value.map(item => [item.age, item.value]),
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
}

// 确保组件正确注册
const registerComponents = () => {
  echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    TimelineComponent,
    DataZoomComponent,
    LineChart,
    CanvasRenderer
  ])
}

onMounted(() => {
  registerComponents()
  initChart()
  updateChartData()
  
  // 添加防抖的 resize 处理
  let resizeTimer = null
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      chart?.resize()
    }, 100)
  })
})

// 监听图表类型变化
watch(chartType, () => {
  updateChartData()
})

// 监听当前儿童变化
watch(() => childrenStore.currentChild, () => {
  updateChartData()
}, { deep: true })

// 确保在组件卸载时清理
onUnmounted(() => {
  if (chart) {
    chart.off('datazoom')
    chart.dispose()
  }
  chart = null
})
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