// pages/record/record.js
const util = require('../../../utils/util.js');
const { api } = require('../../../utils/api.js');
const app = getApp();

// 工具方法
const showFeedback = (title, icon = 'none') => wx.showToast({ title, icon });

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

const validateAmountInput = (value) => {
  value = value.replace(/[^\d.]/g, '');
  const dotIndex = value.indexOf('.');
  if (dotIndex !== -1) {
    value = value.substring(0, dotIndex + 1) + value.substring(dotIndex + 1).replace(/\./g, '');
  }

  const parts = value.split('.');
  if (parts[0]?.length > 9) {
    showFeedback('整数部分最多9位');
    return null;
  }

  if (parts[1]?.length > 2) {
    parts[1] = parts[1].substring(0, 2);
    showFeedback('小数部分必须2位');
  }
  return parts[1] ? `${parts[0]}.${parts[1]}` : parts[0];
};

const getDefaultCategory = (categories) => categories[0]?.id || null;
Page({
  data: {
    activeTab: 'expense',
    expenseCategories: [],
    incomeCategories: [],
    selectedCategory: null,
    amount: '',
    amountFocus: true,
    date: util.getCurrentDateTime(false),
    description: '',
    canSave: false
  },

  onLoad: function() {
    this.loadCategories();
  },
  
  onShow: function() {
    this.setData({
      amountFocus: true
    });
    this.loadCategories();
  },
  
  loadCategories: function() {

    const { categories } = app.globalData;
    
    // 如果分类数据为空，等待一段时间后重新尝试加载
    if (!categories || categories.length === 0) {
      this.waitForCategories();
      return;
    }
    
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');
    
    this.setData({
      expenseCategories,
      incomeCategories,
      selectedCategory: expenseCategories.length > 0 ? expenseCategories[0].id : null
    });
    
    this.checkCanSave();
  },
  
  waitForCategories: function() {
    let attempts = 0;
    const maxAttempts = 4; // 最多等待10秒 (20 * 500ms)
    
    const checkCategories = () => {
      const { categories } = app.globalData;
      
      if (categories && categories.length > 0) {
        // 分类数据已加载完成
        const expenseCategories = categories.filter(c => c.type === 'expense');
        const incomeCategories = categories.filter(c => c.type === 'income');
        
        this.setData({
          expenseCategories,
          incomeCategories,
          selectedCategory: expenseCategories.length > 0 ? expenseCategories[0].id : null
        });
        
        this.checkCanSave();
      } else if (attempts < maxAttempts) {
        // 继续等待
        attempts++;
        setTimeout(checkCategories, 500);
      } else {
        // 超时，通知用户数据加载失败
        showFeedback('数据加载失败，请检查网络');
      }
    };
    
    // 开始检查
    checkCategories();
  },
  
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    
    if (tab !== this.data.activeTab) {
      const categories = tab === 'expense' ? this.data.expenseCategories : this.data.incomeCategories;
      const selectedCategory = categories.length > 0 ? categories[0].id : null;
      
      this.setData({
        activeTab: tab,
        selectedCategory
      });
    }
  },
  
  selectCategory: function(e) {
    const id = e.currentTarget.dataset.id;
    
    this.setData({
      selectedCategory: id
    });
    
    this.checkCanSave();
  },
  
  onAmountInput(e) {
    const value = validateAmountInput(e.detail.value);
    if (value !== null) {
      this.setData({ amount: value });
      this.checkCanSave();
    }
  },
  
  onDateChange: function(e) {
    this.setData({
      date: e.detail.value
    });
  },
  
  onDescriptionInput: function(e) {
    this.setData({
      description: e.detail.value
    });
  },
  
  checkCanSave: function() {
    const { amount, selectedCategory } = this.data;
    const canSave = amount && selectedCategory && parseFloat(amount) > 0;
    this.setData({ canSave });
  },
  
  async saveRecord() {
    if (!this.data.canSave) {
      showFeedback('请填写完整信息');
      return;
    }
    
    if (!app.globalData.userInfo) {
      showFeedback('请先登录');
      return;
    }
    
    const params = {
      type: this.data.activeTab,
      categoryid: this.data.selectedCategory,
      amount: parseFloat(this.data.amount),
      date: this.data.date,
      description: this.data.description
    };

    const data = await callAPI(api.transaction.add.bind(api.transaction), params, '提交中...');
    if (!data) return;

    showFeedback('记账成功', 'success');
    this.resetForm();
  },

  resetForm() {
    this.setData({
      amount: '',
      description: '',
      selectedCategory: getDefaultCategory(this.data.expenseCategories),
      canSave: false
    });
  }
});