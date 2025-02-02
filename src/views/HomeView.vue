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
import { Plus } from '@element-plus/icons-vue'
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
  const data = records.map(record => ({
    value: [record.date, record[chartType.value]],
    itemStyle: { 
      color: '#807CA5',
      borderWidth: 2,
      borderColor: '#FFFFFF'
    }
  }))

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        const date = new Date(params[0].value[0])
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}年${month}月${day}日<br/>${params[0].seriesName}: ${params[0].value[1]}${chartType.value === 'height' ? 'cm' : 'kg'}`
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#807CA5',
      borderWidth: 1,
      textStyle: {
        color: '#2F2F38'
      }
    },
    grid: {
      left: 0,
      right: 20,
      top: 20,
      bottom: 5,
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: function (value) {
          const date = new Date(value)
          const month = date.getMonth() + 1
          const day = date.getDate()
          return `${month}月${day}日`
        },
        interval: 0,
        rotate: 45,
        margin: 16,
        color: '#626270'
      },
      axisLine: {
        lineStyle: {
          color: '#ECE7F0'
        }
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#F4F5F7',
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'value',
      position: 'left',
      axisLabel: {
        margin: 16,
        color: '#626270',
        formatter: function(value) {
          return value + (chartType.value === 'height' ? 'cm' : 'kg');
        }
      },
      axisLine: {
        lineStyle: {
          color: '#ECE7F0'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#F4F5F7',
          type: 'dashed'
        }
      }
    },
    series: [{
      type: 'line',
      name: chartType.value === 'height' ? '身高' : '体重',
      data: data,
      symbolSize: 8,
      itemStyle: {
        color: '#807CA5',
        borderWidth: 2,
        borderColor: '#FFFFFF'
      },
      lineStyle: {
        width: 3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0,
            color: '#807CA5'
          }, {
            offset: 1,
            color: '#9DA0C5'
          }]
        }
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
            color: 'rgba(128, 124, 165, 0.2)'
          }, {
            offset: 1,
            color: 'rgba(157, 160, 197, 0.05)'
          }]
        }
      }
    }]
  }

  chart.setOption(option)
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
  overflow: hidden;
  background-color: #F6F6FB;
  min-height: 100vh;
}

.child-info {
  margin: 0;
  padding: 0 10px;
  width: 100%;
  box-sizing: border-box;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(128, 124, 165, 0.1);
}

.chart-container {
  background: #FFFFFF;
  padding: 0;
  margin: 10px 0 0 0;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(128, 124, 165, 0.1);
  width: 100%;
  box-sizing: border-box;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 10px 0;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
}

.chart {
  height: calc(100vh - 220px);
  min-height: 380px;
  width: 100%;
  margin: 0;
  padding: 0 10px;
  box-sizing: border-box;
}

:deep(.el-descriptions) {
  padding: 10px;
  margin: 0;
  width: 100%;
  
  .el-descriptions__title {
    color: #2F2F38;
    font-weight: 500;
  }
  
  .el-descriptions__label {
    color: #626270;
  }
  
  .el-descriptions__content {
    color: #2F2F38;
  }
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #807CA5 0%, #9DA0C5 100%);
  border: none;
  padding: 8px 16px;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #9DA0C5 0%, #A5A8C6 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(128, 124, 165, 0.2);
  }
  
  &.is-plain {
    background: #FFFFFF;
    border: 1px solid #807CA5;
    color: #807CA5;
    
    &:hover {
      background: #F4F5F7;
      color: #9DA0C5;
      border-color: #9DA0C5;
    }
  }
}

:deep(.el-select) {
  width: 120px;
  
  .el-input__wrapper {
    background-color: #F4F5F7;
    border: 1px solid transparent;
    
    &:hover {
      border-color: #9DA0C5;
    }
    
    &.is-focus {
      border-color: #807CA5;
      box-shadow: 0 0 0 1px #807CA5;
    }
  }
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
</style>