const api = require('../../../utils/api').api;
const getBaseUrl = require('../../../utils/api').getBaseUrl;

Page({
  data: {
    // 当前学生信息
    currentChild: null,
    // 孩子列表
    childrenList: [],
    // 显示学生选择弹窗
    showStudentPicker: false,

    // 筛选条件
    gradeOptions: [],
    selectedGrade: null,
    selectedGradeIndex: -1,
    subjectOptions: [],
    selectedSubjectIndex: -1,

    // 科目分析选择的科目
    selectedAnalysisSubject: { id: 1, name: '语文' },

    // 学科错题统计
    subjectStats: [],

    // 题型分析
    questionTypeAnalysis: [],

    // 错题原因分析
    reasonAnalysis: [],

    // 趋势数据
    trendData: [],
    // 趋势图表数据
    trendChartData: [],

    // 加载状态
    isLoading: false,

    // URL配置
    baseUrl: getBaseUrl()
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    if (this.data.currentChild) {
      this.loadAnalysisData();
    }
  },

  onPullDownRefresh() {
    this.loadAnalysisData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 初始化页面
   */
  initPage() {
    // 获取当前学生信息
    const currentChild = wx.getStorageSync('currentChild');

    if (!currentChild) {
      wx.showToast({
        title: '请先添加孩子',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ currentChild });
    this.initFilterOptions();
    this.loadChildren();
    this.loadAnalysisData();
  },

  /**
   * 加载孩子列表
   */
  async loadChildren() {
    try {
      const res = await api.study.children.getList();
      if (res.code === 200) {
        this.setData({ childrenList: res.data.children || [] });
      }
    } catch (error) {
      console.error('加载孩子列表失败:', error);
    }
  },

  /**
   * 显示学生选择弹窗
   */
  onShowStudentPicker() {
    this.setData({ showStudentPicker: true });
  },

  /**
   * 隐藏学生选择弹窗
   */
  onHideStudentPicker() {
    this.setData({ showStudentPicker: false });
  },

  /**
   * 选择学生
   */
  onSelectStudent(e) {
    const student = e.currentTarget.dataset.student;

    // 设置当前选中的年级索引
    const gradeIndex = this.data.gradeOptions.findIndex(grade =>
      grade.name === student.grade?.split(' ')[0]
    ) || -1;

    this.setData({
      currentChild: student,
      showStudentPicker: false,
      selectedGrade: this.data.gradeOptions[gradeIndex] || null,
      selectedGradeIndex: gradeIndex
    });

    // 保存到本地存储
    wx.setStorageSync('currentChild', student);

    // 重新加载数据
    this.loadAnalysisData();
  },

  /**
   * 阻止弹窗内容区域的事件冒泡
   */
  onModalContentTap() {
    // 空方法，仅用于阻止事件冒泡
  },

  /**
   * 加载分析数据
   */
  async loadAnalysisData() {
    if (!this.data.currentChild) return;

    this.setData({ isLoading: true });

    try {
      await Promise.all([
        this.loadSubjectMistakesData(),
        this.loadStatisticsData(),
        this.loadTrendData()
      ]);
    } catch (error) {
      console.error('加载分析数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 加载统计数据（题型分析 + 错题原因分析）
   */
  async loadStatisticsData() {
    try {
      const res = await api.study.mistakes.statistics({
        child_id: this.data.currentChild?.id,
        grade_id: this.data.selectedGrade?.id,
        grade_name: this.data.selectedGrade?.name || '',
        subject_id: this.data.selectedAnalysisSubject?.id || 1
      });

      if (res.code === 200 && res.data) {
        // 处理题型分析数据
        const questionTypeData = res.data.question_type_statistics || [];
        this.processQuestionTypeData(questionTypeData);

        // 处理错题原因分析数据
        const reasonData = res.data.mistake_reason_statistics || [];
        this.processReasonData(reasonData);
      } else {
        console.error('获取统计数据失败:', res.message);
        this.setDefaultQuestionTypeData();
        this.setDefaultReasonData();
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      this.setDefaultQuestionTypeData();
      this.setDefaultReasonData();
    }
  },

  /**
   * 加载趋势数据
   */
  async loadTrendData() {
    try {
      const res = await api.study.mistakes.monthlyStatistics({
        child_id: this.data.currentChild?.id,
        grade_id: this.data.selectedGrade?.id,
        grade_name: this.data.selectedGrade?.name || '',
        subject_id: this.data.selectedAnalysisSubject?.id || 0
      });

      if (res.code === 200 && res.data) {
        // 将接口返回的 {month, count} 转换为 bar-chart 组件需要的 {score, date} 格式
        const trendChartData = res.data.map(item => ({
          score: item.count,
          date: item.month
        }));

        this.setData({
          trendData: res.data || [],
          trendChartData: trendChartData
        });
      }
    } catch (error) {
      console.error('加载趋势数据失败:', error);
    }
  },

  /**
   * 初始化筛选选项
   */
  initFilterOptions() {
    const app = getApp();

    // 使用全局配置的年级和学科数据
    const gradeOptions = app.globalData.grades || [];
    const subjectOptions = app.globalData.subjects || [];

    // 设置当前年级
    const gradeIndex = gradeOptions.findIndex(grade =>
      grade.name === this.data.currentChild.grade?.split(' ')[0]
    ) || -1;
    const currentGrade = gradeIndex >= 0 ? gradeOptions[gradeIndex] : null;

    // 默认选择第一个学科
    const subjectIndex = subjectOptions.length > 0 ? 0 : -1;
    const defaultSubject = subjectIndex >= 0 ? subjectOptions[subjectIndex] : {};

    this.setData({
      gradeOptions,
      subjectOptions,
      selectedGrade: currentGrade,
      selectedGradeIndex: gradeIndex,
      selectedSubjectIndex: subjectIndex,
      selectedAnalysisSubject: defaultSubject
    });
  },

  /**
   * 加载学科错题统计数据
   */
  async loadSubjectMistakesData() {
    try {
      // 使用 subject-count 接口获取各科目错题统计
      const requestParams = {
        child_id: this.data.currentChild?.id,
        grade_id: this.data.selectedGrade?.id,
        grade_name: this.data.selectedGrade?.name || '',
        subject_id: 0
      };

      const res = await api.study.mistakes.getSubjectCount(requestParams);

      if (res.code === 200 && res.data) {
        this.processSubjectCountData(res.data);
      } else {
        console.error('获取科目统计数据失败:', res.message);
        this.setDefaultSubjectStats();
      }
    } catch (error) {
      console.error('加载学科错题数据失败:', error);
      this.setDefaultSubjectStats();
    }
  },

  /**
   * 处理科目统计数据
   */
  processSubjectCountData(data) {
    const app = getApp();
    const globalSubjects = app.globalData.subjects || [];

    // 学科颜色配置
    const subjectColors = {
      '语文': '#FF6B6B',
      '数学': '#4ECDC4',
      '英语': '#45B7D1',
      '物理': '#96CEB4',
      '化学': '#FFEAA7',
      '生物': '#DDA0DD',
      '历史': '#FFA07A',
      '地理': '#98D8C8',
      '政治': '#F7DC6F'
    };

    // 使用全局学科数据
    const stats = globalSubjects.map(subject => ({
      name: subject.name,
      count: 0,
      color: subjectColors[subject.name] || '#CCCCCC',
      barHeight: 0,
      maxHeight: 160
    }));

    // 根据接口返回的数据更新对应科目的统计
    if (Array.isArray(data)) {
      data.forEach(item => {
        const subjectIndex = stats.findIndex(stat => stat.name === item.subject_name);
        if (subjectIndex !== -1) {
          stats[subjectIndex].count = item.mistake_count || 0;
        }
      });
    }

    // 计算柱子高度
    const maxCount = Math.max(...stats.map(item => item.count), 1);
    stats.forEach(item => {
      item.barHeight = maxCount > 0 ? Math.min(140, (item.count / maxCount) * 140) : 0;
    });

    this.setData({ subjectStats: stats });
  },

  /**
   * 处理题型数据
   */
  processQuestionTypeData(questionTypeData) {
    const total = questionTypeData.reduce((sum, item) => sum + item.count, 0);
    const processedData = questionTypeData.map((item, index) => ({
      id: item.id,
      label: item.label,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
      description: item.description || '',
      color: this.getColorByIndex(index)
    }));

    this.setData({ questionTypeAnalysis: processedData });
  },

  /**
   * 处理错题原因数据
   */
  processReasonData(reasonData) {
    const total = reasonData.reduce((sum, item) => sum + item.count, 0);
    const processedData = reasonData.map((item, index) => ({
      id: item.id,
      label: item.label,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
      description: item.description || '',
      color: this.getColorByIndex(index)
    }));

    this.setData({ reasonAnalysis: processedData });
  },

  /**
   * 获取颜色
   */
  getColorByIndex(index) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFA07A', '#98D8C8', '#F7DC6F'];
    return colors[index % colors.length];
  },

  /**
   * 学科统计模块的年级变化
   */
  onGradeChangeForStats(e) {
    const index = e.detail.value;
    const selectedGrade = this.data.gradeOptions[index];
    this.setData({
      selectedGrade: selectedGrade,
      selectedGradeIndex: index
    });
    this.loadSubjectMistakesData();
    this.loadStatisticsData();
    this.loadTrendData();
  },

  /**
   * 科目分析模块的科目变化
   */
  onSubjectChangeForAnalysis(e) {
    const index = e.detail.value;
    const selectedSubject = this.data.subjectOptions[index];
    this.setData({
      selectedAnalysisSubject: selectedSubject,
      selectedSubjectIndex: index
    });
    this.loadStatisticsData();
    this.loadTrendData();
  },

  /**
   * 设置默认题型数据
   */
  setDefaultQuestionTypeData() {
    this.setData({
      questionTypeAnalysis: [
        { id: 1, label: '选择题', count: 0, percentage: 0, color: '#FF6B6B' },
        { id: 2, label: '填空题', count: 0, percentage: 0, color: '#4ECDC4' },
        { id: 3, label: '解答题', count: 0, percentage: 0, color: '#45B7D1' }
      ]
    });
  },

  /**
   * 设置默认原因数据
   */
  setDefaultReasonData() {
    this.setData({
      reasonAnalysis: [
        { id: 1, label: '粗心', count: 0, percentage: 0, color: '#FF6B6B' },
        { id: 2, label: '概念不清', count: 0, percentage: 0, color: '#4ECDC4' }
      ]
    });
  },

  /**
   * 设置默认科目统计数据
   */
  setDefaultSubjectStats() {
    const app = getApp();
    const globalSubjects = app.globalData.subjects || [];

    // 学科颜色配置
    const subjectColors = {
      '语文': '#FF6B6B',
      '数学': '#4ECDC4',
      '英语': '#45B7D1',
      '物理': '#96CEB4',
      '化学': '#FFEAA7',
      '生物': '#DDA0DD',
      '历史': '#FFA07A',
      '地理': '#98D8C8',
      '政治': '#F7DC6F'
    };

    const stats = globalSubjects.map(subject => ({
      name: subject.name,
      count: 0,
      color: subjectColors[subject.name] || '#CCCCCC',
      barHeight: 0,
      maxHeight: 160
    }));

    this.setData({ subjectStats: stats });
  },

  /**
   * 显示描述信息
   */
  onShowDescription(e) {
    const { description } = e.currentTarget.dataset;
    wx.showModal({
      title: '说明',
      content: description,
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});
