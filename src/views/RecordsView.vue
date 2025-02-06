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

        <div class="records-table" ref="tableWrapper">
          <el-table 
            :data="displayedRecords" 
            style="width: 100%"
            @row-click="handleRowClick"
            :highlight-current-row="false"
            height="calc(100vh - 150px)"
            class="touch-action-none"
            v-infinite-scroll="loadMore"
            :infinite-scroll-disabled="loading"
            :infinite-scroll-distance="20"
            :infinite-scroll-immediate="false">
            <el-table-column prop="date" label="测量日期" min-width="100" align="left">
              <template #default="{ row }">
                <div class="date-cell"
                  @touchstart.stop.prevent="handleRowTouchStart(row, $event)"
                  @touchmove.stop.prevent="handleRowTouchMove($event)" 
                  @touchend.stop.prevent="handleRowTouchEnd($event)"
                  @touchcancel.stop.prevent="handleRowTouchEnd($event)">
                  {{ formatDate(row.date, 'YYYY-MM-DD') }}
                  <span class="time-text">{{ formatDate(row.date, 'HH:mm') }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="年龄" min-width="80" align="left">
              <template #default="{ row }">
                <div class="age-cell"
                  @touchstart.stop.prevent="handleRowTouchStart(row, $event)"
                  @touchmove.stop.prevent="handleRowTouchMove($event)"
                  @touchend.stop.prevent="handleRowTouchEnd($event)"
                  @touchcancel.stop.prevent="handleRowTouchEnd($event)">
                  {{ calculateAgeText(row.date, currentChild.birthDate).replace('..', '') }}
                </div>
              </template>
            </el-table-column>
            <el-table-column label="身高" min-width="80" align="left">
              <template #default="{ row }">
                <div class="value-cell"
                  @touchstart.stop.prevent="handleRowTouchStart(row, $event)"
                  @touchmove.stop.prevent="handleRowTouchMove($event)"
                  @touchend.stop.prevent="handleRowTouchEnd($event)"
                  @touchcancel.stop.prevent="handleRowTouchEnd($event)">
                  {{ row.height }}<span class="unit">cm</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="体重" min-width="80" align="left">
              <template #default="{ row }">
                <div class="value-cell"
                  @touchstart.stop.prevent="handleRowTouchStart(row, $event)"
                  @touchmove.stop.prevent="handleRowTouchMove($event)"
                  @touchend.stop.prevent="handleRowTouchEnd($event)"
                  @touchcancel.stop.prevent="handleRowTouchEnd($event)">
                  {{ row.weight }}<span class="unit">kg</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
          
          <div v-if="loading" class="loading-more">
            <el-icon class="loading-icon"><Loading /></el-icon>
            <span>加载中...</span>
          </div>
          
          <div v-if="noMoreData" class="no-more-data">
            <span>没有更多数据了</span>
          </div>
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
            :min="30"
            :max="200"
            :precision="1"
            style="width: 100%"
            placeholder="30-200"
          />
        </el-form-item>
        <el-form-item label="体重(kg)" class="optional-field" data-test="weight-field">
          <div class="field-with-hint">
            <el-input-number
              v-model="form.weight"
              :min="2"
              :max="100"
              :precision="2"
              style="width: 100%"
              placeholder="选填 2-100"
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
import { ref, computed, reactive, onUnmounted, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChildrenStore } from '../stores/children'
import { useRecordsStore } from '../stores/records'
import { Plus, Edit, Delete, Download, Upload, ArrowRight, Loading } from '@element-plus/icons-vue'
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

const PAGE_SIZE = 20 // 每页加载的记录数
const loading = ref(false)
const currentPage = ref(1)
const noMoreData = ref(false)
const tableWrapper = ref(null)

// 修改 sortedRecords 计算属性为普通的 ref
const allRecords = ref([])

// 显示的记录
const displayedRecords = computed(() => {
  return allRecords.value.slice(0, currentPage.value * PAGE_SIZE)
})

// 初始化数据
const initializeRecords = () => {
  if (!currentChild.value) {
    allRecords.value = []
    return
  }
  
  // 获取所有记录并按时间排序（最新的在前）
  const records = [...recordsStore.getChildRecords(currentChild.value.id)]
  allRecords.value = records.sort((a, b) => new Date(b.date) - new Date(a.date))
  currentPage.value = 1
  noMoreData.value = allRecords.value.length <= PAGE_SIZE
}

// 加载更多数据
const loadMore = async () => {
  if (loading.value || noMoreData.value) return
  
  loading.value = true
  
  try {
    // 模拟异步加载
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const totalRecords = allRecords.value.length
    const currentDisplayed = currentPage.value * PAGE_SIZE
    
    if (currentDisplayed >= totalRecords) {
      noMoreData.value = true
    } else {
      currentPage.value++
    }
  } finally {
    loading.value = false
  }
}

// 监听数据变化
watch(() => currentChild.value?.id, () => {
  initializeRecords()
}, { immediate: true })

// 重置加载状态
const resetLoadingState = () => {
  currentPage.value = 1
  noMoreData.value = false
  loading.value = false
}

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

const longPressTimer = ref(null)
const longPressDelay = 600 // 减少到600ms使响应更快
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchStartTime = ref(0)
const touchMoved = ref(false)
const pressedRow = ref(null)
const isPressing = ref(false)
const MOVE_THRESHOLD = 5 // 移动阈值（像素）
const CLICK_TIMEOUT = 300 // 点击超时时间（毫秒）

const handleRowClick = (row) => {
  // 如果正在长按，不触发点击
  if (isPressing.value) {
    return
  }
  // 直接触发编辑
  editRecord(row)
}

const handleRowTouchStart = (row, event) => {
  // 阻止默认行为和冒泡
  event.preventDefault()
  event.stopPropagation()
 
  // 清理之前可能存在的定时器
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
  }
  
  // 重置状态
  touchMoved.value = false
  pressedRow.value = {...row}
  isPressing.value = true
  touchStartTime.value = Date.now()
  
  // 记录起始触摸位置
  if (event.touches && event.touches[0]) {
    touchStartX.value = event.touches[0].clientX
    touchStartY.value = event.touches[0].clientY
  }
  
  // 设置长按定时器
  longPressTimer.value = setTimeout(() => {
    if (!touchMoved.value && pressedRow.value) {
      // 保存要删除的记录的完整副本
      const recordToDelete = {...pressedRow.value}
      
      // 添加触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate([50])
      }
      
      // 显示删除确认对话框
      ElMessageBox.confirm(
        '确定要删除这条记录吗？',
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
          closeOnClickModal: false,
          closeOnPressEscape: false
        }
      ).then(async () => {
        // 使用保存的记录副本进行删除
        const success = await deleteRecord(recordToDelete)
        if (success) {
          ElMessage.success('删除成功')
          // 添加删除成功的触觉反馈
          if (navigator.vibrate) {
            navigator.vibrate([30, 50, 30])
          }
        }
      }).catch(() => {
        // 用户取消删除，不需要特殊处理
      }).finally(() => {
        // 重置状态
        resetTouchState()
      })
    }
  }, longPressDelay)
}

const handleRowTouchMove = (event) => {
  if (!isPressing.value) return
  
  const touch = event.touches[0]
  const moveX = Math.abs(touch.clientX - touchStartX.value)
  const moveY = Math.abs(touch.clientY - touchStartY.value)
  
  // 如果移动距离超过阈值，标记为已移动
  if (moveX > MOVE_THRESHOLD || moveY > MOVE_THRESHOLD) {
    touchMoved.value = true
    // 清除长按定时器
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null
    }
  }
}

const handleRowTouchEnd = (event) => {
  event.preventDefault()
  event.stopPropagation()
  
  const touchDuration = Date.now() - touchStartTime.value
  
  // 如果触摸时间小于长按时间，且没有明显移动，则触发点击编辑
  if (touchDuration < longPressDelay && !touchMoved.value && pressedRow.value) {
    editRecord(pressedRow.value)
  }
  
  // 清理长按定时器和状态
  resetTouchState()
}

const resetTouchState = () => {
  // 清理定时器和状态
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  // 重置所有状态
  pressedRow.value = null
  isPressing.value = false
  touchMoved.value = false
  touchStartTime.value = 0
}

const deleteRecord = async (record) => {
  try {
    if (!currentChild.value || !currentChild.value.id) {
      ElMessage.error('删除失败：未选择儿童或儿童信息无效')
      return false
    }
    
    if (!record || !record.id) {
      console.error('删除失败 - 记录数据:', record)
      ElMessage.error('删除失败：记录数据无效')
      return false
    }

    // 确保记录属于当前儿童
    if (record.childId !== currentChild.value.id) {
      console.error('删除失败 - 记录不属于当前儿童:', record)
      ElMessage.error('删除失败：记录不属于当前儿童')
      return false
    }

    const result = recordsStore.deleteRecord(currentChild.value.id, record.id)
    if (result) {
      // 删除成功后重新初始化数据
      initializeRecords()
      return true
    } else {
      ElMessage.error('删除失败：记录不存在')
      return false
    }
  } catch (error) {
    console.error('删除记录时发生错误:', error)
    ElMessage.error(`删除失败：${error.message || '未知错误'}`)
    return false
  }
}

const saveRecord = async () => {
  try {
    // 验证必填字段
    if (!form.value.height) {
      ElMessage.warning('请输入身高')
      return
    }

    // 验证身高范围
    if (form.value.height < 30 || form.value.height > 200) {
      ElMessage.warning('身高必须在 30-200 厘米之间')
      return
    }

    // 验证体重范围（如果有填写）
    if (form.value.weight !== null && form.value.weight !== undefined) {
      if (form.value.weight < 2 || form.value.weight > 100) {
        ElMessage.warning('体重必须在 2-100 千克之间')
        return
      }
    }

    const recordData = {
      date: form.value.date || getCurrentLocalISOString(),
      height: form.value.height,
      weight: form.value.weight
    }

    if (isEditing.value) {
      await recordsStore.updateRecord(currentChild.value.id, editingRecordId.value, recordData)
      ElMessage.success('记录更新成功')
    } else {
      await recordsStore.addRecord(currentChild.value.id, recordData)
      ElMessage.success('记录添加成功')
    }
    showAddDialog.value = false
    resetForm()
    // 重新初始化数据
    initializeRecords()
  } catch (error) {
    console.error('保存记录失败:', error)
    ElMessage.error(`保存失败：${error.message || '未知错误'}`)
  }
}

const exportToCsvHandler = async () => {
  try {
    const permissionGranted = await checkAndRequestPermissions(FilePlugin)
    if (!permissionGranted) return

    await exportToCsv(displayedRecords.value, currentChild.value.name, FilePlugin)
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
        // 导入成功后重新初始化数据列表
        initializeRecords()
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

// 在组件卸载时清理
onUnmounted(() => {
  resetTouchState()
})
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
  position: relative;
  height: calc(100vh - 150px);
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
  color: #909399;
  font-size: 14px;
  
  .loading-icon {
    margin-right: 8px;
    animation: rotating 2s linear infinite;
  }
}

.no-more-data {
  text-align: center;
  color: #909399;
  font-size: 14px;
  padding: 10px 0;
  background: #f5f7fa;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

:deep(.el-table__body-wrapper) {
  overflow-y: auto !important;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

:deep(.el-table) {
  height: 100% !important;
}

.date-cell, .age-cell, .value-cell {
  font-size: 0.875rem;
  color: #2F2F38;
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
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

:deep(.el-table__row) {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
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

/* 添加全局样式 */
.touch-action-none {
  touch-action: none !important;
}

.el-table__body {
  touch-action: none !important;
}

.el-table__row {
  touch-action: none !important;
}

/* 确保单元格内容也禁用默认触摸行为 */
.date-cell, .age-cell, .value-cell {
  touch-action: none !important;
  -webkit-touch-callout: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}

/* 禁用表格行的选中效果 */
.records-container :deep(.el-table__row) {
  &:hover,
  &:focus,
  &.current-row {
    background-color: transparent !important;
  }
  
  &.hover-row > td {
    background-color: transparent !important;
  }
}

/* 添加点击时的视觉反馈 */
.records-container :deep(.el-table__row) {
  td {
    transition: background-color 0.2s;
    
    &:active {
      background-color: rgba(64, 150, 255, 0.1) !important;
    }
  }
}

/* 确保单元格内容的触摸行为被禁用 */
.date-cell, .age-cell, .value-cell {
  touch-action: none !important;
  -webkit-touch-callout: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
  transition: opacity 0.2s;
  
  &:active {
    opacity: 0.7;
  }
}
</style>