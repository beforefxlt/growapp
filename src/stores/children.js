import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export const useChildrenStore = defineStore('children', {
  state: () => ({
    children: [],
    currentChildId: null
  }),

  getters: {
    currentChild: (state) => state.children.find(child => child.id === state.currentChildId),
    hasChildren: (state) => state.children.length > 0
  },

  actions: {
    addChild(child) {
      const id = Date.now().toString()
      this.children.push({
        ...child,
        id,
        createdAt: new Date().toISOString()
      })
      if (!this.currentChildId) {
        this.currentChildId = id
      }
      this.saveToLocal()
    },

    updateChild(id, data) {
      const index = this.children.findIndex(c => c.id === id)
      if (index > -1) {
        this.children[index] = {
          ...this.children[index],
          ...data,
          updatedAt: new Date().toISOString()
        }
        this.saveToLocal()
      }
    },

    deleteChild(id) {
      const index = this.children.findIndex(c => c.id === id)
      if (index > -1) {
        this.children.splice(index, 1)
        if (this.currentChildId === id) {
          this.currentChildId = this.children.length > 0 ? this.children[0].id : null
        }
        this.saveToLocal()
      }
    },

    setCurrentChild(id) {
      this.currentChildId = id
      this.saveToLocal()
    },

    async loadFromLocal() {
      try {
        const { value } = await Preferences.get({ key: 'children' })
        if (value) {
          const parsed = JSON.parse(value)
          this.children = parsed.children
          this.currentChildId = parsed.currentChildId
        }
      } catch (error) {
        console.error('Failed to load children data:', error)
      }
    },

    async saveToLocal() {
      try {
        await Preferences.set({
          key: 'children',
          value: JSON.stringify({
            children: this.children,
            currentChildId: this.currentChildId
          })
        })
      } catch (error) {
        console.error('Failed to save children data:', error)
      }
    }
  }
})