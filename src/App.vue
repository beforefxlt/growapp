<template>
  <el-container class="app-container">
    <el-header>
      <el-menu
        :router="false"
        mode="horizontal"
        :ellipsis="false"
        :default-active="currentRoute"
        @select="handleSelect"
      >
        <el-menu-item index="home">
          <el-icon><House /></el-icon>
          首页
        </el-menu-item>
        <el-menu-item index="records">
          <el-icon><List /></el-icon>
          记录
        </el-menu-item>
        <el-menu-item index="settings">
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
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { House, List, Setting } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const currentRoute = computed(() => route.name)

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

.el-menu {
  border-bottom: none;
}

:deep(.el-menu-item) {
  padding: 0 20px;
}

:deep(.el-menu--horizontal > .el-menu-item.is-active) {
  border-bottom: 2px solid var(--el-menu-active-color);
}
</style>