import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'
import { getDateTimeHourKey, getLocalISOString } from '../utils/dateUtils'

export const useRecordsStore = defineStore('records', {
  state: () => ({
    records: {}
  }),

  getters: {
    getChildRecords: (state) => (childId) => {
      return state.records[childId] || []
    }
  },

  actions: {
    // 检查是否存在同一时间的记录
    hasRecordAtTime(childId, date) {
      const records = this.records[childId] || []
      const dateKey = getDateTimeHourKey(new Date(date))
      
      return records.find(r => {
        const recordDateKey = getDateTimeHourKey(new Date(r.date))
        return recordDateKey === dateKey
      })
    },

    addRecord(childId, record) {
      if (!this.records[childId]) {
        this.records[childId] = []
      }

      // 直接添加新记录，不检查时间重复
      const id = Date.now().toString()
      this.records[childId].push({
        ...record,
        id,
        childId,
        createdAt: getLocalISOString(new Date())
      })
      this.saveToLocal()
    },

    updateRecord(childId, recordId, data) {
      const records = this.records[childId] || []
      const index = records.findIndex(r => r.id === recordId)
      if (index > -1) {
        records[index] = {
          ...records[index],
          ...data,
          updatedAt: getLocalISOString(new Date())
        }
        this.saveToLocal()
      }
    },

    deleteRecord(childId, recordId) {
      const records = this.records[childId] || []
      const index = records.findIndex(r => r.id === recordId)
      if (index > -1) {
        records.splice(index, 1)
        this.saveToLocal()
      }
    },

    deleteChildRecords(childId) {
      delete this.records[childId]
      this.saveToLocal()
    },

    async loadFromLocal() {
      try {
        const { value } = await Preferences.get({ key: 'records' })
        if (value) {
          this.records = JSON.parse(value)
        }
      } catch (error) {
        console.error('Failed to load records data:', error)
      }
    },

    async saveToLocal() {
      try {
        await Preferences.set({
          key: 'records',
          value: JSON.stringify(this.records)
        })
      } catch (error) {
        console.error('Failed to save records data:', error)
      }
    }
  }
})