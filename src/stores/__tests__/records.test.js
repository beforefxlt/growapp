import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecordsStore } from '../records'
import { useChildrenStore } from '../children'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    removeItem: vi.fn(key => {
      delete store[key]
    })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Records Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  it('should add a record', () => {
    const childrenStore = useChildrenStore()
    const recordsStore = useRecordsStore()

    // 添加一个儿童
    const child = childrenStore.addChild({
      name: 'Test Child',
      birthDate: '2020-01-01'
    })

    // 添加记录
    const record = {
      date: '2023-01-01T08:00:00.000Z',
      height: 100.5,
      weight: 15.6
    }
    const newRecord = recordsStore.addRecord(child.id, record)

    // 验证记录是否被正确添加
    const childRecords = recordsStore.getChildRecords(child.id)
    expect(childRecords).toHaveLength(1)
    expect(childRecords[0]).toMatchObject({
      ...record,
      childId: child.id
    })
    expect(newRecord.id).toBeDefined()
    expect(newRecord.createdAt).toBeDefined()
  })

  it('should update a record', () => {
    const childrenStore = useChildrenStore()
    const recordsStore = useRecordsStore()

    // 添加一个儿童
    const child = childrenStore.addChild({
      name: 'Test Child',
      birthDate: '2020-01-01'
    })

    // 添加记录
    const record = {
      date: '2023-01-01T08:00:00.000Z',
      height: 100.5,
      weight: 15.6
    }
    const newRecord = recordsStore.addRecord(child.id, record)

    // 更新记录
    const updatedData = {
      height: 101.0,
      weight: 16.0,
      date: record.date // 保持原有日期
    }
    const updatedRecord = recordsStore.updateRecord(child.id, newRecord.id, updatedData)

    // 验证更新是否成功
    expect(updatedRecord).toBeDefined()
    expect(updatedRecord).toMatchObject({
      ...record,
      ...updatedData,
      childId: child.id
    })
    expect(updatedRecord.updatedAt).toBeDefined()
  })

  it('should delete a record', () => {
    const childrenStore = useChildrenStore()
    const recordsStore = useRecordsStore()

    // 添加一个儿童
    const child = childrenStore.addChild({
      name: 'Test Child',
      birthDate: '2020-01-01'
    })

    // 添加记录
    const record = {
      date: '2023-01-01T08:00:00.000Z',
      height: 100.5,
      weight: 15.6
    }
    const newRecord = recordsStore.addRecord(child.id, record)

    // 删除记录
    const deletedRecord = recordsStore.deleteRecord(child.id, newRecord.id)

    // 验证删除是否成功
    expect(deletedRecord).toBeDefined()
    expect(deletedRecord).toMatchObject({
      ...record,
      childId: child.id
    })
    expect(recordsStore.getChildRecords(child.id)).toHaveLength(0)
  })

  it('should load and save records to localStorage', async () => {
    const childrenStore = useChildrenStore()
    const recordsStore = useRecordsStore()

    // 添加一个儿童
    const child = childrenStore.addChild({
      name: 'Test Child',
      birthDate: '2020-01-01'
    })

    // 添加记录
    const record = {
      date: '2023-01-01T08:00:00.000Z',
      height: 100.5,
      weight: 15.6
    }
    const newRecord = recordsStore.addRecord(child.id, record)

    // 创建新的 store 实例来测试加载
    const newRecordsStore = useRecordsStore()
    await newRecordsStore.loadFromLocal()
    const loadedRecords = newRecordsStore.getChildRecords(child.id)
    expect(loadedRecords).toHaveLength(1)
    expect(loadedRecords[0]).toMatchObject({
      ...record,
      childId: child.id
    })
  })

  it('should sort records by date', () => {
    const childrenStore = useChildrenStore()
    const recordsStore = useRecordsStore()

    // 添加一个儿童
    const child = childrenStore.addChild({
      name: 'Test Child',
      birthDate: '2020-01-01'
    })

    // 添加三条记录，日期不同
    const dates = [
      new Date('2023-01-01T08:00:00.000Z'),
      new Date('2023-02-01T08:00:00.000Z'),
      new Date('2023-03-01T08:00:00.000Z')
    ]

    dates.forEach((date, index) => {
      recordsStore.addRecord(child.id, {
        date: date.toISOString(),
        height: 100 + index,
        weight: 15 + index
      })
    })

    // 验证记录是否按日期排序
    const sortedRecords = recordsStore.getSortedRecords(child.id)
    expect(sortedRecords).toHaveLength(3)
    expect(new Date(sortedRecords[0].date)).toEqual(dates[2])
    expect(new Date(sortedRecords[1].date)).toEqual(dates[1])
    expect(new Date(sortedRecords[2].date)).toEqual(dates[0])
  })

  it('should validate record data', () => {
    const childrenStore = useChildrenStore()
    const recordsStore = useRecordsStore()

    // 添加一个儿童
    const child = childrenStore.addChild({
      name: 'Test Child',
      birthDate: '2020-01-01'
    })

    // 测试无效的身高
    expect(() => {
      recordsStore.addRecord(child.id, {
        date: '2023-01-01T08:00:00.000Z',
        height: 20, // 太低
        weight: 15.6
      })
    }).toThrow('身高必须在 30-200 厘米之间')

    // 测试无效的体重
    expect(() => {
      recordsStore.addRecord(child.id, {
        date: '2023-01-01T08:00:00.000Z',
        height: 100.5,
        weight: 1.5 // 太轻
      })
    }).toThrow('体重必须在 2-100 千克之间')

    // 测试缺少日期
    expect(() => {
      recordsStore.addRecord(child.id, {
        height: 100.5,
        weight: 15.6
      })
    }).toThrow('日期是必填项')

    // 测试无效的记录对象
    expect(() => {
      recordsStore.addRecord(child.id, null)
    }).toThrow('记录数据无效')
  })
}) 