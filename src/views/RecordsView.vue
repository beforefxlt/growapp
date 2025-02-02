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
        <el-button type="primary" plain @click="importCsv">
          <el-icon><Upload /></el-icon>导入CSV
        </el-button>
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
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { formatDate } from '../utils/dateFormat'

// 注册FilePlugin
const FilePlugin = registerPlugin('GrowAppFilePlugin');

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

const formatDateForFileName = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

const checkAndRequestPermissions = async () => {
  if (Capacitor.getPlatform() !== 'android') {
    return true;
  }

  try {
    console.log('FilePlugin:', FilePlugin);
    console.log('开始权限检查流程');

    // 显示权限说明
    await ElMessageBox.confirm(
      '导出功能需要访问存储空间权限，以保存CSV文件。\n\n' +
      '请在接下来的系统对话框中点击"允许"。',
      '需要权限',
      {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'info'
      }
    );

    console.log('用户同意继续，开始检查权限');

    try {
      // 检查权限
      const permResult = await FilePlugin.checkPermissions();
      console.log('权限检查结果:', permResult);
      
      if (permResult.granted) {
        console.log('已有权限，可以继续');
        return true;
      }

      console.log('没有权限，开始请求');
      // 请求权限
      const result = await FilePlugin.requestPermissions();
      console.log('权限请求结果:', result);
      
      if (!result.granted) {
        console.log('用户拒绝了权限请求');
        ElMessage.error('需要存储权限才能导出文件。请在设置中手动开启权限。');
        return false;
      }
      
      console.log('用户同意了权限请求');
      return result.granted;
    } catch (error) {
      console.error('权限操作失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('权限请求失败:', error);
    if (error.message !== 'cancel') {
      ElMessage.error('权限请求失败: ' + error.message);
    }
    return false;
  }
}

const exportToCsv = async () => {
  try {
    console.log('开始导出CSV');
    
    if (!currentChild.value || !sortedRecords.value.length) {
      ElMessage.warning('没有可导出的记录');
      return;
    }

    // 检查权限
    const permissionGranted = await checkAndRequestPermissions();
    if (!permissionGranted) {
      return;
    }

    // 准备CSV内容
    const headers = ['日期', '身高(cm)', '体重(kg)'];
    const rows = sortedRecords.value.map(record => [
      formatDate(record.date),
      record.height,
      record.weight
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    console.log('生成的CSV内容:', csvContent);
    console.log('生成的CSV内容长度:', csvContent.length);

    const fileName = `${currentChild.value.name}_生长记录_${formatDateForFileName(new Date())}.csv`;

    if (Capacitor.getPlatform() === 'android') {
      try {
        // 使用文件选择器保存文件
        const result = await FilePlugin.saveFile({
          content: csvContent,
          fileName: fileName,
          mimeType: 'text/csv',
          childName: currentChild.value.name
        });

        console.log('文件保存结果:', result);
        ElMessage.success('文件保存成功');
      } catch (error) {
        console.error('保存文件失败:', error);
        if (error.message === 'User cancelled file save') {
          ElMessage.info('已取消保存');
        } else {
          ElMessage.error('保存文件失败: ' + error.message);
        }
      }
    } else {
      // 非Android平台使用浏览器下载
      // 添加 BOM 头，确保中文正确显示
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      ElMessage.success('文件导出成功');
    }
  } catch (error) {
    console.error('导出CSV时出错:', error);
    ElMessage.error('导出失败：' + error.message);
  }
}

// 新增导入CSV函数
const importCsv = async () => {
  try {
    console.log('开始导入CSV流程');
    
    if (Capacitor.getPlatform() === 'android') {
      console.log('在Android平台上执行导入');
      
      // 检查权限
      const permissionGranted = await checkAndRequestPermissions();
      if (!permissionGranted) {
        console.log('未获得权限，终止导入');
        return;
      }

      try {
        console.log('调用FilePlugin.pickFile');
        // 使用FilePlugin选择文件
        const result = await FilePlugin.pickFile({
          type: 'text/csv',
          title: '选择CSV文件'
        });

        console.log('文件选择结果:', result);

        if (!result || !result.path) {
          console.log('没有选择文件或文件路径为空');
          return;
        }

        // 读取文件内容
        console.log('开始读取文件内容:', result.path);
        const fileContent = await FilePlugin.readFile({
          path: result.path,
          encoding: 'utf8'
        });

        console.log('文件读取结果:', fileContent);
        console.log('文件内容:', fileContent.content);

        if (!fileContent || !fileContent.content) {
          throw new Error('无法读取文件内容');
        }

        // 验证文件名格式
        const fileName = result.name;
        console.log('处理文件:', fileName);
        
        let childName, importTimestamp;

        // 尝试从文件名中提取信息
        const fileNamePattern = /^(.+)_生长记录_(\d{8}_\d{4})\.csv$/;
        const match = fileName.match(fileNamePattern);

        if (!match) {
          console.log('文件名格式不匹配标准格式');
          // 如果文件名不匹配标准格式，直接处理文件内容
          console.log('直接处理文件内容');
          await processFileContent(fileContent.content.split('\n'));
          return;
        }

        childName = match[1];
        importTimestamp = match[2];
        console.log('解析的儿童姓名:', childName);
        console.log('解析的时间戳:', importTimestamp);

        // 确认导入
        try {
          await ElMessageBox.confirm(
            `确认要导入 ${childName} 的生长记录数据吗？\n导出时间：${formatImportTimestamp(importTimestamp)}`,
            '确认导入',
            {
              confirmButtonText: '确定导入',
              cancelButtonText: '取消',
              type: 'warning'
            }
          );
          // 用户确认导入
          console.log('用户确认导入，开始处理文件内容');
          await processFileContent(fileContent.content.split('\n'), childName);
        } catch (err) {
          console.log('用户取消导入:', err);
          ElMessage.info('已取消导入');
        }
      } catch (error) {
        console.error('文件操作失败:', error);
        if (error.message === 'User cancelled file save') {
          ElMessage.info('已取消导入');
        } else {
          ElMessage.error('文件操作失败：' + error.message);
        }
      }
    } else {
      // 非Android平台使用input元素选择文件
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target.result;
          const fileName = file.name;
          let childName, importTimestamp;

          const fileNamePattern = /^(.+)_生长记录_(\d{8}_\d{4})\.csv$/;
          const match = fileName.match(fileNamePattern);

          if (!match) {
            try {
              await ElMessageBox.confirm(
                '文件名格式不是标准的导出格式（姓名_生长记录_日期.csv），是否仍要尝试导入？',
                '文件格式提示',
                {
                  confirmButtonText: '继续导入',
                  cancelButtonText: '取消',
                  type: 'warning'
                }
              );
              await processFileContent(content.split('\n'));
            } catch (err) {
              ElMessage.info('已取消导入');
            }
            return;
          }

          childName = match[1];
          importTimestamp = match[2];

          try {
            await ElMessageBox.confirm(
              `确认要导入 ${childName} 的生长记录数据吗？\n导出时间：${formatImportTimestamp(importTimestamp)}`,
              '确认导入',
              {
                confirmButtonText: '确定导入',
                cancelButtonText: '取消',
                type: 'warning'
              }
            );
            await processFileContent(content.split('\n'), childName);
          } catch (err) {
            ElMessage.info('已取消导入');
          }
        };
        reader.readAsText(file);
      };

      input.click();
      document.body.removeChild(input);
    }
  } catch (error) {
    console.error('导入CSV时出错:', error);
    ElMessage.error('导入失败：' + error.message);
  }
};

// 新增处理文件内容的函数
const processFileContent = async (rows, fileNameChildName) => {
  try {
    console.log('开始处理文件内容，总行数:', rows.length);
    
    // 第一行必须是儿童姓名
    const nameRow = rows[0].trim();
    const childName = nameRow.replace('儿童姓名:', '').trim();
    
    // 第二行必须是标准标题
    const titleRow = rows[1].trim().split(',');
    if (titleRow.join(',') !== '日期,身高(cm),体重(kg)') {
      throw new Error('文件格式错误：标题行必须为"日期,身高(cm),体重(kg)"');
    }

    // 处理数据行
    const dataRows = rows.slice(2).filter(row => row.trim());
    const records = dataRows.map(row => {
      const [dateStr, height, weight] = row.split(',').map(item => item.trim());
      return {
        date: new Date(dateStr).toISOString().slice(0, 16),
        height: parseFloat(height),
        weight: parseFloat(weight)
      };
    });

    // 检查是否存在该儿童
    const childrenStore = useChildrenStore();
    let targetChildId = null;
    const existingChild = childrenStore.children.find(c => c.name === childName);
    
    if (!existingChild) {
      const newChild = {
        id: Date.now().toString(),
        name: childName,
        createdAt: new Date().toISOString()
      };
      childrenStore.addChild(newChild);
      targetChildId = newChild.id;
      ElMessage.success(`已创建新的儿童档案：${childName}`);
    } else {
      targetChildId = existingChild.id;
    }

    // 添加记录
    let addedCount = 0;
    records.forEach(record => {
      recordsStore.addRecord(targetChildId, record);
      addedCount++;
    });

    ElMessage.success(`导入成功：新增${addedCount}条记录`);
    
    // 如果当前没有选中儿童，自动选中导入的儿童
    if (!currentChild.value) {
      childrenStore.setCurrentChild(targetChildId);
    }
  } catch (error) {
    console.error('处理文件内容错误:', error);
    throw error;
  }
};

// 格式化导入时间戳
const formatImportTimestamp = (timestamp) => {
  const year = timestamp.slice(0, 4)
  const month = timestamp.slice(4, 6)
  const day = timestamp.slice(6, 8)
  const hour = timestamp.slice(9, 11)
  const minute = timestamp.slice(11, 13)
  return `${year}年${month}月${day}日 ${hour}:${minute}`
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