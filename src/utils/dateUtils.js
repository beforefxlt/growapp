/**
 * 获取本地时区的时间字符串
 * @param {Date|string} date - 日期对象或ISO日期字符串
 * @returns {string} - 本地时区的ISO格式时间字符串
 */
export function getLocalISOString(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tzOffset = d.getTimezoneOffset() * 60000; // 获取本地时区偏移（毫秒）
  const localISOTime = new Date(d.getTime() - tzOffset).toISOString();
  return localISOTime;
}

/**
 * 格式化日期为指定格式
 * @param {Date|string} date - 要格式化的日期对象或日期字符串
 * @param {string} format - 日期格式，默认为'YYYY-MM-DD'
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
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
    .replace('s', String(d.getSeconds()));
}

/**
 * 获取当前时间的本地ISO字符串（精确到分钟）
 * @returns {string} - 本地时区的ISO格式时间字符串（精确到分钟）
 */
export function getCurrentLocalISOString() {
  return getLocalISOString(new Date()).slice(0, 16);
}

/**
 * 格式化文件名日期
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化后的文件名日期字符串
 */
export function formatDateForFileName(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

/**
 * 格式化导入时间戳
 * @param {string} timestamp - 时间戳字符串（格式：YYYYMMDD_HHMM）
 * @returns {string} - 格式化后的时间字符串
 */
export function formatImportTimestamp(timestamp) {
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const hour = timestamp.slice(9, 11);
  const minute = timestamp.slice(11, 13);
  return `${year}年${month}月${day}日 ${hour}:${minute}`;
}

/**
 * 获取日期时间的小时精度key
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} - 格式化后的日期时间key
 */
export function getDateTimeHourKey(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${
    String(d.getMonth() + 1).padStart(2, '0')}-${
    String(d.getDate()).padStart(2, '0')} ${
    String(d.getHours()).padStart(2, '0')}`;
}

/**
 * 计算年龄数值
 * @param {string} recordDate - 记录日期
 * @param {string} birthDate - 出生日期
 * @returns {number} - 年龄数值（精确到小数点后一位）
 */
export function calculateAge(recordDate, birthDate) {
  if (!birthDate) return 0;
  const birthDateTime = new Date(birthDate);
  const recordDateTime = new Date(recordDate);
  const diffTime = recordDateTime - birthDateTime;
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return parseFloat(diffYears.toFixed(1));
}

/**
 * 计算年龄文本
 * @param {string} recordDate - 记录日期
 * @param {string} birthDate - 出生日期
 * @returns {string} - 格式化的年龄文本，如"4岁3个月"
 */
export function calculateAgeText(recordDate, birthDate) {
  if (!recordDate || !birthDate) {
    console.warn('calculateAgeText: recordDate or birthDate is missing', { recordDate, birthDate });
    return '';
  }
  
  try {
    const birthDateTime = new Date(birthDate);
    const recordDateTime = new Date(recordDate);
    
    if (isNaN(birthDateTime.getTime()) || isNaN(recordDateTime.getTime())) {
      console.warn('calculateAgeText: Invalid date', { birthDate, recordDate });
      return '';
    }
    
    let years = recordDateTime.getFullYear() - birthDateTime.getFullYear();
    let months = recordDateTime.getMonth() - birthDateTime.getMonth();
    
    if (recordDateTime.getDate() < birthDateTime.getDate()) {
      months--;
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return `${years}岁${months}个月`;
  } catch (error) {
    console.error('calculateAgeText error:', error);
    return '';
  }
} 