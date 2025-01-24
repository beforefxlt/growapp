import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChildrenStore } from '../children'

describe('Children Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('should add a child', () => {
    const store = useChildrenStore()
    const child = { name: 'Test Child', birthDate: '2020-01-01' }
    
    store.addChild(child)
    
    expect(store.children.length).toBe(1)
    expect(store.children[0].name).toBe(child.name)
    expect(store.children[0].birthDate).toBe(child.birthDate)
    expect(store.children[0].id).toBeDefined()
    expect(store.children[0].createdAt).toBeDefined()
    expect(store.currentChildId).toBe(store.children[0].id)
  })

  it('should update a child', () => {
    const store = useChildrenStore()
    store.addChild({ name: 'Test Child', birthDate: '2020-01-01' })
    const childId = store.children[0].id
    
    store.updateChild(childId, { name: 'Updated Name' })
    
    expect(store.children[0].name).toBe('Updated Name')
    expect(store.children[0].updatedAt).toBeDefined()
  })

  it('should delete a child', () => {
    const store = useChildrenStore()
    store.addChild({ name: 'Test Child', birthDate: '2020-01-01' })
    const childId = store.children[0].id
    
    store.deleteChild(childId)
    
    expect(store.children.length).toBe(0)
    expect(store.currentChildId).toBeNull()
  })

  it('should load and save to localStorage', () => {
    const store = useChildrenStore()
    store.addChild({ name: 'Test Child', birthDate: '2020-01-01' })
    
    // Create a new store instance to test loading
    const newStore = useChildrenStore()
    newStore.loadFromLocal()
    
    expect(newStore.children.length).toBe(1)
    expect(newStore.children[0].name).toBe('Test Child')
    expect(newStore.currentChildId).toBe(store.currentChildId)
  })
})