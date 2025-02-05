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

import { exportToCsv, importCsv } from '../recordsExportImport'
import { Capacitor } from '@capacitor/core'
import { ElMessage } from 'element-plus'
import { describe, it, expect, afterEach, beforeEach } from 'vitest'

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

describe('recordsExportImport.js', () => {
  beforeEach(() => {
    // 模拟平台为 Android
    vi.spyOn(Capacitor, 'getPlatform').mockImplementation(() => 'android')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('exportToCsv', () => {
    it('当 records 不为空时，应该成功导出 CSV 并调用 saveFile', async () => {
      const sampleRecords = [
        {
          date: new Date('2023-01-01T00:00:00Z').toISOString(),
          height: 100,
          weight: 25,
        },
        {
          date: new Date('2023-01-02T00:00:00Z').toISOString(),
          height: 101.5,
          weight: null,
        },
      ]
      const childName = '测试儿童'

      await exportToCsv(sampleRecords, childName, mockFilePlugin)

      expect(mockFilePlugin.saveFile).toHaveBeenCalled()
      expect(ElMessage.success).toHaveBeenCalledWith('文件保存成功')
    })

    it('当 records 为空时，应该提示没有可导出的记录，并不执行文件保存', async () => {
      await exportToCsv([], '儿童甲', mockFilePlugin)
      expect(mockFilePlugin.saveFile).not.toHaveBeenCalled()
      expect(ElMessage.warning).toHaveBeenCalledWith('没有可导出的记录')
    })
  })

  describe('importCsv', () => {
    it('应能正常执行并调用 pickFile、readFile', async () => {
      const processCallback = vi.fn(() => Promise.resolve())

      await importCsv(mockFilePlugin, processCallback)

      expect(mockFilePlugin.pickFile).toHaveBeenCalled()
      expect(mockFilePlugin.readFile).toHaveBeenCalled()
      expect(processCallback).toHaveBeenCalled()
      expect(ElMessage.error).not.toHaveBeenCalled()
    })

    it('如果未选取文件，应该直接返回，不报错', async () => {
      mockFilePlugin.pickFile.mockResolvedValueOnce(undefined)
      const processCallback = vi.fn()

      await expect(importCsv(mockFilePlugin, processCallback)).resolves.not.toThrow()
      expect(processCallback).not.toHaveBeenCalled()
    })
  })
}) 