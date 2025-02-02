<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2>儿童信息管理</h2>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>添加儿童
      </el-button>
    </div>

    <el-empty v-if="!hasChildren" description="暂无儿童信息" />

    <el-card v-else v-for="child in children" :key="child.id" class="child-card">
      <template #header>
        <div class="card-header">
          <span>{{ child.name }}</span>
          <el-button-group>
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
          </el-button-group>
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
      width="500px"
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()

const children = computed(() => childrenStore.children)
const hasChildren = computed(() => childrenStore.hasChildren)
const currentChildId = computed(() => childrenStore.currentChildId)

const showAddDialog = ref(false)
const isEditing = ref(false)
const editingChildId = ref(null)

const form = ref({
  name: '',
  gender: 'male',
  birthDate: ''
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
    birthDate: ''
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
  if (isEditing.value) {
    childrenStore.updateChild(editingChildId.value, form.value)
  } else {
    childrenStore.addChild(form.value)
  }
  showAddDialog.value = false
  resetForm()
}
</script>

<style scoped>
.settings-container {
  padding: 20px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.settings-header h2 {
  margin: 0;
}

.child-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>