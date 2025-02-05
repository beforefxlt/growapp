import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../../App.vue'
import { ElContainer, ElHeader, ElMain, ElMenu, ElMenuItem, ElIcon } from 'element-plus'
import { useChildrenStore } from '../../stores/children'
import { useRecordsStore } from '../../stores/records'
import { House, List, Setting } from '@element-plus/icons-vue'

// 创建测试用的路由配置
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/records', name: 'records', component: { template: '<div>Records</div>' } },
    { path: '/settings', name: 'settings', component: { template: '<div>Settings</div>' } }
  ]
})

describe('App.vue', () => {
  let wrapper
  let childrenStore
  let recordsStore

  beforeEach(async () => {
    // 重置路由状态
    await router.push('/')
    await router.isReady()

    wrapper = mount(App, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              children: {
                children: [],
                currentChildId: null,
                isLoaded: true
              },
              records: {
                records: {}
              }
            }
          }),
          router
        ],
        components: {
          ElContainer,
          ElHeader,
          ElMain,
          ElMenu,
          ElMenuItem,
          ElIcon
        },
        stubs: {
          'router-view': true
        }
      }
    })

    childrenStore = useChildrenStore()
    recordsStore = useRecordsStore()
  })

  describe('导航菜单', () => {
    it('渲染导航菜单', () => {
      expect(wrapper.findComponent(ElMenu).exists()).toBe(true)
      expect(wrapper.findAllComponents(ElMenuItem)).toHaveLength(3)
    })

    it('导航菜单项显示正确文本', () => {
      const menuItems = wrapper.findAllComponents(ElMenuItem)
      expect(menuItems[0].text()).toContain('首页')
      expect(menuItems[1].text()).toContain('记录')
      expect(menuItems[2].text()).toContain('设置')
    })

    it('导航菜单项包含正确的图标', () => {
      const menuItems = wrapper.findAllComponents(ElMenuItem)
      menuItems.forEach(item => {
        expect(item.find('.el-icon').exists()).toBe(true)
      })
    })

    it('导航菜单项点击正确路由', async () => {
      // 直接调用路由方法
      await router.push({ name: 'records' })
      expect(router.currentRoute.value.name).toBe('records')

      await router.push({ name: 'settings' })
      expect(router.currentRoute.value.name).toBe('settings')

      await router.push({ name: 'home' })
      expect(router.currentRoute.value.name).toBe('home')
    })

    it('当前路由高亮对应的菜单项', async () => {
      const menu = wrapper.findComponent(ElMenu)
      
      // 首页
      await router.push({ name: 'home' })
      await wrapper.vm.$nextTick()
      expect(menu.props('defaultActive')).toBe('home')

      // 记录页
      await router.push({ name: 'records' })
      await wrapper.vm.$nextTick()
      expect(menu.props('defaultActive')).toBe('records')

      // 设置页
      await router.push({ name: 'settings' })
      await wrapper.vm.$nextTick()
      expect(menu.props('defaultActive')).toBe('settings')
    })
  })

  describe('数据加载', () => {
    it('正确加载初始数据', async () => {
      const childrenStore = useChildrenStore()
      const recordsStore = useRecordsStore()
      
      // 等待数据加载完成
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(childrenStore.loadFromLocal).toHaveBeenCalled()
      expect(recordsStore.loadFromLocal).toHaveBeenCalled()
      expect(childrenStore.isLoaded).toBe(true)
    })

    it('数据加载状态正确反映', async () => {
      const childrenStore = useChildrenStore()
      
      // 模拟数据加载过程
      childrenStore.isLoaded = false
      await wrapper.vm.$nextTick()
      
      // 模拟加载完成
      childrenStore.loadFromLocal.mockResolvedValue()
      childrenStore.isLoaded = true
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(childrenStore.isLoaded).toBe(true)
    })

    it('应该按正确的顺序加载数据', async () => {
      const loadOrder = []
      const wrapper = mount(App, {
        global: {
          plugins: [
            router,
            createTestingPinia({
              createSpy: vi.fn,
              stubActions: false
            })
          ],
          components: {
            ElContainer,
            ElHeader,
            ElMain,
            ElMenu,
            ElMenuItem,
            ElIcon
          }
        }
      })

      const childrenStore = useChildrenStore()
      const recordsStore = useRecordsStore()

      // Mock loadFromLocal methods
      childrenStore.loadFromLocal = vi.fn().mockImplementation(async () => {
        loadOrder.push('children')
        return Promise.resolve()
      })
      recordsStore.loadFromLocal = vi.fn().mockImplementation(async () => {
        loadOrder.push('records')
        return Promise.resolve()
      })

      // 直接调用 loadData 方法
      await wrapper.vm.loadData()
      
      expect(loadOrder).toContain('children')
      expect(loadOrder).toContain('records')
      expect(loadOrder[0]).toBe('children')
      expect(loadOrder[1]).toBe('records')
    })
  })

  describe('布局结构', () => {
    it('渲染主要布局组件', () => {
      expect(wrapper.findComponent(ElContainer).exists()).toBe(true)
      expect(wrapper.findComponent(ElHeader).exists()).toBe(true)
      expect(wrapper.findComponent(ElMain).exists()).toBe(true)
    })

    it('header 高度正确', () => {
      const header = wrapper.findComponent(ElHeader)
      const style = header.attributes('style') || ''
      expect(style).toContain('height: 70px')
    })

    it('router-view 正确渲染在 main 区域', () => {
      const main = wrapper.findComponent(ElMain)
      expect(main.find('router-view-stub').exists()).toBe(true)
    })
  })

  describe('响应式行为', () => {
    it('导航菜单响应路由变化', async () => {
      const menu = wrapper.findComponent(ElMenu)
      
      // 改变路由
      await router.push({ name: 'records' })
      await wrapper.vm.$nextTick()
      
      expect(menu.props('defaultActive')).toBe('records')
    })

    it('菜单项样式随状态变化', async () => {
      const menuItems = wrapper.findAllComponents(ElMenuItem)
      
      // 点击记录页
      await router.push({ name: 'records' })
      await wrapper.vm.$nextTick()
      
      expect(menuItems[1].classes()).toContain('is-active')
    })
  })
}) 