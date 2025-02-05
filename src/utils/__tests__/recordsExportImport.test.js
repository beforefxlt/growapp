// 在所有导入之前设置 mock
import { vi } from 'vitest'

// Mock dateUtils
vi.mock('../dateUtils', () => ({
  formatDate: vi.fn(() => '2023-01-01 08:00'),
  formatDateForFileName: vi.fn(() => '20230101_0800'),
  getLocalISOString: vi.fn((date) => date.toISOString()),
  getDateTimeHourKey: vi.fn((date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}`
  })
}))

// Mock element-plus
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

import { exportToCsv, importCsv, processFileContent, decodeContent, removeBOM, containsGarbledText } from '../recordsExportImport'
import { Capacitor } from '@capacitor/core'
import { ElMessage } from 'element-plus'
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import dayjs from 'dayjs'

/**
 * 用于测试时的 FilePlugin 模拟
 */
const mockFilePlugin = {
  saveFile: vi.fn(async ({ content, fileName }) => {
    return { success: true, fileName }
  }),
  pickFile: vi.fn(async () => {
    return { path: '/fake/path/to.csv' }
  }),
  readFile: vi.fn(async ({ path }) => {
    if (path) {
      return { content: 'ZmFrZSBiYXNlNjQgY29udGVudA==' }
    }
    return { content: '' }
  }),
}

describe('记录导出导入测试', () => {
  // 模拟数据
  const mockRecords = [
    {
      date: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS'),
      height: 120.5,
      weight: 25.6,
      createdAt: dayjs().toISOString()
    },
    {
      date: dayjs().subtract(1, 'day').format('YYYY-MM-DDTHH:mm:ss.SSS'),
      height: 120.3,
      weight: 25.5,
      createdAt: dayjs().subtract(1, 'day').toISOString()
    }
  ]

  const childName = '测试儿童'

  // 模拟 stores
  const mockRecordsStore = {}
  const mockChildrenStore = {
    children: [
      { id: 1, name: '测试儿童' }
    ],
    setCurrentChild: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('导出CSV测试', () => {
    it('应该正确导出CSV格式的数据', async () => {
      // 模拟 Android 平台
      vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')

      // 捕获导出的内容
      let exportedContent = null
      mockFilePlugin.saveFile.mockImplementation(({ content }) => {
        exportedContent = content
        return Promise.resolve({ uri: 'test-uri' })
      })

      // 执行导出
      await exportToCsv(mockRecords, childName, mockFilePlugin)

      // 验证调用
      expect(mockFilePlugin.saveFile).toHaveBeenCalled()
      expect(exportedContent).toBeTruthy()

      // 解码导出的内容
      const decodedContent = atob(exportedContent)
      const buffer = new Uint8Array(decodedContent.length)
      for (let i = 0; i < decodedContent.length; i++) {
        buffer[i] = decodedContent.charCodeAt(i)
      }

      // 检查 BOM
      expect(buffer[0]).toBe(0xEF)
      expect(buffer[1]).toBe(0xBB)
      expect(buffer[2]).toBe(0xBF)

      // 解码内容
      const content = decodeContent(buffer)
      const lines = content.split('\n')

      // 验证文件结构
      expect(lines[0]).toBe(`儿童姓名：${childName}`)
      expect(lines[1]).toBe('日期,身高(cm),体重(kg)')
      expect(lines.length).toBe(4) // 标题行 + 表头行 + 2条记录

      // 验证数据行
      const dataLines = lines.slice(2)
      const firstRecord = dataLines[0].split(',')
      expect(dayjs(firstRecord[0], 'YYYY-MM-DD HH:mm:ss').isValid()).toBe(true)
      expect(parseFloat(firstRecord[1])).toBe(mockRecords[0].height)
      expect(parseFloat(firstRecord[2])).toBe(mockRecords[0].weight)
    })
  })

  describe('导入CSV测试', () => {
    it('应该能够正确导入导出的CSV文件', async () => {
      // 首先导出文件
      vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
      let exportedContent = null
      mockFilePlugin.saveFile.mockImplementation(({ content }) => {
        exportedContent = content
        return Promise.resolve({ uri: 'test-uri' })
      })

      await exportToCsv(mockRecords, childName, mockFilePlugin)

      // 模拟文件选择和读取
      mockFilePlugin.pickFile.mockResolvedValue({ path: 'test-path' })
      mockFilePlugin.readFile.mockImplementation(() => {
        return Promise.resolve({ content: exportedContent })
      })

      // 执行导入
      let importedRecords = null
      await importCsv(mockFilePlugin, async (lines) => {
        importedRecords = await processFileContent(lines, mockRecordsStore, mockChildrenStore)
      })

      // 验证导入的数据
      expect(importedRecords).toBeTruthy()
      expect(importedRecords.length).toBe(mockRecords.length)

      // 验证每条记录的数据
      importedRecords.forEach((record, index) => {
        const originalDate = dayjs(mockRecords[index].date)
        const importedDate = dayjs(record.date)
        expect(importedDate.format('YYYY-MM-DD HH:mm')).toBe(originalDate.format('YYYY-MM-DD HH:mm'))
        expect(record.height).toBe(mockRecords[index].height)
        expect(record.weight).toBe(mockRecords[index].weight)
      })

      // 验证儿童信息处理
      expect(mockChildrenStore.setCurrentChild).toHaveBeenCalledWith(1)
    })

    it('应该正确处理不同的日期格式', async () => {
      const testData = [
        '儿童姓名：测试儿童',
        '日期,身高(cm),体重(kg)',
        '2024-03-15 10:30:00,120.5,25.6',
        '2024/03/14 15:45,120.3,25.5',
        '2024-03-13,120.1,25.4'
      ].join('\n')

      const records = await processFileContent(testData.split('\n'), mockRecordsStore, mockChildrenStore)
      
      expect(records.length).toBe(3)
      expect(dayjs(records[0].date).format('YYYY-MM-DD HH:mm:ss')).toBe('2024-03-15 10:30:00')
      expect(dayjs(records[1].date).format('YYYY-MM-DD HH:mm:ss')).toBe('2024-03-14 15:45:00')
      expect(dayjs(records[2].date).format('YYYY-MM-DD HH:mm:ss')).toBe('2024-03-13 00:00:00')
    })

    it('应该正确处理带BOM的UTF-8文件', async () => {
      // 创建带BOM的测试数据
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
      const content = '儿童姓名：测试儿童\n日期,身高(cm),体重(kg)\n2024-03-15 10:30:00,120.5,25.6'
      const encoder = new TextEncoder()
      const contentArray = encoder.encode(content)
      const buffer = new Uint8Array(bom.length + contentArray.length)
      buffer.set(bom)
      buffer.set(contentArray, bom.length)

      const decodedContent = decodeContent(buffer)
      const records = await processFileContent(decodedContent.split('\n'), mockRecordsStore, mockChildrenStore)

      expect(records.length).toBe(1)
      expect(records[0].height).toBe(120.5)
      expect(records[0].weight).toBe(25.6)
    })

    it('应该正确处理特殊字符和空格', async () => {
      const testData = [
        '儿童姓名：测试儿童 ',  // 带空格
        ' 日期, 身高(cm) ,体重(kg)',  // 不规则空格
        ' 2024-03-15 10:30:00 , 120.5 , 25.6 ',  // 带空格的数据
        '2024-03-14 15:45:00,120.3,',  // 缺少体重
      ].join('\n')

      const records = await processFileContent(testData.split('\n'), mockRecordsStore, mockChildrenStore)
      
      expect(records.length).toBe(2)
      expect(records[0].height).toBe(120.5)
      expect(records[0].weight).toBe(25.6)
      expect(records[1].height).toBe(120.3)
      expect(records[1].weight).toBe(null)
    })

    it('应该正确处理复制粘贴的CSV数据', async () => {
      const testData = [
        '日期 身高(cm) 体重(kg)',
        '2025/2/4 10:44 118.7 21',
        '2024/7/30 0:00 113.7 19',
        '2024/4/22 0:00 110.9 18.6',
        '2024/2/14 0:00 109.9 18.4',
        '2024/2/2 0:00 109.9 18.4',
        '2024/1/27 0:00 108.7 18.7'
      ].join('\n')

      const records = await processFileContent(testData.split('\n'), mockRecordsStore, mockChildrenStore)
      
      expect(records.length).toBe(6)
      
      // 验证第一条记录
      expect(dayjs(records[0].date).format('YYYY/M/D HH:mm')).toBe('2025/2/4 10:44')
      expect(records[0].height).toBe(118.7)
      expect(records[0].weight).toBe(21)
      
      // 验证最后一条记录
      expect(dayjs(records[5].date).format('YYYY/M/D HH:mm')).toBe('2024/1/27 00:00')
      expect(records[5].height).toBe(108.7)
      expect(records[5].weight).toBe(18.7)
    })
  })

  describe('数据验证测试', () => {
    it('应该正确处理并报告无效的日期格式', async () => {
      const testData = [
        '儿童姓名：测试儿童',
        '日期,身高(cm),体重(kg)',
        '2024-13-45,120.5,25.6',  // 无效月份和日期
        '2024/02/30,120.3,25.5',  // 无效日期
        '1999-12-31,120.1,25.4',  // 超出范围的日期
        'abc,120.0,25.3'          // 完全无效的日期
      ].join('\n');

      try {
        await processFileContent(testData.split('\n'), mockRecordsStore, mockChildrenStore);
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('【日期错误】');
        expect(error.message).toContain('日期格式无效');
        expect(error.message).toContain('日期超出允许范围');
      }
    });

    it('应该正确处理并报告无效的身高数值', async () => {
      const testData = [
        '日期,身高(cm),体重(kg)',
        '2024-03-15 10:30:00,0,25.6',    // 身高为0
        '2024-03-14 15:45,-120.3,25.5',  // 负数身高
        '2024-03-13,300.1,25.4',         // 超出范围的身高
        '2024-03-12,abc,25.3'            // 非数字身高
      ].join('\n');

      try {
        await processFileContent(testData.split('\n'), mockRecordsStore, mockChildrenStore);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('【身高错误】');
        expect(error.message).toContain('身高数值无效（应在0-250cm之间）');
      }
    });

    it('应该正确处理并报告无效的体重数值', async () => {
      const testData = [
        '日期,身高(cm),体重(kg)',
        '2024-03-15 10:30:00,120.5,-25.6',  // 负数体重
        '2024-03-14 15:45,120.3,0',         // 体重为0
        '2024-03-13,120.1,200.4',           // 超出范围的体重
        '2024-03-12,120.0,abc'              // 非数字体重
      ].join('\n');

      try {
        await processFileContent(testData.split('\n'), mockRecordsStore, mockChildrenStore);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('【体重错误】');
        expect(error.message).toContain('体重数值无效（应在2-150kg之间或留空）');
      }
    });

    it('应该正确处理空文件和无效格式', async () => {
      // 测试空文件
      try {
        await processFileContent([], mockRecordsStore, mockChildrenStore);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('文件内容为空');
      }

      // 测试缺少表头
      try {
        await processFileContent(['2024-03-15,120.5,25.6'], mockRecordsStore, mockChildrenStore);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('未找到表头行');
      }

      // 测试数据不完整
      const invalidData = [
        '日期,身高(cm),体重(kg)',
        '2024-03-15',  // 缺少身高和体重
        '2024-03-14,120.3',  // 缺少体重（这种情况应该是允许的）
        ',120.1,25.4',  // 缺少日期
      ].join('\n');

      try {
        await processFileContent(invalidData.split('\n'), mockRecordsStore, mockChildrenStore);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('【格式错误】');
        expect(error.message).toContain('数据格式不正确');
      }
    });

    it('应该正确处理不同的分隔符', async () => {
      const testData = [
        '日期 身高(cm) 体重(kg)',
        '2024/3/15 10:30 120.5 25.6',    // 空格分隔
        '2024-03-14,120.3,25.5',         // 逗号分隔
        '2024-03-13\t120.1\t25.4'        // Tab分隔
      ].join('\n');

      const records = await processFileContent(testData.split('\n'), mockRecordsStore, mockChildrenStore);
      expect(records.length).toBe(3);
      expect(records[0].height).toBe(120.5);
      expect(records[1].height).toBe(120.3);
      expect(records[2].height).toBe(120.1);
    });

    it('应该正确处理编码和BOM', async () => {
      // 创建带BOM的测试数据
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const content = '日期,身高(cm),体重(kg)\n2024-03-15,120.5,25.6';
      const encoder = new TextEncoder();
      const contentArray = encoder.encode(content);
      const buffer = new Uint8Array(bom.length + contentArray.length);
      buffer.set(bom);
      buffer.set(contentArray, bom.length);

      const decodedContent = decodeContent(buffer);
      expect(decodedContent).not.toContain('\ufeff'); // 不应包含BOM字符
      
      const records = await processFileContent(decodedContent.split('\n'), mockRecordsStore, mockChildrenStore);
      expect(records.length).toBe(1);
      expect(records[0].height).toBe(120.5);
    });

    it('应该正确处理儿童信息', async () => {
      const testData = [
        '儿童姓名：测试儿童',
        '日期,身高(cm),体重(kg)',
        '2024-03-15,120.5,25.6'
      ].join('\n');

      const records = await processFileContent(testData.split('\n'), mockRecordsStore, mockChildrenStore);
      expect(records.length).toBe(1);
      expect(mockChildrenStore.setCurrentChild).toHaveBeenCalledWith(1);
    });
  });

  describe('导出格式测试', () => {
    it('应该正确格式化导出的CSV内容', async () => {
      vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

      let exportedContent = null;
      mockFilePlugin.saveFile.mockImplementation(({ content }) => {
        exportedContent = content;
        return Promise.resolve({ uri: 'test-uri' });
      });

      const testRecords = [
        {
          date: '2024-03-15T10:30:00.000Z',
          height: 120.5,
          weight: 25.6,
          createdAt: '2024-03-15T10:30:00.000Z'
        }
      ];

      await exportToCsv(testRecords, '测试儿童', mockFilePlugin);

      // 解码导出的内容
      const decodedContent = atob(exportedContent);
      const buffer = new Uint8Array(decodedContent.length);
      for (let i = 0; i < decodedContent.length; i++) {
        buffer[i] = decodedContent.charCodeAt(i);
      }

      // 使用 decodeContent 函数来正确解码内容
      const content = decodeContent(buffer);
      const lines = content.split('\n');

      // 验证内容，不检查 BOM
      expect(lines[0].replace(/^\ufeff/, '')).toBe('儿童姓名：测试儿童');
      expect(lines[1]).toBe('日期,身高(cm),体重(kg)');
      expect(lines[2]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},120.5,25.60$/);
    });
  });
}) 