import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { useChildrenStore } from './stores/children'
import { useRecordsStore } from './stores/records'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 初始化数据
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()

Promise.all([
  childrenStore.loadFromLocal(),
  recordsStore.loadFromLocal()
]).then(() => {
  app.mount('#app')
}).catch(error => {
  console.error('Failed to initialize data:', error)
  app.mount('#app')
})