// pages/stats/stats.js
const util = require('../../../utils/util.js')
const { api } = require('../../../utils/api.js');
const app = getApp();

// 统一反馈方法
const showFeedback = (title, icon = 'none') => {
  wx.showToast({ title, icon, duration: 2000 });
};

// API调用封装
  const callAPI = async (apiFunc, params, loadingText = '加载中...') => {
    if (!app.globalData.token) {
      showFeedback('未登录');
      return null;
    }
    try {
      wx.showLoading({ title: loadingText });
      const res = await apiFunc(params);
      // console.log('API响应:', res);
      wx.hideLoading();
      
      if (res.code !== 200) {
        showFeedback(res.message || '操作失败');
        return null;
      }
      return res.data;
    } catch (err) {
      wx.hideLoading();
      showFeedback('网络错误');
      console.error('API请求失败:', err);
      return null;
    }
  };
Page({
  data: {
    dateRange: 'year', // 默认为年视图
    showDatePicker: false,
    startDate: '',
    endDate: '',
    activeTab: 'expense', // 'expense', 'income'
    summary:{
      totalExpense: '0.00',
      totalIncome: '0.00',
      balance: '0.00',// 预处理
    },
    monthly_stats:[], //月度汇总支出收入数据
    category_details:[],//分类汇总数据
    pieChartOption: {}, // 初始化为空对象而不是null
    barChartOption: {} // 初始化为空对象而不是null
  },

  onLoad: function () {
    // 初始化日期范围
    this.initDateRange();
  },

  onShow: function () {
    // 加载统计数据
    if (!app.globalData.token) {
      this.setData({
        summary:{
          totalExpense: '0.00',
          totalIncome: '0.00',
          balance: '0.00',// 预处理
        },
        monthly_stats:[], //月度汇总支出收入数据
        category_details:[] //分类汇总数据
      })
    }
    this.loadStats();
    console.log('统计onshow')
  },

  initDateRange: function () {
    const today = new Date();
    // 默认为本年
    const startDate = new Date(today.getFullYear(), 0, 1);
    const endDate = new Date(today.getFullYear(), 11, 31);
    this.setData({
      dateRange: 'year',
      startDate: util.formatDateTime(startDate,false),
      endDate: util.formatDateTime(endDate,false)
    });
  },

  profileTransactions: function() {
    const querybody = {
      start_date: this.data.startDate,
      end_date: this.data.endDate
    };
    return callAPI(api.transaction.statisticsDetail.bind(api.transaction), querybody, '加载数据中...')
      .then(data => {
        const summary = {
          totalIncome: data.summary.total_income,
          totalExpense: data.summary.total_expense,
          balance: data.summary.total_balance
        };
        this.setData({
          summary: summary,
          category_details: data.category_details,
          monthly_stats: data.monthly_stats
        });
        return data;
      });
  },
  
  setDateRange: function (e) {
    const range = e.currentTarget.dataset.range;
    const now = new Date();
    let startDate, endDate;

    switch (range) {
      case 'week': {
        const weekRange = util.getWeekRange(now, false);
        startDate = weekRange.startDate;
        endDate = weekRange.endDate;
        break;
      }
      case 'month': {
        const monthRange = util.getMonthRange(now);
        startDate = monthRange.startDate;
        endDate = monthRange.endDate;
        break;
      }
      case 'year': {
        const yearRange = util.getYearRange(now);
        startDate = yearRange.startDate;
        endDate = yearRange.endDate;
        break;
      }
      case 'custom': {
        this.setData({
          dateRange: range,
          showDatePicker: true
        });
        return;
      }
    }

    this.setData({
      dateRange: range,
      startDate: startDate,
      endDate: endDate,
      showDatePicker: false
    });
    this.loadStats();
  },

  showCustomDatePicker: function () {
    
    this.setData({
      dateRange: 'custom',
      showDatePicker: true
    });
  },

  hideDatePicker: function () {
    
    this.setData({
      showDatePicker: false
    });
  },

  onStartDateChange: function (e) {
    
    this.setData({
      startDate: e.detail.value
    });
  },

  onEndDateChange: function (e) {
    
    this.setData({
      endDate: e.detail.value
    });
  },

  applyCustomDate: function () {
    
    this.setData({
      dateRange: 'custom',
      showDatePicker: false
    });

    this.loadStats();
  },

  switchTab: function (e) {
    
    const tab = e.currentTarget.dataset.tab;
    let category_act ={};
    const c_details =this.data.category_details;
    if (tab === 'expense') {
      // 加载支出数据
      category_act = c_details.expense;
    } else {
      // 加载收入数据
      category_act = c_details.income;
    }
    const categoryStats = updateCategory(category_act); // 降序排序

    this.setData({
      activeTab: tab,
      categoryStats
    });

    // 更新饼图数据
    this.updatePieData();
  },

  loadStats: async function () {
    //未登录 不请求
    if(!app.globalData.token) 
      return;
    
    wx.showLoading({ title: '加载中...' });
    
    try {
      const resp = await this.profileTransactions();
      if (!resp) return;
      
      const c_details = resp.category_details;
      const flag = this.data.activeTab;
      let category_details_act = c_details.income;
      
      if (flag === 'expense') {
        category_details_act = c_details.expense;
      }
      
      // 计算每个分类的金额和占比
      const categoryStats = updateCategory(category_details_act);
      
      this.setData({
        monthly_stats: resp.monthly_stats || {},
        category_details: c_details,
        categoryStats
      }, () => {
        this.updatePieData();
        this.loadMonthlyData();
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      this.showMessage('加载失败');
    }
  },

  // 更新饼图数据
  updatePieData: function () {
    // 构造饼图数据
    const flag = this.data.activeTab;
    const c_details = this.data.category_details;
    let category_details_act={};
    if (flag === 'expense') {
      // 加载支出数据
      category_details_act = c_details.expense;

    } else {
      // 加载收入数据
      category_details_act = c_details.income;

    }
    const pieData =  Object.values(category_details_act).map(item => {
      return {
        name: item.name,
        value: parseFloat(item.amount)
      };
    });

    // 构造饼图配置
    const pieOption = {
      backgroundColor: "#ffffff",
      series: [{
        label: {
          normal: {
            fontSize: 18
          }
        },
        type: 'pie',
        center: ['50%', '50%'],
        radius: ['40%', '60%'],
        data: pieData.sort((a, b) => {
          return b.value - a.value;
        }),
        labelLine: {
          normal: {
            show: true
          }
        },
        label: {
          normal: {
            position: 'outside',
            show: true,
            formatter: '{b} {d}%',
          }
        }
      }]
    };

    this.setData({
      pieData,
      pieChartOption: pieOption
    });
  },

  // 设置饼图组件实例
  setPieChart: function (chart) {
    this.pieChart = chart;
  },
  // 加载月度柱状图数据
  loadMonthlyData: function () {
    if(!app.globalData.token || !this.data.monthly_stats) {
      return;
    }

    const monthly_stats = this.data.monthly_stats;
    const monthlyData = [];
    const monthlyCategories = [];
    const currentYear = new Date().getFullYear();

    // 生成12个月的数据
    for (let i = 0; i < 12; i++) {
      const month = i + 1;
      const monthLabel = `${i + 1}月`;
      monthlyCategories.push(monthLabel);
      
      // 构建与monthly_stats中键匹配的年月格式（如"2025-07"）
      const yearMonth = `${currentYear}-${String(month).padStart(2, '0')}`;
      
      // 获取对应月份数据
      const monthData = monthly_stats[yearMonth] || { income: 0, expense: 0 };
      monthlyData.push({
        month: monthLabel,
        income: monthData.income,
        expense: monthData.expense
      });
    }
    // 构造柱状图数据系列
    const incomeData = monthlyData.map(item => item.income);
    const expenseData = monthlyData.map(item => item.expense);

    const barSeries = [{
        name: '收入',
        data: incomeData
      },
      {
        name: '支出',
        data: expenseData
      }
    ];
    // 构造柱状图配置
    const barOption = {
      backgroundColor: "#ffffff",
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        confine: true
      },
      grid: {
        left: 20,
        right: 20,
        bottom: 15,
        top: 40,
        containLabel: true
      },
      xAxis: [{
        type: 'category',
        data: monthlyCategories,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666'
        }
      }],
      yAxis: [{
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666'
        }
      }],
      series: [{
          name: '收入',
          type: 'bar',
          label: {
            normal: {
              show: true,
              position: 'top'
            }
          },
          data: incomeData,
          itemStyle: {
            color: '#4CAF50'
          }
        },
        {
          name: '支出',
          type: 'bar',
          label: {
            normal: {
              show: true,
              position: 'top'
            }
          },
          data: expenseData,
          itemStyle: {
            color: '#F44336'
          }
        }
      ]
    };

    this.setData({
      monthlyData,
      monthlyCategories,
      barSeriesData: barSeries,
      barChartOption: barOption
    });
  }
})

function updateCategory(categoryDetails) {
  return Object.entries(categoryDetails)
    .map(([id, item]) => ({
      id,
      name: item.name,
      icon: item.icon,
      amount: parseFloat(item.amount || 0).toFixed(2),
      percent: (item.percentage || 0).toFixed(1)
    }))
    .filter(item => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}