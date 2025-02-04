<template>
  <el-container class="app-container">
    <el-header>
      <el-menu
        :router="false"
        mode="horizontal"
        :ellipsis="false"
        :default-active="currentRoute"
        @select="handleSelect"
        class="nav-menu"
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
    </el-header>
    
    <el-main>
      <router-view />
    </el-main>
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
onMounted(async () => {
  console.log('App mounted, loading data...')
  await childrenStore.loadFromLocal()
  await recordsStore.loadFromLocal()
  console.log('Data loaded:', { 
    children: childrenStore.children,
    currentChild: childrenStore.currentChild,
    records: recordsStore.records
  })
})

// 处理菜单点击
const handleSelect = (key) => {
  router.push({ name: key })
}
</script>

<style>
.app-container {
  min-height: 100vh;
}

.el-header {
  padding: 0;
  border-bottom: 1px solid #eee;
}

.nav-menu {
  display: flex;
  justify-content: space-around;
  width: 100%;
  border-bottom: none;
}

.nav-item {
  flex: 1;
  text-align: center;
  padding: 0 !important;
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.el-menu-item) {
  font-size: 16px;
}

:deep(.el-menu--horizontal > .el-menu-item.is-active) {
  border-bottom: 2px solid var(--el-menu-active-color);
}

:deep(.el-icon) {
  margin-right: 4px;
}
</style>