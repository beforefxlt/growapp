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
import * as echarts from 'echarts'

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
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'time',
      name: '日期',
      axisLabel: {
        formatter: function (value) {
          const date = new Date(value);
          return date.toLocaleDateString();
        }
      }
    },
    yAxis: {
      type: 'value',
      name: chartType.value === 'height' ? '身高(cm)' : '体重(kg)',
      nameLocation: 'middle',
      nameGap: 40
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
  padding: 20px;
}

.child-info {
  margin-bottom: 20px;
}

.chart-container {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart {
  height: 400px;
}
</style>