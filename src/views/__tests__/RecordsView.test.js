import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import RecordsView from '../RecordsView.vue'
import { useChildrenStore } from '../../stores/children'
import { useRecordsStore } from '../../stores/records'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getCurrentLocalISOString } from '../../utils/dateUtils'
import { nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

// Mock vue-router
const mockRouter = {
  push: vi.fn(),
  currentRoute: {
    value: { path: '/records' }
  }
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  createRouter: vi.fn(),
  createWebHistory: vi.fn()
}))

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web'
  },
  registerPlugin: () => ({})
}))

// Mock element-plus
vi.mock('element-plus', () => ({
  ElMessageBox: {
    confirm: vi.fn().mockResolvedValue(true)
  },
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

const createWrapper = async () => {
  const pinia = createPinia()
  const router = createRouter({
    history: createWebHistory(),
    routes: []
  })
  
  const mockConfirm = vi.fn()
  vi.spyOn(ElMessageBox, 'confirm').mockImplementation(mockConfirm)
  mockConfirm.mockResolvedValue(true)
  
  const wrapper = mount(RecordsView, {
    global: {
      plugins: [pinia, router],
      stubs: {
        'el-table': true,
        'el-table-column': true,
        'el-dialog': true,
        'el-form': true,
        'el-form-item': true,
        'el-input': true,
        'el-button': true,
        'el-date-picker': true
      }
    }
  })
  
  const childrenStore = useChildrenStore()
  const recordsStore = useRecordsStore()
  
  await childrenStore.addChild({
    name: '测试儿童',
    gender: 'male',
    birthDate: '2020-01-01'
  })
  
  const testRecord = {
    date: '2024-03-15T00:00:00',
    height: 120.5,
    weight: 25.6
  }
  await recordsStore.addRecord(childrenStore.currentChildId, testRecord)
  
  return {
    wrapper,
    mockConfirm,
    childrenStore,
    recordsStore,
    testRecord
  }
}

describe('RecordsView.vue', () => {
  let wrapper
  let childrenStore
  let recordsStore
  let pinia

  beforeEach(async () => {
    vi.useFakeTimers()
    pinia = createPinia()
    setActivePinia(pinia)
    
    childrenStore = useChildrenStore()
    recordsStore = useRecordsStore()
    childrenStore.isLoaded = true
    
    const child = {
      name: '测试儿童',
      gender: 'male',
      birthDate: '2020-01-01'
    }
    
    const newChild = await childrenStore.addChild(child)
    await childrenStore.setCurrentChild(newChild.id)
    await nextTick()

    wrapper = mount(RecordsView, {
      global: {
        plugins: [pinia],
        stubs: {
          'el-button': true,
          'el-dialog': {
            template: '<div><slot /><slot name="footer" /></div>'
          },
          'el-form': {
            template: '<form><slot /></form>'
          },
          'el-form-item': {
            template: '<div><slot /></div>'
          },
          'el-input-number': true,
          'el-date-picker': true,
          'el-table': true,
          'el-table-column': true,
          'el-empty': true,
          'el-icon': true
        },
        mocks: {
          $router: mockRouter
        }
      }
    })
    
    await nextTick()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('记录交互测试', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('点击行应该触发编辑对话框', async () => {
      // 添加一条测试记录
      const record = {
        date: '2024-03-15T00:00:00',
        height: 120.5,
        weight: 25.6
      }
      await recordsStore.addRecord(childrenStore.currentChildId, record)
      await nextTick()

      // 触发行点击
      await wrapper.vm.handleRowClick(record)
      await nextTick()

      // 验证编辑对话框是否打开
      expect(wrapper.vm.showAddDialog).toBe(true)
      expect(wrapper.vm.isEditing).toBe(true)
      expect(wrapper.vm.form.height).toBe(120.5)
      expect(wrapper.vm.form.weight).toBe(25.6)
    })

    test('长按应该触发删除确认', async () => {
      const { wrapper, mockConfirm } = await createWrapper()
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        touches: [{
          clientX: 0,
          clientY: 0
        }]
      }
      
      const testRecord = {
        id: '1',
        date: '2024-03-15T00:00:00',
        height: 120.5,
        weight: 25.6,
        childId: '1'
      }
      
      wrapper.vm.handleRowTouchStart(testRecord, mockEvent)
      await vi.advanceTimersByTime(2000) // 等待2秒
      
      expect(mockConfirm).toHaveBeenCalledWith(
        '确定要删除这条记录吗？',
        '确认删除',
        expect.any(Object)
      )
    })

    test('触摸移动应该取消长按', async () => {
      const { wrapper, mockConfirm } = await createWrapper()
      const mockStartEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        touches: [{
          clientX: 0,
          clientY: 0
        }]
      }
      
      const mockMoveEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        touches: [{
          clientX: 10,
          clientY: 10
        }]
      }
      
      const testRecord = {
        id: '1',
        date: '2024-03-15T00:00:00',
        height: 120.5,
        weight: 25.6,
        childId: '1'
      }
      
      wrapper.vm.handleRowTouchStart(testRecord, mockStartEvent)
      wrapper.vm.handleRowTouchMove(mockMoveEvent)
      await vi.advanceTimersByTime(2000) // 等待2秒
      
      expect(mockConfirm).not.toHaveBeenCalled()
    })
  })

  describe('添加记录功能测试', () => {
    it('应该能够添加只有身高的记录（体重为空）', async () => {
      await wrapper.vm.openAddDialog()
      await nextTick()

      wrapper.vm.form = {
        date: '2024-03-15T00:00:00',
        height: 120.5,
        weight: null
      }
      await nextTick()

      await wrapper.vm.saveRecord()
      await nextTick()

      const records = recordsStore.getChildRecords(childrenStore.currentChildId)
      expect(records.length).toBe(1)
      expect(records[0].height).toBe(120.5)
      expect(records[0].weight).toBeNull()
    })

    it('不应该允许添加没有身高的记录', async () => {
      await wrapper.vm.openAddDialog()
      await nextTick()

      wrapper.vm.form = {
        date: '2024-03-15T00:00:00',
        height: null,
        weight: 25.6
      }
      await nextTick()

      await wrapper.vm.saveRecord()
      await nextTick()

      const records = recordsStore.getChildRecords(childrenStore.currentChildId)
      expect(records.length).toBe(0)
      expect(ElMessage.warning).toHaveBeenCalledWith('请输入身高')
    })
  })

  describe('编辑记录功能测试', () => {
    it('应该能够编辑记录并清除体重', async () => {
      const record = {
        date: '2024-03-15T00:00:00',
        height: 120.5,
        weight: 25.6
      }
      const addedRecord = await recordsStore.addRecord(childrenStore.currentChildId, record)
      await nextTick()

      await wrapper.vm.editRecord(addedRecord)
      await nextTick()

      wrapper.vm.form = {
        date: addedRecord.date,
        height: addedRecord.height,
        weight: null
      }
      await nextTick()

      await wrapper.vm.saveRecord()
      await nextTick()

      const updatedRecords = recordsStore.getChildRecords(childrenStore.currentChildId)
      expect(updatedRecords.length).toBe(1)
      expect(updatedRecords[0].height).toBe(120.5)
      expect(updatedRecords[0].weight).toBeNull()
    })
  })
}) 