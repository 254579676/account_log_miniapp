// utils/util.js
/**
 * 格式化金额，保留两位小数
 * @param {Number} amount 金额
 * @returns {String} 格式化后的金额字符串
 */
const formatAmount = amount => {
  return amount.toFixed(2);
}

/**
 * 按日期对交易记录进行分组
 * @param {Array} transactions 交易记录数组
 * @returns {Array} 分组后的数组
 */
const groupTransactionsByDate = transactions => {
  // 按日期分组
  const groups = {};
  
  transactions.forEach(transaction => {
    const { date } = transaction;
    
    if (!groups[date]) {
      groups[date] = {
        date,
        transactions: []
      };
    }
    
    groups[date].transactions.push(transaction);
  });
  
  // 转换为数组并按日期降序排序
  return Object.values(groups).sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
}

/**
 * 获取月度统计数据
 * @param {Array} transactions 交易记录数组
 * @param {Number} year 年份，默认为当前年份
 * @param {Number} month 月份，默认为当前月份
 * @returns {Object} 包含收入和支出总额的对象
 */
const getMonthlyStats = (transactions, year = new Date().getFullYear(), month = new Date().getMonth() + 1) => {
  // 筛选指定年月的交易记录
  const filteredTransactions = transactions.filter(transaction => {
    const transDate = new Date(transaction.date);
    return transDate.getFullYear() === year && transDate.getMonth() + 1 === month;
  });
  
  // 计算收入和支出总额
  const stats = {
    income: 0,
    expense: 0,
    amount:0
  };
  
  filteredTransactions.forEach(transaction => {
    if (transaction.type === 'income') {
      stats.income += parseFloat(transaction.amount);
    } else if (transaction.type === 'expense') {
      stats.expense += parseFloat(transaction.amount);
    }
  });
  stats.amount = (stats.income -stats.expense).toFixed(2);
  return stats;
}

/**
 * 检查用户登录状态
 * @returns {Object|null} 返回用户信息，如果未登录则返回null
 */
function checkLoginStatus() {
  try {
    // 获取存储的用户信息和登录时间
    const userInfo = wx.getStorageSync('userInfo');
    const loginTime = wx.getStorageSync('loginTime');
    const token = wx.getStorageSync('token');
    
    if (userInfo && loginTime) {
      // 检查是否在有效期内（7天）
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7天的毫秒数
      
      if (now - loginTime < oneWeek) {
        // 仍在有效期内，保持登录状态
        return {
          userInfo: userInfo,
          token: token
        };
      } else {
        // 已过期，清除登录信息
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('loginTime');
        wx.removeStorageSync('token');
      }
    }
    return null;
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return null;
  }
}

/**
 * 获取全局token
 * @returns {string|null} 返回token，如果未登录则返回null
 */
function getToken() {
  const app = getApp();
  // 如果全局数据中没有token，则从本地存储获取
  if (!app.globalData.token) {
    app.globalData.token = wx.getStorageSync('token');
  }
  return app.globalData.token;
}

/**
 * 获取指定日期所在周的起始日期和结束日期
 * @param {Date} date 日期对象
 * @param {boolean} withTime 是否包含时分秒，默认为false（不带时分秒）
 * @returns {Object} 包含起始日期和结束日期的字符串对象
 */
const getWeekRange = (date, withTime = false) => {
  // 创建日期副本并使用UTC时间计算
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);
  
  // 获取UTC时间的星期几 (0=周日, 1=周一, ..., 6=周六)
  const utcDayOfWeek = targetDate.getUTCDay();
  
  // 计算周一的日期
  const startDate = new Date(targetDate);
  const daysFromMonday = utcDayOfWeek === 0 ? 6 : utcDayOfWeek - 1; // 如果是周日，则需要回退6天到周一
  startDate.setUTCDate(targetDate.getUTCDate() - daysFromMonday);
  startDate.setUTCHours(0, 0, 0, 0);
  
  // 计算周日的日期
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);
  if (withTime) {
    endDate.setUTCHours(23, 59, 59, 999);
  }
  
  // 格式化日期时使用UTC时间
  const formatDate = (d) => {
    if (withTime) {
      // 返回 YYYY-MM-DD HH:mm:ss 格式（使用UTC时间）
      const dateString = d.getUTCFullYear() + '-' + 
                         String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                         String(d.getUTCDate()).padStart(2, '0');
      const timeString = String(d.getUTCHours()).padStart(2, '0') + ':' + 
                         String(d.getUTCMinutes()).padStart(2, '0') + ':' + 
                         String(d.getUTCSeconds()).padStart(2, '0');
      return `${dateString} ${timeString}`;
    } else {
      // 仅返回 YYYY-MM-DD 格式（使用UTC时间）
      return d.getUTCFullYear() + '-' + 
             String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
             String(d.getUTCDate()).padStart(2, '0');
    }
  };
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};

/**
 * 获取指定日期所在月的起始日期和结束日期
 * @param {Date} date 日期对象
 * @param {boolean} withTime 是否包含时分秒，默认为false（不带时分秒）
 * @returns {Object} 包含起始日期和结束日期的字符串对象
 */
const getMonthRange = (date, withTime = false) => {
  // 创建日期副本并使用UTC时间计算
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);
  
  // 获取UTC时间的年份和月份
  const utcYear = targetDate.getUTCFullYear();
  const utcMonth = targetDate.getUTCMonth(); // 0=一月, 11=十二月
  
  // 创建当月的第一天
  const startDate = new Date(Date.UTC(utcYear, utcMonth, 1));
  if (!withTime) {
    startDate.setUTCHours(0, 0, 0, 0);
  }
  
  // 创建当月的最后一天
  const endDate = new Date(Date.UTC(utcYear, utcMonth + 1, 0));
  if (withTime) {
    endDate.setUTCHours(23, 59, 59, 999);
  }
  
  // 格式化日期时使用UTC时间
  const formatDate = (d) => {
    if (withTime) {
      // 返回 YYYY-MM-DD HH:mm:ss 格式（使用UTC时间）
      const dateString = d.getUTCFullYear() + '-' + 
                         String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                         String(d.getUTCDate()).padStart(2, '0');
      const timeString = String(d.getUTCHours()).padStart(2, '0') + ':' + 
                         String(d.getUTCMinutes()).padStart(2, '0') + ':' + 
                         String(d.getUTCSeconds()).padStart(2, '0');
      return `${dateString} ${timeString}`;
    } else {
      // 仅返回 YYYY-MM-DD 格式（使用UTC时间）
      return d.getUTCFullYear() + '-' + 
             String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
             String(d.getUTCDate()).padStart(2, '0');
    }
  };
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};

const getMonthRangeBynum = (month,year, withTime = false) => {
  const utcYear = year;
  const utcMonth = month-1; // 0=一月, 11=十二月 （UTC与数字 差1，传入month=8,UTC=7表示8月）

  // 创建当月的第一天
  const startDate = new Date(Date.UTC(utcYear, utcMonth, 1));
  if (!withTime) {
    startDate.setUTCHours(0, 0, 0, 0);
  }
  
  // 创建当月的最后一天
  const endDate = new Date(Date.UTC(utcYear, utcMonth + 1, 0));
  if (withTime) {
    endDate.setUTCHours(23, 59, 59, 999);
  }
  
  // 格式化日期时使用UTC时间
  const formatDate = (d) => {
    if (withTime) {
      // 返回 YYYY-MM-DD HH:mm:ss 格式（使用UTC时间）
      const dateString = d.getUTCFullYear() + '-' + 
                         String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                         String(d.getUTCDate()).padStart(2, '0');
      const timeString = String(d.getUTCHours()).padStart(2, '0') + ':' + 
                         String(d.getUTCMinutes()).padStart(2, '0') + ':' + 
                         String(d.getUTCSeconds()).padStart(2, '0');
      return `${dateString} ${timeString}`;
    } else {
      // 仅返回 YYYY-MM-DD 格式（使用UTC时间）
      return d.getUTCFullYear() + '-' + 
             String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
             String(d.getUTCDate()).padStart(2, '0');
    }
  };
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};
// utils/util.js
/**
 * 获取上个月的日期范围
 * @param {Date} date - 基准日期（默认为当前日期）
 * @param {boolean} withTime - 是否包含时分秒（默认为false）
 * @returns {Object} 包含 startDate 和 endDate 的对象
 */
function getLastMonthRange(date = new Date(), withTime = false) {
  // 创建日期副本避免污染原日期
  const targetDate = new Date(date);
  
  // 计算上个月（自动处理跨年情况）
  targetDate.setMonth(targetDate.getMonth() - 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  // 获取上个月的起始日（1号）
  const startDate = new Date(year, month, 1);
  if (!withTime) {
    startDate.setHours(0, 0, 0, 0);
  }
  
  // 获取上个月的结束日（最后一天）
  const endDate = new Date(year, month + 1, 0); // 下个月第0天即当月最后一天
  if (withTime) {
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate.setHours(0, 0, 0, 0);
  }

  // 格式化日期时间（实现一个简单的格式化函数）
  function formatDateTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (!withTime) {
      return `${y}-${m}-${d}`;
    }
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }

  return {
    startDate: formatDateTime(startDate),
    endDate: formatDateTime(endDate)
  };
}
/**
 * 获取指定日期所在年的起始日期和结束日期
 * @param {Date} date 日期对象
 * @param {boolean} withTime 是否包含时分秒，默认为false（不带时分秒）
 * @returns {Object} 包含起始日期和结束日期的字符串对象
 */
const getYearRange = (date, withTime = false) => {
  // 创建日期副本并使用UTC时间计算
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);
  
  // 获取UTC时间的年份
  const utcYear = targetDate.getUTCFullYear();
  
  // 创建当年的第一天
  const startDate = new Date(Date.UTC(utcYear, 0, 1)); // 1月1日
  if (!withTime) {
    startDate.setUTCHours(0, 0, 0, 0);
  }
  
  // 创建当年的最后一天
  const endDate = new Date(Date.UTC(utcYear, 11, 31)); // 12月31日
  if (withTime) {
    endDate.setUTCHours(23, 59, 59, 999);
  }
  
  // 格式化日期时使用UTC时间
  const formatDate = (d) => {
    if (withTime) {
      // 返回 YYYY-MM-DD HH:mm:ss 格式（使用UTC时间）
      const dateString = d.getUTCFullYear() + '-' + 
                         String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                         String(d.getUTCDate()).padStart(2, '0');
      const timeString = String(d.getUTCHours()).padStart(2, '0') + ':' + 
                         String(d.getUTCMinutes()).padStart(2, '0') + ':' + 
                         String(d.getUTCSeconds()).padStart(2, '0');
      return `${dateString} ${timeString}`;
    } else {
      // 仅返回 YYYY-MM-DD 格式（使用UTC时间）
      return d.getUTCFullYear() + '-' + 
             String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
             String(d.getUTCDate()).padStart(2, '0');
    }
  };
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
};
// 使用示例
// console.log('本周日期范围（不带时分秒）:', getWeekRange(new Date()));
// console.log('本周日期范围（带时分秒）:', getWeekRange(new Date(), true));
// console.log('本月日期范围（不带时分秒）:', getMonthRange(new Date()));
// console.log('本月日期范围（带时分秒）:', getMonthRange(new Date(), true));
// console.log('本年日期范围（不带时分秒）:', getYearRange(new Date()));
// console.log('本年日期范围（带时分秒）:', getYearRange(new Date(), true));

/**
 * 获取当前日期时间
 * @param {boolean} withTime - 是否包含时分秒，默认为true
 * @returns {string} 格式化后的日期时间字符串
 */
function getCurrentDateTime(withTime = true) {
  const now = new Date();
  
  if (withTime) {
      // 返回 YYYY-MM-DD HH:mm:ss 格式
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0];
      return `${date} ${time}`;
  } else {
      // 仅返回 YYYY-MM-DD 格式
      return now.toISOString().split('T')[0];
  }
}

/**
* 格式化指定日期
* @param {Date} date - 要格式化的日期对象
* @param {boolean} withTime - 是否包含时分秒，默认为true
* @returns {string} 格式化后的日期时间字符串
*/
function formatDateTime(date = new Date(), withTime = true) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  if (withTime) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
  return `${year}-${month}-${day}`; // 本地日期，无时区转换
}
// 使用示例
// console.log('当前日期时间（带时分秒）:', getCurrentDateTime(true));
// console.log('当前日期（不带时分秒）:', getCurrentDateTime(false));

/**
 * 在指定日期基础上增加或减少天数
 * @param {Date} date - 基准日期，默认为当前日期
 * @param {number} days - 要增加或减少的天数，正数为往后推，负数为往前推
 * @param {boolean} withTime - 是否包含时分秒，默认为false（不带时分秒）
 * @returns {string} 格式化后的日期字符串
 */
function addDays(date = new Date(), days = 0, withTime = false) {
  // 创建新的日期对象，避免修改原始日期
  const targetDate = new Date(typeof date === 'string' ? date : date);
  
  // 验证日期是否有效
  if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid date provided');
  }
  
  // 增加或减少天数
  targetDate.setDate(targetDate.getDate() + days);
  
  if (withTime) {
      // 返回 YYYY-MM-DD HH:mm:ss 格式
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const hours = String(targetDate.getHours()).padStart(2, '0');
      const minutes = String(targetDate.getMinutes()).padStart(2, '0');
      const seconds = String(targetDate.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } else {
      // 仅返回 YYYY-MM-DD 格式
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  }
}

/**
* 在指定日期基础上往前推N天
* @param {Date} date - 基准日期，默认为当前日期
* @param {number} days - 要往前推的天数
* @param {boolean} withTime - 是否包含时分秒，默认为false（不带时分秒）
* @returns {string} 格式化后的日期字符串
*/
function subtractDays(date = new Date(), days = 0, withTime = false) {
  return addDays(date, -Math.abs(days), withTime);
}

/**
* 在指定日期基础上往后推N天
* @param {Date} date - 基准日期，默认为当前日期
* @param {number} days - 要往后推的天数
* @param {boolean} withTime - 是否包含时分秒，默认为false（不带时分秒）
* @returns {string} 格式化后的日期字符串
*/
function addDaysForward(date = new Date(), days = 0, withTime = false) {
  return addDays(date, Math.abs(days), withTime);
}

// // 使用示例
// console.log('当前日期:', addDays(new Date(), 0, false));
// console.log('当前日期时间:', addDays(new Date(), 0, true));

// // 往前推5天
// console.log('5天前:', subtractDays(new Date(), 5, false));
// console.log('5天前时间:', subtractDays(new Date(), 5, true));

// // 往后推5天
// console.log('5天后:', addDaysForward(new Date(), 5, false));
// console.log('5天后时间:', addDaysForward(new Date(), 5, true));

// // 指定日期往前推
// const specificDate = new Date('2025-08-22');
// console.log('指定日期5天前:', subtractDays(specificDate, 5, false));

module.exports = {
  groupTransactionsByDate,
  addDays,
  addDaysForward,
  subtractDays,
  getWeekRange,
  getMonthRange,
  getMonthRangeBynum,
  getLastMonthRange,
  getYearRange,
  formatAmount,
  getMonthlyStats,
  getToken,
  checkLoginStatus,
  getCurrentDateTime,
  formatDateTime
}