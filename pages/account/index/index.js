// pages/index/index.js
const util = require('../../../utils/util.js')
const { api } = require('../../../utils/api.js');
const app = getApp();

// 统一反馈方法
const showFeedback = (title, icon = 'none') => {
  wx.showToast({ title, icon });
};

// API调用封装
const callAPI = async (apiFunc, params, loadingText = '加载中...') => {
  try {
    wx.showLoading({ title: loadingText });
    const res = await apiFunc(params);
    wx.hideLoading();
    
    if (res.code !== 200) {
      showFeedback(res.message || '操作失败');
      return null;
    }
    return res.data;
  } catch (err) {
    wx.hideLoading();
    showFeedback('网络错误');
    console.error(err);
    return null;
  }
};
Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    monthlyStats: {
      income: 0,
      expense: 0
    },
    expenseCategories: [],//支出分类
    incomeCategories:[],//收入分类
    recentTransactions: [], //最近账单
    budgets: [], //预算进度
    showQuickRecordModal: false,
    quickRecordData: {
      type: 'expense',
      category: 1,
      amount: '',
      description: '',
      date: util.getCurrentDateTime(false)
    }
  },

  onLoad: function() {
    // console.log('onLoad - 仅首次加载执行'); 
    this.loadInitialData();
  },
  
  onShow: function() {
    // console.log('onShow - 每次页面可见时执行');
    if (!app.globalData.token) {
      this.resetData();
      return;
    }
    this.loadInitialData();
  },

  resetData: function() {
    this.setData({
      recentTransactions: [],
      monthlyStats: { income: 0, expense: 0, amount: 0 }
    });
  },

  loadInitialData: async function() {
    if (app.globalData.isFetchingToken) {
      // console.log('等待token获取完成');
      return;
    }
    if (!app.globalData.token) 
    {
      app.globalData.isFetchingToken = true; // 加锁
      try {
        await this.onWechatLogin();
      } finally {
        app.globalData.isFetchingToken = false; // 解锁
      }
    }
    this.setData({
      expenseCategories: app.globalData.categories.filter(item=>item.type==="expense").slice(0, 3), //支出分类(前3个)
      incomeCategories: app.globalData.categories.filter(item=>item.type==="income").slice(0, 3), //支出分类(前3个)
    })
    await Promise.all([
      this.loadRecentTransactions(),
      this.loadMonthData()
    ]);
  },

  loadBudgetProgress: async function() {
    if (!app.globalData.token) return;
    
    const { currentYear, currentMonth } = this.data;
    const params = {
      budget_year: currentYear,
      budget_month: currentMonth
    };

    const data = await callAPI(api.budgets.getProgress.bind(api.budgets), params);
    if (!data) return;
    this.setData({ budgets: data });
    return data;
  },

  // 最近账单
  loadRecentTransactions: async function() {
    if (!app.globalData.token) return;
    
    const today = util.getCurrentDateTime(false);
    const lastWeek = util.subtractDays(new Date(), 7, false);
    const params = {
      page: 1,
      page_size: 5,
      type: 'All',
      start_date: lastWeek,
      end_date: today
    };

    const data = await callAPI(api.transaction.getList.bind(api.transaction), params);
    if (!data) return;

    const transactions = data.list.map(t => this.enrichTransactionData(t));
    this.setData({ recentTransactions: transactions });
    return transactions;
  },

  //首页自动加载登录
  onWechatLogin:async function(){
    try {

      // 1. 调用微信登录 API，获取 code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      if (!loginRes.code) {
        throw new Error('微信服务异常');
      }

      // 2. 调用你的后端接口，传递 code，让后端通过微信接口获取 openid / unionid 并完成注册或登录
      const res = await callAPI(
        api.user.wechatLogin.bind(api.user), // 注意：你需要在 api.js 中添加这个接口
        { code: loginRes.code },
        '登录中...'
      );
      // 3. 处理登录成功逻辑
      const { userInfo, token } = res;
      app.globalData.userInfo = userInfo;
      app.globalData.token = token;
      
    } catch (err) {
      wx.showToast({
        title: err.message || '未注册...',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  enrichTransactionData: function(transaction) {
    const category = app.globalData.categories.find(c => c.id === transaction.categoryid);
    return {
      ...transaction,
      categoryName: category?.name || '其他',
      categoryIcon: category?.icon || 'ellipsis-h'
    };
  },

  getTopCategories: function(type, categories) {
    return categories
      .filter(c => c.type === type)
      .slice(0, 3)
      .map(item => ({ ...item, categoryType: type }));
  },

  
  quickRecord: function(e) {
    const { category, type } = e.currentTarget.dataset;
    const categoryName = this.getCategoryName(category);
    
    this.setData({
      'quickRecordData.category': category,
      'quickRecordData.type': type,
      'quickRecordData.categoryName': categoryName,
      showQuickRecordModal: true
    });
  },

  getCategoryName: function(categoryId) {
    const allCategories = [...this.data.expenseCategories, ...this.data.incomeCategories];
    const category = allCategories.find(item => item.id === categoryId);
    return category?.name || '未知分类';
  },

  closeQuickRecord: function() {
    this.setData({ showQuickRecordModal: false });
  },

  onAmountInput: function(e) {
    const value = this.validateAmountInput(e.detail.value);
    if (value !== null) {
      this.setData({ 'quickRecordData.amount': value });
    }
  },

  validateAmountInput: function(value) {
    // 1. 过滤非数字和小数点
    value = value.replace(/[^\d.]/g, '');
    
    // 2. 处理多个小数点
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1) {
      value = value.substring(0, dotIndex + 1) + value.substring(dotIndex + 1).replace(/\./g, '');
    }

    const parts = value.split('.');
    
    // 3. 验证整数部分
    if (parts[0]?.length > 9) {
      showFeedback('整数部分最多9位');
      return null;
    }

    // 4. 处理小数部分
    if (parts[1] !== undefined) {
      if (parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2);
        showFeedback('小数部分必须2位');
      }
      value = parts[0] + '.' + parts[1];
    }

    return value;
  },

  onDescriptionInput: function(e) {
    this.setData({ 'quickRecordData.description': e.detail.value });
  },

  onDateChange: function(e) {
    this.setData({ 'quickRecordData.date': e.detail.value });
  },

  updateMonth: function(change) {
    let { currentYear, currentMonth } = this.data;
    
    currentMonth += change;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    } else if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }

    this.setData({ currentYear, currentMonth }, () => {
      this.loadMonthData();
    });
  },

  prevMonth: function() {
    this.updateMonth(-1);
  },

  nextMonth: function() {
    this.updateMonth(1);
  },

  loadMonthData: async function() {
    if (!app.globalData.token) return;
    
    const { currentYear, currentMonth } = this.data;
    const dateRange = util.getMonthRangeBynum(currentMonth, currentYear);
    
    const params = {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate
    };

    const data = await callAPI(api.transaction.summary.bind(api.transaction), params);
    if (!data) return;

    this.setData({
      monthlyStats: {
        income: data.total_income,
        expense: data.total_expense,
        amount: data.balance
      }
    },()=>{
      this.loadBudgetProgress();
    });
  },

  showQuickRecord: function () {
    this.setData({
      showQuickRecordModal: true
    });
  },

  // 记账入口
  navigateToRecord: function () {
    wx.navigateTo({
      url: '/pages/account/record/record'
    });
  },
  // 明细入口
  navigateToDetail: function () {
    wx.navigateTo({
      url: '/pages/account/detail/detail',
      success: () => {
        // 通过事件总线通知
        app.eventBus.emit('refreshDetail');
      }
    });
  },
  viewDetail: function (e) {
    console.log('点击明细');
    const id = e.currentTarget.dataset.id;
     // 显示加载状态
    wx.showLoading({
      title: '加载中...',
    });
    // 调用新接口获取交易详情
    wx.navigateTo({
      url: `/pages/account/detail/transaction-detail?id=${id}`
    });
  },

  navigateToPhotoRecord: function () {
    wx.navigateTo({
      url: '/pages/account/record/photo-record'
    });
  },
  navigateToBudget:function(){
    wx.navigateTo({
      url: '/pages/account/budget/budget'
    });
  },
  navigateToVoiceRecord: function () {
    wx.navigateTo({
      url: '/pages/account/record/voice-record'
    });
  },
  // 统计入口
  goToStatsPage: function () {
    wx.navigateTo({
      url: '/pages/account/stats/stats'
    });
  },

  submitQuickRecord: async function() {
    const { quickRecordData } = this.data;
    
    if (!this.validateQuickRecord(quickRecordData)) return;
    if (!app.globalData.userInfo) {
      showFeedback('请先登录');
      return;
    }

    const params = {
      type: quickRecordData.type,
      categoryid: quickRecordData.category,
      amount: parseFloat(quickRecordData.amount),
      date: quickRecordData.date,
      description: quickRecordData.description || ''
    };

    const data = await callAPI(api.transaction.add.bind(api.transaction), params, '提交中...');
    if (!data) return;

    showFeedback('记账成功', 'success');
    this.resetQuickRecordForm();
    this.loadInitialData();
  },

  validateQuickRecord: function(record) {
    if (!record.amount) {
      showFeedback('请输入金额');
      return false;
    }

    const amount = parseFloat(record.amount);
    if (isNaN(amount) || amount <= 0) {
      showFeedback('请输入有效的金额');
      return false;
    }

    return true;
  },

  resetQuickRecordForm: function() {
    this.setData({
      showQuickRecordModal: false,
      'quickRecordData.amount': '',
      'quickRecordData.description': '',
      'quickRecordData.categoryName': ''
    });
  },

  // 我的入口
  navigateToProfile: function() {
    wx.navigateTo({
      url: '/pages/account/profile/profile'
    });
  }
});