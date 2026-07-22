const app = getApp();
const { api } = require('../../../utils/api.js');
/**
 * 统一API调用方法
 * @param {Function} apiFunc API方法
 * @param {Object} params 请求参数
 * @param {String} loadingText 加载提示文本
 * @returns {Promise} 返回API调用结果
 */
const callAPI = async (apiFunc, params, loadingText = '处理中...') => {
  try {
    wx.showLoading({ title: loadingText });
    const res = await apiFunc(params);
    wx.hideLoading();
    if (res.code === 200) {
      return res.data;
    }
    throw new Error(res.message || '操作失败');
  } catch (err) {
    wx.hideLoading();
    throw err;
  }
};

/**
 * 交易详情页
 * 功能：
 * 1. 查看交易详情
 * 2. 编辑交易信息
 * 3. 删除交易记录
 */
Page({
  // 页面初始数据
  data: {
    transaction: null,
    showEditPopup: false,
    showDeleteConfirm: false,
    editData: {
      type: 'expense',
      category: 1,
      amount: '',
      description: '',
      date: ''
    },
    categoryNames: [],
    categoryIds: [],
    categoryIndex: 0
  },

  onLoad: function (options) {
    this.transactionId = options.id;  // 直接使用原始ID字符串，避免数值转换
    this.viewTransactionDetail();
  },

  /**
   * 查看交易详情
   */
  async viewTransactionDetail() {
    const data = await callAPI(
      () => api.transaction.getDetail(this.transactionId),
      {},
      '加载中...'
    );

    if (data) {
      const transaction_detail = {
        id: data.id,
        type: data.type,
        category: data.category.id,
        categoryIcon: data.category.icon,
        categoryName: data.category.name,
        amount: data.amount,
        description: data.description,
        date: data.date
      };
      this.setData({
        transaction: transaction_detail,
        editData: {
          type: transaction_detail.type,
          category: transaction_detail.category,
          amount: transaction_detail.amount.toString(),
          description: transaction_detail.description || '',
          date: transaction_detail.date
        }
      });
      this.loadCategories();
    }
  },
  /**
   * 根据类型筛选分类
   */
  filterCategoriesByType: function(type) {
    return app.globalData.categories
      .filter(c => c.type === type)
      .map(c => ({ name: c.name, id: c.id }));
  },

  /**
   * 加载当前类型的分类列表
   */
  loadCategories: function() {
    const { type, category } = this.data.editData;
    const filteredCategories = this.filterCategoriesByType(type);
    
    const categoryIndex = filteredCategories
      .findIndex(c => c.id === category);

    this.setData({
      categoryNames: filteredCategories.map(c => c.name),
      categoryIds: filteredCategories.map(c => c.id),
      categoryIndex: Math.max(categoryIndex, 0)
    });
  },

  editTransaction: function () {
    this.setData({
      showEditPopup: true
    });
  },

  hideEditPopup: function () {
    this.setData({
      showEditPopup: false
    });
  },

  selectType: function (e) {
    const type = e.currentTarget.dataset.type;

    this.setData({
      'editData.type': type
    });

    // 切换类型后重新加载对应的分类列表
    this.loadCategories();
  },

  /**
   * 格式化金额输入
   */
  formatAmountInput: function(value) {
    // 1. 过滤非数字和小数点
    value = value.replace(/[^\d.]/g, '');
    
    // 2. 处理多个小数点
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1) {
      value = value.substring(0, dotIndex + 1) + 
              value.substring(dotIndex + 1).replace(/\./g, '');
    }
    return value;
  },

  /**
   * 验证金额格式
   */
  validateAmountFormat: function(value) {
    const parts = value.split('.');
    
    // 验证整数部分
    if (parts[0] && parts[0].length > 9) {
      wx.showToast({ title: '整数部分最多9位', icon: 'none' });
      return false;
    }
    
    // 验证小数部分
    if (parts[1] !== undefined && parts[1].length > 2) {
      wx.showToast({ title: '小数部分必须2位', icon: 'none' });
      return false;
    }
    
    return true;
  },

  /**
   * 处理金额输入
   */
  onAmountInput: function(e) {
    let value = this.formatAmountInput(e.detail.value);
    
    if (!this.validateAmountFormat(value)) {
      return;
    }
    
    // 自动补全2位小数
    const parts = value.split('.');
    if (parts[1] !== undefined) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    this.setData({ 'editData.amount': value });
  },

  onCategoryChange: function (e) {
    const index = parseInt(e.detail.value);
    const categoryId = this.data.categoryIds[index];

    this.setData({
      categoryIndex: index,
      'editData.category': categoryId
    });
  },

  onDateChange: function (e) {
    this.setData({
      'editData.date': e.detail.value
    });
  },

  onDescriptionInput: function (e) {
    this.setData({
      'editData.description': e.detail.value
    });
  },

  /**
   * 验证金额输入是否有效
   */
  validateAmount: function(amount) {
    if (!amount || isNaN(parseFloat(amount))) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      });
      return false;
    }
    return true;
  },

  /**
   * 更新交易数据状态
   */
  updateTransactionData: function(data) {
    const categoryInfo = this.getCategoryInfo(data.category);
    
    this.setData({
      transaction: {
        id: this.transactionId,
        ...data,
        categoryIcon: categoryInfo.icon,
        categoryName: categoryInfo.name
      },
      editData: {
        type: data.type,
        category: data.category,
        amount: data.amount.toString(),
        description: data.description || '',
        date: data.date
      },
      showEditPopup: false
    });
    this.loadCategories();
  },

  /**
   * 保存编辑的交易信息
   */
  async saveEdit() {
    const { editData } = this.data;
    if (!this.validateAmount(editData.amount)) return;

    const data = await callAPI(
      () => api.transaction.update(this.transactionId,editData),
      {},
      '保存中...'
    );
    if (data) {
      wx.showToast({ title: '更新成功' });
      this.updateTransactionData(editData);
    }
  },

  /**
 * 根据分类ID获取分类信息
 * @param {number} categoryId 分类ID
 * @returns {Object} 包含分类名称和图标的对象
 */
getCategoryInfo:function(categoryId) {
  const category = app.globalData.categories.find(c => c.id === categoryId);
  return {
    name: category ? category.name : '其他',
    icon: category ? category.icon : 'question-circle'
  };
},
  deleteTransaction: function () {
    this.setData({
      showDeleteConfirm: true
    });
  },

  hideDeleteConfirm: function () {
    this.setData({
      showDeleteConfirm: false
    });
  },

  async confirmDelete() {
    const success = await callAPI(
      () => api.transaction.delete(this.transactionId),
      {},
      '删除中...'
    );

    if (success) {
      wx.showToast({ title: '删除成功' });
      this.setData({ showDeleteConfirm: false });
      setTimeout(() => wx.navigateBack(), 500);
    }
  }
})