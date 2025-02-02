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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()

const children = computed(() => childrenStore.children)
const hasChildren = computed(() => childrenStore.hasChildren)
const currentChildId = computed(() => childrenStore.currentChildId)

const showAddDialog = ref(false)
const isEditing = ref(false)
const editingChildId = ref(null)

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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background: linear-gradient(135deg, #807CA5 0%, #9DA0C5 100%);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(128, 124, 165, 0.1);
}

.settings-header h2 {
  margin: 0;
  color: #fff;
  font-weight: 500;
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
  
  .el-button + .el-button {
    margin-left: 0;
  }
}

:deep(.el-button.is-link) {
  background: none;
  border: none;
  padding: 4px 8px;
  
  &.el-button--primary {
    margin-left: 8px;
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

:deep(.child-dialog) {
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
      color: #fff;
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

  &.is-plain {
    background: #fff;
    border: 1px solid #807CA5;
    color: #807CA5;
    &:hover {
      background: #F4F5F7;
      color: #9DA0C5;
      border-color: #9DA0C5;
    }
  }
}

:deep(.el-button--default) {
  border: 1px solid #dcdfe6;
  &:hover {
    border-color: #807CA5;
    color: #807CA5;
  }
}

:deep(.el-card) {
  border-radius: 8px;
  border: none;
  
  .el-card__header {
    padding: 15px 20px;
    border-bottom: 1px solid #ebeef5;
    background: #F4F5F7;
  }
}

:deep(.el-descriptions) {
  padding: 15px;
  
  .el-descriptions__label {
    color: #626270;
  }
  
  .el-descriptions__content {
    color: #2F2F38;
  }
}
</style>