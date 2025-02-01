/**
 * 格式化日期为指定格式
 * @param {Date|string} date - 要格式化的日期对象或日期字符串
 * @param {string} format - 日期格式，默认为'YYYY-MM-DD'
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return ''
  
  const d = typeof date === 'string' ? new Date(date) : date
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
    .replace('M', String(d.getMonth() + 1))
    .replace('D', String(d.getDate()))
    .replace('H', String(d.getHours()))
    .replace('m', String(d.getMinutes()))
    .replace('s', String(d.getSeconds()))
}