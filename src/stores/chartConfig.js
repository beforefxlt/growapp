import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export const useChartConfigStore = defineStore('chartConfig', {
  state: () => ({
    config: {
      height: {
        xAxisMin: 3,
        xAxisMax: 18,
        yAxisMin: 50,
        yAxisMax: 200,
        showWHOStandards: true,
        whoStandardsConfig: {
          showP3: true,
          showP15: true,
          showP50: true,
          showP85: true,
          showP97: true,
          lineStyle: {
            opacity: 0.5,
            type: 'dashed'
          },
          colors: {
            p3: '#FF9999',
            p15: '#FFB366',
            p50: '#66B3FF',
            p85: '#99FF99',
            p97: '#FF99CC'
          }
        }
      },
      weight: {
        xAxisMin: 3,
        xAxisMax: 18,
        yAxisMin: 2,
        yAxisMax: 100,
        showWHOStandards: true,
        whoStandardsConfig: {
          showP3: true,
          showP15: true,
          showP50: true,
          showP85: true,
          showP97: true,
          lineStyle: {
            opacity: 0.5,
            type: 'dashed'
          },
          colors: {
            p3: '#FF9999',
            p15: '#FFB366',
            p50: '#66B3FF',
            p85: '#99FF99',
            p97: '#FF99CC'
          }
        }
      }
    },
    whoStandardsData: null
  }),

  actions: {
    updateConfig(type, config) {
      if (!['height', 'weight'].includes(type)) {
        throw new Error('Invalid chart type')
      }

      const validatedConfig = { ...this.config[type] }
      
      if (typeof config.xAxisMin === 'number') {
        validatedConfig.xAxisMin = Math.max(0, config.xAxisMin)
      }
      if (typeof config.xAxisMax === 'number') {
        validatedConfig.xAxisMax = Math.max(config.xAxisMin || validatedConfig.xAxisMin, config.xAxisMax)
      }
      
      if (type === 'height') {
        if (typeof config.yAxisMin === 'number') {
          validatedConfig.yAxisMin = Math.max(30, Math.min(config.yAxisMin, 200))
        }
        if (typeof config.yAxisMax === 'number') {
          validatedConfig.yAxisMax = Math.max(config.yAxisMin || validatedConfig.yAxisMin, Math.min(config.yAxisMax, 250))
        }
      } else {
        if (typeof config.yAxisMin === 'number') {
          validatedConfig.yAxisMin = Math.max(2, Math.min(config.yAxisMin, 100))
        }
        if (typeof config.yAxisMax === 'number') {
          validatedConfig.yAxisMax = Math.max(config.yAxisMin || validatedConfig.yAxisMin, Math.min(config.yAxisMax, 150))
        }
      }

      this.config[type] = validatedConfig
      this.saveToLocal()
    },

    async loadFromLocal() {
      try {
        console.log('开始从本地加载图表配置...');
        const { value } = await Preferences.get({ key: 'chartConfig' })
        if (value) {
          console.log('成功读取本地配置:', value);
          const loadedConfig = JSON.parse(value)
          if (loadedConfig && typeof loadedConfig === 'object') {
            if (loadedConfig.height) {
              console.log('更新身高图表配置...');
              this.updateConfig('height', loadedConfig.height)
            }
            if (loadedConfig.weight) {
              console.log('更新体重图表配置...');
              this.updateConfig('weight', loadedConfig.weight)
            }
          }
        } else {
          console.log('未找到本地图表配置，使用默认配置');
        }
      } catch (error) {
        console.error('加载图表配置失败:', error)
      }
    },

    async saveToLocal() {
      try {
        await Preferences.set({
          key: 'chartConfig',
          value: JSON.stringify(this.config)
        })
      } catch (error) {
        console.error('Failed to save chart config:', error)
      }
    },

    async loadWHOStandards() {
      try {
        console.log('开始加载WHO标准数据...');
        const data = await import('../assets/who-standards-template.json')
        console.log('WHO标准数据加载成功:', data.default);
        this.whoStandardsData = data.default
      } catch (error) {
        console.error('加载WHO标准数据失败:', error)
      }
    },

    toggleWHOStandards(type, value) {
      if (!['height', 'weight'].includes(type)) {
        throw new Error('Invalid chart type')
      }
      this.config[type].showWHOStandards = value
      this.saveToLocal()
    },

    updateWHOStandardsConfig(type, config) {
      if (!['height', 'weight'].includes(type)) {
        throw new Error('Invalid chart type')
      }
      this.config[type].whoStandardsConfig = {
        ...this.config[type].whoStandardsConfig,
        ...config
      }
      this.saveToLocal()
    }
  }
})