import { ElMessage, ElMessageBox } from 'element-plus'
import { Capacitor } from '@capacitor/core'
import { formatDate, formatDateForFileName, getLocalISOString } from './dateUtils'

// 处理文件内容的函数
export const processFileContent = async (rows, recordsStore, childrenStore) => {
  try {
    if (rows.length < 2) {
      throw new Error('文件格式错误：文件内容不完整')
    }
    
    // 验证标题行
    const titleRow = rows[0].trim()
    const validTitles = [
      '日期,身高(cm),体重(kg)',
      '日期\t身高(cm)\t体重(kg)',
      '日期, 身高(cm), 体重(kg)',
      '日期 身高(cm) 体重(kg)'
    ]
    
    const normalizedTitleRow = titleRow.split(/[\t,]/).map(item => item.trim()).join(',')
    
    if (!validTitles.includes(normalizedTitleRow)) {
      throw new Error('文件格式错误：第一行必须是标准标题')
    }

    // 处理数据行
    const dataRows = rows.slice(1).filter(row => row.trim())
    const records = []
    const errors = []

    dataRows.forEach((row, index) => {
      try {
        const [dateStr, height, weight] = row.split(/[\t,]/).map(item => item.trim())
        
        // 验证日期
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          throw new Error(`第${index + 2}行：日期格式无效`)
        }

        // 验证身高
        const heightNum = parseFloat(height)
        if (isNaN(heightNum) || heightNum <= 0 || heightNum > 250) {
          throw new Error(`第${index + 2}行：身高数值无效`)
        }

        // 验证体重
        const weightNum = parseFloat(weight)
        if (isNaN(weightNum) || weightNum <= 0 || weightNum > 150) {
          throw new Error(`第${index + 2}行：体重数值无效`)
        }

        records.push({
          date: getLocalISOString(date),
          height: heightNum,
          weight: weightNum,
          createdAt: new Date().toISOString()
        })
      } catch (error) {
        errors.push(error.message)
      }
    })

    if (errors.length > 0) {
      throw new Error('数据格式错误：\n' + errors.join('\n'))
    }

    return records
  } catch (error) {
    console.error('处理文件内容错误:', error)
    throw error
  }
}

// 导出CSV文件
export const exportToCsv = async (records, childName, FilePlugin) => {
  try {
    if (!records.length) {
      ElMessage.warning('没有可导出的记录')
      return
    }

    // 准备CSV内容
    const rows = records.map(record => {
      const formattedDate = formatDate(record.date, 'YYYY-MM-DD HH:mm')
      return [
        formattedDate,
        record.height.toFixed(1),
        record.weight.toFixed(2)
      ]
    })
    
    const csvContent = [
      '日期,身高(cm),体重(kg)',
      ...rows.map(row => row.join(','))
    ].join('\n')

    const fileName = `${childName}_生长记录_${formatDateForFileName(new Date())}.csv`

    if (Capacitor.getPlatform() === 'android') {
      const result = await FilePlugin.saveFile({
        content: csvContent,
        fileName: fileName,
        childName: childName,
        mimeType: 'text/csv'
      })

      console.log('文件保存结果:', result)
      ElMessage.success('文件保存成功')
    } else {
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      ElMessage.success('文件导出成功')
    }
  } catch (error) {
    console.error('导出CSV时出错:', error)
    throw error
  }
}

// 导入CSV文件
export const importCsv = async (FilePlugin, processCallback) => {
  try {
    if (Capacitor.getPlatform() === 'android') {
      const result = await FilePlugin.pickFile({
        type: 'text/csv',
        title: '选择CSV文件'
      })

      if (!result || !result.path) {
        return
      }

      const fileContent = await FilePlugin.readFile({
        path: result.path,
        encoding: 'utf8'
      })

      if (!fileContent || !fileContent.content) {
        throw new Error('无法读取文件内容')
      }

      await processCallback(fileContent.content.split('\n'))
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.csv'
      input.style.display = 'none'
      document.body.appendChild(input)

      input.onchange = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (e) => {
          const content = e.target.result
          await processCallback(content.split('\n'))
        }
        reader.readAsText(file)
      }

      input.click()
      document.body.removeChild(input)
    }
  } catch (error) {
    console.error('导入CSV时出错:', error)
    throw error
  }
} 