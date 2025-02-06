<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2 class="center-title" @click="showMainDialog = true">儿童信息管理</h2>
    </div>

    <div class="chart-config">
      <el-card class="chart-config-card">
        <template #header>
          <div class="card-header">
            <span>图表配置</span>
          </div>
        </template>
        <div class="config-content">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="身高曲线" name="height">
              <el-form label-position="top">
                <el-form-item label="X轴范围（年龄/岁）">
                  <div class="range-inputs">
                    <el-input-number 
                      v-model="heightConfig.xAxisMin" 
                      :min="0" 
                      :max="heightConfig.xAxisMax"
                      @change="updateHeightConfig"
                    />
                    <span class="range-separator">至</span>
                    <el-input-number 
                      v-model="heightConfig.xAxisMax" 
                      :min="heightConfig.xAxisMin" 
                      :max="100"
                      @change="updateHeightConfig"
                    />
                  </div>
                </el-form-item>
                <el-form-item label="Y轴范围（厘米）">
                  <div class="range-inputs">
                    <el-input-number 
                      v-model="heightConfig.yAxisMin" 
                      :min="0" 
                      :max="heightConfig.yAxisMax"
                      @change="updateHeightConfig"
                    />
                    <span class="range-separator">至</span>
                    <el-input-number 
                      v-model="heightConfig.yAxisMax" 
                      :min="heightConfig.yAxisMin" 
                      :max="250"
                      @change="updateHeightConfig"
                    />
                  </div>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="体重曲线" name="weight">
              <el-form label-position="top">
                <el-form-item label="X轴范围（年龄/岁）">
                  <div class="range-inputs">
                    <el-input-number 
                      v-model="weightConfig.xAxisMin" 
                      :min="0" 
                      :max="weightConfig.xAxisMax"
                      @change="updateWeightConfig"
                    />
                    <span class="range-separator">至</span>
                    <el-input-number 
                      v-model="weightConfig.xAxisMax" 
                      :min="weightConfig.xAxisMin" 
                      :max="100"
                      @change="updateWeightConfig"
                    />
                  </div>
                </el-form-item>
                <el-form-item label="Y轴范围（千克）">
                  <div class="range-inputs">
                    <el-input-number 
                      v-model="weightConfig.yAxisMin" 
                      :min="0" 
                      :max="weightConfig.yAxisMax"
                      @change="updateWeightConfig"
                    />
                    <span class="range-separator">至</span>
                    <el-input-number 
                      v-model="weightConfig.yAxisMax" 
                      :min="weightConfig.yAxisMin" 
                      :max="150"
                      @change="updateWeightConfig"
                    />
                  </div>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-card>
    </div>

    <div class="about-button">
      <el-button @click="showAboutDialog = true">关于</el-button>
    </div>
  </div>

  <!-- 主弹窗 -->
  <el-dialog
    v-model="showMainDialog"
    title="儿童信息管理"
    width="90%"
    class="main-dialog"
  >
    <div class="settings-content">
      <div class="action-button">
        <el-button @click="showSyncDialog = true">
          <el-icon><Share /></el-icon>同步数据
        </el-button>
        <el-button @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>添加儿童
        </el-button>
      </div>

      <el-empty v-if="!hasChildren" description="暂无儿童信息" />

      <div v-else class="children-list">
        <el-card v-for="child in children" :key="child.id" class="child-card">
          <template #header>
            <div class="card-header">
              <span class="child-name">{{ child.name }}</span>
              <div class="button-group">
                <el-button 
                  type="primary" 
                  :class="{ 'is-selected': child.id === currentChildId }"
                  @click="setCurrentChild(child.id)"
                >
                  {{ child.id === currentChildId ? '当前选中' : '选择' }}
                </el-button>
                <el-button type="primary" class="icon-button" @click="editChild(child)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button type="danger" class="icon-button" @click="deleteChild(child)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          <div class="child-info">
            <div class="info-row">
              <span class="info-label">性别</span>
              <span class="info-value">{{ child.gender === 'male' ? '男' : '女' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">出生日期</span>
              <span class="info-value">{{ formatDate(child.birthDate) }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </el-dialog>

  <!-- 添加/编辑儿童弹窗 -->
  <el-dialog
    v-model="showAddDialog"
    :title="isEditing ? '编辑儿童信息' : '添加儿童'"
    width="90%"
    class="child-dialog"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="姓名">
        <el-input v-model="form.name" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="性别">
        <el-radio-group v-model="form.gender">
          <el-radio label="male">男</el-radio>
          <el-radio label="female">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="出生日期">
        <el-date-picker
          v-model="form.birthDate"
          type="date"
          placeholder="选择出生日期"
          format="YYYY年MM月DD日"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showAddDialog = false">取消</el-button>
      <el-button type="primary" @click="saveChild">保存</el-button>
    </template>
  </el-dialog>

  <!-- 同步数据弹窗 -->
  <el-dialog
    v-model="showSyncDialog"
    title="数据同步"
    width="90%"
    class="sync-dialog"
    :close-on-click-modal="false"
  >
    <el-form label-position="top">
      <el-form-item label="选择儿童">
        <el-select v-model="selectedChildId" placeholder="请选择要同步的儿童" style="width: 100%">
          <el-option
            v-for="child in children"
            :key="child.id"
            :label="child.name"
            :value="child.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="同步码">
        <el-input
          v-model="syncCode"
          type="textarea"
          :rows="3"
          :autosize="{ minRows: 3, maxRows: 4 }"
          style="word-break: break-all; width: 100%;"
          :placeholder="selectedChildId ? '点击生成同步码或输入收到的同步码' : '请先选择要同步的儿童'"
        />
        <div class="sync-tip" v-if="syncCode">
          提示：同步码包含了选中儿童的所有生长记录数据
        </div>
      </el-form-item>
      <div class="sync-actions">
        <el-button type="primary" @click="handleSync" :disabled="!selectedChildId">
          <el-icon><Upload /></el-icon>生成同步码
        </el-button>
        <el-button type="primary" @click="copySyncCode" :disabled="!syncCode">
          <el-icon><Link /></el-icon>复制同步码
        </el-button>
        <el-button type="success" @click="handleImportSync" :disabled="!syncCode">
          <el-icon><Download /></el-icon>导入同步码
        </el-button>
      </div>
    </el-form>
  </el-dialog>

  <!-- 关于弹窗 -->
  <el-dialog
    v-model="showAboutDialog"
    title="关于"
    width="90%"
    class="about-dialog"
  >
    <div class="about-content">
      <p class="version">版本号：1.0.0</p>
      <p class="author">作者：fxlt</p>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { useSyncStore } from '../stores/sync'
import { useChartConfigStore } from '../stores/chartConfig'
import { Plus, Edit, Delete, Share, Link, Upload, Download } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()
const syncStore = useSyncStore()
const chartConfigStore = useChartConfigStore()

const children = computed(() => childrenStore.children)
const hasChildren = computed(() => childrenStore.hasChildren)
const currentChildId = computed(() => childrenStore.currentChildId)

const showMainDialog = ref(false)
const showAddDialog = ref(false)
const isEditing = ref(false)
const editingChildId = ref(null)
const showSyncDialog = ref(false)
const syncCode = ref('')
const selectedChildId = ref('')
const showAboutDialog = ref(false)
const activeTab = ref('height')

// 图表配置数据
const heightConfig = ref({ ...chartConfigStore.config.height })
const weightConfig = ref({ ...chartConfigStore.config.weight })

// 监听弹窗显示状态，当弹窗打开时，如果不是编辑模式就重置表单
watch(showAddDialog, (newVal) => {
  if (newVal && !isEditing.value) {
    resetForm()
  }
})

const form = ref({
  name: '',
  gender: 'male',
  birthDate: new Date().toISOString().split('T')[0]  // 设置默认日期为今天
})

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
}

const resetForm = () => {
  form.value = {
    name: '',
    gender: 'male',
    birthDate: new Date().toISOString().split('T')[0]  // 重置时也设置默认日期
  }
  isEditing.value = false
  editingChildId.value = null
}

const editChild = (child) => {
  form.value = { ...child }
  isEditing.value = true
  editingChildId.value = child.id
  showAddDialog.value = true
}

const deleteChild = (child) => {
  ElMessageBox.confirm(
    '删除儿童信息将同时删除所有相关的生长记录，是否继续？',
    '警告',
    {
      type: 'warning'
    }
  ).then(() => {
    childrenStore.deleteChild(child.id)
    recordsStore.deleteChildRecords(child.id)
  })
}

const setCurrentChild = (id) => {
  childrenStore.setCurrentChild(id)
}

const saveChild = () => {
  // 表单验证
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入姓名')
    return
  }
  if (!form.value.birthDate) {
    ElMessage.warning('请选择出生日期')
    return
  }

  if (isEditing.value) {
    childrenStore.updateChild(editingChildId.value, {
      ...form.value,
      name: form.value.name.trim()  // 去除名字前后的空格
    })
  } else {
    childrenStore.addChild({
      ...form.value,
      name: form.value.name.trim()  // 去除名字前后的空格
    })
  }
  showAddDialog.value = false
  resetForm()
}

const handleSync = async () => {
  console.log('开始生成同步码，选中的儿童ID:', selectedChildId.value);
  
  if (!selectedChildId.value) {
    ElMessage.warning('请选择要同步的儿童');
    return;
  }
  
  try {
    const code = syncStore.generateSyncData(selectedChildId.value);
    console.log('生成的同步码:', code);
    
    if (code) {
      syncCode.value = code;
      ElMessage.success('同步码生成成功');
    } else {
      ElMessage.error('生成同步码失败');
    }
  } catch (error) {
    console.error('生成同步码出错:', error);
    ElMessage.error('生成同步码时发生错误：' + error.message);
  }
}

const handleImportSync = () => {
  if (!syncCode.value) {
    ElMessage.warning('请输入同步码')
    return
  }

  ElMessageBox.confirm(
    '导入数据将会添加新的记录，如果已存在相同日期的记录将会保留最新的数据。是否继续？',
    '确认导入',
    {
      confirmButtonText: '确定导入',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const result = syncStore.importSyncData(syncCode.value)
    if (result.success) {
      ElMessage.success(result.message)
      showSyncDialog.value = false
      syncCode.value = ''
    } else {
      ElMessage.error(result.message)
    }
  }).catch(() => {
    // 用户取消导入
  })
}

const copySyncCode = async () => {
  if (!syncCode.value) {
    ElMessage.warning('请先生成同步码')
    return
  }

  try {
    // 尝试使用 Clipboard API
    await navigator.clipboard.writeText(syncCode.value)
    ElMessage.success('同步码已复制到剪贴板')
  } catch (err) {
    // 备用复制方法
    const textarea = document.createElement('textarea')
    textarea.value = syncCode.value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    
    try {
      document.execCommand('copy')
      ElMessage.success('同步码已复制到剪贴板')
    } catch (err) {
      ElMessage.error('复制失败，请手动复制')
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

// 更新配置方法
const updateHeightConfig = () => {
  chartConfigStore.updateConfig('height', heightConfig.value)
}

const updateWeightConfig = () => {
  chartConfigStore.updateConfig('weight', weightConfig.value)
}

// 在组件挂载时加载配置
onMounted(async () => {
  await chartConfigStore.loadFromLocal()
  heightConfig.value = { ...chartConfigStore.config.height }
  weightConfig.value = { ...chartConfigStore.config.weight }
})
</script>

<style scoped>
.settings-container {
  padding: 1rem;
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  background-color: #F6F6FB;
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-header {
  padding: 0.75rem;
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  border-bottom: 1px solid #EBEEF5;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border-radius: 8px;
}

.settings-header:hover {
  background-color: #F6F6FB;
}

.center-title {
  margin: 0;
  color: #2F2F38;
  font-weight: 600;
  text-align: center;
  font-size: 1.25rem;
  line-height: 1.2;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: stretch;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.action-button {
  display: flex;
  justify-content: stretch;
  width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  
  @media screen and (max-width: 576px) {
    flex-direction: column;
  }

  .el-button {
    flex: 1;
    width: 50%;
    height: 40px;
    justify-content: center;
    margin: 0;
    border-radius: 0;
    
    @media screen and (max-width: 576px) {
      width: 100%;
    }
  }
}

.children-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  margin: 0 auto;
}

.child-card {
  background: #FFFFFF;
  border-radius: 8px;
  transition: all 0.3s ease;
  width: 100%;
  box-sizing: border-box;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.child-info {
  padding: 0.5rem 0;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 0.25rem 0;
  border-bottom: 1px solid #F5F7FA;
  
  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  width: 60px;
  color: #909399;
  font-size: 0.875rem;
}

.info-value {
  flex: 1;
  color: #2F2F38;
  font-size: 0.875rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  gap: 1rem;
  
  @media screen and (max-width: 576px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.child-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2F2F38;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: nowrap;
  
  @media screen and (max-width: 576px) {
    justify-content: flex-end;
  }

  .el-button {
    flex: 1;
    min-width: 80px;
    height: 32px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }

  .icon-button {
    flex: 0 0 32px;
    width: 32px;
    min-width: 32px;
    padding: 0 !important;
  }
}

:deep(.el-button--primary) {
  background: #807CA5;
  border: none;
  
  &:hover {
    background: #9DA0C5;
  }
  
  &.is-selected {
    background: #606266;
  }

  .el-icon {
    margin-right: 4px;
  }
}

:deep(.el-button--danger) {
  background: #F56C6C;
  border: none;
  
  &:hover {
    background: #F78989;
  }
}

:deep(.el-card) {
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  
  .el-card__header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #EBEEF5;
  }
  
  .el-card__body {
    padding: 1rem 1.5rem;
  }
}

:deep(.el-empty) {
  padding: 4rem 0;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

/* Dialog styles */
:deep(.el-dialog) {
  width: 98% !important;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  
  @media screen and (max-width: 576px) {
    width: 99% !important;
  }
  
  .el-dialog__header {
    margin: 0;
    padding: 1.5rem;
    background: #807CA5;
    
    .el-dialog__title {
      color: #FFFFFF;
      font-size: 1.125rem;
      font-weight: 600;
    }
    
    .el-dialog__headerbtn .el-dialog__close {
      color: #FFFFFF;
    }
  }
  
  .el-dialog__body {
    padding: 1.5rem;
  }
  
  .el-dialog__footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #EBEEF5;
  }
}

/* Form styles */
:deep(.el-form-item) {
  width: 100%;
  
  .el-input__wrapper,
  .el-select,
  .el-date-editor {
    width: 100% !important;
  }
}

.sync-tip {
  font-size: clamp(0.75rem, 1.25vw, 0.875rem);
  color: #909399;
  margin-top: 0.25rem;
  line-height: 1.4;
}

.sync-actions {
  display: flex;
  justify-content: stretch;
  gap: 0;
  margin: 0;
  width: 100%;
  
  @media screen and (max-width: 576px) {
    flex-direction: column;
  }

  .el-button {
    flex: 1;
    width: calc(100% / 3);
    height: 40px;
    margin: 0;
    border-radius: 0;
    
    @media screen and (max-width: 576px) {
      width: 100%;
    }
  }
}

/* 同步对话框样式 */
.sync-dialog {
  :deep(.el-select),
  :deep(.el-input),
  :deep(.el-textarea) {
    width: 100% !important;
  }
}

.about-button {
  margin: 0;
  padding: 0;
  
  .el-button {
    width: 100%;
    height: 40px;
    background: #FFFFFF;
    border: none;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    border-radius: 0;
  }
}

.about-content {
  text-align: center;
  padding: 1rem;
  
  .version, .author {
    margin: 0.5rem 0;
    color: #2F2F38;
    font-size: 1rem;
  }
}

.about-dialog {
  :deep(.el-dialog__body) {
    padding: 1rem;
  }
}

.chart-config {
  margin: 1rem 0;
}

.chart-config-card {
  background: #FFFFFF;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.config-content {
  padding: 1rem 0;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 1rem;
  
  .el-input-number {
    flex: 1;
  }
}

.range-separator {
  color: #909399;
  font-size: 0.875rem;
}

:deep(.el-tabs__header) {
  margin-bottom: 1.5rem;
}

:deep(.el-form-item) {
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
}

:deep(.el-input-number) {
  width: 100%;
}

/* 添加主弹窗的样式 */
.main-dialog {
  :deep(.el-dialog__body) {
    padding: 1rem;
    max-height: 80vh;
    overflow-y: auto;
  }
}
</style>