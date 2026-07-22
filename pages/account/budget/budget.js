const { api } = require('../../../utils/api.js');
const app = getApp();

// 工具方法
const generateYears =  () => {
  const endYear = new Date().getFullYear() + 1; // Include next year
  const startYear = 2020;
  return Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );
};
const generateMonths = () => Array.from({ length: 12 }, (_, i) => i + 1);

Page({
  data: {
    categories: [],
    activeTab: 0,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    years: generateYears(),
    months: generateMonths(),
    budgets: {},
    currentBudget: {}
  },

  // 初始化方法
  onLoad: function() {
    this._initBudgetData();
    this._initPageData();
  },

  _initPageData: function() {
    const categories = app.globalData.categories.filter(item => item.type === 'expense');
    this.setData({ categories }, () => {
      this.loadBudgets();
    });
  },

  _initBudgetData: function() {
    return {
      categoryId: 0,
      categoryIcon: '',
      categoryName: '',
      budgetId: 0,
      amount: 0,
      budgetYear: '',
      budgetMonth: ''
    };
  },

  // 初始化或更新currentBudget对象
  initCurrentBudget: function(index = 0, value = 0) {
    const { currentYear, currentMonth, categories, budgets, activeTab } = this.data;
    
    if (!categories.length) return;
    
    const category = categories[activeTab];
    const matchedBudget = Array.isArray(budgets) 
      ? budgets.find(item => 
          item.category_id === category.id &&
          item.budget_year === currentYear &&
          item.budget_month === currentMonth
        )
      : null;

    this.setData({
      currentBudget: {
        categoryId: category.id,
        categoryIcon: category.icon,
        categoryName: category.name,
        budgetId: matchedBudget?.id || null,
        amount: matchedBudget?.amount || value,
        budgetYear: currentYear,
        budgetMonth: currentMonth
      }
    });
  },

  // 标签页切换
  handleTabChange: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeTab: index }, () => {
      this.initCurrentBudget(index);
    });
  },

  // 预算金额输入
  handleBudgetChange: function(e) {
    let value = e.detail.value;
    // 过滤掉所有非数字和小数点的字符
    value = value.replace(/[^\d.]/g, '');
    // 处理多个小数点的情况，只保留第一个
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    // 验证整数部分不超过7位，小数部分不超过2位
    const isValid = /^\d{0,7}(\.\d{0,2})?$/.test(value);
    
    if (isValid || value === '') {
      this.setData({
        currentBudget: {
          ...this.data.currentBudget,
          amount: value
        }
      });
    } else {
      // 如果输入无效，回退到上一次的有效值
      const prevValue = this.data.currentBudget.amount || '';
      if (value !== prevValue) {
        this.setData({
          currentBudget: {
            ...this.data.currentBudget,
            amount: prevValue
          }
        });
      }
    }
  },

  // 年份选择
  handleYearChange: function(e) {
    const year = this.data.years[e.detail.value];
    this.setData({ currentYear: year }, () => {
      this.loadBudgets();
    });
  },

  // 月份选择
  handleMonthChange: function(e) {
    const month = this.data.months[e.detail.value];
    this.setData({ currentMonth: month }, () => {
      this.loadBudgets();
    });
  },

  // 加载预算数据
  loadBudgets: function() {
    const { currentYear, currentMonth } = this.data;
    
    wx.showLoading({ title: '加载中...' });
    
    api.budgets.getList({ year: currentYear, month: currentMonth })
      .then(res => {
        const list = res.data.map(item => {
          const matchedCategory = this.data.categories.find(c => c.id === item.category_id);
          return {
            ...item,
            icon: matchedCategory?.icon || '',
            iconName: matchedCategory?.name || ''
          };
        });
        this.setData({ budgets: list }, () => this.initCurrentBudget());
      })
      .catch(this._handleApiError.bind(this, '获取预算失败'))
      .finally(() => wx.hideLoading());
  },

  // 保存预算数据
  saveBudget: function() {
    const { currentBudget } = this.data;
    
    if (!this._validateBudget(currentBudget)) {
      return;
    }

    const payload = {
      category_id: currentBudget.categoryId,
      amount: currentBudget.amount,
      budget_year: currentBudget.budgetYear,
      budget_month: currentBudget.budgetMonth
    };

    const request = currentBudget.budgetId 
      ? api.budgets.update(currentBudget.budgetId, payload) 
      : api.budgets.create(payload);

    wx.showLoading({ title: '保存中...' });

    request
      .then(() => {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.loadBudgets();
      })
      .catch(this._handleApiError.bind(this, '保存预算失败'))
      .finally(() => wx.hideLoading());
  },

  // 删除预算数据
  deleteBudget: function(budgetId) {
    wx.showLoading({ title: '删除中...' });
    
    api.budgets.delete(budgetId)
      .then(() => {
        wx.showToast({ title: '删除成功', icon: 'success' });
        // 重置列表状态
        this.setData({
          budgets: [] // 先清空数组
        }, () => {
          // 然后重新加载预算数据
          this.loadBudgets();
        });
      })
      .catch(this._handleApiError.bind(this, '删除预算失败'))
      .finally(() => wx.hideLoading());
  },

  // 公共工具方法
  _validateBudget: function(budget) {
    if (!budget || budget.amount <= 0) {
      wx.showToast({ title: '请输入有效的预算金额', icon: 'none' });
      return false;
    }
    return true;
  },

  _handleApiError: function(message, err) {
    console.error(`${message}:`, err);
    wx.showToast({
      title: err.errMsg || message,
      icon: 'none'
    });
  },


  handleDeleteBudget: function(e) {
    const budgetId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条预算吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteBudget(budgetId);
        }
      }
    });
  }
});