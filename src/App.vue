<template>
  <el-container class="app-container">
    <el-header>
      <el-menu
        :router="true"
        mode="horizontal"
        :ellipsis="false"
      >
        <el-menu-item index="/">
          <el-icon><House /></el-icon>
          首页
        </el-menu-item>
        <el-menu-item index="/records">
          <el-icon><List /></el-icon>
          记录
        </el-menu-item>
        <el-menu-item index="/settings">
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
import { House, List, Setting } from '@element-plus/icons-vue'
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
</style>