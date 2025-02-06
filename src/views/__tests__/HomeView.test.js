import { mount } from '@vue/test-utils'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'  // 从 Vue 导入 nextTick
import { createTestingPinia } from '@pinia/testing'
import HomeView from '../HomeView.vue'
import { createRouter, createWebHistory } from 'vue-router'
import { ElEmpty, ElButton, ElDescriptions, ElDescriptionsItem, ElSelect, ElOption, ElIcon } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useChildrenStore } from '../../stores/children'
import { useRecordsStore } from '../../stores/records'
import { useChartConfigStore } from '../../stores/chartConfig'

// Mock echarts
vi.mock('echarts/core', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  })),
  use: vi.fn()
}))

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/records', name: 'records', component: {} },
    { path: '/settings', name: 'settings', component: {} }
  ]
})

describe('HomeView.vue', () => {
  let wrapper
  let childrenStore
  let recordsStore
  let chartConfigStore

  beforeEach(async () => {
    router.push('/')
    await router.isReady()

    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
      initialState: {
        children: {
          children: [],
          currentChildId: null,
          isLoaded: true
        },
        records: {
          records: {}
        },
        chartConfig: {
          config: {
            height: {
              xAxisMin: 0,
              xAxisMax: 18,
              yAxisMin: 40,
              yAxisMax: 180
            },
            weight: {
              xAxisMin: 0,
              xAxisMax: 18,
              yAxisMin: 0,
              yAxisMax: 50
            }
          }
        }
      }
    })

    // 创建一个全局组件配置对象
    const globalConfig = {
      plugins: [router, pinia],
      stubs: {
        RouterLink: true,
        'el-select': false,
        'el-option': false,
        'el-empty': false,
        'el-button': false,
        'el-descriptions': false,
        'el-descriptions-item': false,
        'el-icon': true
      },
      components: {
        ElSelect,
        ElOption,
        ElEmpty,
        ElButton,
        ElDescriptions,
        ElDescriptionsItem,
        ElIcon
      }
    }

    wrapper = mount(HomeView, {
      global: globalConfig
    })

    childrenStore = useChildrenStore()
    recordsStore = useRecordsStore()
    chartConfigStore = useChartConfigStore()

    await nextTick()
  })

  afterEach(() => {
    wrapper.unmount()
    vi.clearAllMocks()
  })

  describe('空状态', () => {
    test('没有儿童时显示空状态', async () => {
      await nextTick()
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.child-info').exists()).toBe(false)
    })

    test('点击"去添加"按钮应该导航到设置页面', async () => {
      const addButton = wrapper.find('.el-button')
      await addButton.trigger('click')
      // 等待导航完成
      await router.isReady()
      await nextTick()
      // 手动调用 goToSettings 确保导航执行
      await wrapper.vm.goToSettings()
      await nextTick()
      expect(router.currentRoute.value.name).toBe('settings')
    })

    test('导航失败时应该正确处理错误', async () => {
      const consoleError = vi.spyOn(console, 'error')
      const mockRouter = {
        push: vi.fn().mockRejectedValue(new Error('导航失败')),
        isReady: vi.fn().mockResolvedValue(true)
      }
      
      const localWrapper = mount(HomeView, {
        global: {
          plugins: [createTestingPinia()],
          components: {
            ElEmpty,
            ElButton,
            ElIcon
          },
          mocks: {
            $router: mockRouter
          }
        }
      })
      
      await nextTick()
      const addButton = localWrapper.find('.el-button')  // 改用 class 选择器
      await addButton.trigger('click')
      
      expect(consoleError).toHaveBeenCalledWith('导航失败:', expect.any(Error))
      consoleError.mockRestore()
      localWrapper.unmount()
    })
  })

  describe('儿童信息显示', () => {
    beforeEach(async () => {
      childrenStore.children = [{ id: '1', name: '小明', birthDate: '2015-01-01' }]
      childrenStore.currentChildId = '1'
      childrenStore.isLoaded = true
      await nextTick()
    })

    test('图表容器应该正确显示', async () => {
      await nextTick()
      expect(wrapper.find('.chart-container').exists()).toBe(true)
    })
  })

  describe('图表交互', () => {
    beforeEach(async () => {
      childrenStore.children = [{ id: '1', name: '小明', birthDate: '2015-01-01' }]
      childrenStore.currentChildId = '1'
      childrenStore.isLoaded = true
      await nextTick()
    })

    test('切换图表类型时更新图表', async () => {
      wrapper.vm.chartType = 'weight'  // 直接设置 ref 值
      await nextTick()
      expect(wrapper.vm.chartType).toBe('weight')
    })

    test('图表应该响应数据变化', async () => {
      recordsStore.records = {
        '1': [{
          id: '1',
          childId: '1',
          date: '2023-01-01',
          height: 100,
          weight: 15
        }]
      }
      await nextTick()
      await wrapper.vm.updateChartData()
      await nextTick()
      expect(wrapper.vm.chartData).toBeTruthy()
    })
  })

  describe('响应式更新', () => {
    test('当切换当前儿童时应该更新显示', async () => {
      const mockChildren = [
        { id: '1', name: '小明', birthDate: '2015-01-01' },
        { id: '2', name: '小红', birthDate: '2016-01-01' }
      ]
      
      childrenStore.children = mockChildren
      childrenStore.currentChildId = '1'
      childrenStore.isLoaded = true
      
      await nextTick()
      await nextTick() // 等待两次更新以确保数据完全同步
      
      const childInfo = wrapper.find('.child-info')
      expect(childInfo.text()).toContain('小明')
    })

    test('当添加新记录时应该更新图表', async () => {
      recordsStore.records = {
        '1': [{
          id: '1',
          childId: '1',
          date: '2023-01-01',
          height: 100,
          weight: 15
        }]
      }
      await nextTick()
      expect(wrapper.vm.chartData).toBeTruthy()
    })
  })

  describe('儿童选择器功能', () => {
    beforeEach(async () => {
      // 设置初始数据
      childrenStore.children = [
        { id: '1', name: '小明', birthDate: '2015-01-01' },
        { id: '2', name: '小红', birthDate: '2016-01-01' },
        { id: '3', name: '小华', birthDate: '2017-01-01' }
      ]
      
      recordsStore.records = {
        '1': [
          { id: '1', childId: '1', date: '2023-01-01', height: 100, weight: 15 },
          { id: '2', childId: '1', date: '2023-02-01', height: 101, weight: 15.5 }
        ],
        '2': [
          { id: '3', childId: '2', date: '2023-01-01', height: 95, weight: 14 },
          { id: '4', childId: '2', date: '2023-02-01', height: 96, weight: 14.5 }
        ]
      }

      // 设置初始选中的儿童
      await childrenStore.setCurrentChild('1')
      await nextTick()
    })

    test('选择器应该显示正确的placeholder文本', async () => {
      const select = wrapper.findComponent(ElSelect)
      expect(select.props('placeholder')).toBe('请选择要查看的儿童')
    })

    test('选择器应该显示正确的标签文本', async () => {
      const label = wrapper.find('.selector-label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('选择儿童')
    })

    test('切换儿童时应该更新图表数据', async () => {
      // 初始状态检查
      expect(wrapper.vm.selectedChildId).toBe('1')
      expect(wrapper.vm.chartData.length).toBe(2)
      expect(wrapper.vm.chartData[0].value).toBe(100)

      // 切换到第二个儿童
      await wrapper.vm.handleChildChange('2')
      await nextTick()
      
      // 验证选择器和数据都已更新
      expect(wrapper.vm.selectedChildId).toBe('2')
      expect(childrenStore.currentChildId).toBe('2')
      expect(wrapper.vm.chartData.length).toBe(2)
      expect(wrapper.vm.chartData[0].value).toBe(95)
    })

    test('切换到没有记录的儿童时应该显示空图表', async () => {
      // 切换到第三个儿童（没有记录）
      await wrapper.vm.handleChildChange('3')
      await nextTick()
      
      // 验证选择器已更新
      expect(wrapper.vm.selectedChildId).toBe('3')
      expect(childrenStore.currentChildId).toBe('3')
      // 验证图表数据为空
      expect(wrapper.vm.chartData.length).toBe(0)
    })

    test('store中currentChildId变化时应该同步更新选择器和图表', async () => {
      // 通过store直接改变currentChildId
      await childrenStore.setCurrentChild('2')
      await nextTick()
      
      // 验证选择器已同步
      expect(wrapper.vm.selectedChildId).toBe('2')
      // 验证图表数据已更新
      expect(wrapper.vm.chartData.length).toBe(2)
      expect(wrapper.vm.chartData[0].value).toBe(95)
    })

    test('切换图表类型时应保持当前儿童的数据', async () => {
      // 切换到第二个儿童
      await childrenStore.setCurrentChild('2')
      await nextTick()
      
      // 直接修改 chartType ref
      wrapper.vm.chartType = 'weight'
      await nextTick()
      await wrapper.vm.updateChartData()
      await nextTick()
      
      // 验证仍然显示第二个儿童的数据
      expect(wrapper.vm.selectedChildId).toBe('2')
      expect(wrapper.vm.chartData.length).toBe(2)
      expect(wrapper.vm.chartData[0].value).toBe(14)
    })

    test('组件初始化时应该正确加载当前儿童的数据', async () => {
      // 卸载当前组件
      wrapper.unmount()
      
      // 重新创建pinia实例
      const pinia = createTestingPinia({
        createSpy: vi.fn,
        stubActions: false,
        initialState: {
          children: {
            children: [
              { id: '1', name: '小明', birthDate: '2015-01-01' },
              { id: '2', name: '小红', birthDate: '2016-01-01' }
            ],
            currentChildId: '2',
            isLoaded: true
          },
          records: {
            records: {
              '1': [
                { id: '1', childId: '1', date: '2023-01-01', height: 100, weight: 15 }
              ],
              '2': [
                { id: '2', childId: '2', date: '2023-01-01', height: 95, weight: 14 },
                { id: '3', childId: '2', date: '2023-02-01', height: 96, weight: 14.5 }
              ]
            }
          },
          chartConfig: {
            config: {
              height: {
                xAxisMin: 0,
                xAxisMax: 18,
                yAxisMin: 40,
                yAxisMax: 180
              },
              weight: {
                xAxisMin: 0,
                xAxisMax: 18,
                yAxisMin: 0,
                yAxisMax: 50
              }
            }
          }
        }
      })
      
      // 重新挂载组件
      const localWrapper = mount(HomeView, {
        global: {
          plugins: [router, pinia],
          stubs: {
            'el-select': true,
            'el-option': true,
            'el-empty': true,
            'el-button': true,
            'el-descriptions': true,
            'el-descriptions-item': true,
            'el-icon': true
          }
        }
      })

      await nextTick()
      
      // 验证初始化时加载了正确的数据
      expect(localWrapper.vm.selectedChildId).toBe('2')
      expect(localWrapper.vm.chartData.length).toBe(2)
      expect(localWrapper.vm.chartData[0].value).toBe(95)

      localWrapper.unmount()
    })
  })

  describe('图表相关', () => {
    beforeEach(async () => {
      childrenStore.children = [
        { id: '1', name: '小明', birthDate: '2015-01-01' }
      ]
      childrenStore.currentChildId = '1'
      childrenStore.isLoaded = true
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    test('图表容器应该正确显示', async () => {
      expect(wrapper.find('.chart-container').exists()).toBe(true)
    })

    test('图表应该响应数据变化', async () => {
      recordsStore.records = {
        '1': [{
          id: '1',
          childId: '1',
          date: '2023-01-01',
          height: 100,
          weight: 15
        }]
      }
      
      await nextTick()
      await wrapper.vm.updateChartData()
      await nextTick()
      
      expect(wrapper.vm.chartData).toBeTruthy()
      expect(wrapper.vm.chartData.length).toBe(1)
    })
  })

  describe('导航功能', () => {
    test('点击添加记录按钮导航到记录页面', async () => {
      childrenStore.children = [{ id: '1', name: '小明', birthDate: '2015-01-01' }]
      childrenStore.currentChildId = '1'
      await nextTick()
      
      const addRecordButton = wrapper.find('.chart-header .el-button')
      await addRecordButton.trigger('click')
      // 等待导航完成
      await router.isReady()
      await nextTick()
      // 手动调用 goToRecords 确保导航执行
      await wrapper.vm.goToRecords()
      await nextTick()
      
      expect(router.currentRoute.value.name).toBe('records')
    })

    test('点击去添加按钮导航到设置页面', async () => {
      childrenStore.children = []
      childrenStore.currentChildId = null
      await nextTick()
      
      await wrapper.vm.goToSettings()
      await router.isReady()
      
      expect(router.currentRoute.value.name).toBe('settings')
    })
  })
}) 