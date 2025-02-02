<template>
  <div class="records-container">
    <el-empty v-if="!hasChildren" description="请先添加儿童信息">
      <el-button type="primary" @click="router.push('/settings')">去添加</el-button>
    </el-empty>

    <template v-else>
      <div class="records-header">
        <h2>生长记录</h2>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>添加记录
        </el-button>
      </div>

      <el-table :data="sortedRecords" style="width: 100%">
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

      <el-dialog
        v-model="showAddDialog"
        :title="isEditing ? '编辑记录' : '添加记录'"
        width="500px"
      >
        <el-form :model="form" label-width="100px">
          <el-form-item label="日期">
            <el-date-picker
              v-model="form.date"
              type="date"
              placeholder="选择日期"
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
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()

const hasChildren = computed(() => childrenStore.hasChildren)
const currentChild = computed(() => childrenStore.currentChild)

const showAddDialog = ref(false)
const isEditing = ref(false)
const editingRecordId = ref(null)

const form = ref({
  date: '',
  height: 0,
  weight: 0
})

const sortedRecords = computed(() => {
  if (!currentChild.value) return []
  return [...recordsStore.getChildRecords(currentChild.value.id)]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

const resetForm = () => {
  form.value = {
    date: new Date(),
    height: 0,
    weight: 0
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
  return `${year}年${month}月${day}日`
}
</script>

<style scoped>
.records-container {
  padding: 10px;
  max-width: 100%;
  box-sizing: border-box;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.records-header h2 {
  margin: 0;
}

:deep(.el-table) {
  width: 100% !important;
}

:deep(.el-table__cell) {
  padding: 8px !important;
  text-align: center !important;
}

:deep(.el-button-group) {
  display: flex;
  justify-content: center;
}
</style>