import { ElMessage, ElMessageBox } from 'element-plus'
import { Capacitor } from '@capacitor/core'
import { formatDate, formatDateForFileName, getLocalISOString, getDateTimeHourKey } from './dateUtils'

const removeBOM = (str) => {
  if (!str) return '';
  // 去除常见的 UTF-8 BOM \uFEFF
  return str.replace(/^\uFEFF/, '');
};

// 检测并修复编码问题
const tryGB18030Decode = (content) => {
  try {
    // 将字符串转换为字节数组
    const bytes = new Uint8Array(content.length);
    for (let i = 0; i < content.length; i++) {
      bytes[i] = content.charCodeAt(i) & 0xff;
    }
    
    // 尝试使用GB18030解码
    const decoder = new TextDecoder('gb18030');
    return decoder.decode(bytes);
  } catch (e) {
    console.warn('GB18030解码失败:', e);
    return content; // 解码失败时返回原内容
  }
};

// 检查是否包含乱码
const containsGarbledText = (text) => {
  return /[\ufffd\ufffe\uffff]/.test(text) || text.includes('');
};

// 处理文件内容的函数
export const processFileContent = async (rows, recordsStore, childrenStore) => {
  try {
    if (rows.length < 1) {
      throw new Error('文件格式错误：文件内容不完整')
    }

    let startIndex = 0;
    let childName = '';

    // 检查第一行是否包含儿童姓名
    const firstRow = rows[0].trim();
    console.log('第一行内容:', firstRow); // 添加调试日志
    
    if (firstRow.includes('儿童姓名') || firstRow.includes('姓名')) {
      try {
        childName = firstRow.split(/[:\：]/)[1].trim();
        startIndex = 1;
        console.log('检测到儿童姓名:', childName); // 添加调试日志
      } catch (e) {
        console.warn('解析儿童姓名失败:', e);
      }
    }

    // 检查是否存在表头行
    if (rows[startIndex] && (rows[startIndex].includes('日期') || rows[startIndex].includes('身高') || rows[startIndex].includes('体重'))) {
      startIndex++;
      console.log('检测到表头行，跳过处理');
    }

    // 假设自此开始全是数据行
    const dataRows = rows.slice(startIndex).filter(row => row.trim());
    const records = [];
    const errors = [];

    dataRows.forEach((row, index) => {
      try {
        console.log(`处理第${index + 1}行数据:`, row); // 添加调试日志
        const parts = row.split(/[\t,]/).map(item => item.trim());
        console.log('拆分后的数据:', parts); // 添加调试日志
        
        const [dateStr, height, weight] = parts;

        // 验证日期
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new Error(`第${index + startIndex + 1}行：日期格式无效 => ${dateStr}`);
        }

        // 验证身高
        const heightNum = parseFloat(height);
        if (isNaN(heightNum) || heightNum <= 0 || heightNum > 250) {
          throw new Error(`第${index + startIndex + 1}行：身高数值无效 => ${height}`);
        }

        // 验证体重（允许为空）
        let weightNum = null;
        if (weight && weight.trim() !== '') {
          weightNum = parseFloat(weight);
          if (isNaN(weightNum) || weightNum <= 0 || weightNum > 150) {
            throw new Error(`第${index + startIndex + 1}行：体重数值无效 => ${weight}`);
          }
        }

        records.push({
          date: getLocalISOString(date),
          height: heightNum,
          weight: weightNum,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        errors.push(error.message);
      }
    });

    if (errors.length > 0) {
      throw new Error('数据格式错误：\n' + errors.join('\n'));
    }

    // 如果发现了儿童姓名，更新当前选中的儿童
    if (childName && childrenStore) {
      const child = childrenStore.children.find(c => c.name === childName)
      if (child) {
        childrenStore.setCurrentChild(child.id)
      }
    }

    return records;
  } catch (error) {
    console.error('处理文件内容错误:', error);
    throw error;
  }
}

// 导出CSV文件
export const exportToCsv = async (records, childName, FilePlugin) => {
  try {
    if (!records.length) {
      ElMessage.warning('没有可导出的记录')
      return
    }

    // 按日期时间（精确到小时）进行去重
    const uniqueRecords = new Map()
    records.forEach(record => {
      const dateKey = getDateTimeHourKey(new Date(record.date))
      if (!uniqueRecords.has(dateKey) || new Date(record.date) > new Date(uniqueRecords.get(dateKey).date)) {
        uniqueRecords.set(dateKey, record)
      }
    })

    // 准备CSV内容
    const rows = Array.from(uniqueRecords.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(record => {
        const formattedDate = formatDate(record.date, 'YYYY-MM-DD HH:mm')
        return [
          formattedDate,
          record.height.toFixed(1),
          record.weight ? record.weight.toFixed(2) : ''
        ]
      })
    
    const csvContent = [
      '日期,身高(cm),体重(kg)',
      ...rows.map(row => row.join(','))
    ].join('\n')

    const fileName = `${childName}_生长记录_${formatDateForFileName(new Date())}.csv`

    if (Capacitor.getPlatform() === 'android') {
      // 添加 UTF-8 BOM，确保Excel等软件正确识别编码
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const textEncoder = new TextEncoder();
      const contentArray = textEncoder.encode(csvContent);
      
      // 合并BOM和内容
      const finalContent = new Uint8Array(bom.length + contentArray.length);
      finalContent.set(bom);
      finalContent.set(contentArray, bom.length);

      // 将 Uint8Array 转换为 base64 字符串
      const base64Content = btoa(String.fromCharCode.apply(null, finalContent));

      const result = await FilePlugin.saveFile({
        content: base64Content,
        fileName: fileName,
        childName: childName,
        mimeType: 'text/csv; charset=utf-8'
      })

      console.log('文件保存结果:', result)
      ElMessage.success('文件保存成功')
    } else {
      // Web端导出
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv; charset=utf-8' });
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
    throw error;
  }
}

// 尝试使用不同编码解码内容
const decodeContent = (buffer) => {
  // 尝试编码顺序：UTF-8 -> GB18030
  const encodings = ['utf-8', 'gb18030'];
  
  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding);
      const content = decoder.decode(buffer);
      
      // 如果是UTF-8且没有乱码，直接返回
      if (encoding === 'utf-8' && !containsGarbledText(content)) {
        console.log('成功使用UTF-8解码');
        return content;
      }
      
      // 如果是GB18030且解码成功，返回结果
      if (encoding === 'gb18030') {
        console.log('成功使用GB18030解码');
        return content;
      }
    } catch (e) {
      console.warn(`${encoding}解码失败:`, e);
    }
  }
  
  // 如果所有编码都失败，返回UTF-8的结果
  console.warn('所有编码尝试失败，使用UTF-8作为后备方案');
  return new TextDecoder('utf-8').decode(buffer);
};

// 导入CSV文件
export const importCsv = async (FilePlugin, processCallback) => {
  try {
    if (Capacitor.getPlatform() === 'android') {
      const result = await FilePlugin.pickFile({
        type: 'text/csv',
        title: '选择CSV文件'
      });

      if (!result || !result.path) {
        return;
      }

      console.log('选择的文件路径:', result.path);

      // 以base64方式读取文件
      const fileContent = await FilePlugin.readFile({
        path: result.path,
        encoding: 'base64'
      });

      console.log('读取到的文件内容:', fileContent);

      if (!fileContent || !fileContent.content) {
        throw new Error('无法读取文件内容');
      }

      // 将base64转换为ArrayBuffer
      const binaryString = atob(fileContent.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('转换后的字节数组:', bytes);

      // 解码内容
      let content = decodeContent(bytes);
      console.log('解码后的内容:', content);
      
      // 移除BOM
      content = removeBOM(content);
      console.log('移除BOM后的内容:', content);
      
      // 分割行并过滤空行
      const lines = content.split('\n').filter(line => line.trim());
      console.log('分割后的行数:', lines.length);
      
      await processCallback(lines);
    } else {
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
          try {
            // 获取ArrayBuffer
            const buffer = e.target.result;
            
            // 解码内容
            let content = decodeContent(new Uint8Array(buffer));
            
            // 移除BOM
            content = removeBOM(content);
            
            await processCallback(content.split('\n'));
          } catch (error) {
            console.error('处理文件内容失败:', error);
            ElMessage.error('处理文件内容失败: ' + error.message);
          }
        };
        // 读取为ArrayBuffer
        reader.readAsArrayBuffer(file);
      };

      input.click();
      document.body.removeChild(input);
    }
  } catch (error) {
    console.error('导入CSV时出错:', error);
    ElMessage.error('导入失败: ' + error.message);
    throw error;
  }
} 