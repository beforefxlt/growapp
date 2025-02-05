import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 配置全局组件
config.global.plugins = [ElementPlus]

// 配置全局图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  config.global.components[key] = component
}

// 配置全局 mocks
config.global.mocks = {
  $route: {
    name: 'home'
  },
  $router: {
    push: vi.fn(),
    replace: vi.fn()
  }
}

// 配置全局 stubs
config.global.stubs = {
  transition: false,
  'router-view': true
} 