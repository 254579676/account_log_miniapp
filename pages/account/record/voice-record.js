// pages/record/voice-record.js
const util = require('../../../utils/util.js')
const { api } = require('../../../utils/api.js');
const app = getApp();

// 引入同声传译插件
const plugin = requirePlugin("WechatSI");
Page({
  data: {
    isRecording: false,
    recognitionComplete: false,
    voiceContent: '',
    typeOptions: ['支出', '收入'],
    typeIndex: 0,
    categoryNames: [],
    categoryIds: [],
    categoryIndex: 0,
    amount: '',
    date: util.getCurrentDateTime(false),
    description: '',
    // 语音识别相关
    recognitionMethod: 'plugin', // 使用同声传译插件
    pluginManager: null, // 同声传译插件管理器
    currentRecognitionResult: '', // 当前识别结果
    isPluginInitialized: false // 插件是否已初始化
  },

  onLoad: function () {
    this.loadCategories();
    this.initPlugin();
  },

  onUnload: function() {
    // 页面卸载时清理资源
    if (this.recognitionManager) {
      this.recognitionManager.stop();
    }
    if (this.recorderManager) {
      this.recorderManager.stop();
    }
  },

  // 初始化同声传译插件
  initPlugin: function() {
    if (!plugin) return;

    try {
      this.recognitionManager = plugin.getRecordRecognitionManager();
      if (this.recognitionManager) {
        this.setData({ isPluginInitialized: true });
        this.setupRecognitionEvents();
      }
    } catch (error) {
      // 插件初始化失败，静默处理
    }
  },

  // 设置语音识别事件监听
  setupRecognitionEvents: function() {
    const that = this;
    
    this.recognitionManager.onStart = function() {
      // 开始录音
    };

    this.recognitionManager.onStop = function(res) {
      wx.hideLoading();
      
      if (res?.result) {
        wx.showModal({
          title: '语音识别结果',
          content: `识别结果：${res.result}\n\n是否使用此结果？`,
          confirmText: '使用',
          cancelText: '重新录音',
          success: (modalRes) => {
            if (modalRes.confirm) {
              that.analyzeTextAndGenerateForm(res.result);
            } else {
              that.setData({
                isRecording: false,
                recognitionComplete: false,
                currentRecognitionResult: ''
              });
            }
          }
        });
      } else {
        wx.showToast({ title: '语音识别失败，请重试', icon: 'none' });
        that.setData({
          isRecording: false,
          currentRecognitionResult: ''
        });
      }
    };

    this.recognitionManager.onError = function() {
      wx.hideLoading();
      wx.showToast({ title: '语音识别失败', icon: 'none' });
      that.setData({
        isRecording: false,
        currentRecognitionResult: ''
      });
    };
  },

  

  loadCategories: function () {
    const { categories } = app.globalData;

    if (!categories?.length) {
      this.waitForCategories();
      return;
    }

    const expenseCategories = categories.filter(c => c.type === 'expense');
    this.setData({
      categoryNames: expenseCategories.map(c => c.name),
      categoryIds: expenseCategories.map(c => c.id),
      categoryIndex: 0
    });
  },

  waitForCategories: function () {
    let attempts = 0;
    const maxAttempts = 4;

    const checkCategories = () => {
      const { categories } = app.globalData;

      if (categories?.length) {
        const expenseCategories = categories.filter(c => c.type === 'expense');
        this.setData({
          categoryNames: expenseCategories.map(c => c.name),
          categoryIds: expenseCategories.map(c => c.id),
          categoryIndex: 0
        });
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkCategories, 500);
      }
    };

    checkCategories();
  },

  /** 按下录音按钮*/
  startRecord: function () {
    // 检查插件是否已初始化
    if (!this.data.isPluginInitialized) {
      wx.showToast({
        title: '语音识别插件未初始化',
        icon: 'none'
      });
      return;
    }

    // 检查运行环境
    const systemInfo = wx.getSystemInfoSync();
    const isDevTool = systemInfo.platform === 'devtools';
    
    if (isDevTool) {
      // 开发者工具环境，使用模拟录音
      this.simulateRecording();
      return;
    }

    // 检查权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.beginRecord();
            },
            fail: () => {
              wx.showToast({
                title: '需要录音权限',
                icon: 'none'
              });
            }
          });
        } else {
          this.beginRecord();
        }
      }
    });
  },

  // 模拟录音功能（开发者工具环境）
  simulateRecording: function () {
    wx.showModal({
      title: '模拟录音',
      content: '开发者工具不支持真实录音，是否使用模拟录音功能？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            isRecording: true,
            recognitionComplete: false,
            currentRecognitionResult: ''
          });

          setTimeout(() => {
            this.setData({ isRecording: false });
            
            const mockResults = [
              '今天在肯德基花了38.5元',
              '昨天买衣服花了299元',
              '今天地铁费5元',
              '工资收入8000元',
              '今天超市购物128元',
              '午餐花了25元',
              '打车费35元',
              '看电影花了45元'
            ];
            
            const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
            wx.hideLoading();
            
            wx.showModal({
              title: '语音识别结果',
              content: `识别结果：${randomResult}\n\n是否使用此结果？`,
              confirmText: '使用',
              cancelText: '重新录音',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  this.analyzeTextAndGenerateForm(randomResult);
                } else {
                  this.setData({
                    isRecording: false,
                    recognitionComplete: false,
                    currentRecognitionResult: ''
                  });
                }
              }
            });
          }, 3000);
        }
      }
    });
  },

  // 开始录音
  beginRecord: function () {
    try {
      this.setData({
        isRecording: true,
        recognitionComplete: false,
        currentRecognitionResult: ''
      });

      if (this.recognitionManager) {
        this.recognitionManager.start({
          duration: 60000,
          lang: 'zh_CN'
        });
      } else {
        wx.hideLoading();
        wx.showToast({ title: '语音识别功能不可用', icon: 'none' });
        this.setData({ isRecording: false });
      }
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '语音识别功能不可用', icon: 'none' });
      this.setData({ isRecording: false });
    }
  },

  // 结束录音
  stopRecord: function () {
    if (!this.data.isRecording) return;

    this.setData({ isRecording: false });

    if (this.recognitionManager) {
      try {
        this.recognitionManager.stop();
      } catch (error) {
        wx.showToast({ title: '停止语音识别失败', icon: 'none' });
      }
    }
  },

  // 显示手动输入界面
  showManualInput: function () {
    this.setData({
      isRecording: false,
      recognitionComplete: true,
      voiceContent: '手动输入模式',
      amount: '',
      description: '',
      // 保持其他默认值
    });
  },

  onTypeChange: function (e) {
    const typeIndex = parseInt(e.detail.value);
    this.setData({ typeIndex });

    const { categories } = app.globalData;
    if (!categories?.length) return;

    const type = typeIndex === 0 ? 'expense' : 'income';
    const filteredCategories = categories.filter(c => c.type === type);
    
    this.setData({
      categoryNames: filteredCategories.map(c => c.name),
      categoryIds: filteredCategories.map(c => c.id),
      categoryIndex: 0
    });
  },

  onCategoryChange: function (e) {
    this.setData({
      categoryIndex: parseInt(e.detail.value)
    });
  },

  onAmountInput: function (e) {
    this.setData({
      amount: e.detail.value
    });
  },

  onDateChange: function (e) {
    this.setData({
      date: e.detail.value
    });
  },

  onDescriptionInput: function (e) {
    this.setData({
      description: e.detail.value
    });
  },

  // 解析文本并生成表单
  analyzeTextAndGenerateForm: function (text) {
    const { categories } = app.globalData;
    if (!categories?.length) {
      wx.showToast({ title: '分类数据未加载', icon: 'none' });
      return;
    }

    const formData = {
      typeIndex: 0,
      categoryIndex: 0,
      amount: '',
      date: util.getCurrentDateTime(false),
      description: text,
      voiceContent: text
    };

    // 提取金额
    const amountReg = /(\d+\.?\d*)[元块块钱]/g;
    const amountMatches = text.match(amountReg);
    if (amountMatches?.length) {
      const amountValue = amountMatches[amountMatches.length - 1].match(/(\d+\.?\d*)/)[1];
      formData.amount = parseFloat(amountValue).toFixed(2);
    }

    // 2. 判断收入/支出类型
    if (text.includes('收入') || text.includes('赚') || text.includes('工资') || text.includes('奖金')) {
      formData.typeIndex = 1; // 收入
    }

    // 3. 提取分类
    const currentType = formData.typeIndex === 0 ? 'expense' : 'income';
    const typeCategories = categories.filter(c => c.type === currentType);
    
    // 分类关键词映射
    const categoryKeywords = {
      '餐饮': ['吃', '饭', '餐', '肯德基', '麦当劳', '火锅', '烧烤', '外卖', '食堂'],
      '购物': ['买', '购', '淘宝', '京东', '超市', '商场', '衣服', '鞋子'],
      '交通': ['车', '地铁', '公交', '打车', '滴滴', '油费', '停车', '高铁', '飞机'],
      '住房': ['房租', '水电', '物业', '装修', '家具'],
      '娱乐': ['电影', '游戏', 'KTV', '唱歌', '玩', '娱乐'],
      '医疗': ['药', '医院', '看病', '体检', '医生'],
      '教育': ['学费', '书', '课程', '培训', '学习'],
      '工资': ['工资', '薪水', '月薪'],
      '奖金': ['奖金', '奖励', '分红'],
      '理财': ['理财', '投资', '股票', '基金', '利息']
    };

    // 查找匹配的分类
    const foundCategory = typeCategories.find(category => {
      const keywords = categoryKeywords[category.name] || [category.name];
      return keywords.some(keyword => text.includes(keyword));
    });

    if (foundCategory) {
      const categoryIndex = typeCategories.findIndex(c => c.id === foundCategory.id);
      if (categoryIndex !== -1) {
        formData.categoryIndex = categoryIndex;
      }
    }

    // 提取日期
    const dateReg = /(\d{1,2}月\d{1,2}日)|今天|昨天|明天|前天|大前天/;
    const dateMatch = text.match(dateReg);
    if (dateMatch?.[0]) {
      formData.date = this.parseDateText(dateMatch[0]);
    }

    // 更新分类列表
    const filteredCategories = formData.typeIndex === 0 ? 
      categories.filter(c => c.type === 'expense') : 
      categories.filter(c => c.type === 'income');

    this.setData({
      typeIndex: formData.typeIndex,
      categoryNames: filteredCategories.map(c => c.name),
      categoryIds: filteredCategories.map(c => c.id),
      categoryIndex: formData.categoryIndex,
      amount: formData.amount,
      date: formData.date,
      description: formData.description,
      voiceContent: formData.voiceContent,
      recognitionComplete: true
    });
  },

  // 解析日期文本
  parseDateText: function (dateText) {
    const today = new Date();

    if (dateText === '今天') return util.getCurrentDateTime(false);
    if (dateText === '昨天') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return util.formatDateTime(yesterday, false);
    }
    if (dateText === '明天') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return util.formatDateTime(tomorrow, false);
    }
    if (dateText === '前天') {
      const dayBeforeYesterday = new Date(today);
      dayBeforeYesterday.setDate(today.getDate() - 2);
      return util.formatDateTime(dayBeforeYesterday, false);
    }
    if (dateText === '大前天') {
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      return util.formatDateTime(threeDaysAgo, false);
    }

    // 处理 "X月X日" 格式
    const match = dateText.match(/(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const date = new Date(today.getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
      return util.formatDateTime(date, false);
    }

    return util.getCurrentDateTime(false);
  },
  
  //提交记账
  saveRecord: function () {
    const { typeIndex, categoryIds, categoryIndex, amount, date, description } = this.data;

    if (!amount || isNaN(parseFloat(amount))) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    const params = {
      type: typeIndex === 0 ? 'expense' : 'income',
      categoryid: categoryIds[categoryIndex],
      amount: parseFloat(amount),
      date: date,
      description: description || ''
    };

    api.transaction.add(params).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '记账成功',
        icon: 'success',
        success: () => setTimeout(() => wx.navigateBack(), 1500)
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    });
  }
})