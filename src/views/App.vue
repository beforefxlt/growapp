import { ref } from 'vue'
import { ElContainer, ElHeader, ElMain, ElMenu, ElMenuItem, ElIcon } from 'element-plus'
import { House, List, Setting } from '@element-plus/icons-vue'
import { useChildrenStore } from '@/stores/children'
import { useRecordsStore } from '@/stores/records'

// 初始化数据
async function loadData() {
  const loadOrder = []
  try {
    await childrenStore.loadFromLocal()
    loadOrder.push('children')
    await recordsStore.loadFromLocal()
    loadOrder.push('records')
    childrenStore.isLoaded = true
    return loadOrder
  } catch (error) {
    console.error('Failed to load data:', error)
    childrenStore.isLoaded = false
    throw new Error('加载失败')
  }
} 