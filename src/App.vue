<template>
  <el-container class="app-container">
    <div class="app-header">
      生长发育记录
    </div>
    <el-main>
      <router-view />
    </el-main>
    
    <el-footer class="app-footer" style="height: 70px">
      <el-menu
        :router="false"
        mode="horizontal"
        :ellipsis="false"
        :default-active="currentRoute"
        @select="handleSelect"
        class="nav-menu-bottom"
      >
        <el-menu-item index="home" class="nav-item">
          <el-icon><House /></el-icon>
          首页
        </el-menu-item>
        <el-menu-item index="records" class="nav-item">
          <el-icon><List /></el-icon>
          记录
        </el-menu-item>
        <el-menu-item index="settings" class="nav-item">
          <el-icon><Setting /></el-icon>
          设置
        </el-menu-item>
      </el-menu>
    </el-footer>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { House, List, Setting } from '@element-plus/icons-vue'
import { useChildrenStore } from './stores/children'
import { useRecordsStore } from './stores/records'

const route = useRoute()
const router = useRouter()
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()
const currentRoute = computed(() => route.name)

// 初始化数据
async function loadData() {
  try {
    await childrenStore.loadFromLocal()
    await recordsStore.loadFromLocal()
    childrenStore.isLoaded = true
    return { 
      children: childrenStore.children || [], 
      currentChild: childrenStore.currentChild, 
      records: recordsStore.records 
    }
  } catch (error) {
    console.error('数据加载失败:', error)
    childrenStore.isLoaded = false
    throw error
  }
}

onMounted(async () => {
  console.log('App mounted, loading data...')
  try {
    const data = await loadData()
    console.log('Data loaded:', data)
  } catch (error) {
    console.error('数据加载失败:', error)
    childrenStore.isLoaded = false
  }
})

// 处理菜单点击
const handleSelect = async (key) => {
  await router.push({ name: key })
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  height: 50px;
  line-height: 50px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  background-color: #ffffff;
  border-bottom: 1px solid #eee;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
}

.app-footer {
  padding: 0;
  border-top: 1px solid #eee;
  position: fixed;
  bottom: 0;
  width: 100%;
  z-index: 1000;
  background-color: #ffffff;
}

:deep(.el-main) {
  padding: 0 !important;
  overflow-x: hidden;
  background-color: #F6F6FB;
  flex: 1;
  padding-bottom: 70px !important;
  padding-top: 50px !important; /* 为顶部标题栏预留空间 */
}

.nav-menu-bottom {
  display: flex;
  justify-content: space-around;
  width: 100%;
  border-top: none;
  height: 70px !important;
  background-color: #ffffff !important;
}

.nav-menu-bottom :deep(.nav-item) {
  flex: 1;
  text-align: center;
  padding: 0 !important;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 70px !important;
  height: 70px !important;
}

.nav-menu-bottom :deep(.el-menu-item) {
  font-size: 20px !important;
  font-weight: 700 !important;
  height: 70px !important;
  color: #606266 !important;
  padding: 0 24px !important;
}

.nav-menu-bottom :deep(.el-menu--horizontal > .el-menu-item.is-active) {
  border-top: 3px solid var(--el-color-primary) !important;
  border-bottom: none !important;
  color: var(--el-color-primary) !important;
  font-weight: 800 !important;
}

.nav-menu-bottom :deep(.el-menu-item .el-icon) {
  margin-right: 12px !important;
  font-size: 24px !important;
  margin-top: -2px !important;
}
</style>