const utilsApi = require('../../../utils/api');
const api = utilsApi.api;
const getBaseUrl = utilsApi.getBaseUrl;
const utils = require('../../../utils/util');

// ========== 常量定义 ==========
const PERIOD_OPTIONS = ['今日', '本周', '本月', '自定义'];
const HOMEWORK_TYPES = ['课后作业', '预习作业', '复习作业', '实践作业', '其他'];

// 获取全局数据中的学科和年级
const getGlobalSubjects = () => getApp().globalData.subjects || [];
const getGlobalGrades = () => getApp().globalData.grades || [];

// 构建筛选选项（带"全部"选项）
const buildFilterOptions = () => {
  const globalSubjects = getGlobalSubjects();
  const globalGrades = getGlobalGrades();
  
  const filterSubjects = [{ id: 0, name: '全部学科' }, ...globalSubjects];
  const filterGrades = [{ id: 0, name: '全部年级' }, ...globalGrades];
  
  return { filterSubjects, filterGrades };
};

// 构建表单选择器选项（不带"全部"选项）
const buildFormOptions = () => {
  const globalSubjects = getGlobalSubjects();
  const formSubjects = globalSubjects.map(subject => subject.name);
  
  return { formSubjects };
};

Page({
  data: {
    // 基础数据
    currentChild: null,
    baseUrl: getBaseUrl(),
    
    // 作业列表相关
    homeworkList: [],
    homeworkStats: { total: 0, completed: 0, pending: 0 },
    statsTitle: '今日作业统计',
    
    // 分页相关
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: true
    },
    
    // 日期相关
    today: '',
    selectedDate: '',
    dateList: [],
    
    // 筛选条件
    gradeOptions: [],
    selectedGrade: null,
    subjectOptions: [],
    selectedSubject: { name: '全部', id: 0 },
    selectedPeriod: '今日',
    periodOptions: PERIOD_OPTIONS,
    
    // 科目数据（用于表单选择器）
    subjects: [],
    subjectNameMap: {},
    homeworkTypes: HOMEWORK_TYPES,
    
    // 自定义日期选择
    showCalendar: false,
    customStartDate: '',
    customEndDate: '',
    
    // 添加作业表单
    showAddModal: false,
    continueAddAfterSave: false,
    formData: {
      subject_id: 1,
      title: '',
      description: '',
      images: [],
      estimated_time: 30,
      homework_type: '课后作业',
      due_date: ''
    },
    
    // 状态控制
    isLoading: false,
    isInitialized: false
  },

  // ========== 生命周期方法 ==========
  onLoad() {
    this.initData();
  },

  onShow() {
    // 页面显示时加载数据（简单直接）
    if (this.data.isInitialized && this.data.currentChild) {
      this.loadHomeworkList();
    }
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },

  // 加载更多数据
  onLoadMore() {
    this.loadHomeworkList(true);
  },

  // 页面滚动到底部触发加载更多
  onReachBottom() {
    const { pagination, isLoading } = this.data;
    if (pagination.hasMore && !isLoading) {
      this.onLoadMore();
    }
  },

  // ========== 数据初始化方法 ==========
  
  // 初始化页面数据
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

      const today = this.formatDateForAPI(new Date());
      const selectedDate = today;

      this.setData({
        currentChild,
        today,
        selectedDate,
        dateList: this.generateDateList(),
        'formData.due_date': selectedDate
      });

      await this.initFilterOptions();
    } catch (error) {
      const currentChild = wx.getStorageSync('currentChild');
      if (currentChild) {
        this.setData({ currentChild });
        await this.initFilterOptions();
      } else {
        this.showNoChildError();
      }
    }
  },

  // 初始化筛选条件
  async initFilterOptions() {
    try {
      const { currentChild } = this.data;
      const selectedGrade = this.getDefaultGrade(currentChild);
      const { filterSubjects, filterGrades } = buildFilterOptions();
      const { formSubjects } = buildFormOptions();
      
      // 构建科目名称映射
      const subjectNameMap = this.buildSubjectNameMap();

      this.setData({
        gradeOptions: filterGrades,
        selectedGrade,
        subjectOptions: filterSubjects,
        selectedSubject: filterSubjects[0],
        subjects: formSubjects,
        subjectNameMap,
        isInitialized: true
      });
      
      this.loadHomeworkList();
    } catch (error) {
      this.setDefaultFilterOptions();
    }
  },

  // 设置默认筛选选项
  setDefaultFilterOptions() {
    const { currentChild } = this.data;
    const selectedGrade = this.getDefaultGrade(currentChild);
    const { filterSubjects, filterGrades } = buildFilterOptions();
    const { formSubjects } = buildFormOptions();
    
    // 构建科目名称映射
    const subjectNameMap = this.buildSubjectNameMap();
    
    this.setData({
      gradeOptions: filterGrades,
      selectedGrade,
      subjectOptions: filterSubjects,
      selectedSubject: filterSubjects[0],
      subjects: formSubjects,
      subjectNameMap,
      isInitialized: true
    });
    this.loadHomeworkList();
  },

  // ========== 工具方法 ==========
  
  // 获取默认年级
  getDefaultGrade(currentChild) {
    const { filterGrades } = buildFilterOptions();
    if (!currentChild?.grade) return filterGrades[0];
    return filterGrades.find(g => g.name === currentChild.grade) || filterGrades[0];
  },

  // 构建科目名称映射
  buildSubjectNameMap() {
    const globalSubjects = getGlobalSubjects();
    const subjectNameMap = {};
    
    globalSubjects.forEach(subject => {
      subjectNameMap[subject.id] = subject.name;
    });
    
    return subjectNameMap;
  },

  // 格式化日期为API格式
  formatDateForAPI(date) {
    return utils.formatDateTime(date, false);
  },

  // 生成日期列表（最近7天）
  generateDateList() {
    const dates = [];
    const today = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (let i = 0; i < 7; i++) {
      const date = utils.subtractDays(today, i, false);
      const dateObj = new Date(date);
      const dateStr = utils.formatDateTime(dateObj, false);

      dates.push({
        date: dateStr,
        display: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
        weekDay: weekDays[dateObj.getDay()],
        isToday: i === 0
      });
    }

    return dates;
  },

//显示无孩子错误
  showNoChildError() {
    wx.showToast({
      title: '请先添加孩子',
      icon: 'none'
    });
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // ========== 作业列表相关方法 ==========
  
  // 加载作业列表
  async loadHomeworkList(isLoadMore = false) {
    const { currentChild, isLoading, pagination } = this.data;
    
    if (!currentChild || isLoading || (isLoadMore && !pagination.hasMore)) return;

    this.setData({ isLoading: true });
    
    try {
      // 不显示加载提示，避免与成功提示冲突
      
      const params = this.buildFilterParams();
      // 添加分页参数
      params.page = isLoadMore ? pagination.page + 1 : 1;
      params.limit = pagination.limit;
      
      const res = await api.study.homework.getList(params);
      
      if (res.code === 200) {
        const homeworkList = this.processHomeworkList(res.data.homework_list || []);
        const total = res.data.total || 0;
        const hasMore = (params.page * params.limit) < total;
        
        if (isLoadMore) {
          // 加载更多，追加数据
          this.setData({
            homeworkList: [...this.data.homeworkList, ...homeworkList],
            'pagination.page': params.page,
            'pagination.total': total,
            'pagination.hasMore': hasMore
          });
        } else {
          // 首次加载或刷新，替换数据
          this.setData({
            homeworkList,
            'pagination.page': 1,
            'pagination.total': total,
            'pagination.hasMore': hasMore
          });
        }
        
        this.calculateStats(this.data.homeworkList);
        
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  //构建筛选参数
  buildFilterParams() {
    const { currentChild, selectedGrade, selectedSubject } = this.data;
    const params = { child_id: currentChild.id };

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

  // 处理作业列表数据
  processHomeworkList(homeworkList) {

    return homeworkList.map(item => ({
      ...item,
      subject_name: this.getSubjectNameById(item.subject_id),
      images: this.processImageUrls(item.images)
    }));
  },

  // 根据科目ID获取科目名称
  getSubjectNameById(subjectId) {
    const globalSubjects = getGlobalSubjects();
    const subject = globalSubjects.find(s => s.id === subjectId);
    return subject ? subject.name : '未知科目';
  },

  //处理图片URL
  processImageUrls(images) {
    const { baseUrl } = this.data;
    if (!images) return [];
    
    return images.map(img => {
      return img.startsWith('http') ? img : baseUrl + (img.startsWith('/') ? img : '/' + img);
    });
  },

  //计算统计数据
  calculateStats(homeworkList) {
    const total = homeworkList.length;
    const completed = homeworkList.filter(item => item.status === '已完成').length;
    const pending = total - completed;
    
    this.setData({
      homeworkStats: { total, completed, pending }
    });
  },

  // 添加作业
  onAddHomework() {
    // 保留之前的选择，只重置必要字段
    const currentFormData = this.data.formData;
    const newFormData = {
      subject_id: currentFormData.subject_id || 1,
      title: '',
      description: '',
      images: [],
      estimated_time: currentFormData.estimated_time || 30,
      homework_type: currentFormData.homework_type || '课后作业',
      due_date: this.data.selectedDate
    };

    this.setData({
      showAddModal: true,
      formData: newFormData
    });

    // 自动生成初始标题
    this.generateHomeworkTitle();
  },

  //作业日期选择变化
  onHomeworkDateChange(e) {
    this.setData({
      'formData.due_date': e.detail.value
    });
  },

  // ========== 筛选条件事件处理 ==========
  
  //年级筛选变化
  onGradeChange(e) {
    this.updateFilterAndReload('selectedGrade', this.data.gradeOptions[e.detail.value]);
  },

  //学科筛选变化
  onFilterSubjectChange(e) {
    this.updateFilterAndReload('selectedSubject', this.data.subjectOptions[e.detail.value]);
  },

  //快速选择时间周期
  onQuickPeriodSelect(e) {
    const period = e.currentTarget.dataset.period;
    
    // 根据选择的周期更新统计标题
    let statsTitle = '作业统计';
    switch (period) {
      case '今日':
        statsTitle = '今日作业统计';
        break;
      case '本周':
        statsTitle = '本周作业统计';
        break;
      case '本月':
        statsTitle = '本月作业统计';
        break;
      case '自定义':
        statsTitle = '作业统计';
        break;
    }
    
    this.setData({ 
      selectedPeriod: period,
      homeworkList: [],
      homeworkStats: { total: 0, completed: 0, pending: 0 },
      statsTitle
    });
    
    if (period !== '自定义') {
      this.loadHomeworkList();
    }
  },

  //显示自定义日期选择器
  onShowCustomDatePicker() {
    this.setData({
      selectedPeriod: '自定义',
      showCalendar: true
    });
  },

  //隐藏日历
  onHideCalendar() {
    this.setData({ showCalendar: false });
  },

  //日历确认回调
  onCalendarConfirm(e) {
    const { startDate, endDate } = e.detail;
    
    this.setData({
      showCalendar: false,
      customStartDate: startDate,
      customEndDate: endDate,
      selectedPeriod: '自定义',
      statsTitle: '作业统计'
    });
    
    if (this.validateDateRange()) {
      this.updateFilterAndReload();
    }
  },

  //更新筛选条件并重新加载
  updateFilterAndReload(key, value) {
    const updateData = { 
      homeworkList: [],
      homeworkStats: { total: 0, completed: 0, pending: 0 }
    };
    
    if (key && value) {
      updateData[key] = value;
    }
    
    this.setData(updateData);
    this.loadHomeworkList();
  },

  // ========== 时间相关方法 ==========
  
  //获取日期范围
  getDateRange() {
    const { selectedPeriod, customStartDate, customEndDate } = this.data;
    
    if (selectedPeriod === '自定义' && customStartDate && customEndDate) {
      return { start_date: customStartDate, end_date: customEndDate };
    }
    
    const today = new Date();
    let startDate = today;
    
    switch (selectedPeriod) {
      case '今日':
        startDate = today;
        break;
      case '本周':
        const weekRange = utils.getWeekRange(today, false);
        return { start_date: weekRange.startDate, end_date: weekRange.endDate };
      case '本月':
        const monthRange = utils.getMonthRange(today, false);
        return { start_date: monthRange.startDate, end_date: monthRange.endDate };
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    return {
      start_date: this.formatDateForAPI(startDate),
      end_date: this.formatDateForAPI(today)
    };
  },

  //验证日期范围
  validateDateRange() {
    const { customStartDate, customEndDate, today } = this.data;
    
    if (!customStartDate || !customEndDate) return false;

    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const todayDate = new Date(today);
    
    if (start > end) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return false;
    }

    if (end > todayDate) {
      wx.showToast({ title: '结束日期不能超过今天', icon: 'none' });
      this.setData({ customEndDate: today });
      return false;
    }
    
    return true;
  },

  // ========== 日期选择相关方法 ==========
  
  //选择日期
  onDateSelect(e) {
    const { date } = e.currentTarget.dataset;
    this.setData({ 
      selectedDate: date,
      'formData.due_date': date
    });
    this.loadHomeworkList();
  },

  // ========== 页面跳转方法 ==========
  
  //打开统计页面
  onOpenStats() {
    wx.navigateTo({
      url: '/pages/study/homework/homework-stats'
    });
  },

  // ========== 添加作业表单方法 ==========

  //表单科目选择
  onSubjectChange(e) {
    const selectedIndex = parseInt(e.detail.value);
    const globalSubjects = getGlobalSubjects();
    
    if (globalSubjects[selectedIndex]) {
      this.setData({
        'formData.subject_id': globalSubjects[selectedIndex].id
      });
      
      // 自动生成作业标题：科目+作业类型
      this.generateHomeworkTitle();
    }
  },

  //作业类型选择
  onHomeworkTypeChange(e) {
    this.setData({
      'formData.homework_type': HOMEWORK_TYPES[e.detail.value]
    });
    
    // 自动生成作业标题：科目+作业类型
    this.generateHomeworkTitle();
  },

  //标题输入
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    });
  },

  //内容输入
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    });
  },

  //预计时间输入
  onEstimatedTimeInput(e) {
    let value = e.detail.value.replace(/\D/g, '').substring(0, 3);
    this.setData({
      'formData.estimated_time': parseInt(value) || 0
    });
  },

  //自动生成作业标题
  generateHomeworkTitle() {
    const { formData, subjectNameMap } = this.data;
    
    // 查找当前选中的科目名称
    const subjectName = subjectNameMap[formData.subject_id] || '未知科目';
    
    // 生成标题：科目+作业类型
    const generatedTitle = `${subjectName}${formData.homework_type}`;
    
    // 如果标题为空或者是自动生成的标题，则更新为新的标题
    if (!formData.title.trim() || this.isAutoGeneratedTitle(formData.title)) {
      this.setData({
        'formData.title': generatedTitle
      });
    }
  },

  //检查是否为自动生成的标题
  isAutoGeneratedTitle(title) {
    const globalSubjects = getGlobalSubjects();
    const subjectNames = globalSubjects.map(subject => subject.name);
    
    // 检查标题是否符合科目+作业类型的格式
    for (const subjectName of subjectNames) {
      for (const homeworkType of HOMEWORK_TYPES) {
        if (title === `${subjectName}${homeworkType}`) {
          return true;
        }
      }
    }
    
    return false;
  },

  // ========== 图片上传相关方法 ==========
  
  //选择图片
  onChooseImage() {
    const remainingCount = 9 - this.data.formData.images.length;
    if (remainingCount <= 0) {
      wx.showToast({ title: '最多只能上传9张图片', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: remainingCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => this.handleImageSelection(res),
      fail: (err) => this.handleImageSelectionError(err)
    });
  },

  //处理图片选择结果
  async handleImageSelection(res) {
    const { sourceType, tempFilePaths } = res;
    
    if (!tempFilePaths || tempFilePaths.length === 0) return;
    
    wx.showLoading({ title: '上传中...' });
    
    try {
      const uploadedImages = await this.uploadImages(tempFilePaths, sourceType);
      
      if (uploadedImages.length > 0) {
        this.setData({
          'formData.images': [...this.data.formData.images, ...uploadedImages]
        });
        wx.showToast({ title: '图片上传成功', icon: 'success' });
      } else {
        wx.showToast({ title: '图片上传失败', icon: 'none' });
      }
    } catch (error) {
      wx.showToast({ title: '上传异常，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  //处理图片选择错误
  handleImageSelectionError(err) {
    if (err.errMsg && err.errMsg.includes('cancel')) {
      return; // 用户取消操作，不显示错误
    }
    wx.showToast({ title: '选择图片失败', icon: 'none' });
  },

  //批量上传图片
  async uploadImages(filePaths, sourceType) {
    const uploadedImages = [];
    
    for (const filePath of filePaths) {
      try {
        const uploadRes = await this.uploadImage(filePath);
        if (uploadRes.code === 200) {
          const relativeUrl = this.extractRelativeUrl(uploadRes.data.url);
          uploadedImages.push({
            url: relativeUrl,
            source: sourceType === 'camera' ? 'camera' : 'album',
            timestamp: Date.now()
          });
        }
      } catch (error) {
        wx.showToast({ title: '图片上传失败', icon: 'none' });
      }
    }
    
    return uploadedImages;
  },

  //单张图片上传
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: getBaseUrl() + '/api/study/upload/image',
        filePath: filePath,
        name: 'file',
        formData: { type: 'homework' },
        header: {
          'content-type': 'multipart/form-data',
          'token': utils.getToken() || ''
        },
        success: (res) => this.handleUploadResponse(res, resolve, reject),
        fail: (err) => reject(err)
      });
    });
  },

  //处理上传响应
  handleUploadResponse(res, resolve, reject) {
    try {
      const data = JSON.parse(res.data);
      if (res.statusCode === 200) {
        resolve(data);
      } else {
        reject({ code: res.statusCode, message: data.message || '上传失败' });
      }
    } catch (error) {
      reject({ code: -1, message: '解析响应失败' });
    }
  },

  //提取相对URL
  extractRelativeUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      return urlObj.pathname;
    }
    return url;
  },

  //预览图片
  onImagePreview(e) {
    const { url, source } = e.currentTarget.dataset;
    
    const imageUrls = source === 'form' 
      ? this.getFormImageUrls() 
      : this.getHomeworkImageUrls();
    
    const currentUrl = this.buildFullUrl(url);
    
    wx.previewImage({
      current: currentUrl,
      urls: imageUrls
    });
  },

  //获取表单图片URL
  getFormImageUrls() {
    const { formData, baseUrl } = this.data;
    return formData.images.map(item => this.buildFullUrl(item.url));
  },

  //获取作业列表图片URL
  getHomeworkImageUrls() {
    const { homeworkList, baseUrl } = this.data;
    return homeworkList
      .filter(item => item.images && item.images.length > 0)
      .flatMap(item => item.images)
      .map(url => this.buildFullUrl(url));
  },

  //构建完整URL
  buildFullUrl(url) {
    const { baseUrl } = this.data;
    if (!url) return '';
    return url.startsWith('/') ? baseUrl + url : baseUrl + '/' + url;
  },

  //删除图片
  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.formData.images];
    images.splice(index, 1);
    
    this.setData({
      'formData.images': images
    });
    
    wx.showToast({
      title: '图片已删除',
      icon: 'success',
      duration: 1000
    });
  },

  // ========== 添加作业表单操作 ==========
  
  //取消添加
  onCancel() {
    this.setData({ showAddModal: false });
  },

  //保存作业
  async onSave() {
    if (!this.validateForm()) return;

    this.setData({ isLoading: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const res = await this.submitHomework();

      if (res.code === 200) {
        await this.handleSaveSuccess();

      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' });
        // 保存失败时也要重置 loading
        this.setData({ isLoading: false });
      }
    } catch (error) {
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      // 发生错误时也要重置 loading
      this.setData({ isLoading: false });
    } finally {
      wx.hideLoading();
    }
  },

  //验证表单
  validateForm() {
    const { formData } = this.data;

    if (!formData.title.trim()) {
      wx.showToast({ title: '请输入作业标题', icon: 'none' });
      return false;
    }

    if (!formData.description.trim()) {
      wx.showToast({ title: '请输入作业内容', icon: 'none' });
      return false;
    }

    if (!formData.due_date.trim()) {
      wx.showToast({ title: '请选择作业日期', icon: 'none' });
      return false;
    }

    return true;
  },

  //提交作业
  async submitHomework() {
    const { formData, currentChild } = this.data;
    const images = formData.images.map(item => item.url);

    return await api.study.homework.add({
      child_id: currentChild.id,
      grade: currentChild.grade,
      subject_id: formData.subject_id,
      title: formData.title,
      description: formData.description,
      homework_type: formData.homework_type,
      estimated_time: formData.estimated_time,
      due_date: formData.due_date,
      images: images
    });
  },

  //处理保存成功
  async handleSaveSuccess() {
    // 先重置 loading 状态，否则 loadHomeworkList 会因为 isLoading 为 true 而跳过
    this.setData({ isLoading: false });

    // 先显示成功提示
    wx.showToast({
      title: '添加成功',
      icon: 'success',
      duration: 1500
    });

    // 刷新列表
    await this.loadHomeworkList();

    // 判断是否继续添加
    if (this.data.continueAddAfterSave) {
      // 重置表单，保留科目和作业类型选择
      const currentFormData = this.data.formData;
      const newFormData = {
        subject_id: currentFormData.subject_id,
        title: '',
        description: '',
        images: [],
        estimated_time: currentFormData.estimated_time || 30,
        homework_type: currentFormData.homework_type || '课后作业',
        due_date: this.data.selectedDate
      };

      this.setData({
        isLoading: false,
        formData: newFormData
      });

      // 自动生成初始标题
      this.generateHomeworkTitle();
    } else {
      // 关闭弹窗
      this.setData({ isLoading: false, showAddModal: false });
    }
  },

  //切换继续添加选项
  onToggleContinueAdd() {
    this.setData({
      continueAddAfterSave: !this.data.continueAddAfterSave
    });
  },

  // ========== 作业操作相关方法 ==========
  
  //切换完成状态
  async onToggleComplete(e) {
    const { index } = e.currentTarget.dataset;
    const { homeworkList } = this.data;
    const homework = homeworkList[index];
    
    try {
      const newStatus = homework.status === '已完成' ? '待完成' : '已完成';
      const actualTime = newStatus === '已完成' ? 25 : homework.actual_time;
      
      const res = await api.study.homework.update({
        homework_id: homework.id,
        status: newStatus,
        actual_time: actualTime
      });

      if (res.code === 200) {
        this.updateHomeworkStatus(homeworkList, index, newStatus, actualTime);
        wx.showToast({
          title: newStatus === '已完成' ? '已完成' : '已取消完成',
          icon: 'success'
        });
      }
    } catch (error) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  //更新作业状态
  updateHomeworkStatus(homeworkList, index, newStatus, actualTime) {
    homeworkList[index].status = newStatus;
    homeworkList[index].actual_time = actualTime;
    
    this.setData({ homeworkList });
    this.calculateStats(homeworkList);
  },

  // ========== 页面跳转方法 ==========

  //查看作业详情
  onHomeworkDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/study/homework/homework-detail?id=${id}`
    });
  }
});