<template>
  <div class="home-container">
    <div class="nav-header">
      <el-button-group>
        <el-button :class="['nav-button', $route.path === '/' ? 'active' : '']" @click="router.push('/')">
          <el-icon><House /></el-icon>首页
        </el-button>
        <el-button :class="['nav-button', $route.path === '/records' ? 'active' : '']" @click="router.push('/records')">
          <el-icon><Notebook /></el-icon>记录
        </el-button>
        <el-button :class="['nav-button', $route.path === '/settings' ? 'active' : '']" @click="router.push('/settings')">
          <el-icon><Setting /></el-icon>设置
        </el-button>
      </el-button-group>
    </div>

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

  // 计算年龄函数
  const calculateAge = (recordDate) => {
    const birthDate = new Date(currentChild.value.birthDate)
    const recordDateTime = new Date(recordDate)
    const diffTime = recordDateTime - birthDate
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25)
    return parseFloat(diffYears.toFixed(1))
  }

  // 转换数据，X轴使用年龄
  const chartData = sortedRecords.map(record => ({
    age: calculateAge(record.date),
    value: record[chartType.value],
    date: record.date
  })).sort((a, b) => a.age - b.age)

  const option = {
    animation: false,  // 禁用动画，避免重绘问题
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        const date = new Date(chartData[params[0].dataIndex].date)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const age = params[0].value[0]
        return `${year}年${month}月${day}日<br/>年龄: ${age}岁<br/>${params[0].seriesName}: ${params[0].value[1]}${chartType.value === 'height' ? 'cm' : 'kg'}`
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
          return value.toFixed(1)
        }
      }
    },
    yAxis: {
      type: 'value',
      name: chartType.value === 'height' ? '身高（cm）' : '体重（kg）',
      nameLocation: 'middle',
      nameGap: 40,
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
}

.nav-header {
  display: flex;
  justify-content: center;
  background: #fff;
  padding: 10px;
  margin: 0;
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:deep(.el-button-group) {
  width: 100%;
  display: flex;
  max-width: 360px;
  
  .nav-button {
    flex: 1;
    border: none;
    border-radius: 0;
    background: transparent;
    color: #666;
    font-size: 14px;
    height: 44px;
    padding: 0;
    position: relative;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    
    .el-icon {
      margin-right: 2px;
      font-size: 16px;
    }
    
    &.active {
      color: #409EFF;
      font-weight: normal;
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: #409EFF;
      }
    }
    
    &:hover {
      background: transparent;
      color: #409EFF;
    }
  }
}

.child-info {
  margin: 0;
  padding: 15px;
  background: #FFFFFF;
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chart-container {
  background: #FFFFFF;
  padding: 15px;
  margin: 0;
  border-radius: 0;
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
  padding-bottom: 15px;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  
  :deep(.el-button) {
    margin-left: 10px;
    background: #807CA5;
    border: none;
    
    &:hover {
      background: #9DA0C5;
    }
  }
  
  :deep(.el-select) {
    width: 120px;
  }
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 300px;
  position: relative;
}

:deep(.el-descriptions) {
  padding: 0;
  
  .el-descriptions__title {
    color: #2F2F38;
    font-weight: 500;
  }
  
  .el-descriptions__label {
    color: #606266;
  }
  
  .el-descriptions__content {
    color: #2F2F38;
  }
}

:deep(.el-empty) {
  background: #fff;
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 32px;
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
  
  &:hover {
    background: #9DA0C5;
  }
}
</style>