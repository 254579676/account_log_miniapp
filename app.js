// app.js
const { api } = require('./utils/api.js');
// 导入工具函数
const { checkLoginStatus} = require('./utils/util.js');
App({
  onLaunch() {
    // 初始化全局数据
    this.initGlobalData();
  },
  eventBus: {
    events: {},
    on(event, callback) {
      this.events[event] = callback;
    },
    emit(event) {
      if (this.events[event]) this.events[event]();
    }
  },
  initGlobalData: function() {
     
    // 初始化分类数据
    this.initCategories();
    
    // 初始化学科数据
    this.initSubjects();
    
    // 初始化年级数据
    this.initGrades();
   
    // 检查本地存储中的用户登录状态
    const loginData = checkLoginStatus();
    if (loginData) {
      this.globalData.userInfo = loginData.userInfo;
      this.globalData.token = loginData.token;
    }
  },
  
  initCategories: function() {
    // 获取所有分类数据
    api.category.getList().then(res => {
      if (res.code === 200) {
        this.globalData.categories = res.data;
      } else {
        // 如果请求失败，使用默认分类数据
        this.setDefaultCategories();
      }
    }).catch(err => {
      // 如果请求失败，使用默认分类数据
      this.setDefaultCategories();
    });
  },
  setDefaultCategories: function() {
    // 默认分类数据
    this.globalData.categories = [
      // 支出分类
      { id: 1, name: '餐饮', icon: 'utensils', type: 'expense' },
      { id: 2, name: '购物', icon: 'shopping-bag', type: 'expense' },
      { id: 3, name: '交通', icon: 'car', type: 'expense' },
      { id: 4, name: '住房', icon: 'home', type: 'expense' },
      { id: 5, name: '娱乐', icon: 'gamepad', type: 'expense' },
      { id: 6, name: '医疗', icon: 'medkit', type: 'expense' },
      { id: 7, name: '教育', icon: 'book', type: 'expense' },
      { id: 8, name: '旅行', icon: 'plane', type: 'expense' },
      { id: 9, name: '数码', icon: 'mobile-alt', type: 'expense' },
      { id: 10, name: '服饰', icon: 'tshirt', type: 'expense' },
      { id: 11, name: '美容', icon: 'spa', type: 'expense' },
      { id: 12, name: '宠物', icon: 'paw', type: 'expense' },
      { id: 13, name: '礼物', icon: 'gift', type: 'expense' },
      { id: 14, name: '办公', icon: 'briefcase', type: 'expense' },
      { id: 15, name: '其他', icon: 'ellipsis-h', type: 'expense' },
      { id: 16, name: '水电气', icon: 'water', type: 'expense' },
      { id: 17, name: '汽车相关', icon: 'gas-pump', type: 'expense' },
      { id: 18, name: '网络会员', icon: 'tv', type: 'expense' },
      { id: 19, name: '通讯', icon: 'phone', type: 'expense' },
      { id: 20, name: '运动健身', icon: 'dumbbell', type: 'expense' },
       
      // 收入分类
      { id: 101, name: '工资', icon: 'money-bill-wave', type: 'income' },
      { id: 102, name: '奖金', icon: 'award', type: 'income' },
      { id: 103, name: '兼职', icon: 'user-clock', type: 'income' },
      { id: 104, name: '理财', icon: 'chart-line', type: 'income' },
      { id: 105, name: '退款', icon: 'undo', type: 'income' },
      { id: 106, name: '礼金', icon: 'envelope', type: 'income' },
      { id: 107, name: '其他', icon: 'ellipsis-h', type: 'income' },
      { id: 108, name: '租金收入', icon: 'house-user', type: 'income' }
    ];
  },
  
  initSubjects: function() {
    // 获取学科数据
    api.study.subjects.getList().then(res => {
      if (res.code === 200) {
        this.globalData.subjects = res.data;
      } else {
        // 如果请求失败，使用默认学科数据
        this.setDefaultSubjects();
      }
    }).catch(err => {
      // 如果请求失败，使用默认学科数据
      this.setDefaultSubjects();
    });
  },
  
  setDefaultSubjects: function() {
    // 默认学科数据
    const DEFAULT_SUBJECTS = [
      { id: 1, name: '语文' }, { id: 2, name: '数学' }, { id: 3, name: '英语' },
      { id: 4, name: '物理' }, { id: 5, name: '化学' }, { id: 6, name: '生物' },
      { id: 7, name: '历史' }, { id: 8, name: '地理' }, { id: 9, name: '政治' }
    ];
    this.globalData.subjects = DEFAULT_SUBJECTS;
  },
  
  initGrades: function() {
    // 默认年级数据
    const GRADE_OPTIONS = [
      { id: 1, name: '一年级' }, { id: 2, name: '二年级' }, { id: 3, name: '三年级' },
      { id: 4, name: '四年级' }, { id: 5, name: '五年级' }, { id: 6, name: '六年级' },
      { id: 7, name: '初一' }, { id: 8, name: '初二' }, { id: 9, name: '初三' },
      { id: 10, name: '高一' }, { id: 11, name: '高二' }, { id: 12, name: '高三' }
    ];
    this.globalData.grades = GRADE_OPTIONS;
  },
  
  globalData: {
    userInfo: null,
    token: null,
    categories: [],
    subjects: [],
    grades: [],
    isFetchingToken: false // 状态锁标记
  }
})