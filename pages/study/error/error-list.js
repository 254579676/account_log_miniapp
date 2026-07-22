const api = require('../../../utils/api').api;
const getBaseUrl = require('../../../utils/api').getBaseUrl;

const PERIOD_OPTIONS = ['本周', '本月', '本年', '自定义'];

Page({
  data: {
    currentChild: null,
    errorList: [],
    subjectStats: [],
    isLoading: false,
    baseUrl: getBaseUrl(),
    showEditOptions: false,
    selectedError: null,

    // 筛选条件 - 从全局获取
    gradeOptions: [],
    selectedGrade: { id: 0, name: '全部年级' },
    subjectOptions: [],
    selectedSubject: { name: '全部', id: 0 },

    // 时间筛选条件
    selectedPeriod: '本月',
    periodOptions: PERIOD_OPTIONS,
    showCalendar: false,
    customStartDate: '',
    customEndDate: '',
    today: '',

    // 控制重复请求
    isInitialized: false,

    // 分页相关 - 优化后端分页请求
    backendPageSize: 20, // 后端每页返回20条记录
    currentBackendPage: 0, // 后端当前页码（从0开始，便于计算下一页）
    hasMore: true,
    isRefreshing: false,
    totalCount: 0
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    // 只在页面初始化完成后才重新加载数据，避免重复请求
    if (this.data.currentChild && this.data.isInitialized) {
      this.loadErrorList();
    }
  },

  async initData() {
    try {
      let currentChild = wx.getStorageSync('currentChild');
      
      if (!currentChild) {
        const res = await api.study.children.getList();
        if (res.code === 200 && res.data.children?.length > 0) {
          const currentChildId = wx.getStorageSync('currentChildId');
          currentChild = res.data.children.find(child => child.id == currentChildId) || res.data.children[0];
          wx.setStorageSync('currentChildId', currentChild.id);
          wx.setStorageSync('currentChild', currentChild);
        } else {
          this.showNoChildError();
          return;
        }
      }

      this.setData({ currentChild });
      await this.initFilterOptions();
      // 初始化完成后只调用一次loadErrorList
    } catch (error) {
      console.error('加载孩子数据失败:', error);
      const currentChild = wx.getStorageSync('currentChild');
      if (currentChild) {
        this.setData({ currentChild });
        await this.initFilterOptions();
      } else {
        this.showNoChildError();
      }
    }
  },

  showNoChildError() {
    wx.showToast({
      title: '请先添加孩子',
      icon: 'none'
    });
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  async initFilterOptions() {
    try {
      const { currentChild } = this.data;
      const app = getApp();

      // 从全局获取年级选项，添加"全部年级"
      const globalGrades = app.globalData.grades || [];
      const gradeOptions = [
        { id: 0, name: '全部年级' },
        ...globalGrades
      ];

      // 设置年级选项
      const selectedGrade = this.getDefaultGrade(currentChild, gradeOptions);

      // 从全局获取学科列表，添加"全部"
      const globalSubjects = app.globalData.subjects || [];
      const subjects = [
        { id: 0, name: '全部' },
        ...globalSubjects
      ];
      const selectedSubject = subjects[0];

      // 初始化时间数据
      this.initCustomDateData();

      this.setData({
        gradeOptions,
        selectedGrade,
        subjectOptions: subjects,
        selectedSubject,
        isInitialized: true  // 标记初始化完成
      });

      // 筛选条件初始化完成后加载数据
      this.loadErrorList();
    } catch (error) {
      console.error('初始化筛选选项失败:', error);
      this.setDefaultFilterOptions();
      // 默认筛选条件设置完成后也加载数据
      this.setData({ isInitialized: true });
      this.loadErrorList();
    }
  },

  getDefaultGrade(currentChild, gradeOptions) {
    if (!currentChild?.grade) return gradeOptions[0];
    return gradeOptions.find(g => g.name === currentChild.grade) || gradeOptions[0];
  },

  setDefaultFilterOptions() {
    const { currentChild } = this.data;
    const app = getApp();

    // 从全局获取年级选项
    const globalGrades = app.globalData.grades || [];
    const gradeOptions = [
      { id: 0, name: '全部年级' },
      ...globalGrades
    ];
    const selectedGrade = this.getDefaultGrade(currentChild, gradeOptions);

    // 从全局获取学科选项
    const globalSubjects = app.globalData.subjects || [];
    const subjects = [
      { id: 0, name: '全部' },
      ...globalSubjects
    ];

    this.setData({
      gradeOptions,
      selectedGrade,
      subjectOptions: subjects,
      selectedSubject: subjects[0]
    });
    this.initCustomDateData();
  },

  formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getDateRange() {
    const { selectedPeriod, customStartDate, customEndDate } = this.data;
    
    if (selectedPeriod === '自定义' && customStartDate && customEndDate) {
      return {
        start_date: customStartDate,
        end_date: customEndDate
      };
    }
    
    const today = new Date();
    let startDate = new Date();
    
    switch (selectedPeriod) {
      case '本周':
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(today);
        startDate.setDate(today.getDate() + diffToMonday);
        break;
      case '本月':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case '本年':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    return {
      start_date: this.formatDateForAPI(startDate),
      end_date: this.formatDateForAPI(today)
    };
  },

  async loadErrorList(isLoadMore = false) {
    if (!this.data.currentChild || this.data.isLoading) return;

    // 如果是加载更多且没有更多数据了，直接返回
    if (isLoadMore && !this.data.hasMore) return;

    this.setData({ 
      isLoading: true,
      isRefreshing: !isLoadMore 
    });

    try {
      const params = this.buildRequestParams(isLoadMore);
      const res = await api.study.error.getList(params);

      if (res.code === 200) {
        const newData = this.processErrorList(res.data.mistakes_list || []);
        const totalCount = res.data.total || 0;
        const currentPage = res.data.page || 1;
        const pageSize = res.data.limit || this.data.backendPageSize;
        
        // 计算是否有更多数据
        const hasMore = currentPage * pageSize < totalCount;
        
        let finalErrorList;
        let finalSubjectStats;
        
        if (isLoadMore) {
          // 加载更多：追加新数据到现有数据
          finalErrorList = [...this.data.errorList, ...newData];
        } else {
          // 刷新：使用新数据
          finalErrorList = newData;
        }
        
        // 限制前端最大显示数量，避免性能问题
        const MAX_DISPLAY_COUNT = 100; // 最多显示100条
        if (finalErrorList.length > MAX_DISPLAY_COUNT) {
          finalErrorList = finalErrorList.slice(0, MAX_DISPLAY_COUNT);
          wx.showToast({
            title: `已显示前${MAX_DISPLAY_COUNT}条记录`,
            icon: 'none'
          });
        }
        
        // 计算学科统计
        finalSubjectStats = this.calculateSubjectStats(finalErrorList);
        
        this.setData({
          errorList: finalErrorList,
          subjectStats: finalSubjectStats,
          hasMore,
          totalCount,
          currentBackendPage: currentPage
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载错题列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ 
        isLoading: false,
        isRefreshing: false 
      });
    }
  },

  buildRequestParams(isLoadMore = false) {
    const { currentChild, selectedGrade, selectedSubject, backendPageSize, currentBackendPage } = this.data;
    const params = { 
      child_id: currentChild.id,
      page: isLoadMore ? currentBackendPage + 1 : 1,
      limit: backendPageSize // 使用后端的分页大小
    };

    if (selectedGrade && selectedGrade.id !== 0) {
      params.grade = selectedGrade.name;
    }

    if (selectedSubject && selectedSubject.id !== 0) {
      params.subject_id = parseInt(selectedSubject.id);
    }

    const dateRange = this.getDateRange();
    if (dateRange.start_date && dateRange.end_date) {
      params.start_date = dateRange.start_date;
      params.end_date = dateRange.end_date;
    }

    return params;
  },

  processErrorList(errorList) {
    return errorList.map(item => {
      if (item.solution_image && typeof item.solution_image === 'string') {
        try {
          item.solution_image = JSON.parse(item.solution_image);
        } catch (error) {
          console.error('解析solution_image失败:', error);
          item.solution_image = [];
        }
      } else {
        item.solution_image = item.solution_image || [];
      }
      return item;
    });
  },

  // 页面跳转方法
  onOpenAnalysis() {
    wx.navigateTo({
      url: '/pages/study/analysis/analysis'
    });
  },

  onAddError() {
    wx.navigateTo({
      url: '/pages/study/error/error-input'
    });
  },

  onErrorDetail(e) {
    const { error } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/study/error/error-detail?id=${error.id}`
    });
  },

  onImagePreview(e) {
    const { url, urls } = e.currentTarget.dataset;
    if (urls) {
      wx.previewImage({
        current: this.data.baseUrl + url,
        urls: urls.map(img => this.data.baseUrl + img)
      });
    }
  },

  onShowFullText(e) {
    const { content, title } = e.currentTarget.dataset;
    wx.showModal({
      title,
      content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 编辑操作相关
  onShowEditMenu(e) {
    const { error } = e.currentTarget.dataset;
    this.setData({
      showEditOptions: true,
      selectedError: error
    });
  },

  onHideEditOptions() {
    this.setData({
      showEditOptions: false,
      selectedError: null
    });
  },

  onEditError() {
    const { selectedError } = this.data;
    if (!selectedError) return;
    
    this.setData({ showEditOptions: false });
    wx.navigateTo({
      url: `/pages/study/error/error-input?id=${selectedError.id}`
    });
  },

  onDeleteError() {
    const { selectedError } = this.data;
    if (!selectedError) return;
    
    this.setData({ showEditOptions: false });
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除这道错题吗？\n${selectedError.question_content.substring(0, 50)}${selectedError.question_content.length > 50 ? '...' : ''}`,
      confirmText: '删除',
      confirmColor: '#f44336',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.confirmDeleteError(selectedError.id);
        }
      }
    });
  },

  async confirmDeleteError(errorId) {
    try {
      wx.showLoading({ title: '删除中...' });
      const res = await api.study.error.delete({ mistake_id: errorId });

      if (res.code === 200) {
        wx.showToast({ title: '删除成功', icon: 'success' });
        // 重新加载数据，从第一页开始
        this.setData({
          currentBackendPage: 0,
          hasMore: true,
          errorList: [],
          subjectStats: []
        });
        this.loadErrorList(false);
      } else {
        wx.showToast({ title: res.message || '删除失败', icon: 'none' });
      }
    } catch (error) {
      console.error('删除错题失败:', error);
      wx.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 筛选条件事件处理
  onGradeChange(e) {
    const selectedGrade = this.data.gradeOptions[e.detail.value];
    this.setData({ 
      selectedGrade,
      currentBackendPage: 0,
      hasMore: true,
      errorList: [],
      subjectStats: []
    });
    this.loadErrorList();
  },

  onSubjectChange(e) {
    const selectedSubject = this.data.subjectOptions[e.detail.value];
    this.setData({ 
      selectedSubject,
      currentBackendPage: 0,
      hasMore: true,
      errorList: [],
      subjectStats: []
    });
    this.loadErrorList();
  },

  onQuickPeriodSelect(e) {
    const period = e.currentTarget.dataset.period;
    this.setData({ selectedPeriod: period });
    if (period !== '自定义') {
      this.loadErrorList();
    }
  },

  onShowCustomDatePicker(e) {
    const period = e ? e.currentTarget.dataset.period : '自定义';
    this.setData({
      selectedPeriod: period,
      showCalendar: true
    });
  },

  onHideCalendar() {
    this.setData({ showCalendar: false });
  },

  onCalendarConfirm(e) {
    const { startDate, endDate } = e.detail;
    
    this.setData({
      showCalendar: false,
      customStartDate: startDate,
      customEndDate: endDate,
      selectedPeriod: '自定义',
      currentBackendPage: 0,
      hasMore: true,
      errorList: [],
      subjectStats: []
    });
    
    this.validateDateRange();
    this.loadErrorList();
  },

  // 时间相关方法
  initCustomDateData() {
    const todayStr = this.formatDateForAPI(new Date());
    this.setData({
      today: todayStr,
      customStartDate: '',
      customEndDate: todayStr
    });
  },

  validateDateRange() {
    const { customStartDate, customEndDate } = this.data;
    
    if (!customStartDate || !customEndDate) {
      this.setData({ dateRangeDays: 0, canConfirmDate: false });
      return;
    }

    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const today = new Date();
    
    if (start > end) {
      this.setData({ dateRangeDays: 0, canConfirmDate: false });
      return;
    }

    if (end > today) {
      wx.showToast({ title: '结束日期不能超过今天', icon: 'none' });
      this.setData({
        customEndDate: this.data.today,
        canConfirmDate: false
      });
      return;
    }

    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    this.setData({
      dateRangeDays: daysDiff,
      canConfirmDate: daysDiff > 0 && daysDiff <= 365
    });
  },

  // 加载更多数据（后端分页）
  onLoadMore() {
    if (this.data.isLoading || !this.data.hasMore) return;
    this.loadErrorList(true);
  },



  calculateSubjectStats(errorList) {
    const subjects = [
      { name: '语文', color: '#FF6B6B' },
      { name: '数学', color: '#4ECDC4' },
      { name: '英语', color: '#45B7D1' },
      { name: '物理', color: '#96CEB4' },
      { name: '化学', color: '#FFEAA7' },
      { name: '生物', color: '#DDA0DD' },
      { name: '历史', color: '#FFA07A' },
      { name: '地理', color: '#98D8C8' },
      { name: '政治', color: '#F7DC6F' }
    ];
    
    const stats = subjects.map(subject => ({
      name: subject.name,
      count: 0,
      color: subject.color,
      barHeight: 0,
      maxHeight: 140 // 设置最大高度
    }));
    
    errorList.forEach(item => {
      const subjectIndex = stats.findIndex(stat => stat.name === item.subject_name);
      if (subjectIndex !== -1) {
        stats[subjectIndex].count++;
      }
    });
    
    const maxCount = Math.max(...stats.map(item => item.count), 1);
    stats.forEach(item => {
      item.barHeight = maxCount > 0 ? Math.min(140, (item.count / maxCount) * 140) : 0;
    });
    
    return stats;
  },

  // 阻止弹窗内容区域的事件冒泡
  onModalContentTap() {
    // 空方法，仅用于阻止事件冒泡
  },




});