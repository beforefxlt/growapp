import { ElMessage, ElMessageBox } from 'element-plus'
import { Capacitor } from '@capacitor/core'
import { formatDate, formatDateForFileName, getLocalISOString, getDateTimeHourKey } from './dateUtils'
import dayjs from 'dayjs'

// 增强的BOM移除函数
export function removeBOM(str) {
  if (!str) return str;
  
  const original = str;
  
  // 定义所有可能的BOM标记和特殊字符组合
  const patterns = [
    /^\uFEFF/,          // UTF-8 BOM
    /^\uFFFE/,          // UTF-16 BE BOM
    /^\u0000\u0000\uFEFF/, // UTF-32 BE BOM
    /^\uEFBBBF/,        // UTF-8 BOM (hex)
    /^\u{FEFF}/u,       // Unicode BOM
    /^锘\u{6302}?/u,    // 锘字符及其变体
    /^锘[挎]?/,         // 锘字符后跟挎字符
    /^挎/,              // 单独的挎字符
  ];
  
  // 依次应用所有模式
  let cleaned = str;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // 移除可能的连续BOM
  cleaned = cleaned.replace(/^[\uFEFF\uFFFE\uEFBBBF\u0000]+/, '');
  
  // 清理结果
  cleaned = cleaned.trim();
  
  if (cleaned !== original) {
    console.log('BOM标记已清理:', {
      original: Array.from(original).map(c => c.charCodeAt(0)),
      cleaned: Array.from(cleaned).map(c => c.charCodeAt(0))
    });
  }
  
  return cleaned;
}

// 检测并修复编码问题
export const decodeContent = (buffer) => {
  console.log('原始buffer:', Array.from(buffer).slice(0, 20));

  // 检测是否有UTF-8 BOM
  const hasUTF8BOM = buffer.length >= 3 && 
                     buffer[0] === 0xEF && 
                     buffer[1] === 0xBB && 
                     buffer[2] === 0xBF;

  // 如果有BOM，跳过BOM字节
  const contentBuffer = hasUTF8BOM ? buffer.slice(3) : buffer;

  // 首先尝试UTF-8解码
  try {
    const decoder = new TextDecoder('utf-8');
    let content = decoder.decode(contentBuffer);
    console.log('UTF-8解码结果:', content.substring(0, 50));
    
    // 如果解码成功且内容看起来正常，直接返回
    if (!containsGarbledText(content)) {
      return content;
    }
  } catch (e) {
    console.warn('UTF-8解码失败:', e);
  }

  // 如果UTF-8解码失败或结果有问题，尝试GB18030
  try {
    const decoder = new TextDecoder('gb18030');
    let content = decoder.decode(contentBuffer);
    console.log('GB18030解码结果:', content.substring(0, 50));
    
    if (!containsGarbledText(content)) {
      return content;
    }
  } catch (e) {
    console.warn('GB18030解码失败:', e);
  }

  // 如果所有尝试都失败，返回UTF-8的结果
  console.warn('所有编码尝试失败，使用UTF-8作为后备方案');
  return new TextDecoder('utf-8').decode(contentBuffer);
};

// 检查是否包含乱码
export const containsGarbledText = (text) => {
  // 仅检查明显的乱码字符
  const hasGarbled = /[\ufffd]/.test(text) || // 替换字符
                     /[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/.test(text); // 控制字符
  
  console.log('乱码检测结果:', hasGarbled);
  return hasGarbled;
};

function parseDate(dateStr) {
  // 移除毫秒部分和多余空格
  dateStr = dateStr.trim().replace(/\.\d+$/, '');
  
  // 统一替换点号为横杠
  dateStr = dateStr.replace(/\./g, '-');
  
  // 处理单位数的月份和日期，确保是两位数
  dateStr = dateStr.replace(/\/(\d)\//, '/0$1/').replace(/\/(\d)\s/, '/0$1 ');
  if (dateStr.match(/\/\d{1}$/)) {
    dateStr = dateStr.replace(/\/(\d)$/, '/0$1');
  }
  
  // 尝试不同的日期格式
  const formats = [
    // 带时间的格式
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm',
    'YYYY/MM/DD HH:mm:ss',
    'YYYY/MM/DD HH:mm',
    'YYYY-M-D HH:mm:ss',   // 支持单位数的月份和日期
    'YYYY-M-D HH:mm',
    'YYYY/M/D HH:mm:ss',
    'YYYY/M/D HH:mm',
    // 仅日期格式
    'YYYY-MM-DD',
    'YYYY/MM/DD',
    'YYYY-M-D',
    'YYYY/M/D',
    'YYYYMMDD'
  ];

  let date = null;
  for (const format of formats) {
    const parsed = dayjs(dateStr, format);
    if (parsed.isValid()) {
      date = parsed;
      break;
    }
  }

  if (!date) {
    throw new Error('无效日期');
  }

  // 验证日期范围
  const minDate = dayjs('2000-01-01');
  const maxDate = dayjs().add(1, 'day'); // 允许当天和未来一天的数据
  
  if (date.isBefore(minDate) || date.isAfter(maxDate)) {
    throw new Error('日期超出合理范围');
  }

  // 如果日期字符串不包含时间部分，设置时间为00:00:00
  if (!dateStr.includes(':')) {
    date = date.hour(0).minute(0).second(0);
  }

  // 返回标准格式的时间字符串
  return date.format('YYYY-MM-DDTHH:mm:ss.SSS');
}

// 处理文件内容的函数
export const processFileContent = async (rows, recordsStore, childrenStore) => {
  try {
    if (rows.length < 1) {
      throw new Error('文件内容为空。请确保文件包含有效数据。')
    }

    // 对所有行进行清理
    rows = rows.map(line => line.trim()).filter(line => line.length > 0);
    console.log('清理后的行数:', rows.length);

    let startIndex = 0;
    let childName = '';

    // 检查第一行是否包含儿童姓名
    if (rows[0].includes('儿童姓名')) {
      try {
        const nameParts = rows[0].split(/[:\：]/);
        childName = nameParts[nameParts.length - 1]?.trim() || '';
        startIndex = 1;
        console.log('检测到儿童姓名:', childName);
      } catch (e) {
        console.warn('解析儿童姓名失败:', e);
      }
    }

    // 检查表头行
    if (rows[startIndex] && (rows[startIndex].includes('日期') || rows[startIndex].toLowerCase().includes('date'))) {
      startIndex++;
      console.log('检测到表头行，开始处理数据行');
    } else {
      throw new Error('文件格式错误：未找到表头行。表头行应包含"日期"字段。\n期望的表头格式：日期,身高(cm),体重(kg) 或 日期 身高(cm) 体重(kg)')
    }

    // 处理数据行
    const dataRows = rows.slice(startIndex);
    console.log('数据行数量:', dataRows.length);
    
    if (dataRows.length === 0) {
      throw new Error('文件中没有找到有效的数据行。\n请确保文件中包含实际的记录数据。')
    }

    const records = [];
    const errors = {
      dateErrors: [],
      heightErrors: [],
      weightErrors: [],
      formatErrors: []
    };

    dataRows.forEach((row, index) => {
      try {
        // 移除可能的引号
        const cleanRow = row.replace(/['"]/g, '').trim();
        if (!cleanRow) {
          errors.formatErrors.push(`第${index + startIndex + 1}行：空行`);
          return;
        }
        
        // 尝试不同的分隔方式
        let parts;
        if (cleanRow.includes('\t')) {
          parts = cleanRow.split('\t');
        } else if (cleanRow.includes(',')) {
          parts = cleanRow.split(',');
        } else {
          // 处理空格分隔的情况，需要特殊处理日期时间
          const matches = cleanRow.match(/^(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{1,2})\s+(\d+\.?\d*)\s+(\d+\.?\d*)?$/);
          if (matches) {
            parts = [matches[1], matches[2], matches[3]].filter(Boolean);
          } else {
            errors.formatErrors.push(`第${index + startIndex + 1}行：数据格式不正确 => ${cleanRow}\n期望格式：YYYY/MM/DD HH:mm 身高 体重`);
            return;
          }
        }
        
        parts = parts.map(item => item.trim());

        if (parts.length < 2) {
          errors.formatErrors.push(`第${index + startIndex + 1}行：数据不完整，至少需要日期和身高 => ${row}`);
          return;
        }

        const [dateStr, height, weight] = parts;

        // 验证日期
        let date;
        try {
          date = parseDate(dateStr);
        } catch (e) {
          if (e.message === '日期超出合理范围') {
            errors.dateErrors.push(`第${index + startIndex + 1}行：日期超出允许范围（2000年至今） => ${dateStr}`);
          } else {
            errors.dateErrors.push(`第${index + startIndex + 1}行：日期格式无效 => ${dateStr}\n支持的格式：YYYY-MM-DD HH:mm:ss、YYYY/M/D HH:mm、YYYY-MM-DD`);
          }
          return;
        }

        // 验证身高
        const heightNum = parseFloat(height);
        if (isNaN(heightNum) || heightNum <= 0 || heightNum > 250) {
          errors.heightErrors.push(`第${index + startIndex + 1}行：身高数值无效（应在0-250cm之间） => ${height}`);
          return;
        }

        // 验证体重（允许为空）
        let weightNum = null;
        if (weight && weight.trim() !== '') {
          weightNum = parseFloat(weight);
          if (isNaN(weightNum) || weightNum < 2 || weightNum > 150) {
            errors.weightErrors.push(`第${index + startIndex + 1}行：体重数值无效（应在2-150kg之间或留空） => ${weight}`);
            return;
          }
        }

        records.push({
          date,
          height: heightNum,
          weight: weightNum,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        errors.formatErrors.push(`第${index + startIndex + 1}行：${error.message}`);
      }
    });

    // 检查是否有错误
    const hasErrors = Object.values(errors).some(errArray => errArray.length > 0);
    if (hasErrors) {
      let errorMessage = '导入失败，请检查以下问题：\n\n';
      
      if (errors.formatErrors.length > 0) {
        errorMessage += '【格式错误】\n' + errors.formatErrors.join('\n') + '\n\n';
      }
      if (errors.dateErrors.length > 0) {
        errorMessage += '【日期错误】\n' + errors.dateErrors.join('\n') + '\n\n';
      }
      if (errors.heightErrors.length > 0) {
        errorMessage += '【身高错误】\n' + errors.heightErrors.join('\n') + '\n\n';
      }
      if (errors.weightErrors.length > 0) {
        errorMessage += '【体重错误】\n' + errors.weightErrors.join('\n') + '\n\n';
      }

      errorMessage += '\n正确的数据格式示例：\n';
      errorMessage += '2024/2/4 10:44 118.7 21\n';
      errorMessage += '2024-02-04 10:44:00,118.7,21\n';
      errorMessage += '2024-02-04\t118.7\t21';
      
      throw new Error(errorMessage);
    }

    if (records.length === 0) {
      throw new Error('没有找到有效的记录数据。\n请检查文件格式是否正确，并确保包含有效的生长记录数据。');
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
    const headerRow = `儿童姓名：${childName}`
    const columnHeaders = '日期,身高(cm),体重(kg)'
    const rows = Array.from(uniqueRecords.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(record => {
        // 确保日期格式统一
        const date = dayjs(record.date)
        return [
          date.format('YYYY-MM-DD HH:mm:ss'),
          record.height.toFixed(1),
          record.weight ? record.weight.toFixed(2) : ''
        ]
      })
    
    const csvContent = [
      headerRow,
      columnHeaders,
      ...rows.map(row => row.join(','))
    ].join('\n')

    const fileName = `${childName}_生长记录_${formatDateForFileName(new Date())}.csv`

    if (Capacitor.getPlatform() === 'android') {
      // 添加 UTF-8 BOM
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const textEncoder = new TextEncoder();
      const contentArray = textEncoder.encode(csvContent);
      
      // 合并BOM和内容
      const finalContent = new Uint8Array(bom.length + contentArray.length);
      finalContent.set(bom);
      finalContent.set(contentArray, bom.length);

      // 将 Uint8Array 转换为 base64 字符串
      let base64Content = '';
      for (let i = 0; i < finalContent.length; i++) {
        base64Content += String.fromCharCode(finalContent[i]);
      }
      base64Content = btoa(base64Content);

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
            
            // 分割行并过滤空行
            const lines = content.split('\n').filter(line => line.trim());
            console.log('分割后的行数:', lines.length);
            
            await processCallback(lines);
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