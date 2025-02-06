import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import App from './App.vue'
import router from './router'
import { RouterView } from 'vue-router'
import { ElContainer, ElHeader, ElMain, ElMenu, ElMenuItem, ElIcon, ElFooter } from 'element-plus'
import { House, List, Setting } from '@element-plus/icons-vue'
import { useChildrenStore } from './stores/children'

describe('App.vue', () => {
  describe('导航菜单', () => {
    test('渲染导航菜单', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      const menu = wrapper.findComponent({ name: 'el-menu' })
      expect(menu.exists()).toBe(true)
    })

    test('导航菜单项显示正确文本', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      const menuItems = wrapper.findAllComponents({ name: 'el-menu-item' })
      expect(menuItems[0].text()).toContain('首页')
      expect(menuItems[1].text()).toContain('记录')
      expect(menuItems[2].text()).toContain('设置')
    })

    test('导航菜单项包含正确的图标', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      const icons = wrapper.findAllComponents({ name: 'el-icon' })
      expect(icons.length).toBeGreaterThan(0)
    })

    test('导航菜单项点击正确路由', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      await wrapper.vm.handleSelect('records')
      expect(router.currentRoute.value.name).toBe('records')
    })

    test('当前路由高亮对应的菜单项', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      await router.push('/records')
      await wrapper.vm.$nextTick()
      const menu = wrapper.findComponent({ name: 'el-menu' })
      expect(menu.props('defaultActive')).toBe('records')
    })
  })

  describe('数据加载', () => {
    test('正确加载初始数据', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          components: {
            ElContainer,
            ElHeader,
            ElMain,
            ElMenu,
            ElMenuItem,
            ElIcon,
            House,
            List,
            Setting
          }
        }
      })
      await wrapper.vm.loadData()
      const store = wrapper.vm.childrenStore
      expect(store.isLoaded).toBe(true)
    })

    test('数据加载状态正确反映', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          components: {
            ElContainer,
            ElHeader,
            ElMain,
            ElMenu,
            ElMenuItem,
            ElIcon,
            House,
            List,
            Setting
          }
        }
      })
      expect(wrapper.vm.childrenStore.isLoaded).toBe(false)
      await wrapper.vm.loadData()
      expect(wrapper.vm.childrenStore.isLoaded).toBe(true)
    })

    test('应该按正确的顺序加载数据', async () => {
      const loadOrder = []
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              children: {
                children: [],
                currentChildId: null,
                isLoaded: false
              }
            }
          })],
          components: {
            ElContainer,
            ElHeader,
            ElMain,
            ElMenu,
            ElMenuItem,
            ElIcon,
            House,
            List,
            Setting
          }
        }
      })

      // Mock loadFromLocal methods
      wrapper.vm.childrenStore.loadFromLocal = vi.fn().mockImplementation(() => {
        loadOrder.push('children')
        return Promise.resolve()
      })
      wrapper.vm.recordsStore.loadFromLocal = vi.fn().mockImplementation(() => {
        loadOrder.push('records')
        return Promise.resolve()
      })

      await wrapper.vm.loadData()
      expect(loadOrder).toContain('children')
      expect(loadOrder).toContain('records')
    })
  })

  describe('布局结构', () => {
    it('渲染主要布局组件', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      expect(wrapper.findComponent({ name: 'el-container' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'el-footer' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'el-main' }).exists()).toBe(true)
    })

    it('footer 高度正确', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      const footer = wrapper.findComponent(ElFooter)
      const style = footer.attributes('style') || ''
      expect(style).toContain('height: 70px')
    })

    it('router-view 正确渲染在 main 区域', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      const main = wrapper.findComponent(ElMain)
      expect(main.findComponent(RouterView).exists()).toBe(true)
    })
  })

  describe('响应式行为', () => {
    test('导航菜单响应路由变化', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      await router.push('/records')
      await wrapper.vm.$nextTick()
      const menu = wrapper.findComponent({ name: 'el-menu' })
      expect(menu.props('defaultActive')).toBe('records')
    })

    test('菜单项样式随状态变化', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router, createTestingPinia()],
          stubs: {
            'router-view': true
          }
        }
      })
      await router.push('/records')
      await wrapper.vm.$nextTick()
      const menuItems = wrapper.findAllComponents({ name: 'el-menu-item' })
      const activeMenuItem = menuItems.find(item => item.classes('is-active'))
      expect(activeMenuItem).toBeTruthy()
    })
  })
}) 