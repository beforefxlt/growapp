# 生长发育曲线APP架构设计文档

业务目标
用户希望方便记录儿童的生长数据，并能够查看生长曲线，以便更好地了解儿童的生长情况。

## 1. 整体架构

### 1.1 技术栈选型
- 前端框架：Vue.js 3.0
- 状态管理：Pinia
- 路由管理：Vue Router
- 跨平台解决方案：Capacitor
- 构建工具：Vite
- 图表库：Chart.js

### 1.2 架构模式
采用Vue.js的组件化架构，主要分为以下几层：
- 视图层（Views）：页面级组件，负责UI展示
- 组件层（Components）：可复用的UI组件
- 状态层（Stores）：使用Pinia管理应用状态
- 工具层（Utils）：通用工具函数和业务逻辑

### 1.3 核心功能模块
1. 儿童信息管理
   - 添加/编辑儿童基本信息
   - 切换当前选中的儿童

2. 生长数据记录
   - 记录身高、体重等测量数据
   - 查看历史记录

3. 生长曲线展示
   - 显示WHO标准生长曲线
   - 在曲线上展示儿童实际生长数据点
   - 支持身高、体重等不同指标的曲线切换

## 2. 数据结构设计

### 2.1 Child（儿童信息）
```javascript
interface Child {
    id: string;           // UUID
    name: string;         // 姓名
    gender: string;       // 性别：male/female
    birthDate: string;    // 出生日期（ISO格式）
    createdAt: string;    // 创建时间
    updatedAt: string;    // 更新时间
}
```

### 2.2 GrowthRecord（生长记录）
```javascript
interface GrowthRecord {
    id: string;           // UUID
    childId: string;      // 关联的儿童ID
    measureDate: string;  // 测量日期（ISO格式）
    height?: number;      // 身高(cm)
    weight?: number;      // 体重(kg)
    createdAt: string;    // 创建时间
}
```

### 2.3 WHO标准数据结构
```javascript
interface WHOStandard {
    gender: string;       // 性别
    ageInMonths: number;  // 月龄
    indicator: string;    // 指标类型（height/weight）
    p3: number;          // 3百分位数
    p15: number;         // 15百分位数
    p50: number;         // 50百分位数
    p85: number;         // 85百分位数
    p97: number;         // 97百分位数
}
```

## 3. 状态管理设计

### 3.1 Pinia Store模块
1. Children Store
   - 管理儿童信息列表
   - 处理当前选中儿童
   - 提供儿童信息的CRUD操作

2. Records Store
   - 管理生长记录数据
   - 提供记录的CRUD操作
   - 处理数据过滤和排序

3. Chart Config Store
   - 管理图表配置信息
   - 处理WHO标准数据
   - 控制图表显示选项

### 3.2 数据持久化
- 使用浏览器的IndexedDB存储应用数据
- 支持数据导入导出功能
- 定期自动备份数据

## 4. 界面设计

### 4.1 主要界面
1. 首页（HomeView）
   - 当前选中儿童信息展示
   - 生长曲线图表显示
   - 快速添加记录入口

2. 记录页（RecordsView）
   - 历史记录列表
   - 添加/编辑记录表单

3. 设置页（SettingsView）
   - 儿童信息管理
   - 数据导入导出
   - 应用设置

### 4.2 响应式设计
- 采用移动优先的响应式设计
- 支持不同尺寸设备的适配
- 优化触摸操作体验

## 5. 跨平台适配

### 5.1 Capacitor配置
- 配置应用权限
- 处理平台特定功能
- 管理应用生命周期

### 5.2 平台特性
- 文件系统访问
- 数据备份恢复
- 设备API调用

## 6. 注意事项

1. 当前版本功能：
   - 本地数据存储
   - 基础数据管理
   - WHO标准曲线展示
   - 数据导入导出

2. 后续可扩展的功能：
   - 数据云同步
   - 更多生长指标支持
   - 生长预测
   - 营养建议