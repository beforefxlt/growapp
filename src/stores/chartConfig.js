import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export const useChartConfigStore = defineStore('chartConfig', {
  state: () => ({
    config: {
      height: {
        xAxisMin: 3,
        xAxisMax: 18,
        yAxisMin: 50,
        yAxisMax: 200
      },
      weight: {
        xAxisMin: 3,
        xAxisMax: 18,
        yAxisMin: 2,
        yAxisMax: 100
      }
    }
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
        const { value } = await Preferences.get({ key: 'chartConfig' })
        if (value) {
          const loadedConfig = JSON.parse(value)
          if (loadedConfig && typeof loadedConfig === 'object') {
            if (loadedConfig.height) {
              this.updateConfig('height', loadedConfig.height)
            }
            if (loadedConfig.weight) {
              this.updateConfig('weight', loadedConfig.weight)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load chart config:', error)
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
    }
  }
}) 