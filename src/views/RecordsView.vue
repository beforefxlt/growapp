<template>
  <div class="records-container">
    <div class="records-header">
      <h2 class="center-title">生长记录</h2>
    </div>

    <div class="records-content">
      <el-empty v-if="!hasChildren" description="请先添加儿童信息">
        <el-button type="primary" @click="router.push('/settings')">去添加</el-button>
      </el-empty>

      <template v-else>
        <div class="action-button">
          <el-button type="primary" @click="showAddDialog = true">
            <el-icon><Plus /></el-icon>添加记录
          </el-button>
        </div>

        <div class="records-table">
          <el-table 
            :data="sortedRecords" 
            style="width: 100%"
            @row-click="handleRowClick"
          >
            <el-table-column prop="date" label="测量日期" min-width="120" align="left">
              <template #default="{ row }">
                <div class="date-cell">
                  {{ formatDate(row.date, 'YYYY-MM-DD') }}
                  <span class="time-text">{{ formatDate(row.date, 'HH:mm') }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="年龄" min-width="80" align="left">
              <template #default="{ row }">
                <div class="age-cell">
                  {{ calculateAgeText(row.date, currentChild.birthDate).replace('..', '') }}
                </div>
              </template>
            </el-table-column>
            <el-table-column label="身高" min-width="60" align="left">
              <template #default="{ row }">
                <div class="value-cell">{{ row.height }}<span class="unit">cm</span></div>
              </template>
            </el-table-column>
            <el-table-column label="体重" min-width="60" align="left">
              <template #default="{ row }">
                <div class="value-cell">{{ row.weight }}<span class="unit">kg</span></div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="action-buttons">
          <el-button type="primary" @click="exportToCsvHandler">
            <el-icon><Upload /></el-icon>导出CSV
          </el-button>
          <el-button type="primary" @click="importCsvHandler">
            <el-icon><Download /></el-icon>导入CSV
          </el-button>
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
        <el-form-item label="体重(kg)">
          <el-input-number
            v-model="form.weight"
            :min="0"
            :max="100"
            :precision="2"
            style="width: 100%"
          />
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
import { ref, computed } from 'vue'
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
  date: getCurrentLocalISOString(),  // 使用新的获取本地时间函数
  height: null,
  weight: null
})

const sortedRecords = computed(() => {
  console.log('sortedRecords currentChild:', currentChild.value)
  if (!currentChild.value) return []
  
  // 获取所有记录并按创建时间排序
  const records = [...recordsStore.getChildRecords(currentChild.value.id)]
  console.log('records:', records)
  
  // 使用Map进行去重，以日期时间（精确到小时）为key
  const uniqueRecords = new Map()
  
  // 遍历排序后的记录（最新的记录会先被处理）
  records.forEach(record => {
    // 将日期时间格式化到小时
    const dateObj = new Date(record.date)
    const dateKey = getDateTimeHourKey(dateObj)
    
    // 由于已经按创建时间排序，如果key不存在，就是最新的记录
    if (!uniqueRecords.has(dateKey)) {
      uniqueRecords.set(dateKey, record)
    }
  })
  
  // 转换回数组并按记录时间排序
  return Array.from(uniqueRecords.values())
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

const resetForm = () => {
  form.value = {
    date: getCurrentLocalISOString(),  // 使用新的获取本地时间函数
    height: null,
    weight: null
  }
  isEditing.value = false
  editingRecordId.value = null
}

const editRecord = (row) => {
  form.value = { ...row }
  isEditing.value = true
  editingRecordId.value = row.id
  showAddDialog.value = true
}

const deleteRecord = (record) => {
  ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
    type: 'warning'
  }).then(() => {
    recordsStore.deleteRecord(currentChild.value.id, record.id)
  })
}

const saveRecord = () => {
  // 将表单日期格式化到小时
  const formDateKey = getDateTimeHourKey(new Date(form.value.date))

  const existingRecords = recordsStore.getChildRecords(currentChild.value.id)
  const sameTimeRecord = existingRecords.find(r => {
    const recordDateKey = getDateTimeHourKey(new Date(r.date))
    return recordDateKey === formDateKey
  })

  if (sameTimeRecord && !isEditing.value) {
    // 如果存在同一小时的记录且不是编辑模式，提示用户
    ElMessageBox.confirm(
      '当前时间已存在记录，是否覆盖？',
      '提示',
      {
        confirmButtonText: '覆盖',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      // 用户确认覆盖，更新现有记录
      recordsStore.updateRecord(currentChild.value.id, sameTimeRecord.id, form.value)
      showAddDialog.value = false
      resetForm()
    }).catch(() => {
      // 用户取消操作
      ElMessage.info('已取消添加')
    })
  } else {
    // 没有重复记录或是编辑模式，直接保存
    if (isEditing.value) {
      recordsStore.updateRecord(currentChild.value.id, editingRecordId.value, form.value)
    } else {
      recordsStore.addRecord(currentChild.value.id, form.value)
    }
    showAddDialog.value = false
    resetForm()
  }
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
      let updatedCount = 0
      let skippedCount = 0

      records.forEach(record => {
        const existingRecord = recordsStore.hasRecordAtTime(currentChild.value.id, record.date)
        
        if (!existingRecord) {
          recordsStore.addRecord(currentChild.value.id, record)
          addedCount++
        } else if (existingRecord.height !== record.height || existingRecord.weight !== record.weight) {
          recordsStore.updateRecord(currentChild.value.id, existingRecord.id, record)
          updatedCount++
        } else {
          skippedCount++
        }
      })

      const resultMessage = []
      if (addedCount > 0) resultMessage.push(`新增${addedCount}条记录`)
      if (updatedCount > 0) resultMessage.push(`更新${updatedCount}条记录`)
      if (skippedCount > 0) resultMessage.push(`跳过${skippedCount}条重复记录`)

      ElMessage.success(`导入成功：${resultMessage.join('，')}`)
    })
  } catch (error) {
    ElMessage.error('导入失败：' + error.message)
  }
}

const handleRowClick = (row) => {
  editRecord(row);
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
  gap: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.action-button {
  width: 100%;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  
  .el-button {
    width: 100%;
    height: 40px;
    justify-content: center;
    background: #FFFFFF;
    border: 1px solid #DCDFE6;
    color: #606266;
    font-size: 1rem;
    padding: 0 1rem;
    border-radius: 8px;
    
    &:hover {
      background: #F5F7FA;
      border-color: #C6E2FF;
      color: #409EFF;
    }
    
    .el-icon {
      margin-right: 8px;
    }
  }
}

.records-table {
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 0;
  margin: 0;
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

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  
  .el-button {
    width: 100%;
    height: 40px;
    justify-content: center;
    background: #FFFFFF;
    border: 1px solid #DCDFE6;
    color: #606266;
    padding: 0 1rem;
    margin: 0;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

    &:hover {
      background: #F5F7FA;
      border-color: #C6E2FF;
      color: #409EFF;
    }

    .el-icon {
      margin-right: 8px;
    }
  }
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
</style>