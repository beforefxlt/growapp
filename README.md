# GrowApp - 儿童生长记录应用

GrowApp 是一个帮助家长记录和追踪儿童生长发育数据的移动应用。它提供了直观的数据可视化和便捷的记录管理功能，并可通过 **Capacitor** 打包生成 APK 安装到 Android 设备进行使用。

优势：
- 支持数据导入导出，方便备份和恢复，以及父母间数据共享
- 支持数据可视化，方便家长了解儿童生长发育情况
- 完全本地存储，数据安全

## 快速开始
## 技术栈

- 前端框架: Vue 3 + Vite
- UI 组件库: Element Plus
- 状态管理: Pinia

- 图表库: ECharts
- 移动端框架: Capacitor
- 单元测试: Vitest

## 项目结构

```
src/
├── views/                  # 视图组件
│   ├── HomeView.vue       # 首页 - 展示生长曲线图表
│   ├── RecordsView.vue    # 记录页 - 管理生长记录
│   └── SettingsView.vue   # 设置页 - 儿童信息管理
├── stores/                 # 状态管理
│   ├── children.js        # 儿童信息存储
│   ├── records.js         # 生长记录存储
│   └── sync.js            # 数据同步管理
├── utils/                  # 工具函数
│   ├── dateUtils.js       # 日期处理工具
│   ├── dateFormat.js      # 日期格式化
│   ├── permissions.js     # 权限处理
│   └── recordsExportImport.js  # 数据导入导出
├── styles/                 # 样式文件
├── router/                 # 路由配置
└── App.vue                # 根组件
```

## 功能特性

### 1. 儿童信息管理
- 添加/编辑/删除儿童信息
- 支持多个儿童档案
- 记录基本信息(姓名、出生日期等)

### 2. 生长记录
- 记录身高、体重数据
- 按日期排序展示历史记录
- 支持编辑和删除记录

### 3. 数据可视化
- 生长曲线图表展示
- 支持身高、体重切换
- 数据趋势分析

### 4. 数据管理
- 本地数据持久化存储
- CSV格式数据导入导出
- 数据备份和恢复

### 5. 用户界面
- 响应式设计
- 简洁直观的操作界面
- 中文本地化支持

## 新增布局与导航栏说明

- **固定底部导航**  
  在移动端，项目默认将导航栏 (`<el-footer>`) 固定在屏幕底部，类似于常见的 App "Tab Bar" 设计。若页面内容较少导致底部出现大面积空白，可通过以下方式减少空白：  
  1. 移除或覆盖多余的 `margin-bottom` 等外边距。  
  2. 在内容不足时，增加"空状态"插画或提示，保证界面美观度。  
  3. 如果希望导航栏随页面滚动，可去掉 `position: fixed;`，并在 `.el-main` 中使用 `flex: 1` 做自适应布局。

## 主要文件说明

### 视图组件
- `HomeView.vue`: 首页组件，展示生长曲线图表和基本信息
- `RecordsView.vue`: 记录管理页面，提供记录的增删改查功能
- `SettingsView.vue`: 设置页面，管理儿童信息和应用配置

### 状态管理
- `children.js`: 管理儿童信息的存储和操作
- `records.js`: 处理生长记录的存储和查询
- `sync.js`: 负责数据的同步和持久化

### 工具函数
- `dateUtils.js`: 提供日期计算和格式化功能
- `permissions.js`: 处理应用权限相关功能
- `recordsExportImport.js`: 实现数据的导入导出功能

## 开发指南

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 运行测试
```bash
npm run test
```

### 构建并安装到Android设备
```bash
./build-and-install.ps1
```
> 该脚本会执行单元测试、前端构建、同步到 `android` 工程并最终生成并安装 APK。  
> 在非 Windows 系统下可手动执行 `npm run build` → `npx cap sync android` → `cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`。

## 测试覆盖

本项目包含完整的单元测试，覆盖了以下方面：
- 组件渲染和交互
- 数据存储和管理
- 工具函数功能
- 数据导入导出

## 注意事项

1. 首次使用需要授予存储权限以支持数据导出功能
2. 建议定期导出数据备份
3. Android 设备需要开启开发者模式并允许USB调试以进行安装
