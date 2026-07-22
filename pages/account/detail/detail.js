// pages/detail/detail.js
const util = require('../../../utils/util.js');
const { api } = require('../../../utils/api.js');
const app = getApp();

// 统一反馈方法
const showFeedback = (title, icon = 'none') => wx.showToast({ title, icon });

// API调用封装
const callAPI = async (apiFunc, params, loadingText = '加载中...') => {
  try {
    wx.showLoading({ title: loadingText });
    const res = await apiFunc(params);
    wx.hideLoading();
    return res.code === 200 ? res.data : (showFeedback(res.message || '操作失败'), null);
  } catch (err) {
    wx.hideLoading();
    showFeedback('网络错误');
    console.error(err);
    return null;
  }
};

// 日期范围获取器
const getDateRange = (filter, customStart, customEnd) => {
  const now = new Date();
  switch (filter) {
    case 'today': 
      return { start: util.formatDateTime(now, false), end: util.formatDateTime(now, false) };
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return { start: util.formatDateTime(yesterday, false), end: util.formatDateTime(yesterday, false) };
    case 'thisWeek': {
      const weekRange = util.getWeekRange(now, false);
      return { start: weekRange.startDate, end: weekRange.endDate };
    }
    case 'thisMonth': {
      const monthRange = util.getMonthRange(now);
      return { start: monthRange.startDate, end: monthRange.endDate };
    }
    case 'lastMonth': {
      const lastMonthRange = util.getLastMonthRange(now);
      return { start: lastMonthRange.startDate, end: lastMonthRange.endDate };
    }
    case 'custom':
      return { start: customStart, end: customEnd };
    default:
      return { start: '', end: '' };
  }
};
Page({
  data: {
    // 筛选条件
    dateFilter: 'thisMonth',
    dateFilterText: '本月',
    typeFilter: 'all',
    typeFilterText: '全部',
    categoryFilter: 'all',
    categoryFilterText: '全部分类',

    // 自定义日期范围
    customStartDate: util.getCurrentDateTime(false),
    customEndDate: util.getCurrentDateTime(false),

    // 弹窗显示状态
    showDateFilterPopup: false,
    showTypeFilterPopup: false,
    showCategoryFilterPopup: false,

    // 数据
    expenseCategories: [],
    incomeCategories: [],
    groupedTransactions: [],
    cachedTransactions: [], // 缓存当前页数据
    allTransactions: [],    // 所有已加载数据的索引
    filteredStats: {
      income: 0,
      expense: 0,
      amount: 0
    },
    
    // 分页相关状态
    page: 1,
    pageSize: 20,
    maxPages: 20,          // 最大加载页数限制
    hasMore: false,
    isLoading: false,
    visibleRange: [0, 20]   // 可视区域数据范围
  },

  onLoad: function () {
    this.loadCategories();
    // 监听全局事件
    app.eventBus.on('refreshDetail', () => {
      this.onShow(); // 手动触发 onShow 逻辑
    });
  },

  onShow: function () {
    if (!app.globalData.token) {
      this.setData({
        cachedTransactions: [],
        filteredStats: {
          income: 0,
          expense: 0,
          amount: 0
        }
      })
    }
    this.applyFilters();
    console.log('明细onshow')
  },

  loadCategories: function () {
    const {
      categories
    } = app.globalData;

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

    this.setData({
      expenseCategories,
      incomeCategories
    });
  },

  // 日期筛选相关
  showDateFilter: function () {
    this.setData({
      showDateFilterPopup: true
    });
  },

  hideDateFilter: function () {
    this.setData({
      showDateFilterPopup: false
    });
  },

  selectDateFilter: function (e) {
    const filter = e.currentTarget.dataset.filter;

    this.setData({
      dateFilter: filter
    });
  },

  onStartDateChange: function (e) {
    this.setData({
      customStartDate: e.detail.value
    });
  },

  onEndDateChange: function (e) {
    this.setData({
      customEndDate: e.detail.value
    });
  },

  resetDateFilter: function () {
    this.setData({
      dateFilter: 'thisMonth',
      customStartDate: util.getCurrentDateTime(),
      customEndDate: util.getCurrentDateTime()
    });
  },

  applyDateFilter: function () {
    let dateFilterText = '全部时间';

    switch (this.data.dateFilter) {
      case 'today':
        dateFilterText = '今天';
        break;
      case 'yesterday':
        dateFilterText = '昨天';
        break;
      case 'thisWeek':
        dateFilterText = '本周';
        break;
      case 'thisMonth':
        dateFilterText = '本月';
        break;
      case 'lastMonth':
        dateFilterText = '上月';
        break;
      case 'custom':
        dateFilterText = this.data.customStartDate + ' 至 ' + this.data.customEndDate;
        break;
      default:
        dateFilterText = '全部时间';
    }

    this.setData({
      dateFilterText,
      showDateFilterPopup: false
    });

    this.applyFilters();
  },

  // 类型筛选相关
  showTypeFilter: function () {
    this.setData({
      showTypeFilterPopup: true
    });
  },

  hideTypeFilter: function () {
    this.setData({
      showTypeFilterPopup: false
    });
  },

  selectTypeFilter: function (e) {
    const filter = e.currentTarget.dataset.filter;

    this.setData({
      typeFilter: filter
    });
  },

  resetTypeFilter: function () {
    this.setData({
      typeFilter: 'all'
    });
  },

  applyTypeFilter: function () {
    let typeFilterText = '全部';

    switch (this.data.typeFilter) {
      case 'expense':
        typeFilterText = '支出';
        break;
      case 'income':
        typeFilterText = '收入';
        break;
      default:
        typeFilterText = '全部';
    }

    this.setData({
      typeFilterText,
      showTypeFilterPopup: false
    });

    this.applyFilters();
  },

  // 分类筛选相关
  showCategoryFilter: function () {
    this.setData({
      showCategoryFilterPopup: true
    });
  },

  hideCategoryFilter: function () {
    this.setData({
      showCategoryFilterPopup: false
    });
  },

  selectCategoryFilter: function (e) {
    const filter = e.currentTarget.dataset.filter;

    this.setData({
      categoryFilter: filter
    });
  },

  resetCategoryFilter: function () {
    this.setData({
      categoryFilter: 'all'
    });
  },

  applyCategoryFilter: function () {
    let categoryFilterText = '全部分类';
    if (this.data.categoryFilter !== 'all') {
      const {
        categories
      } = app.globalData;
      const category = categories.find(c => c.id === parseInt(this.data.categoryFilter));
      if (category) {
        categoryFilterText = category.name;
      }
    }

    this.setData({
      categoryFilterText,
      showCategoryFilterPopup: false
    });

    this.applyFilters();
  },

  // 应用所有筛选条件
  applyFilters: async function () {
    // 总是先获取最新数据（monthTransactions内部会更新缓存）
    await this.monthTransactions();

    // 从缓存中获取数据用于过滤
    const transactions = this.data.cachedTransactions || [];

    const {
      categories
    } = app.globalData;
    // 筛选交易记录
    const filteredTransactions = this.filterTransactions(transactions);
    // 为每个交易记录添加图标和分类名称
    const filteredTransactionsWithIcons = filteredTransactions.map(transaction => {
      const category = categories.find(c => c.id === transaction.categoryid);
      return {
        ...transaction,
        categoryName: category ? category.name : '其他',
        categoryIcon: category ? category.icon : 'ellipsis-h'
      };
    });

    // 按日期分组
    const groupedTransactions = util.groupTransactionsByDate(filteredTransactionsWithIcons);

    // 为每个分组添加每日支出和收入统计
    const groupedTransactionsWithStats = groupedTransactions.map(group => {
      const expense = group.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const income = group.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        ...group,
        dayExpense: expense.toFixed(2),
        dayIncome: income.toFixed(2)
      };
    });

    // 计算统计数据
    const income = filteredTransactionsWithIcons
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = filteredTransactionsWithIcons
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const amount = income - expense;
    this.setData({
      groupedTransactions: groupedTransactionsWithStats,
      filteredStats: {
        income: income.toFixed(2),
        expense: expense.toFixed(2),
        amount: amount.toFixed(2)
      }
    });
  },

  // 加载更多数据
  async loadMore() {
    if (!this.data.hasMore || this.data.isLoading) return;

    this.setData({ 
      isLoading: true,
      page: this.data.page + 1 
    });

    const { start, end } = getDateRange(
      this.data.dateFilter,
      this.data.customStartDate,
      this.data.customEndDate
    );

    const params = {
      page: this.data.page,
      page_size: this.data.pageSize,
      type: 'All',
      start_date: start,
      end_date: end,
      token: util.getToken()
    };

    const data = await callAPI(api.transaction.getList.bind(api.transaction), params,'加载更多数据...');
    if (!data) {
      this.setData({ isLoading: false });
      return;
    }

    const newList = data.list.map(item => ({
      ...item,
      categoryIcon: this.getCategoryIcon(item.categoryid),
      categoryName: this.getCategoryName(item.categoryid)
    }));

    const updatedList = [...this.data.cachedTransactions, ...newList];
    const result = this.processTransactions(updatedList);

    this.setData({
      cachedTransactions: updatedList,
      groupedTransactions: result.grouped,
      filteredStats: result.stats,
      hasMore: data.list.length >= this.data.pageSize,
      isLoading: false
    });
  },

  async monthTransactions() {
    if (!app.globalData.token) return [];

    this.setData({ 
      page: 1,
      hasMore: true,
      isLoading: true 
    });

    const { start, end } = getDateRange(
      this.data.dateFilter,
      this.data.customStartDate,
      this.data.customEndDate
    );

    const params = {
      page: this.data.page,
      page_size: this.data.pageSize,
      type: 'All',
      start_date: start,
      end_date: end
    };

    const data = await callAPI(api.transaction.getList.bind(api.transaction), params);
    if (!data) {
      this.setData({ isLoading: false });
      return [];
    }

    const list = data.list.map(item => ({
      ...item,
      categoryIcon: this.getCategoryIcon(item.categoryid),
      categoryName: this.getCategoryName(item.categoryid)
    }));

    this.setData({
      cachedTransactions: list,
      hasMore: data.list.length >= this.data.pageSize,
      isLoading: false
    });

    return list;
  },
  // 辅助方法：获取分类图标
  getCategoryIcon: function (categoryId) {
    const category = app.globalData.categories.find(c => c.id === categoryId);
    return category?.icon || 'ellipsis-h';
  },

  // 处理交易数据
  processTransactions: function(transactions) {
    // 筛选交易记录
    const filtered = this.filterTransactions(transactions);
    
    // 添加分类信息
    const withCategories = filtered.map(t => ({
      ...t,
      categoryName: this.getCategoryName(t.categoryid),
      categoryIcon: this.getCategoryIcon(t.categoryid)
    }));

    // 分组并计算统计
    const grouped = util.groupTransactionsByDate(withCategories).map(group => ({
      ...group,
      dayExpense: this.getDayExpense(group.transactions),
      dayIncome: this.getDayIncome(group.transactions)
    }));

    // 计算总统计
    const income = withCategories
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = withCategories
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      grouped,
      stats: {
        income: income.toFixed(2),
        expense: expense.toFixed(2),
        amount: (income - expense).toFixed(2)
      }
    };
  },

  // 辅助方法：获取分类名称
  getCategoryName: function (categoryId) {
    const category = app.globalData.categories.find(c => c.id === categoryId);
    return category?.name || '其他';
  },

  filterTransactions: function (transactions) {
    const {
      dateFilter,
      typeFilter,
      categoryFilter,
      customStartDate,
      customEndDate
    } = this.data;
    // console.log('dateFilter:',dateFilter)
    // console.log('transactions',transactions)
    return transactions.filter(t => {
      // 日期筛选
      if (!this.matchesDateFilter(t.date, dateFilter, customStartDate, customEndDate)) {
        return false;
      }

      // 类型筛选
      if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }

      // 分类筛选
      if (categoryFilter !== 'all' && t.categoryid !== parseInt(categoryFilter)) {
        return false;
      }

      return true;
    });
  },

  matchesDateFilter: function (dateStr, filter, startDate, endDate) {
    try {
      const inputDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (filter) {
        case 'today':
          return util.formatDateTime(inputDate, false) === util.formatDateTime(today, false);

        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          return util.formatDateTime(inputDate, false) === util.formatDateTime(yesterday, false);
        }

        case 'thisWeek': {
          const {
            startDate: weekStart,
            endDate: weekEnd
          } = util.getWeekRange(new Date(), false);
          return inputDate >= new Date(weekStart) && inputDate <= new Date(weekEnd);
        }

        case 'thisMonth': {
          const {
            startDate: monthStart,
            endDate: monthEnd
          } = util.getMonthRange(new Date());
          return inputDate >= new Date(monthStart) && inputDate <= new Date(monthEnd);
        }

        case 'lastMonth': {
          const lastMonth = new Date(today);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
          const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
          return inputDate >= lastMonthStart && inputDate <= lastMonthEnd;
        }

        case 'custom': {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return inputDate >= start && inputDate <= end;
        }

        default: // 'all'
          return true;
      }
    } catch (e) {
      console.error('日期筛选出错:', e);
      return false;
    }
  },
  // 辅助方法
  getDayExpense: function (transactions) {
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return expense.toFixed(2);
  },

  getDayIncome: function (transactions) {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    return income.toFixed(2);
  },

  viewTransactionDetail: function (e) {
    const id = e.currentTarget.dataset.id;

    wx.navigateTo({
      url: `/pages/account/detail/transaction-detail?id=${id}`
    });
  }
})