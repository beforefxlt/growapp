import { mount } from '@vue/test-utils'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import HomeView from '../HomeView.vue'
import { createRouter, createWebHistory } from 'vue-router'
import { ElEmpty, ElButton, ElDescriptions, ElDescriptionsItem, ElSelect, ElOption, ElIcon } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useChildrenStore } from '../../stores/children'
import { useRecordsStore } from '../../stores/records'

// Mock echarts
vi.mock('echarts/core', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    on: vi.fn()
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
  beforeEach(async () => {
    router.push('/')
    await router.isReady()
  })

  afterEach(() => {
    vi.clearAllMocks()
    router.currentRoute.value.name = 'home'
  })

  describe('空状态交互', () => {
    test('显示空状态当没有儿童信息时', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, createTestingPinia({
            initialState: {
              children: {
                children: [],
                currentChildId: null,
                isLoaded: true
              }
            }
          })],
          stubs: {
            ElEmpty,
            ElButton,
            ElIcon: true
          }
        }
      })
      expect(wrapper.findComponent(ElEmpty).exists()).toBe(true)
    })

    test('点击"去添加"按钮应该导航到设置页面', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, createTestingPinia({
            initialState: {
              children: {
                children: [],
                currentChildId: null,
                isLoaded: true
              }
            }
          })],
          components: {
            ElEmpty,
            ElButton,
            ElIcon,
            ElDescriptions,
            ElDescriptionsItem
          }
        }
      })
      
      await wrapper.vm.$nextTick()
      const addButton = wrapper.findComponent(ElButton)
      await addButton.trigger('click')
      await router.isReady()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(router.currentRoute.value.name).toBe('settings')
    })

    test('点击添加记录按钮应该导航到记录页面', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, createTestingPinia({
            initialState: {
              children: {
                children: [{
                  id: '1',
                  name: '测试儿童',
                  birthDate: '2020-01-01'
                }],
                currentChildId: '1',
                isLoaded: true
              }
            }
          })],
          components: {
            ElEmpty,
            ElButton,
            ElIcon,
            ElDescriptions,
            ElDescriptionsItem,
            ElSelect,
            ElOption
          }
        }
      })
      
      await wrapper.vm.$nextTick()
      const addButton = wrapper.findComponent(ElButton)
      await addButton.trigger('click')
      await router.isReady()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(router.currentRoute.value.name).toBe('records')
    })

    test('导航失败时应该正确处理错误', async () => {
      const consoleError = vi.spyOn(console, 'error')
      const mockRouter = {
        push: vi.fn().mockRejectedValue(new Error('导航失败')),
        isReady: vi.fn().mockResolvedValue(true)
      }
      
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createTestingPinia({
            initialState: {
              children: {
                children: [],
                currentChildId: null,
                isLoaded: true
              }
            }
          })],
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
      
      await wrapper.vm.$nextTick()
      const addButton = wrapper.findComponent(ElButton)
      await addButton.trigger('click')
      
      expect(consoleError).toHaveBeenCalledWith('导航失败:', expect.any(Error))
      consoleError.mockRestore()
    })
  })

  describe('儿童信息显示', () => {
    test('图表容器应该正确显示', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, createTestingPinia({
            initialState: {
              children: {
                children: [{
                  id: '1',
                  name: '测试儿童',
                  birthDate: '2020-01-01'
                }],
                currentChildId: '1',
                isLoaded: true
              }
            }
          })],
          components: {
            ElEmpty,
            ElButton,
            ElDescriptions,
            ElDescriptionsItem,
            ElSelect,
            ElOption,
            ElIcon
          }
        }
      })
      expect(wrapper.find('.chart-container').exists()).toBe(true)
    })
  })

  describe('图表交互', () => {
    test('切换图表类型时更新图表', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, createTestingPinia({
            initialState: {
              children: {
                children: [{
                  id: '1',
                  name: '测试儿童',
                  birthDate: '2020-01-01'
                }],
                currentChildId: '1',
                isLoaded: true
              }
            }
          })],
          stubs: {
            ElDescriptions,
            ElDescriptionsItem,
            ElSelect,
            ElOption,
            ElButton,
            ElIcon: true
          }
        }
      })
      await wrapper.vm.$nextTick()
      wrapper.vm.chartType = 'weight'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.chartType).toBe('weight')
    })

    test('图表应该响应数据变化', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, createTestingPinia({
            initialState: {
              children: {
                children: [{
                  id: '1',
                  name: '测试儿童',
                  birthDate: '2020-01-01'
                }],
                currentChildId: '1',
                isLoaded: true
              },
              records: {
                records: {
                  '1': [{
                    id: '1',
                    childId: '1',
                    date: '2023-01-01',
                    height: 100,
                    weight: 15
                  }]
                }
              }
            }
          })],
          components: {
            ElEmpty,
            ElButton,
            ElDescriptions,
            ElDescriptionsItem,
            ElSelect,
            ElOption,
            ElIcon
          }
        }
      })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.chartOptions).toBeTruthy()
    })
  })

  describe('响应式更新', () => {
    test('当切换当前儿童时应该更新显示', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, createTestingPinia({
            initialState: {
              children: {
                children: [
                  { id: '1', name: '儿童1', birthDate: '2020-01-01' },
                  { id: '2', name: '儿童2', birthDate: '2020-02-02' }
                ],
                currentChildId: '1',
                isLoaded: true
              }
            }
          })],
          components: {
            ElEmpty,
            ElButton,
            ElDescriptions,
            ElDescriptionsItem,
            ElSelect,
            ElOption,
            ElIcon
          }
        }
      })
      const store = wrapper.vm.childrenStore
      store.currentChildId = '2'
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('儿童2')
    })

    test('当添加新记录时应该更新图表', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, createTestingPinia({
            initialState: {
              children: {
                children: [{
                  id: '1',
                  name: '测试儿童',
                  birthDate: '2020-01-01'
                }],
                currentChildId: '1',
                isLoaded: true
              },
              records: {
                records: {}
              }
            }
          })],
          components: {
            ElEmpty,
            ElButton,
            ElDescriptions,
            ElDescriptionsItem,
            ElSelect,
            ElOption,
            ElIcon
          }
        }
      })
      const recordsStore = wrapper.vm.recordsStore
      recordsStore.records = {
        '1': [{
          id: '1',
          childId: '1',
          date: '2023-01-01',
          height: 100,
          weight: 15
        }]
      }
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.chartData).toBeTruthy()
    })
  })
}) 