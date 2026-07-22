const { api } = require('../../../utils/api');

Page({
  data: {
    currentChild: null,
    childrenList: [],
    showStudentPicker: false,

    // 年级选择 - 从全局获取
    gradeOptions: [],
    selectedGrade: '',
    selectedGradeIndex: -1,

    // 科目选择 - 从全局获取
    subjectOptions: [],
    selectedSubject: '',
    selectedSubjectIndex: -1,



    // 图表数据
    comprehensiveChartData: [],
    subjectChartData: [],

    // 综合考试统计数据
    comprehensiveStats: {
      totalScore: 0,
      highestScore: 0,
      avgScore: 0,
      lowestScore: 0
    },

    // 单科成绩统计数据
    subjectStats: {
      totalScore: 0,
      highestScore: 0,
      avgScore: 0,
      lowestScore: 0
    },

    hasData: false
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    // 页面显示时不需要重新加载数据，避免重复请求
    if (this.data.currentChild) {
      this.loadChartData();
    }
  },

  onPullDownRefresh() {
    this.loadChartData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  initData() {
    const app = getApp();
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

    // 从全局获取年级数据
    const globalGrades = app.globalData.grades || [];
    const gradeOptions = globalGrades.map(g => g.name);

    // 从全局获取学科数据
    const globalSubjects = app.globalData.subjects || [];
    const subjectOptions = globalSubjects.map(s => s.name);

    // 设置默认年级（当前学生的年级）
    const gradeIndex = gradeOptions.indexOf(currentChild.grade || '');
    const selectedGrade = gradeIndex >= 0 ? gradeOptions[gradeIndex] : '';

    // 设置默认科目（第一个学科）
    const subjectIndex = subjectOptions.length > 0 ? 0 : -1;
    const selectedSubject = subjectIndex >= 0 ? subjectOptions[subjectIndex] : '';

    this.setData({
      currentChild,
      gradeOptions,
      selectedGrade,
      selectedGradeIndex: gradeIndex,
      subjectOptions,
      selectedSubject,
      selectedSubjectIndex: subjectIndex
    });

    this.loadChildren();
  },

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

  // 显示学生选择器
  onShowStudentPicker() {
    this.setData({ showStudentPicker: true });
  },

  // 隐藏学生选择器
  onHideStudentPicker() {
    this.setData({ showStudentPicker: false });
  },

  // 选择学生
  onSelectStudent(e) {
    const student = e.currentTarget.dataset.student;
    this.setData({
      currentChild: student,
      showStudentPicker: false,
      selectedGrade: student.grade || '',
      selectedGradeIndex: this.data.gradeOptions.indexOf(student.grade || '')
    });

    // 保存到本地存储
    wx.setStorageSync('currentChild', student);

    // 重新加载数据
    this.loadChartData();
  },

  // 年级选择变化
  onGradeChange(e) {
    const index = e.detail.value;
    const grade = this.data.gradeOptions[index];

    this.setData({
      selectedGrade: grade,
      selectedGradeIndex: index
    });

    this.loadChartData();
  },

  // 科目选择变化
  onSubjectChange(e) {
    const index = e.detail.value;
    const subject = this.data.subjectOptions[index];

    this.setData({
      selectedSubject: subject,
      selectedSubjectIndex: index
    });

    this.loadSubjectChart();
  },



  // 加载图表数据
  async loadChartData() {
    if (!this.data.currentChild || !this.data.selectedGrade) {
      this.setData({ hasData: false });
      return;
    }

    await this.loadComprehensiveChart();
    
    if (this.data.selectedSubject) {
      await this.loadSubjectChart();
    }
  },

  // 加载综合考试总分曲线图数据
  async loadComprehensiveChart() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const res = await api.study.exam.getComprehensives({
        child_id: this.data.currentChild.id,
        grade: this.data.selectedGrade
      });
      
      if (res.code === 200) {
        const chartData = res.data || [];
        // 计算统计数据
        const stats = this.calculateStats(chartData);
        this.setData({ 
          comprehensiveChartData: chartData,
          comprehensiveStats: stats,
          hasData: chartData.length > 0
        });
        // 图表组件会自动处理数据更新
      }
    } catch (error) {
      console.error('加载综合考试趋势失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  // 加载单科成绩曲线图数据
  async loadSubjectChart() {
    if (!this.data.selectedSubject) return;
    
    try {
      wx.showLoading({ title: '加载中...' });
      const subject_name = this.data.selectedSubject
      const subject_id = this.data.subjectOptions.indexOf(subject_name)+1;
      const res = await api.study.exam.getSingles({
        child_id: this.data.currentChild.id,
        grade: this.data.selectedGrade,
        subject_id: subject_id ,
        subject: this.data.selectedSubject
      });
      
      if (res.code === 200) {
        const chartData = res.data || [];
        // 计算统计数据
        const stats = this.calculateStats(chartData);
        this.setData({ 
          subjectChartData: chartData,
          subjectStats: stats,
          hasData: this.data.hasData || chartData.length > 0
        });
        // 图表组件会自动处理数据更新
      }
    } catch (error) {
      console.error('加载单科成绩趋势失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  // 计算统计数据
  calculateStats(data) {
    if (!data || data.length === 0) {
      return {
        totalScore: 0,
        highestScore: 0,
        avgScore: 0,
        lowestScore: 0
      };
    }
    
    const scores = data.map(item => item.score || 0);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const avgScore = Math.round(totalScore / scores.length);
    
    return {
      totalScore,
      highestScore,
      avgScore,
      lowestScore
    };
  },

  // 综合考试柱状图触摸事件处理
  onComprehensiveBarTouch(e) {
    // tooltip由组件内部处理
  },

  // 单科成绩柱状图触摸事件处理
  onSubjectBarTouch(e) {
    // tooltip由组件内部处理
  },

  // 柱状图触摸结束事件
  onBarTouchEnd() {
    // tooltip由组件内部处理
  },

  // 阻止弹窗内容区域的事件冒泡
  onModalContentTap() {
    // 空方法，仅用于阻止事件冒泡
  }
});