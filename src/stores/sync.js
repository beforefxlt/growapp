import { defineStore } from 'pinia'
import { useChildrenStore } from './children'
import { useRecordsStore } from './records'

export const useSyncStore = defineStore('sync', {
  actions: {
    // 生成同步数据
    generateSyncData(childId) {
      try {
        console.log('开始生成同步数据，儿童ID:', childId);
        
        const childrenStore = useChildrenStore();
        const recordsStore = useRecordsStore();

        const child = childrenStore.children.find(c => c.id === childId);
        if (!child) {
          console.error('未找到指定ID的儿童:', childId);
          throw new Error('未找到指定的儿童信息');
        }

        const records = recordsStore.getChildRecords(childId);
        console.log('获取到的记录数量:', records.length);

        const syncData = {
          version: '1.0',
          timestamp: new Date().toISOString(),
          child: { ...child },
          records: [...records]
        };
        
        console.log('生成的同步数据:', syncData);

        // 使用 TextEncoder 处理 UTF-8 编码
        const jsonString = JSON.stringify(syncData);
        const encoder = new TextEncoder();
        const utf8Bytes = encoder.encode(jsonString);
        
        // 转换为Base64编码
        const base64String = btoa(String.fromCharCode.apply(null, utf8Bytes));
        
        console.log('生成的同步码长度:', base64String.length);
        return base64String;
        
      } catch (error) {
        console.error('生成同步数据时出错:', error);
        throw error;
      }
    },

    // 导入同步数据
    importSyncData(syncCode) {
      try {
        // 解码Base64
        const binaryString = atob(syncCode);
        
        // 转换为 UTF-8 字节数组
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // 使用 TextDecoder 解码 UTF-8
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(bytes);
        
        // 解析JSON
        const syncData = JSON.parse(jsonString);
        
        // 验证版本
        if (!syncData.version || syncData.version !== '1.0') {
          throw new Error('不支持的同步数据版本');
        }

        const childrenStore = useChildrenStore()
        const recordsStore = useRecordsStore()

        // 检查儿童是否已存在
        const existingChild = childrenStore.children.find(c => c.name === syncData.child.name)
        
        if (!existingChild) {
          // 如果儿童不存在，添加新儿童
          childrenStore.addChild(syncData.child)
        } else {
          // 如果儿童已存在，更新信息
          childrenStore.updateChild(existingChild.id, syncData.child)
        }

        // 合并记录
        syncData.records.forEach(record => {
          const existingRecord = recordsStore.getChildRecords(existingChild ? existingChild.id : syncData.child.id)
            .find(r => r.date === record.date)
          
          if (!existingRecord) {
            // 如果记录不存在，添加新记录
            recordsStore.addRecord(existingChild ? existingChild.id : syncData.child.id, record)
          } else {
            // 如果记录已存在，保留最新的记录
            const existingDate = new Date(existingRecord.date)
            const newDate = new Date(record.date)
            if (newDate > existingDate) {
              recordsStore.updateRecord(existingChild ? existingChild.id : syncData.child.id, existingRecord.id, record)
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