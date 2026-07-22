// API 基础配置
const config = {
  baseUrl: 'https://api.mant.com', // 替换为实际的 API 地址
  timeout: 10000, // 请求超时时间（毫秒）
  header: {
    'content-type': 'application/json; charset=utf-8'
  }
};

// 检查是否为开发环境
const isDev = wx.getAccountInfoSync?.().miniProgram?.envVersion === 'develop';

// 开发环境使用本地地址，生产环境使用线上地址
const getBaseUrl = () => {
  // 如果是开发环境，可以设置本地服务器地址
  if (isDev) {
    // 这里替换为你的本地服务器实际IP地址
    return 'http://10.100.3.123:5521'; 
 
  }
  // 生产环境使用正式API地址
  return 'https://wx.demo.cn';
};

/**
 * 封装 wx.request 请求
 * @param {Object} options 请求配置
 * @returns {Promise} Promise 对象
 */
const request = (options) => {
  return new Promise((resolve, reject) => {

    wx.request({
      url: getBaseUrl() + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        ...config.header,
        ...options.header,
        token: getApp().globalData.token
      },
      timeout: options.timeout || config.timeout,
      success: (res) => {
        // 根据业务状态码判断请求是否成功
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject({
            code: res.statusCode,
            message: res.data.message || '请求失败'
          });
        }
      },
      fail: (err) => {
        reject({
          code: -1,
          message: err.errMsg || '网络异常'
        });
      }
    });
  });
};
// API 接口定义
const api = {
  // 用户相关
  user: {
    login: (data) => request({
      url: '/api/login',  // 统一添加 /api 前缀
      method: 'POST',
      data
    }),
    register: (data) => request({
      url: '/api/register',
      method: 'POST',
      data
    }),
    getUserInfo: () => request({
      url: '/api/user/info'
    }),
     // 新增：微信登录接口
    wechatLogin: (data) => request({
      url: '/api/user/wechat-login',
      method: 'POST',
      data
    }),
    // 更新家庭ID
    updateFamily: (data) => request({
      url: '/api/user/update_family',
      method: 'POST',
      data
    }),
  },
  
  // 交易记录相关
  transaction: {
    getList: (data) => request({
      url: '/api/transactions/list',
      method: 'POST',
      data
    }),
    getDetail: (transaction_id) => request({
      url: `/api/transactions/${transaction_id}`,
      method: 'GET'
    }),
    add: (data) => request({
      url: '/api/transactions/add',
      method: 'POST',
      data
    }),
    update: (transaction_id, data) => request({
      url: `/api/transactions/${transaction_id}`,
      method: 'PUT',
      data
    }),
    delete: (transaction_id) => request({
      url: `/api/transactions/${transaction_id}`,
      method: 'DELETE'
    }),
    summary: (data) => request({
      url: '/api/transactions/summary',
      method: 'POST',
      data
    }),
    statistics: (params) => request({
      url: '/api/transactions/statistics',
      method: 'GET',
      data: params
    }),
    statisticsDetail: (data) => request({
      url: '/api/transactions/statistics/detail',
      method: 'POST',
      data
    }),
  },
  
  // 分类相关
  category: {
    getList: (params) => request({
      url: '/api/categories/list',
      data: params || { type: 'all' }
    })
  },
  
  // 统计相关
  stats: {
    getSummary: (data) => request({
      url: '/api/stats/summary',
      data
    })
  },

  budgets: {
    // 获取预算列表
    getList: (data) => request({
      url: '/api/budgets/list',
      method: 'POST',
      data
    }),
    
    // 创建预算
    create: (data) => request({
      url: '/api/budgets/add',
      method: 'POST',
      data
    }),
    
    // 获取单个预算详情
    getDetail: (budget_id) => request({
      url: `/api/budgets/${budget_id}`,
      method: 'GET'
    }),
    
    // 更新预算
    update: (budget_id, data) => request({
      url: `/api/budgets/${budget_id}`,
      method: 'PUT',
      data
    }),
    
    // 删除预算
    delete: (budget_id) => request({
      url: `/api/budgets/${budget_id}`,
      method: 'DELETE'
    }),
    // 预算进度
    getProgress: (data) => request({
      url: `/api/budgets/progress`,
      method: 'POST',
      data
    })
  },

  // 学习模块相关接口
  study: {
    // 用户相关
    auth: {
      login: (data) => request({
        url: '/api/study/auth/login',
        method: 'POST',
        data
      }),
      getUserInfo: () => request({
        url: '/api/study/user/info',
        method: 'POST',
        data: {}
      })
    },

    // 孩子管理
    children: {
      getList: () => request({
        url: '/api/study/children/list',
        method: 'POST',
        data: {}
      }),
      add: (data) => request({
        url: '/api/study/children/add',
        method: 'POST',
        data
      }),
      update: (data) => request({
        url: '/api/study/children/update',
        method: 'POST',
        data
      }),
      delete: (data) => request({
        url: '/api/study/children/delete',
        method: 'POST',
        data
      })
    },

    // 作业管理
    homework: {
      getList: (data) => request({
        url: '/api/study/homework/list',
        method: 'POST',
        data
      }),
      getToday: (data) => request({
        url: '/api/study/homework/today',
        method: 'POST',
        data
      }),
      add: (data) => request({
        url: '/api/study/homework/add',
        method: 'POST',
        data
      }),
      update: (data) => request({
        url: '/api/study/homework/update',
        method: 'POST',
        data
      }),
      delete: (data) => request({
        url: '/api/study/homework/delete',
        method: 'POST',
        data
      }),
      getStats: (data) => request({
        url: '/api/study/homework/stats',
        method: 'POST',
        data
      }),
      batchUpdate: (data) => request({
        url: '/api/study/homework/batch-update',
        method: 'POST',
        data
      })
    },

    // 考试管理
    exam: {
      getList: (data) => request({
        url: '/api/study/exam/list',
        method: 'POST',
        data
      }),
      //查看综合考试，关联的单科成绩情况
      getDetailList: (data) => request({
        url: '/api/study/exam/detail',
        method: 'POST',
        data
      }),
      // 添加单元测试
      addUnitTest: (data) => request({
        url: '/api/study/exam/add/unittest',
        method: 'POST',
        data
      }),
      // 添加综合测试
      addComprehensive: (data) => request({
        url: '/api/study/exam/add/comprehensivetest',
        method: 'POST',
        data
      }),
      // 添加单科成绩
      addSingle: (data) => request({
        url: '/api/study/exam/add/single',
        method: 'POST',
        data
      }),
      // 更新单元测试
      updateUnitTest: (data) => request({
        url: '/api/study/exam/update/unittest',
        method: 'POST',
        data
      }),
      // 更新综合测试
      updateComprehensive: (data) => request({
        url: '/api/study/exam/update/comprehensivetest',
        method: 'POST',
        data
      }),
      // 更新单科成绩
      updateSingle: (data) => request({
        url: '/api/study/exam/update/single',
        method: 'POST',
        data
      }),
      delete: (data) => request({
        url: '/api/study/exam/delete',
        method: 'POST',
        data
      }),
      // 综合测试曲线图
      getComprehensives: (data) => request({
        url: '/api/study/exam/trend/comprehensive',
        method: 'POST',
        data
      }),
      // 单科成绩曲线图
      getSingles: (data) => request({
        url: '/api/study/exam/trend/single',
        method: 'POST',
        data
      })
    },

    // 错题管理
    error: {
      getList: (data) => request({
        url: '/api/study/mistakes/list',
        method: 'POST',
        data
      }),
      add: (data) => request({
        url: '/api/study/mistakes/add',
        method: 'POST',
        data
      }),
      update: (data) => request({
        url: '/api/study/mistakes/update',
        method: 'POST',
        data
      }),
      delete: (data) => request({
        url: '/api/study/mistakes/delete',
        method: 'POST',
        data
      }),
      detail: (data) => request({
        url: '/api/study/mistakes/detail',
        method: 'POST',
        data
      }),

      review: (data) => request({
        url: '/api/study/mistakes/review',
        method: 'POST',
        data
      }),

      // 获取科目错题统计
      getSubjectCount: (data) => request({
        url: '/api/study/mistakes/subject-count',
        method: 'POST',
        data
      }),
      // 获取统计数据
      statistics: (data) => request({
        url: '/api/study/mistakes/statistics',
        method: 'POST',
        data
      }),

      // 错题分析
      analysis: {
        // 获取错题统计数据
        getStats: (data) => request({
          url: '/api/study/mistakes/analysis/stats',
          method: 'POST',
          data
        }),
        // 获取薄弱点分析
        getWeakPoints: (data) => request({
          url: '/api/study/mistakes/analysis/weakpoints',
          method: 'POST',
          data
        }),
        // 获取学习建议
        getSuggestions: (data) => request({
          url: '/api/study/mistakes/analysis/suggestions',
          method: 'POST',
          data
        }),
        // 获取趋势分析
        getTrends: (data) => request({
          url: '/api/study/mistakes/analysis/trends',
          method: 'POST',
          data
        })
      }
    },

    // 错题管理（别名，保持向后兼容）
    mistakes: {
      getList: (data) => request({
        url: '/api/study/mistakes/list',
        method: 'POST',
        data
      }),
      add: (data) => request({
        url: '/api/study/mistakes/add',
        method: 'POST',
        data
      }),
      update: (data) => request({
        url: '/api/study/mistakes/update',
        method: 'POST',
        data
      }),
      delete: (data) => request({
        url: '/api/study/mistakes/delete',
        method: 'POST',
        data
      }),
      // 获取科目错题统计
      getSubjectCount: (data) => request({
        url: '/api/study/mistakes/subject-count',
        method: 'POST',
        data
      }),
      // 获取统计数据
      statistics: (data) => request({
        url: '/api/study/mistakes/statistics',
        method: 'POST',
        data
      }),
      // 获取月度错题统计
      monthlyStatistics: (data) => request({
        url: '/api/study/mistakes/monthly-statistics',
        method: 'POST',
        data
      })
    },

    // 错题原因管理
    mistakeReasons: {
      getList: () => request({
        url: '/api/study/mistakes/reasons',
        method: 'GET'
      })
    },


    // 科目管理
    subjects: {
      getList: () => request({
        url: '/api/study/subjects/list',
        method: 'POST',
        data: {}
      })
    },

    // 题目类型管理
    questionTypes: {
      getList: (params) => request({
        url: '/api/study/question/types',
        method: 'POST',
        data: params || {}
      })
    },

    // 学习目标
    goals: {
      getList: (data) => request({
        url: '/api/study/goals/list',
        method: 'POST',
        data
      }),
      add: (data) => request({
        url: '/api/study/goals/add',
        method: 'POST',
        data
      }),
      update: (data) => request({
        url: '/api/study/goals/update',
        method: 'POST',
        data
      }),
      delete: (data) => request({
        url: '/api/study/goals/delete',
        method: 'POST',
        data
      })
    },
    // 文件上传
    upload: {
      image: (data) => request({
        url: '/api/study/upload/image',
        method: 'POST',
        data
      })
    },

    // 批量操作
    batch: {
      deleteErrors: (data) => request({
        url: '/api/study/error/batch-delete',
        method: 'POST',
        data
      })
    }
  }
};

module.exports = {
  config,
  request,
  api,
  getBaseUrl
};