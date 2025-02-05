import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export const useChildrenStore = defineStore('children', {
  state: () => ({
    children: [],
    currentChildId: null,
    isLoaded: false  // 添加加载状态标志
  }),

  getters: {
    currentChild: (state) => {
      console.log('children store - Getting currentChild:', {
        currentChildId: state.currentChildId,
        children: state.children,
        isLoaded: state.isLoaded
      });
      
      if (!state.isLoaded) {
        console.log('Data not yet loaded');
        return null;
      }
      
      const child = state.children.find(child => child.id === state.currentChildId);
      console.log('Found child:', child);
      return child;
    },
    hasChildren: (state) => state.children.length > 0
  },

  actions: {
    addChild(child) {
      console.log('Adding child:', child);
      const id = Date.now().toString()
      const newChild = {
        ...child,
        id,
        birthDate: child.birthDate,
        createdAt: new Date().toISOString()
      };
      console.log('New child data:', newChild);
      this.children.push(newChild)
      if (!this.currentChildId) {
        this.currentChildId = id
      }
      this.saveToLocal()
      return newChild
    },

    updateChild(id, data) {
      console.log('Updating child:', { id, data });
      const index = this.children.findIndex(c => c.id === id)
      if (index > -1) {
        const updatedChild = {
          ...this.children[index],
          ...data,
          birthDate: data.birthDate,
          updatedAt: new Date().toISOString()
        };
        console.log('Updated child data:', updatedChild);
        this.children[index] = updatedChild;
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
        console.log('Loading children data from local storage...');
        const { value } = await Preferences.get({ key: 'children' });
        if (value) {
          const parsed = JSON.parse(value);
          console.log('Loaded data:', parsed);
          this.children = parsed.children;
          this.currentChildId = parsed.currentChildId;
        }
        this.isLoaded = true;  // 标记数据已加载
        console.log('Data loading completed:', {
          children: this.children,
          currentChildId: this.currentChildId,
          isLoaded: this.isLoaded
        });
      } catch (error) {
        console.error('Failed to load children data:', error);
        this.isLoaded = true;  // 即使加载失败也标记为已完成
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