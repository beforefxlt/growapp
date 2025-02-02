<template>
  <div class="records-container">
    <el-empty v-if="!hasChildren" description="请先添加儿童信息">
      <el-button type="primary" @click="router.push('/settings')">去添加</el-button>
    </el-empty>

    <template v-else>
      <div class="records-header">
        <div class="records-header-left">
          <h2 class="records-title">生长记录</h2>
          <div class="action-buttons">
            <el-button type="primary" @click="showAddDialog = true">
              <el-icon><Plus /></el-icon>添加记录
            </el-button>
          </div>
        </div>
      </div>

      <el-table :data="sortedRecords" style="width: 100%; margin-bottom: 20px;">
        <el-table-column label="日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column label="身高/体重">
          <template #default="{ row }">
            {{ row.height }}cm / {{ row.weight }}kg
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" link @click="editRecord(row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button type="danger" link @click="deleteRecord(row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <div class="csv-actions">
        <el-button type="primary" plain @click="exportToCsv">
          <el-icon><Download /></el-icon>导出CSV
        </el-button>
        <el-upload
          action=""
          :auto-upload="false"
          :show-file-list="false"
          accept=".csv"
          @change="handleFileChange"
        >
          <el-button type="primary" plain>
            <el-icon><Upload /></el-icon>导入CSV
          </el-button>
        </el-upload>
      </div>

      <el-dialog
        v-model="showAddDialog"
        :title="isEditing ? '编辑记录' : '添加记录'"
        width="90%"
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { Plus, Edit, Delete, Download, Upload } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()

const hasChildren = computed(() => childrenStore.hasChildren)
const currentChild = computed(() => childrenStore.currentChild)

const showAddDialog = ref(false)
const isEditing = ref(false)
const editingRecordId = ref(null)

const form = ref({
  date: new Date().toISOString().slice(0, 16),  // 格式化到分钟
  height: null,
  weight: null
})

const sortedRecords = computed(() => {
  if (!currentChild.value) return []
  return [...recordsStore.getChildRecords(currentChild.value.id)]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

const resetForm = () => {
  form.value = {
    date: new Date().toISOString().slice(0, 16),
    height: null,
    weight: null
  }
  isEditing.value = false
  editingRecordId.value = null
}

const editRecord = (record) => {
  form.value = { ...record }
  isEditing.value = true
  editingRecordId.value = record.id
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
  if (isEditing.value) {
    recordsStore.updateRecord(currentChild.value.id, editingRecordId.value, form.value)
  } else {
    recordsStore.addRecord(currentChild.value.id, form.value)
  }
  showAddDialog.value = false
  resetForm()
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}

const exportToCsv = () => {
  if (!currentChild.value || !sortedRecords.value.length) {
    ElMessage.warning('没有可导出的记录')
    return
  }

  // 准备CSV内容
  const headers = ['日期', '身高(cm)', '体重(kg)']
  const rows = sortedRecords.value.map(record => [
    formatDate(record.date),
    record.height,
    record.weight
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  // 创建Blob对象
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  // 创建下载链接
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${currentChild.value.name}_生长记录.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleFileChange = (file) => {
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target.result
      const rows = text.split('\n').map(row => row.trim()).filter(row => row)
      
      // 跳过标题行
      const records = rows.slice(1).map(row => {
        const [dateStr, height, weight] = row.split(',')
        
        // 解析日期
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          throw new Error('日期格式不正确')
        }

        // 验证数据
        const heightNum = parseFloat(height)
        const weightNum = parseFloat(weight)
        if (isNaN(heightNum) || isNaN(weightNum)) {
          throw new Error('身高或体重格式不正确')
        }

        return {
          date: date.toISOString().slice(0, 16),
          height: heightNum,
          weight: weightNum
        }
      })

      // 添加记录
      records.forEach(record => {
        recordsStore.addRecord(currentChild.value.id, record)
      })

      ElMessage.success(`成功导入 ${records.length} 条记录`)
    } catch (error) {
      ElMessage.error('导入失败：' + error.message)
    }
  }
  reader.readAsText(file.raw)
}
</script>

<style scoped>
.records-container {
  padding: 10px;
  max-width: 100%;
  box-sizing: border-box;
  background-color: #F6F6FB;
  min-height: 100vh;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(128, 124, 165, 0.1);
}

.records-title {
  margin: 0;
  color: #2F2F38;
  font-weight: 500;
  font-size: 18px;
  min-width: 72px;
}

.records-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.records-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-table) {
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(128, 124, 165, 0.1);
  
  .el-table__header th {
    background-color: #F4F5F7;
    color: #626270;
    font-weight: 500;
  }
  
  .el-table__row {
    background-color: #FFFFFF;
    &:hover {
      background-color: #F6F6FB;
    }
  }
}

:deep(.el-table__cell) {
  padding: 12px !important;
  text-align: center !important;
}

:deep(.el-button.is-link) {
  padding: 8px;
  border-radius: 4px;
  background: none;
  border: none;
  
  &.el-button--primary {
    color: #807CA5;
    &:hover {
      color: #9DA0C5;
    }
  }
  
  &.el-button--danger {
    color: #F56C6C;
    &:hover {
      color: #FF7C7C;
    }
  }
}

:deep(.el-button-group) {
  display: flex;
  justify-content: center;
  gap: 8px;
  
  .el-button + .el-button {
    margin-left: 0;
  }
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #807CA5 0%, #9DA0C5 100%);
  border: none;
  padding: 8px 16px;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #9DA0C5 0%, #A5A8C6 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(128, 124, 165, 0.2);
  }
}

:deep(.record-dialog) {
  .el-dialog {
    max-width: 360px;
    margin: 0 auto;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .el-dialog__header {
    background: linear-gradient(135deg, #807CA5 0%, #9DA0C5 100%);
    padding: 15px 20px;
    margin-right: 0;
    .el-dialog__title {
      color: #FFFFFF;
      font-size: 16px;
      font-weight: 500;
    }
  }

  .el-dialog__body {
    padding: 20px;
  }

  .el-form-item__label {
    color: #626270;
    font-weight: 500;
  }
}

.csv-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(128, 124, 165, 0.1);
  margin-top: 20px;
}

:deep(.el-button--primary.is-plain) {
  background: #fff;
  border: 1px solid #807CA5;
  color: #807CA5;
  
  &:hover {
    background: #F4F5F7;
    color: #9DA0C5;
    border-color: #9DA0C5;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(128, 124, 165, 0.1);
  }
}
</style>