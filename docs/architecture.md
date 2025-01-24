# 生长发育曲线APP架构设计文档

业务目标
用户希望方便记录儿童的在安卓手机生长数据，并能够查看生长曲线，以便更好地了解儿童的生长情况。

## 1. 整体架构

### 1.1 架构模式
采用MVVM（Model-View-ViewModel）架构模式，主要分为以下几层：
- View层：Fragment和Activity，负责UI展示
- ViewModel层：处理业务逻辑，管理UI状态
- Model层：数据模型和仓储层
- Repository层：数据访问层，处理本地JSON文件的读写

### 1.2 核心功能模块
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
```kotlin
data class Child(
    val id: String = UUID.randomUUID().toString(),
    val name: String,                 // 姓名
    val gender: String,               // 性别：男/女
    val birthDate: Date,              // 出生日期
    val createdAt: Date = Date(),     // 创建时间
    val updatedAt: Date = Date()      // 更新时间
)
```

### 2.2 GrowthRecord（生长记录）
```kotlin
data class GrowthRecord(
    val id: String = UUID.randomUUID().toString(),
    val childId: String,              // 关联的儿童ID
    val measureDate: Date,            // 测量日期
    val height: Float?,               // 身高(cm)
    val weight: Float?,               // 体重(kg)
    val createdAt: Date = Date()      // 创建时间
)
```

### 2.3 WHO标准数据结构
```kotlin
data class WHOStandard(
    val gender: String,               // 性别
    val ageInMonths: Int,            // 月龄
    val indicator: String,            // 指标类型（身高/体重）
    val p3: Float,                    // 3百分位数
    val p15: Float,                   // 15百分位数
    val p50: Float,                   // 50百分位数
    val p85: Float,                   // 85百分位数
    val p97: Float                    // 97百分位数
)
```

## 3. 核心功能实现

### 3.1 数据存储
采用JSON文件存储方式，在应用私有目录下创建以下文件：
- children.json：存储儿童信息列表
- growth_records.json：存储生长记录数据
- who_standards.json：存储WHO标准数据（打包在assets目录中）

### 3.2 生长曲线绘制
使用Android原生的MPAndroidChart库实现曲线绘制：
1. 根据儿童性别和年龄加载对应的WHO标准数据
2. 绘制5条百分位曲线（P3、P15、P50、P85、P97）
3. 加载儿童实际测量数据点并绘制在曲线上
4. 支持缩放和拖动查看

### 3.3 数据管理流程
1. 启动时从本地JSON文件加载数据到内存
2. 数据变更时同步更新内存和文件
3. 定期（如每天）备份数据文件

## 4. 界面设计

### 4.1 主要界面
1. 首页
   - 当前选中儿童信息展示
   - 生长曲线图表显示
   - 快速添加记录入口

2. 记录页
   - 历史记录列表
   - 添加/编辑记录表单

3. 设置页
   - 儿童信息管理
   - 数据导入导出

### 4.2 交互流程
1. 首次使用时引导用户添加儿童信息
2. 支持多个儿童信息切换
3. 提供便捷的数据记录入口
4. 图表支持手势操作

## 5. 注意事项

1. 本方案以简单实现为主，不考虑：
   - 数据加密
   - 网络同步
   - 用户认证
   - 性能优化

2. 后续可扩展的功能：
   - 数据云同步
   - 更多生长指标支持
   - 生长预测
   - 营养建议