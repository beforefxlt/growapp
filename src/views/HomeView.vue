<template>
  <div class="home-container">
    <el-empty v-if="!hasChildren" description="请先添加儿童信息">
      <el-button type="primary" @click="router.push('/settings')">去添加</el-button>
    </el-empty>

    <template v-else>
      <div class="child-info">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="姓名">{{ currentChild.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ currentChild.gender === 'male' ? '男' : '女' }}</el-descriptions-item>
          <!-- <el-descriptions-item label="出生日期">{{ currentChild.birthDate }}</el-descriptions-item> -->
        </el-descriptions>
      </div>

      <div class="chart-container">
        <div class="chart-header">
          <el-select v-model="chartType" placeholder="选择图表类型">
            <el-option label="身高曲线" value="height" />
            <el-option label="体重曲线" value="weight" />
          </el-select>

          <el-button type="primary" @click="router.push('/records')">
            <el-icon><Plus /></el-icon>添加记录
          </el-button>
        </div>

        <div ref="chartRef" class="chart"></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { Plus, House, Notebook, Setting } from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  TimelineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { formatDate, calculateAge } from '../utils/dateUtils'

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  TimelineComponent,
  LineChart,
  CanvasRenderer
])

const router = useRouter()
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()

const hasChildren = computed(() => childrenStore.hasChildren)
const currentChild = computed(() => childrenStore.currentChild)
const chartType = ref('height')
const chartRef = ref(null)
let chart = null

const formatAgeDisplay = (age) => {
  const years = Math.floor(age)
  const months = Math.round((age - years) * 12)
  if (months === 12) {
    return `${years + 1}岁`
  }
  return months > 0 ? `${years}岁${months}个月` : `${years}岁`
}

const initChart = () => {
  if (chart) {
    chart.dispose()
  }
  chart = echarts.init(chartRef.value)
}

const updateChart = () => {
  if (!chart || !currentChild.value) return

  const records = recordsStore.getChildRecords(currentChild.value.id)
  // 按日期排序
  const sortedRecords = records.sort((a, b) => new Date(a.date) - new Date(b.date))

  // 转换数据，X轴使用年龄
  const chartData = sortedRecords.map(record => ({
    age: calculateAge(record.date, currentChild.value.birthDate),
    value: record[chartType.value],
    date: record.date
  })).sort((a, b) => a.age - b.age)

  const option = {
    animation: false,  // 禁用动画，避免重绘问题
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        const date = new Date(chartData[params[0].dataIndex].date)
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
      min: 0,  // 从0开始
      max: Math.ceil(Math.max(...chartData.map(item => item.age))),  // 向上取整
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
      min: chartType.value === 'height' ? 0 : null,  // 身高从0开始，体重保持自动
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
      data: chartData.map(item => [item.age, item.value]),
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

  // 清除之前的图表实例
  chart.clear()
  // 设置新的配置
  chart.setOption(option, true)
}

onMounted(() => {
  initChart()
  updateChart()
  window.addEventListener('resize', () => chart?.resize())
})

watch([chartType, currentChild], updateChart)
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
  padding: var(--spacing-base, 1rem);
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chart-container {
  background: #FFFFFF;
  padding: var(--spacing-base, 1rem);
  margin: 0;
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
  padding-bottom: var(--spacing-base, 1rem);
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  gap: 0.5rem;
  
  @media screen and (max-width: 576px) {
    flex-direction: column;
    align-items: stretch;
  }
  
  :deep(.el-button) {
    margin-left: 0;
    background: #807CA5;
    border: none;
    
    @media screen and (max-width: 576px) {
      width: 100%;
    }
    
    &:hover {
      background: #9DA0C5;
    }
  }
  
  :deep(.el-select) {
    width: clamp(120px, 30vw, 200px);
    
    @media screen and (max-width: 576px) {
      width: 100%;
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
  padding: 0;
  
  .el-descriptions__title {
    color: #2F2F38;
    font-weight: 500;
    font-size: clamp(0.875rem, 1.5vw, 1rem);
  }
  
  .el-descriptions__label {
    color: #606266;
    font-size: clamp(0.75rem, 1.25vw, 0.875rem);
  }
  
  .el-descriptions__content {
    color: #2F2F38;
    font-size: clamp(0.75rem, 1.25vw, 0.875rem);
  }
}

:deep(.el-empty) {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: clamp(1rem, 4vw, 2rem);
  margin: 0;
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
  background: #807CA5;
  border: none;
  padding: clamp(0.5rem, 2vw, 1rem) clamp(1rem, 3vw, 1.5rem);
  font-size: clamp(0.875rem, 1.5vw, 1rem);
  
  &:hover {
    background: #9DA0C5;
  }
}
</style>