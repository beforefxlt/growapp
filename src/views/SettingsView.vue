<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2 class="center-title">儿童信息管理</h2>
      <div class="header-buttons">
        <el-button type="primary" @click="showSyncDialog = true">
          <el-icon><Share /></el-icon>同步数据
        </el-button>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>添加儿童
        </el-button>
      </div>
    </div>

    <el-empty v-if="!hasChildren" description="暂无儿童信息" />

    <el-card v-else v-for="child in children" :key="child.id" class="child-card">
      <template #header>
        <div class="card-header">
          <span>{{ child.name }}</span>
          <div class="button-group">
            <el-button 
              type="primary" 
              :plain="child.id !== currentChildId"
              @click="setCurrentChild(child.id)"
            >
              {{ child.id === currentChildId ? '当前选中' : '选择' }}
            </el-button>
            <el-button type="primary" link @click="editChild(child)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button type="danger" link @click="deleteChild(child)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="1">
        <el-descriptions-item label="性别">
          {{ child.gender === 'male' ? '男' : '女' }}
        </el-descriptions-item>
        <el-descriptions-item label="出生日期">
          {{ formatDate(child.birthDate) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { useSyncStore } from '../stores/sync'
import { Plus, Edit, Delete, Share, Link, Upload, Download } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()
const syncStore = useSyncStore()

const children = computed(() => childrenStore.children)
const hasChildren = computed(() => childrenStore.hasChildren)
const currentChildId = computed(() => childrenStore.currentChildId)

const showAddDialog = ref(false)
const isEditing = ref(false)
const editingChildId = ref(null)
const showSyncDialog = ref(false)
const syncCode = ref('')
const selectedChildId = ref('')

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
</script>

<style scoped>
.settings-container {
  padding: 10px;
  max-width: 100%;
  box-sizing: border-box;
  background-color: #F6F6FB;
  min-height: 100vh;
}

.settings-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(128, 124, 165, 0.1);
}

.center-title {
  margin: 0;
  color: #2F2F38;
  font-weight: 500;
  text-align: center;
}

.header-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.child-card {
  margin-bottom: 15px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(128, 124, 165, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.button-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.button-group :deep(.el-button) + :deep(.el-button) {
  margin-left: 0;
}

:deep(.el-button.is-link) {
  background: none;
  border: none;
  padding: 4px 8px;
}

:deep(.el-button--primary.is-link) {
  margin-left: 8px;
  color: #807CA5;
}

:deep(.el-button--primary.is-link:hover) {
  color: #9DA0C5;
}

:deep(.el-button--danger.is-link) {
  color: #F56C6C;
}

:deep(.el-button--danger.is-link:hover) {
  color: #FF7C7C;
}

:deep(.child-dialog .el-dialog) {
  max-width: 360px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.child-dialog .el-dialog__header) {
  background: linear-gradient(135deg, #807CA5 0%, #9DA0C5 100%);
  padding: 15px 20px;
  margin-right: 0;
}

:deep(.child-dialog .el-dialog__title) {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

:deep(.child-dialog .el-dialog__body) {
  padding: 20px;
}

:deep(.child-dialog .el-form-item__label) {
  color: #626270;
  font-weight: 500;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #807CA5 0%, #9DA0C5 100%);
  border: none;
  padding: 8px 16px;
  transition: all 0.3s ease;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #9DA0C5 0%, #A5A8C6 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(128, 124, 165, 0.2);
}

:deep(.el-button--primary.is-plain) {
  background: #fff;
  border: 1px solid #807CA5;
  color: #807CA5;
}

:deep(.el-button--primary.is-plain:hover) {
  background: #F4F5F7;
  color: #9DA0C5;
  border-color: #9DA0C5;
}

:deep(.el-button--default) {
  border: 1px solid #dcdfe6;
}

:deep(.el-button--default:hover) {
  border-color: #807CA5;
  color: #807CA5;
}

:deep(.el-card) {
  border-radius: 8px;
  border: none;
}

:deep(.el-card .el-card__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
  background: #F4F5F7;
}

:deep(.el-descriptions) {
  padding: 15px;
}

:deep(.el-descriptions .el-descriptions__label) {
  color: #626270;
}

:deep(.el-descriptions .el-descriptions__content) {
  color: #2F2F38;
}

.sync-code-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sync-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.sync-buttons-left {
  display: flex;
  gap: 8px;
}

.sync-buttons-right {
  display: flex;
  gap: 8px;
}

.sync-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

:deep(.sync-dialog .el-dialog) {
  max-width: 360px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.sync-dialog .el-dialog__header) {
  background: linear-gradient(135deg, #807CA5 0%, #9DA0C5 100%);
  padding: 15px 20px;
  margin-right: 0;
}

:deep(.sync-dialog .el-dialog__title) {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

:deep(.sync-dialog .el-dialog__body) {
  padding: 20px;
}

:deep(.sync-dialog .el-form-item__label) {
  padding-bottom: 4px;
}

:deep(.sync-dialog .el-input__wrapper) {
  max-width: 100%;
}

:deep(.sync-dialog .el-textarea__inner) {
  font-family: monospace;
  font-size: 14px;
  word-break: break-all;
  white-space: pre-wrap;
}

.sync-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.sync-actions :deep(.el-button) {
  width: 100%;
  margin-left: 0;
  justify-content: center;
}

:deep(.el-button--success) {
  background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%);
  border: none;
  padding: 8px 16px;
  transition: all 0.3s ease;
}

:deep(.el-button--success:hover) {
  background: linear-gradient(135deg, #85CE61 0%, #95D475 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.2);
}

:deep(.el-button--success.is-disabled) {
  background: #b3e19d;
  border-color: #b3e19d;
}

:deep(.el-button--success.is-disabled:hover) {
  background: #b3e19d;
  border-color: #b3e19d;
  transform: none;
  box-shadow: none;
}
</style>