import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

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
    addRecord(childId, record) {
      if (!this.records[childId]) {
        this.records[childId] = []
      }
      const id = Date.now().toString()
      this.records[childId].push({
        ...record,
        id,
        childId,
        createdAt: new Date().toISOString()
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
          updatedAt: new Date().toISOString()
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