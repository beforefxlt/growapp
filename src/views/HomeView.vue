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
    itemStyle: { color: '#409EFF' }
  }))

  const option = {
    title: {
      text: chartType.value === 'height' ? '身高曲线' : '体重曲线',
      left: 10,
      top: 10,
      padding: 0
    },
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '10%',
      right: '4%',
      top: 60,
      bottom: 60,
      containLabel: true
    },
    xAxis: {
      type: 'time',
      name: '日期',
      nameLocation: 'middle',
      nameGap: 35,
      axisLabel: {
        formatter: function (value) {
          const date = new Date(value);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          return `${year}年${month}月${day}日`;
        },
        interval: 0,
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: chartType.value === 'height' ? '身高(cm)' : '体重(kg)',
      nameLocation: 'middle',
      nameGap: 40,
      nameRotate: 0,
      position: 'left'
    },
    series: [{
      type: 'line',
      name: chartType.value === 'height' ? '身高' : '体重',
      data: data,
      symbolSize: 8
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
  width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
}

.child-info {
  margin: 0;
  padding: 0 10px;
  width: 100%;
  box-sizing: border-box;
}

.chart-container {
  background: #fff;
  padding: 0;
  margin: 20px 0 0 0;
  border-radius: 0;
  box-shadow: none;
  width: 100%;
  box-sizing: border-box;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 20px 0;
  padding: 0 10px;
  width: 100%;
  box-sizing: border-box;
}

.chart {
  height: 400px;
  width: 100%;
  margin: 0;
  padding: 0 10px;
  box-sizing: border-box;
}

:deep(.el-descriptions) {
  padding: 0;
  margin: 0;
  width: 100%;
}

:deep(.el-descriptions__body) {
  background-color: transparent;
  padding: 0;
  margin: 0;
  width: 100%;
}

:deep(.el-descriptions__table) {
  width: 100%;
  margin: 0;
  padding: 0;
  border-collapse: collapse;
}

:deep(.el-descriptions__cell) {
  padding: 8px !important;
}

:deep(.el-descriptions__label) {
  margin: 0;
  padding: 8px !important;
}

:deep(.el-descriptions__content) {
  margin: 0;
  padding: 8px !important;
}

:deep(.el-table__cell) {
  padding: 8px !important;
}
</style>