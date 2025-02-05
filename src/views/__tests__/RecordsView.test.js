import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import RecordsView from '../RecordsView.vue'
import { useChildrenStore } from '../../stores/children'
import { useRecordsStore } from '../../stores/records'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getCurrentLocalISOString } from '../../utils/dateUtils'
import { nextTick } from 'vue'
import { useRouter, createRouter, createWebHistory } from 'vue-router'

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
    confirm: vi.fn()
  },
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

describe('RecordsView.vue', () => {
  let wrapper
  let childrenStore
  let recordsStore
  let pinia

  beforeEach(async () => {
    // 创建新的 pinia 实例
    pinia = createPinia()
    setActivePinia(pinia)
    
    // 初始化 stores
    childrenStore = useChildrenStore()
    recordsStore = useRecordsStore()

    // 确保 store 已加载
    childrenStore.isLoaded = true
    
    // 添加测试儿童
    const child = {
      name: '测试儿童',
      gender: 'male',
      birthDate: '2020-01-01'
    }
    
    // 添加儿童并等待更新
    const newChild = await childrenStore.addChild(child)
    await nextTick()
    
    // 设置当前儿童
    await childrenStore.setCurrentChild(newChild.id)
    await nextTick()

    // 挂载组件
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
          'el-icon': true,
          'Plus': true,
          'Edit': true,
          'Delete': true,
          'Download': true,
          'Upload': true,
          'ArrowRight': true
        },
        mocks: {
          $router: mockRouter
        }
      }
    })
    
    await nextTick()
  })

  describe('添加记录功能测试', () => {
    it('应该能够添加只有身高的记录（体重为空）', async () => {
      // 确保对话框显示
      await wrapper.vm.openAddDialog()
      await nextTick()

      // 设置表单数据
      wrapper.vm.form = {
        date: '2024-03-15T00:00:00',
        height: 120.5,
        weight: null
      }
      await nextTick()

      // 保存记录
      await wrapper.vm.saveRecord()
      await nextTick()

      // 验证记录是否正确保存
      const records = recordsStore.getChildRecords(childrenStore.currentChildId)
      expect(records.length).toBe(1)
      expect(records[0].height).toBe(120.5)
      expect(records[0].weight).toBeNull()
    })

    it('应该能够添加完整的记录（包含体重）', async () => {
      // 确保对话框显示
      await wrapper.vm.openAddDialog()
      await nextTick()

      // 设置表单数据
      wrapper.vm.form = {
        date: '2024-03-15T00:00:00',
        height: 120.5,
        weight: 25.6
      }
      await nextTick()

      // 保存记录
      await wrapper.vm.saveRecord()
      await nextTick()

      // 验证记录是否正确保存
      const records = recordsStore.getChildRecords(childrenStore.currentChildId)
      expect(records.length).toBe(1)
      expect(records[0].height).toBe(120.5)
      expect(records[0].weight).toBe(25.6)
    })

    it('不应该允许添加没有身高的记录', async () => {
      // 确保对话框显示
      await wrapper.vm.openAddDialog()
      await nextTick()

      // 设置表单数据
      wrapper.vm.form = {
        date: '2024-03-15T00:00:00',
        height: null,
        weight: 25.6
      }
      await nextTick()

      // 尝试保存记录
      await wrapper.vm.saveRecord()
      await nextTick()

      // 验证记录未被保存
      const records = recordsStore.getChildRecords(childrenStore.currentChildId)
      expect(records.length).toBe(0)
    })
  })

  describe('编辑记录功能测试', () => {
    it('应该能够编辑记录并清除体重', async () => {
      // 先添加一条记录
      const record = {
        date: '2024-03-15T00:00:00',
        height: 120.5,
        weight: 25.6
      }
      const addedRecord = await recordsStore.addRecord(childrenStore.currentChildId, record)
      await nextTick()

      // 编辑记录
      await wrapper.vm.editRecord(addedRecord)
      await nextTick()

      // 修改表单数据
      wrapper.vm.form = {
        date: addedRecord.date,
        height: addedRecord.height,
        weight: null
      }
      await nextTick()

      // 保存修改
      await wrapper.vm.saveRecord()
      await nextTick()

      // 验证记录是否正确更新
      const updatedRecords = recordsStore.getChildRecords(childrenStore.currentChildId)
      expect(updatedRecords.length).toBe(1)
      expect(updatedRecords[0].height).toBe(120.5)
      expect(updatedRecords[0].weight).toBeNull()
    })
  })

  describe('UI交互测试', () => {
    it('体重字段应该显示为可选', async () => {
      // 确保对话框显示
      await wrapper.vm.openAddDialog()
      await nextTick()

      // 查找体重字段
      const weightField = wrapper.find('[data-test="weight-field"]')
      expect(weightField.exists()).toBe(true)
      
      // 验证可选标记
      const optionalHint = weightField.find('.optional-hint')
      expect(optionalHint.exists()).toBe(true)
      expect(optionalHint.text()).toBe('选填')
    })
  })
}) 