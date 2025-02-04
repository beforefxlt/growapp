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

      <div class="records-content">
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
import { 
  formatDate, 
  getCurrentLocalISOString, 
  formatDateForFileName, 
  getDateTimeHourKey,
  getLocalISOString  // 添加这个导入
} from '../utils/dateUtils'

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
  date: getCurrentLocalISOString(),  // 使用新的获取本地时间函数
  height: null,
  weight: null
})

const sortedRecords = computed(() => {
  if (!currentChild.value) return []
  
  // 获取所有记录并按创建时间排序
  const records = [...recordsStore.getChildRecords(currentChild.value.id)]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // 先按创建时间排序，保证最新的记录优先处理
  
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
    const rows = sortedRecords.value.map(record => {
      const date = new Date(record.date);
      const formattedDate = formatDate(record.date, 'YYYY年MM月DD日 HH:mm');  // 修改格式化模式,添加时分
      return [
        formattedDate,
        record.height.toFixed(1),
        record.weight.toFixed(2)
      ];
    });
    
    // 修改CSV内容生成逻辑，不在这里添加儿童姓名
    const csvContent = [
      '日期,身高(cm),体重(kg)',
      ...rows.map(row => row.join(','))
    ].join('\n');

    console.log('生成的CSV内容:', csvContent);

    const fileName = `${currentChild.value.name}_生长记录_${formatDateForFileName(new Date())}.csv`;

    if (Capacitor.getPlatform() === 'android') {
      try {
        // 使用文件选择器保存文件
        const result = await FilePlugin.saveFile({
          content: csvContent,
          fileName: fileName,
          childName: currentChild.value.name,  // 添加儿童姓名
          mimeType: 'text/csv'
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
    
    if (rows.length < 3) {
      throw new Error('文件格式错误：文件内容不完整，至少需要包含儿童姓名、标题行和一条记录');
    }
    
    // 验证第一行：儿童姓名
    const nameRow = rows[0].trim();
    if (!nameRow.startsWith('儿童姓名:')) {
      throw new Error('文件格式错误：第一行必须以"儿童姓名:"开头');
    }
    const childName = nameRow.replace('儿童姓名:', '').trim();
    if (!childName) {
      throw new Error('文件格式错误：儿童姓名不能为空');
    }
    
    // 验证第二行：标题
    const titleRow = rows[1].trim();
    // 允许多种标题格式，忽略空格和制表符
    const validTitles = [
      '日期,身高(cm),体重(kg)',
      '日期\t身高(cm)\t体重(kg)',
      '日期, 身高(cm), 体重(kg)',
      '日期 身高(cm) 体重(kg)',
      'date,height(cm),weight(kg)',
      'date, height(cm), weight(kg)'
    ];
    
    // 标准化标题行（移除多余空格和制表符）
    const normalizedTitleRow = titleRow.split(/[\t,]/).map(item => item.trim()).join(',');
    
    if (!validTitles.some(title => title.split(/[\t,]/).map(item => item.trim()).join(',') === normalizedTitleRow)) {
      throw new Error(`文件格式错误：第二行必须是标准标题，支持以下格式：
      日期,身高(cm),体重(kg)
      日期\t身高(cm)\t体重(kg)`);
    }

    // 处理数据行
    const dataRows = rows.slice(2).filter(row => row.trim());
    if (dataRows.length === 0) {
      throw new Error('文件格式错误：没有找到有效的记录数据');
    }

    const records = [];
    const errors = [];

    dataRows.forEach((row, index) => {
      try {
        // 支持逗号、制表符或空格分隔
        const [dateStr, height, weight] = row.split(/[\t,]/).map(item => item.trim());
        
        // 验证并转换日期格式
        let date;
        // 尝试多种日期格式
        const formats = [
          /^(\d{4})年(\d{1,2})月(\d{1,2})日 (\d{1,2}):(\d{1,2})$/, // YYYY年MM月DD日 HH:mm
          /^(\d{4})年(\d{1,2})月(\d{1,2})日$/, // YYYY年MM月DD日
          /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2})$/, // YYYY-MM-DD HH:mm
          /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
          /^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{1,2})$/, // YYYY/MM/DD HH:mm
          /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/ // YYYY/MM/DD
        ];

        let matched = false;
        for (const format of formats) {
          const match = dateStr.match(format);
          if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            const day = parseInt(match[3]);
            const hours = match[4] ? parseInt(match[4]) : 0;
            const minutes = match[5] ? parseInt(match[5]) : 0;
            
            date = new Date(year, month, day, hours, minutes);
            
            if (!isNaN(date.getTime()) && 
                date.getFullYear() === year && 
                date.getMonth() === month && 
                date.getDate() === day) {
              matched = true;
              break;
            }
          }
        }

        if (!matched) {
          throw new Error(`第${index + 3}行：日期格式无效，支持的格式有：
          YYYY年MM月DD日 HH:mm
          YYYY年MM月DD日`);
        }

        // 验证身高
        const heightNum = parseFloat(height);
        if (isNaN(heightNum) || heightNum <= 0 || heightNum > 250) {
          throw new Error(`第${index + 3}行：身高数值无效，应为0-250之间的数字`);
        }

        // 验证体重
        const weightNum = parseFloat(weight);
        if (isNaN(weightNum) || weightNum <= 0 || weightNum > 150) {
          throw new Error(`第${index + 3}行：体重数值无效，应为0-150之间的数字`);
        }

        records.push({
          date: getLocalISOString(date).slice(0, 16),  // 确保使用正确的日期格式
          height: heightNum,
          weight: weightNum,
          createdAt: new Date().toISOString()  // 添加创建时间
        });
      } catch (error) {
        errors.push(error.message);
      }
    });

    if (errors.length > 0) {
      throw new Error('数据格式错误：\n' + errors.join('\n'));
    }

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
    let updatedCount = 0;
    let skippedCount = 0;

    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    records.forEach(record => {
      const existingRecord = recordsStore.hasRecordAtTime(targetChildId, record.date);
      
      if (!existingRecord) {
        recordsStore.addRecord(targetChildId, record);
        addedCount++;
      } else if (
        existingRecord.height !== record.height || 
        existingRecord.weight !== record.weight
      ) {
        recordsStore.updateRecord(targetChildId, existingRecord.id, record);
        updatedCount++;
      } else {
        skippedCount++;
      }
    });

    const resultMessage = [];
    if (addedCount > 0) resultMessage.push(`新增${addedCount}条记录`);
    if (updatedCount > 0) resultMessage.push(`更新${updatedCount}条记录`);
    if (skippedCount > 0) resultMessage.push(`跳过${skippedCount}条重复记录`);

    ElMessage.success(`导入成功：${resultMessage.join('，')}`);
    
    if (!currentChild.value) {
      childrenStore.setCurrentChild(targetChildId);
    }
  } catch (error) {
    console.error('处理文件内容错误:', error);
    ElMessage.error(error.message);
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
  padding: 0;
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  background-color: #F6F6FB;
  min-height: 100vh;
  height: 100vh; /* 固定高度为视口高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止整体滚动 */
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  padding: 15px;
  background: #FFFFFF;
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0; /* 防止头部压缩 */
}

/* 添加内容容器样式 */
.records-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

:deep(.el-table) {
  flex: 0 1 auto;
  margin: 0 !important;
  border-radius: 0 !important;
}

:deep(.el-table__body-wrapper) {
  overflow-y: auto;
}

.records-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 15px;
}

.records-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-right: 15px;
}

.records-title {
  margin: 0;
  color: #2F2F38;
  font-weight: 500;
  font-size: 18px;
  min-width: 72px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-table .el-table__header th) {
  background-color: #F4F5F7;
  color: #626270;
  font-weight: 500;
}

:deep(.el-table .el-table__row) {
  background-color: #FFFFFF;
}

:deep(.el-table .el-table__row:hover) {
  background-color: #F6F6FB;
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
    max-width: 90%;
    width: 360px !important;
    margin: 15px auto !important;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 30px); /* 限制最大高度 */
    
    .el-dialog__body {
      overflow-y: auto; /* 内容过多时可滚动 */
      flex: 1;
      padding: 20px;
    }
    
    .el-dialog__header {
      flex-shrink: 0;
    }
    
    .el-dialog__footer {
      flex-shrink: 0;
    }
  }
}

.csv-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 15px;
  background: #FFFFFF;
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-top: 0;
  flex-shrink: 0;
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

:deep(.el-empty) {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0;
}
</style>