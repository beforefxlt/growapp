import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChartConfigStore } from '../chartConfig'

// Mock Preferences API
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn()
  }
}))

describe('Chart Config Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have default config', () => {
    const store = useChartConfigStore()
    expect(store.config).toEqual({
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
    })
  })

  describe('updateConfig', () => {
    it('should throw error for invalid chart type', () => {
      const store = useChartConfigStore()
      expect(() => store.updateConfig('invalid', {})).toThrow('Invalid chart type')
    })

    it('should validate height config values', () => {
      const store = useChartConfigStore()
      store.updateConfig('height', {
        xAxisMin: -1,  // should be clamped to 0
        xAxisMax: 25,  // should be kept as is
        yAxisMin: 20,  // should be clamped to 30
        yAxisMax: 300  // should be clamped to 250
      })

      expect(store.config.height).toEqual({
        xAxisMin: 0,
        xAxisMax: 25,
        yAxisMin: 30,
        yAxisMax: 250
      })
    })

    it('should validate weight config values', () => {
      const store = useChartConfigStore()
      store.updateConfig('weight', {
        xAxisMin: -1,  // should be clamped to 0
        xAxisMax: 25,  // should be kept as is
        yAxisMin: 1,   // should be clamped to 2
        yAxisMax: 200  // should be clamped to 150
      })

      expect(store.config.weight).toEqual({
        xAxisMin: 0,
        xAxisMax: 25,
        yAxisMin: 2,
        yAxisMax: 150
      })
    })

    it('should ensure xAxisMax is not less than xAxisMin', () => {
      const store = useChartConfigStore()
      store.updateConfig('height', {
        xAxisMin: 5,
        xAxisMax: 3  // should be adjusted to 5
      })

      expect(store.config.height.xAxisMax).toBe(5)
    })

    it('should ensure yAxisMax is not less than yAxisMin', () => {
      const store = useChartConfigStore()
      store.updateConfig('height', {
        yAxisMin: 100,
        yAxisMax: 80  // should be adjusted to 100
      })

      expect(store.config.height.yAxisMax).toBe(100)
    })
  })

  it('should load and validate config from local storage', async () => {
    const store = useChartConfigStore()
    const mockConfig = {
      height: {
        xAxisMin: -1,    // invalid
        xAxisMax: 15,
        yAxisMin: 20,    // invalid
        yAxisMax: 300    // invalid
      },
      weight: {
        xAxisMin: 1,
        xAxisMax: 15,
        yAxisMin: 0,     // invalid
        yAxisMax: 200    // invalid
      }
    }

    const { Preferences } = await import('@capacitor/preferences')
    Preferences.get.mockResolvedValueOnce({ value: JSON.stringify(mockConfig) })

    await store.loadFromLocal()
    
    // Check if values were properly validated
    expect(store.config.height.xAxisMin).toBe(0)
    expect(store.config.height.yAxisMin).toBe(30)
    expect(store.config.height.yAxisMax).toBe(250)
    expect(store.config.weight.yAxisMin).toBe(2)
    expect(store.config.weight.yAxisMax).toBe(150)
  })

  it('should handle invalid JSON in local storage', async () => {
    const store = useChartConfigStore()
    const { Preferences } = await import('@capacitor/preferences')
    
    // Mock invalid JSON
    Preferences.get.mockResolvedValueOnce({ value: 'invalid json' })
    
    // Should not throw error and keep default values
    await store.loadFromLocal()
    expect(store.config).toEqual({
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
    })
  })

  it('should save config to local storage', async () => {
    const store = useChartConfigStore()
    const { Preferences } = await import('@capacitor/preferences')
    
    await store.saveToLocal()
    
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'chartConfig',
      value: JSON.stringify(store.config)
    })
  })

  it('should handle save errors gracefully', async () => {
    const store = useChartConfigStore()
    const { Preferences } = await import('@capacitor/preferences')
    
    Preferences.set.mockRejectedValueOnce(new Error('Failed to save'))
    
    await expect(store.saveToLocal()).resolves.not.toThrow()
  })
}) 