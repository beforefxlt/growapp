import { defineStore } from 'pinia'
import { useChildrenStore } from './children'
import { useRecordsStore } from './records'

export const useSyncStore = defineStore('sync', {
  actions: {
    // 生成同步数据
    generateSyncData(childId) {
      const childrenStore = useChildrenStore()
      const recordsStore = useRecordsStore()

      console.log('childId:', childId);
      const child = childrenStore.children.find(c => c.id === childId)
      if (!child) { 
        console.log('child:', child); 
        return null 
      }

      // 检查 recordsStore.getChildRecords 返回值
      const records = recordsStore.getChildRecords(childId)
      console.log('records:', records); // 添加调试信息

      const syncData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        child: child,
        records: records
      }
      console.log('syncData:', syncData); // 移动调试信息到对象定义之后

      // 转换为Base64编码，支持非ASCII字符
      const syncDataString = JSON.stringify(syncData);
      const syncCode = btoa(encodeURIComponent(syncDataString));
      console.log('syncCode:', syncCode);
      return syncCode;
    },

    // 导入同步数据
    importSyncData(syncCode) {
      try {
        // 解码Base64
        const syncData = JSON.parse(atob(syncCode))
        
        // 验证版本
        if (!syncData.version || syncData.version !== '1.0') {
          throw new Error('不支持的同步数据版本')
        }

        const childrenStore = useChildrenStore()
        const recordsStore = useRecordsStore()

        // 检查儿童是否已存在
        const existingChild = childrenStore.children.find(c => c.id === syncData.child.id)
        
        if (!existingChild) {
          // 如果儿童不存在，添加新儿童
          childrenStore.addChild(syncData.child)
        } else {
          // 如果儿童已存在，更新信息
          childrenStore.updateChild(syncData.child.id, syncData.child)
        }

        // 合并记录
        syncData.records.forEach(record => {
          const existingRecord = recordsStore.getChildRecords(syncData.child.id)
            .find(r => r.date === record.date)
          
          if (!existingRecord) {
            // 如果记录不存在，添加新记录
            recordsStore.addRecord(syncData.child.id, record)
          } else {
            // 如果记录已存在，保留最新的记录
            const existingDate = new Date(existingRecord.date)
            const newDate = new Date(record.date)
            if (newDate > existingDate) {
              recordsStore.updateRecord(syncData.child.id, existingRecord.id, record)
            }
          }
        })

        return {
          success: true,
          message: `成功同步 ${syncData.records.length} 条记录`
        }
      } catch (error) {
        return {
          success: false,
          message: '同步失败：' + error.message
        }
      }
    }
  }
})