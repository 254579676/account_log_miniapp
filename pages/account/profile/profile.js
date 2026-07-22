// pages/profile/profile.js
const {api} = require('../../../utils/api.js');
const app = getApp();

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
 * 统一错误处理方法
 * @param {Error} error 错误对象
 * @param {String} defaultMessage 默认错误提示
 */
const handleError = (error, defaultMessage = '操作失败') => {
  console.error(error);
  wx.showToast({
    title: error.message || defaultMessage,
    icon: 'none'
  });
};

/**
 * 验证登录表单
 */
const validateLoginForm = (email, password) => {
  if (!email) throw new Error('请输入邮箱');
  if (!password) throw new Error('请输入密码');
  return true;
};

/**
 * 验证注册表单
 */
const validateRegisterForm = (username, email, password, confirmPassword) => {
  if (!username) throw new Error('请输入用户名');
  if (username.length < 2 || username.length > 20) throw new Error('用户名长度需在2-20个字符之间');
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) throw new Error('用户名只能包含字母、数字、下划线和中文');
  if (!email) throw new Error('请输入邮箱');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('邮箱格式不正确');
  if (!password) throw new Error('请输入密码');
  if (password.length < 6 || password.length > 20) throw new Error('密码长度需在6-20个字符之间');
  if (!/(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}/.test(password)) throw new Error('密码必须包含字母和数字');
  if (!confirmPassword) throw new Error('请确认密码');
  if (password !== confirmPassword) throw new Error('两次密码输入不一致');
  return true;
};

Page({
  data: {
    totalDays: 0,
    totalRecords: 0,
    totalCategories: 0,
    showModal: false,
    isLoginMode: true,
    // 登录表单数据
    loginEmail: '',
    loginPassword: '',
    rememberMe: false, // 记住我选项
    // 注册表单数据
    registerUsername: '',
    registerEmail: '',
    registerPassword: '',
    registerConfirmPassword: '',
    // 用户登录状态
    isUserLoggedIn: false,
    userInfo: null
  },

  onLoad: function () {

  },

  onShow: function () {
    this.checkUserLoginStatus();
    this.getUserStatistics();
  },

  // 检查用户登录状态
  checkUserLoginStatus: function () {
    const userInfo = app.globalData.userInfo;

    if (userInfo) {
      this.setData({
        isUserLoggedIn: true,
    userInfo: userInfo
      });
    } else {
      this.setData({
        isUserLoggedIn: false,
        userInfo: null
      });
    }
  },

  navigateTo: function (e) {
    const url = e.currentTarget.dataset.url;

    // 检查页面是否已实现
    if (url === '/pages/account/profile/budget-setting' ||
      url === '/pages/account/profile/data-export' ||
      url === '/pages/account/profile/settings' ||
      url === '/pages/account/profile/feedback' ||
      url === '/pages/account/profile/about') {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url
    });
  },

  // 导航到学生管理页面
  navigateToStudentManage: function() {
    wx.navigateTo({
      url: '/pages/study/children/children'
    });
  },

  // 显示登录/注册弹窗
  showLoginModal: function () {
    this.setData({
      showModal: true
    });

    // 如果本地存储中有记住的邮箱，则自动填充
    const rememberedEmail = wx.getStorageSync('rememberedEmail');
    if (rememberedEmail) {
      this.setData({
        loginEmail: rememberedEmail,
        rememberMe: true
      });
    }
  },

  // 隐藏登录/注册弹窗
  hideModal: function () {
    this.setData({
      showModal: false,
      // 重置所有表单数据
      loginEmail: '',
      loginPassword: '',
      rememberMe: false,
      registerUsername: '',
      registerEmail: '',
      registerPassword: '',
      registerConfirmPassword: ''
    });
  },

  // 切换登录/注册模式
  switchMode: function () {
    this.setData({
      isLoginMode: !this.data.isLoginMode,
      // 切换时重置表单数据
      loginEmail: '',
      loginPassword: '',
      rememberMe: false,
      registerUsername: '',
      registerEmail: '',
      registerPassword: '',
      registerConfirmPassword: ''
    });
  },

  // 登录邮箱输入
  onLoginEmailInput: function (e) {
    this.setData({
      loginEmail: e.detail.value
    });
  },

  // 登录密码输入
  onLoginPasswordInput: function (e) {
    this.setData({
      loginPassword: e.detail.value
    });
  },

  // 记住我选项切换
  onRememberMeChange: function (e) {
    this.setData({
      rememberMe: e.detail.value
    });
  },

  // 注册用户名输入
  onRegisterUsernameInput: function (e) {
    this.setData({
      registerUsername: e.detail.value
    });
  },

  // 注册邮箱输入
  onRegisterEmailInput: function (e) {
    this.setData({
      registerEmail: e.detail.value
    });
  },

  // 注册密码输入
  onRegisterPasswordInput: function (e) {
    this.setData({
      registerPassword: e.detail.value
    });
  },

  // 注册确认密码输入
  onRegisterConfirmPasswordInput: function (e) {
    this.setData({
      registerConfirmPassword: e.detail.value
    });
  },

  // 确认按钮点击
  onConfirm: function () {
    if (this.data.isLoginMode) {
      this.handleLogin();
    } else {
      this.handleRegister();
    }
  },

  // 处理登录
  async handleLogin() {
    const { loginEmail, loginPassword, rememberMe } = this.data;
    
    try {
      validateLoginForm(loginEmail, loginPassword);
      
      const res = await callAPI(
        api.user.login.bind(api.user),
        { email: loginEmail, password: loginPassword },
        '登录中...'
      );

      // 处理登录成功逻辑
      const { user: userInfo, token } = res;
      app.globalData.userInfo = userInfo;
      app.globalData.token = token;
      
      if (rememberMe) {
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('token', token);
        wx.setStorageSync('loginTime', Date.now());
        wx.setStorageSync('rememberedEmail', loginEmail);
      } else {
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('token');
        wx.removeStorageSync('loginTime');
        wx.removeStorageSync('rememberedEmail');
      }

      this.setData({ isUserLoggedIn: true, userInfo });
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.getUserStatistics();
      this.hideModal();
    } catch (err) {
      handleError(err, '登录失败');
    }
  },

  // 获取统计数据
  async getUserStatistics() {
    if (!app.globalData.token) return;
    
    try {
      const data = await callAPI(
        api.transaction.statistics.bind(api.transaction),'加载数据中...'
      );
      
      this.setData({
        totalDays: data.transaction_days,
        totalRecords: data.transaction_count,
        totalCategories: data.category_count
      });
    } catch (err) {
      handleError(err, '获取统计数据失败');
    }
  },

  // 处理注册
  async handleRegister() {
    const {
      registerUsername,
      registerEmail,
      registerPassword,
      registerConfirmPassword
    } = this.data;

    try {
      validateRegisterForm(
        registerUsername,
        registerEmail,
        registerPassword,
        registerConfirmPassword
      );

      await callAPI(
        api.user.register.bind(api.user),
        {
          username: registerUsername,
          email: registerEmail,
          password: registerPassword
        },
        '注册中...'
      );

      wx.showToast({ title: '注册成功', icon: 'success' });
      this.setData({
        isLoginMode: true,
        registerUsername: '',
        registerEmail: '',
        registerPassword: '',
        registerConfirmPassword: ''
      });
    } catch (err) {
      handleError(err, '注册失败');
    }
  },

  // 新增：微信登录按钮点击事件
  async onWechatLogin() {
    try {
      wx.showLoading({ title: '登录中...' });
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
      
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('token', token);
      wx.setStorageSync('loginTime', Date.now());

      this.setData({ isUserLoggedIn: true, userInfo: userInfo });
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.getUserStatistics();
    } catch (err) {
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 用户退出登录
  handleLogout: function () {
    // 清除全局状态和本地存储中的用户信息
    app.globalData.userInfo = null;
    app.globalData.token = null;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    wx.removeStorageSync('loginTime');
    wx.removeStorageSync('rememberedEmail');

    // 更新页面状态
    this.setData({
      isUserLoggedIn: false,
      userInfo: null,
      totalDays: 0,
      totalRecords: 0,
      totalCategories: 0
    });

    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    });
  }
})