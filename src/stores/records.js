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
    },

    // 获取所有记录
    getAllRecords: (state) => {
      return Object.values(state.records).flat()
    },

    // 获取按日期排序的记录
    getSortedRecords: (state) => (childId) => {
      const records = state.records[childId] || []
      return [...records].sort((a, b) => new Date(b.date) - new Date(a.date))
    }
  },

  actions: {
    // 验证记录数据
    validateRecord(record) {
      if (!record || typeof record !== 'object') {
        throw new Error('记录数据无效')
      }

      if (!record.date) {
        throw new Error('日期是必填项')
      }

      if (record.height !== undefined && (record.height < 30 || record.height > 200)) {
        throw new Error('身高必须在 30-200 厘米之间')
      }

      if (record.weight !== null && record.weight !== undefined && (record.weight < 2 || record.weight > 100)) {
        throw new Error('体重必须在 2-100 千克之间')
      }

      return true
    },

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
      // 验证记录数据
      this.validateRecord(record)

      if (!this.records[childId]) {
        this.records[childId] = []
      }

      // 检查是否已存在相同时间的记录
      const existingRecord = this.hasRecordAtTime(childId, record.date)
      if (existingRecord) {
        // 如果存在，更新该记录
        return this.updateRecord(childId, existingRecord.id, record)
      }

      // 添加新记录
      const id = Date.now().toString()
      const newRecord = {
        ...record,
        id,
        childId,
        createdAt: getLocalISOString(new Date())
      }

      this.records[childId].push(newRecord)
      this.saveToLocal()

      return newRecord
    },

    updateRecord(childId, recordId, data) {
      const records = this.records[childId] || []
      const index = records.findIndex(r => r.id === recordId)
      
      if (index > -1) {
        const currentRecord = records[index]
        const updatedRecord = {
          ...currentRecord,
          ...data,
          updatedAt: getLocalISOString(new Date())
        }

        // 验证更新后的记录
        this.validateRecord(updatedRecord)

        records[index] = updatedRecord
        this.saveToLocal()
        return updatedRecord
      }

      return null
    },

    deleteRecord(childId, recordId) {
      const records = this.records[childId] || []
      const index = records.findIndex(r => r.id === recordId)
      if (index > -1) {
        const deletedRecord = records.splice(index, 1)[0]
        this.saveToLocal()
        return deletedRecord
      }
      return null
    },

    deleteChildRecords(childId) {
      if (this.records[childId]) {
        delete this.records[childId]
        this.saveToLocal()
        return true
      }
      return false
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