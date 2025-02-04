import { ElMessageBox, ElMessage } from 'element-plus'
import { Capacitor } from '@capacitor/core'

export const checkAndRequestPermissions = async (FilePlugin) => {
  if (Capacitor.getPlatform() !== 'android') {
    return true
  }

  try {
    await ElMessageBox.confirm(
      '需要访问存储空间权限，以保存或读取文件。\n\n请在接下来的系统对话框中点击"允许"。',
      '需要权限',
      {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    const permResult = await FilePlugin.checkPermissions()
    if (permResult.granted) {
      return true
    }

    const result = await FilePlugin.requestPermissions()
    if (!result.granted) {
      ElMessage.error('需要存储权限才能继续操作。请在设置中手动开启权限。')
      return false
    }

    return result.granted
  } catch (error) {
    if (error.message !== 'cancel') {
      ElMessage.error('权限请求失败: ' + error.message)
    }
    return false
  }
} 