<template>
  <div class="records-container">
    <div class="records-header">
    </div>

    <div class="records-content">
      <el-empty v-if="!hasChildren" description="请先添加儿童信息">
        <el-button type="primary" @click="router.push('/settings')">去添加</el-button>
      </el-empty>

      <template v-else>
        <div class="action-buttons">
          <el-button class="btn-add" type="primary" @click="showAddDialog = true">
            <el-icon><Plus /></el-icon>添加记录
          </el-button>
          <el-button class="btn-export" type="primary" @click="exportToCsvHandler">
            <el-icon><Upload /></el-icon>导出CSV
          </el-button>
          <el-button class="btn-import" type="primary" @click="importCsvHandler">
            <el-icon><Download /></el-icon>导入CSV
          </el-button>
        </div>

        <div class="records-table">
          <el-table 
            :data="sortedRecords" 
            style="width: 100%"
          >
            <el-table-column prop="date" label="测量日期" min-width="120" align="left">
              <template #default="{ row }">
                <div class="date-cell">
                  {{ formatDate(row.date, 'YYYY-MM-DD') }}
                  <span class="time-text">{{ formatDate(row.date, 'HH:mm') }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="年龄" min-width="100" align="left">
              <template #default="{ row }">
                <div class="age-cell">
                  {{ calculateAgeText(row.date, currentChild.birthDate).replace('..', '') }}
                </div>
              </template>
            </el-table-column>
            <el-table-column label="身高" min-width="100" align="left">
              <template #default="{ row }">
                <div class="value-cell">{{ row.height }}<span class="unit">cm</span></div>
              </template>
            </el-table-column>
            <el-table-column label="体重" min-width="100" align="left">
              <template #default="{ row }">
                <div class="value-cell">{{ row.weight }}<span class="unit">kg</span></div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="right" fixed="right">
              <template #default="{ row }">
                <div class="action-cell">
                  <el-button type="primary" size="small" @click.stop="editRecord(row)">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button type="danger" size="small" @click.stop="deleteRecord(row)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </div>

    <el-dialog
      v-model="showAddDialog"
      :title="isEditing ? '编辑记录' : '添加记录'"
      width="98%"
      class="record-dialog"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="日期">
          <el-date-picker
            v-model="form.date"
            type="datetime"
            placeholder="选择日期和时间"
            format="YYYY年MM月DD日 HH:mm"
            value-format="YYYY-MM-DD HH:mm:00"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="身高(cm)">
          <el-input-number
            v-model="form.height"
            :min="0"
            :max="200"
            :precision="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="体重(kg)" class="optional-field" data-test="weight-field">
          <div class="field-with-hint">
            <el-input-number
              v-model="form.weight"
              :min="0"
              :max="100"
              :precision="2"
              style="width: 100%"
              placeholder="选填"
            />
            <span class="optional-hint">选填</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRecord">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { Plus, Edit, Delete, Download, Upload, ArrowRight } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { 
  formatDate, 
  getCurrentLocalISOString, 
  formatDateForFileName, 
  getDateTimeHourKey,
  getLocalISOString,
  calculateAgeText
} from '../utils/dateUtils'
import { checkAndRequestPermissions } from '../utils/permissions'
import { exportToCsv, importCsv, processFileContent } from '../utils/recordsExportImport'

// 注册FilePlugin
const FilePlugin = registerPlugin('GrowAppFilePlugin');

const router = useRouter()
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()

const hasChildren = computed(() => {
  console.log('hasChildren computed:', childrenStore.hasChildren);
  return childrenStore.hasChildren;
})

const currentChild = computed(() => {
  const child = childrenStore.currentChild;
  console.log('RecordsView currentChild computed:', {
    child,
    birthDate: child?.birthDate,
    storeChildren: childrenStore.children,
    storeCurrentChildId: childrenStore.currentChildId,
    birthDateType: child?.birthDate ? typeof child.birthDate : 'undefined'
  });
  return child;
})

const showAddDialog = ref(false)
const isEditing = ref(false)
const editingRecordId = ref(null)

const form = ref({
  date: getCurrentLocalISOString(),
  height: null,
  weight: null
})

const sortedRecords = computed(() => {
  console.log('sortedRecords currentChild:', currentChild.value)
  if (!currentChild.value) return []
  
  // 获取所有记录并按时间排序（最新的在前）
  const records = [...recordsStore.getChildRecords(currentChild.value.id)]
  console.log('records:', records)
  
  return records.sort((a, b) => new Date(b.date) - new Date(a.date))
})

const resetForm = () => {
  Object.assign(form.value, {
    date: getCurrentLocalISOString(),
    height: null,
    weight: null
  })
  isEditing.value = false
  editingRecordId.value = null
}

const editRecord = async (row) => {
  Object.assign(form.value, {
    date: row.date,
    height: row.height,
    weight: row.weight
  })
  isEditing.value = true
  editingRecordId.value = row.id
  showAddDialog.value = true
}

const deleteRecord = (record) => {
  ElMessageBox.confirm(
    '确定要删除这条记录吗？删除后无法恢复。',
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    recordsStore.deleteRecord(currentChild.value.id, record.id)
    ElMessage.success('记录已删除')
  }).catch(() => {
    // 用户取消删除
  })
}

const saveRecord = () => {
  // 验证必填字段
  if (!form.value.height) {
    ElMessage.warning('请输入身高')
    return
  }

  const recordData = {
    date: form.value.date || getCurrentLocalISOString(),
    height: form.value.height,
    weight: form.value.weight
  }

  if (isEditing.value) {
    recordsStore.updateRecord(currentChild.value.id, editingRecordId.value, recordData)
  } else {
    recordsStore.addRecord(currentChild.value.id, recordData)
  }
  showAddDialog.value = false
  resetForm()
}

const exportToCsvHandler = async () => {
  try {
    const permissionGranted = await checkAndRequestPermissions(FilePlugin)
    if (!permissionGranted) return

    await exportToCsv(sortedRecords.value, currentChild.value.name, FilePlugin)
  } catch (error) {
    ElMessage.error('导出失败：' + error.message)
  }
}

const importCsvHandler = async () => {
  try {
    const permissionGranted = await checkAndRequestPermissions(FilePlugin)
    if (!permissionGranted) return

    await importCsv(FilePlugin, async (rows) => {
      const records = await processFileContent(rows, recordsStore, childrenStore)
      // 处理导入的记录
      let addedCount = 0
      let skippedCount = 0

      records.forEach(record => {
        const existingRecord = recordsStore.hasRecordAtTime(currentChild.value.id, record.date)
        
        if (!existingRecord) {
          // 只有在记录不存在时才添加
          recordsStore.addRecord(currentChild.value.id, record)
          addedCount++
        } else {
          // 如果记录已存在，直接跳过
          skippedCount++
        }
      })

      const resultMessage = []
      if (addedCount > 0) resultMessage.push(`新增${addedCount}条记录`)
      if (skippedCount > 0) resultMessage.push(`跳过${skippedCount}条已存在的记录`)

      if (addedCount === 0) {
        ElMessage.info('没有新的记录需要导入')
      } else {
        ElMessage.success(`导入成功：${resultMessage.join('，')}`)
      }
    })
  } catch (error) {
    ElMessage.error('导入失败：' + error.message)
  }
}

const openAddDialog = async () => {
  showAddDialog.value = true
  resetForm()
}
</script>

<style scoped>
.records-container {
  padding: 0;
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  background-color: #F6F6FB;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.records-header {
  padding: 0.5rem;
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  border-bottom: 1px solid #EBEEF5;
}

.center-title {
  margin: 0;
  color: #2F2F38;
  font-weight: 600;
  text-align: center;
  font-size: 1.25rem;
  line-height: 1.2;
}

.records-content {
  flex: 1;
  padding: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  background-color: #F6F6FB;
}

.action-buttons {
  display: flex;
  width: 100%;
  margin: 0;
  padding: 0;
  flex-direction: row;

  :deep(.el-button) {
    flex: 1;
    height: 44px;
    margin: 0;
    border: none;
    border-radius: 0;
    font-size: 0.95rem;
  }

  :deep(.btn-add.el-button--primary) {
    background-color: #4096FF !important;
    color: #FFFFFF !important;
  }
  :deep(.btn-add.el-button--primary:hover),
  :deep(.btn-add.el-button--primary:focus) {
    background-color: #69B1FF !important;
  }

  :deep(.btn-export.el-button--primary) {
    background-color: #52C41A !important;
    color: #FFFFFF !important;
  }
  :deep(.btn-export.el-button--primary:hover),
  :deep(.btn-export.el-button--primary:focus) {
    background-color: #73D13D !important;
  }

  :deep(.btn-import.el-button--primary) {
    background-color: #722ED1 !important;
    color: #FFFFFF !important;
  }
  :deep(.btn-import.el-button--primary:hover),
  :deep(.btn-import.el-button--primary:focus) {
    background-color: #9254DE !important;
  }
}

.records-table {
  margin-top: 1px;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

:deep(.el-table) {
  --el-table-header-bg-color: #F4F5F7;
  --el-table-row-hover-bg-color: #F6F6FB;
  
  :is(th) {
    background-color: #F6F6FB;
    color: #2F2F38;
    font-weight: 500;
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid #E5E7EB;
  }
  
  :is(td) {
    padding: 8px;
    border-bottom: 1px solid #E5E7EB;
  }

  :is(td).actions {
    text-align: right;
  }
}

.date-cell, .age-cell, .value-cell {
  font-size: 0.875rem;
  color: #2F2F38;
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}

.time-text, .unit {
  color: #909399;
  font-size: 0.75rem;
  margin-left: 2px;
}

/* 对话框按钮保持居中 */
:deep(.el-dialog__footer) {
  .el-button {
    justify-content: center;
  }
}

/* Empty状态的按钮保持居中 */
:deep(.el-empty) {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

/* Dialog styles */
.record-dialog {
  :deep(.el-dialog) {
    border-radius: 12px;
    overflow: hidden;
    
    .el-dialog__header {
      margin: 0;
      padding: 1rem;
      background: #FFFFFF;
      border-bottom: 1px solid #EBEEF5;
      
      .el-dialog__title {
        color: #2F2F38;
        font-size: 1.125rem;
        font-weight: 600;
      }
      
      .el-dialog__headerbtn {
        top: 1rem;
        
        .el-dialog__close {
          color: #909399;
          
          &:hover {
            color: #409EFF;
          }
        }
      }
    }
    
    .el-dialog__body {
      padding: 1rem;
    }
    
    .el-dialog__footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid #EBEEF5;
      
      .el-button {
        min-width: 80px;
      }
    }
  }
}

/* Form styles */
:deep(.el-form-item) {
  margin-bottom: 1rem;
  
  .el-form-item__label {
    font-weight: 500;
    color: #2F2F38;
  }
  
  .el-input__wrapper,
  .el-select,
  .el-date-editor {
    width: 100%;
  }
}

.action-cell {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  
  .el-button {
    padding: 4px;
    height: 28px;
    width: 28px;
    min-width: unset;
    
    .el-icon {
      margin: 0;
    }
  }
}

.optional-field :deep(.el-form-item__label) {
  color: #606266;
}

.field-with-hint {
  position: relative;
  width: 100%;
}

.optional-hint {
  position: absolute;
  right: -40px;
  top: 50%;
  transform: translateY(-50%);
  color: #909399;
  font-size: 12px;
}
</style>

<!-- 添加全局样式块，确保更高优先级 -->
<style>
/* 使用更具体的选择器来提高优先级 */
.records-container .action-buttons .btn-add.el-button--primary {
  background-color: #4096FF !important;
  color: #FFFFFF !important;
  border: none !important;
}
.records-container .action-buttons .btn-add.el-button--primary:hover,
.records-container .action-buttons .btn-add.el-button--primary:focus {
  background-color: #69B1FF !important;
  border: none !important;
}

.records-container .action-buttons .btn-export.el-button--primary {
  background-color: #52C41A !important;
  color: #FFFFFF !important;
  border: none !important;
}
.records-container .action-buttons .btn-export.el-button--primary:hover,
.records-container .action-buttons .btn-export.el-button--primary:focus {
  background-color: #73D13D !important;
  border: none !important;
}

.records-container .action-buttons .btn-import.el-button--primary {
  background-color: #722ED1 !important;
  color: #FFFFFF !important;
  border: none !important;
}
.records-container .action-buttons .btn-import.el-button--primary:hover,
.records-container .action-buttons .btn-import.el-button--primary:focus {
  background-color: #9254DE !important;
  border: none !important;
}

/* 共享的按钮基础样式 */
.records-container .action-buttons .el-button {
  flex: 1;
  height: 44px;
  margin: 0;
  border: none !important;
  border-radius: 0;
  font-size: 0.95rem;
  padding: 8px 16px !important;
}
</style>