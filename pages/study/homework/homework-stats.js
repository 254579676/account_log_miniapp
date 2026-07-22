const api = require('../../../utils/api').api;

Page({
  data: {
    currentChild: null,
    selectedPeriod: '本周',
    periodOptions: ['本周', '本月', '全部', '自定义'],
    stats: {
      totalHomework: 0,
      completedHomework: 0,
      completionRate: 0,
      totalTime: 0,
      subjectStats: {}
    },
    chartData: [],
    // 自定义时间选择相关
    showCalendar: false, // 添加日历显示控制字段
    customStartDate: '',
    customEndDate: '',
    today: ''
  },

  onLoad() {
    this.initData();
    this.initCustomDateData();
  },

  onShow() {
    // 页面显示时不需要重新加载数据，避免重复请求
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  initData() {
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
    this.loadStats();
  },

  onPeriodChange(e) {
    const periods = ['本周', '本月', '全部'];
    this.setData({
      selectedPeriod: periods[e.detail.value]
    });
    this.loadStats();
  },

  // 添加快速周期选择方法
  onQuickPeriodSelect(e) {
    const period = e.currentTarget.dataset.period;
    this.setData({
      selectedPeriod: period
    });
    // 如果不是自定义时间，则加载数据
    if (period !== '自定义') {
      this.loadStats();
    }
  },

  async loadStats() {
    if (!this.data.currentChild) return;
    
    wx.showLoading({ title: '加载中...' });
    
    try {
      const { currentChild, selectedPeriod } = this.data;
      const result = await this.getHomeworkStats(currentChild.id, selectedPeriod);
      
      this.setData({
        stats: result.stats,
        chartData: result.chartData
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  async getHomeworkStats(childId, period) {
    try {
      // 根据设计文档调用统计接口
      const dateRange = this.getDateRange(period);
      const res = await api.study.homework.getStats({
        child_id: childId,
        date_range: dateRange
      });
      
      if (res.code === 200 && res.data) {
        return this.formatStatsData(res.data);
      }
    } catch (error) {
      console.log('API获取失败，使用本地数据:', error);
    }

    // API失败时使用本地存储数据
    return this.getLocalStats(childId, period);
  },

  getDateRange(period) {
    const today = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '本周':
        // 本周第一天是周一，最后一天是周日
        const dayOfWeek = today.getDay(); // 0表示周日
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 计算到周一需要的天数差
        startDate = new Date(today);
        startDate.setDate(today.getDate() + diffToMonday);
        break;
      case '本月':
        // 本月第一天到最后一天
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case '本年':
        // 本年第一天到最后一天
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case '全部':
        startDate.setFullYear(today.getFullYear() - 1); // 最近一年
        break;
    }
    
    // 确保结束日期不超过今天
    const endDate = new Date(today);
    
    return {
      start_date: this.formatDateForAPI(startDate),
      end_date: this.formatDateForAPI(endDate)
    };
  },

  formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatStatsData(apiData) {
    // 根据API返回格式化数据，完全符合设计文档
    const stats = {
      totalHomework: apiData.total || 0,
      completedHomework: apiData.completed || 0,
      completionRate: Math.round(apiData.completion_rate || 0),
      totalTime: apiData.total_time || 0,
      subjectStats: {},
      subjectStatsList: [] // 新增：用于列表展示的数组格式
    };

    // 格式化科目统计 - 按照设计文档的subject_stats数组格式
    if (apiData.subject_stats && Array.isArray(apiData.subject_stats)) {
      apiData.subject_stats.forEach(subject => {
        const completionRate = Math.round(subject.completion_rate || 0);
        const subjectData = {
          total: subject.total || 0,
          completed: subject.completed || 0,
          completionRate: completionRate,
          progressWidth: completionRate,
          progressStyle: `width:${completionRate}%`,
          subjectName: subject.subject_name
        };
        
        // 保留对象格式用于兼容
        stats.subjectStats[subject.subject_name] = subjectData;
        
        // 添加到数组格式用于列表展示
        stats.subjectStatsList.push(subjectData);
      });
    }

    return {
      stats,
      chartData: [] // API暂不提供趋势数据，使用本地数据
    };
  },

  getLocalStats(childId, period) {
    // 本地数据获取逻辑（保持原有逻辑）
    const allHomework = [];
    const storageKeys = wx.getStorageInfoSync().keys.filter(key => key.startsWith(`homework_${childId}_`));
    
    storageKeys.forEach(key => {
      const date = key.split('_').pop();
      if (this.isDateInPeriod(date, period)) {
        const homeworkList = wx.getStorageSync(key) || [];
        homeworkList.forEach(homework => {
          allHomework.push({
            ...homework,
            date
          });
        });
      }
    });

    // 如果没有本地数据，提供模拟数据用于测试
    if (allHomework.length === 0) {
      return this.getMockStats();
    }

    const stats = this.calculateStats(allHomework);
    const chartData = this.prepareChartData(allHomework);

    return { stats, chartData };
  },

  // 模拟数据用于测试
  getMockStats() {
    const subjectStatsData = {
      '数学': {
        total: 15,
        completed: 14,
        completionRate: 93,
        progressWidth: 93,
        progressStyle: 'width:93%'
      },
      '语文': {
        total: 12,
        completed: 11,
        completionRate: 92,
        progressWidth: 92,
        progressStyle: 'width:92%'
      },
      '英语': {
        total: 10,
        completed: 8,
        completionRate: 80,
        progressWidth: 80,
        progressStyle: 'width:80%'
      },
      '物理': {
        total: 8,
        completed: 7,
        completionRate: 88,
        progressWidth: 88,
        progressStyle: 'width:88%'
      }
    };

    const subjectStatsList = [
      { ...subjectStatsData['数学'], subjectName: '数学' },
      { ...subjectStatsData['语文'], subjectName: '语文' },
      { ...subjectStatsData['英语'], subjectName: '英语' },
      { ...subjectStatsData['物理'], subjectName: '物理' }
    ];

    const mockStats = {
      totalHomework: 45,
      completedHomework: 40,
      completionRate: 89,
      totalTime: 1200,
      subjectStats: subjectStatsData,
      subjectStatsList
    };

    const mockChartData = [
      { date: '2024-01-08', dateFormatted: '1/8', total: 8, completed: 7, completedHeight: 87, totalHeight: 100 },
      { date: '2024-01-07', dateFormatted: '1/7', total: 6, completed: 5, completedHeight: 83, totalHeight: 100 },
      { date: '2024-01-06', dateFormatted: '1/6', total: 7, completed: 6, completedHeight: 86, totalHeight: 100 },
      { date: '2024-01-05', dateFormatted: '1/5', total: 5, completed: 4, completedHeight: 80, totalHeight: 100 },
      { date: '2024-01-04', dateFormatted: '1/4', total: 9, completed: 8, completedHeight: 89, totalHeight: 100 },
      { date: '2024-01-03', dateFormatted: '1/3', total: 6, completed: 5, completedHeight: 83, totalHeight: 100 },
      { date: '2024-01-02', dateFormatted: '1/2', total: 4, completed: 3, completedHeight: 75, totalHeight: 100 }
    ];

    return {
      stats: mockStats,
      chartData: mockChartData
    };
  },

  isDateInPeriod(dateStr, period) {
    const date = new Date(dateStr);
    const today = new Date();
    
    switch (period) {
      case '本周':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return date >= weekStart;
      case '本月':
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      case '全部':
        return true;
      default:
        return true;
    }
  },

  calculateStats(homeworkData) {
    const totalHomework = homeworkData.length;
    const completedHomework = homeworkData.filter(h => h.status === '已完成' || h.completed).length;
    const completionRate = totalHomework > 0 ? Math.round((completedHomework / totalHomework) * 100) : 0;
    
    const totalTime = homeworkData
      .filter(h => h.estimated_time || h.estimatedTime)
      .reduce((sum, h) => sum + parseInt(h.estimated_time || h.estimatedTime || 0), 0);

    const subjectStats = {};
    homeworkData.forEach(homework => {
      const subjectName = homework.subject_name || homework.subject || '未知科目';
      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = {
          total: 0,
          completed: 0,
          totalTime: 0
        };
      }
      subjectStats[subjectName].total++;
      if (homework.status === '已完成' || homework.completed) {
        subjectStats[subjectName].completed++;
      }
      if (homework.estimated_time || homework.estimatedTime) {
        subjectStats[subjectName].totalTime += parseInt(homework.estimated_time || homework.estimatedTime || 0);
      }
    });

    // 计算进度百分比和样式
    Object.keys(subjectStats).forEach(subject => {
      const subjectData = subjectStats[subject];
      subjectData.progressWidth = subjectData.total > 0 ? Math.round((subjectData.completed / subjectData.total) * 100) : 0;
      subjectData.progressStyle = `width:${subjectData.progressWidth}%`;
    });

    // 按作业数量排序科目
    const sortedSubjectStats = {};
    const subjectStatsList = [];
    Object.keys(subjectStats)
      .sort((a, b) => subjectStats[b].total - subjectStats[a].total)
      .forEach(subject => {
        sortedSubjectStats[subject] = subjectStats[subject];
        // 添加到数组格式用于列表展示
        subjectStatsList.push({
          ...subjectStats[subject],
          subjectName: subject,
          totalTime: subjectStats[subject].totalTime || 0
        });
      });

    return {
      totalHomework,
      completedHomework,
      completionRate,
      totalTime,
      subjectStats: sortedSubjectStats,
      subjectStatsList
    };
  },

  prepareChartData(homeworkData) {
    const dailyStats = {};
    
    homeworkData.forEach(homework => {
      if (!dailyStats[homework.date]) {
        dailyStats[homework.date] = {
          total: 0,
          completed: 0
        };
      }
      dailyStats[homework.date].total++;
      if (homework.completed) {
        dailyStats[homework.date].completed++;
      }
    });

    const chartData = Object.keys(dailyStats)
      .sort()
      .map(date => ({
        date,
        dateFormatted: this.formatDate(date),
        ...dailyStats[date]
      }))
      .slice(-7); // 最近7天

    // 计算高度百分比
    const maxTotal = Math.max(...chartData.map(d => d.total), 1);
    chartData.forEach(item => {
      item.completedHeight = Math.round((item.completed / maxTotal) * 100);
      item.totalHeight = Math.round((item.total / maxTotal) * 100);
    });

    return chartData;
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  },

  getBarHeight(value, maxValue) {
    if (maxValue === 0) return 0;
    return Math.round((value / maxValue) * 100);
  },

  getMaxTotal() {
    if (this.data.chartData.length === 0) return 1;
    return Math.max(...this.data.chartData.map(d => d.total));
  },

  // 分享功能
  onShareAppMessage() {
    const { currentChild, stats, selectedPeriod } = this.data;
    return {
      title: `${currentChild.name}的${selectedPeriod}作业统计`,
      path: `/pages/study/homework/homework-stats?childId=${currentChild.id}`,
      imageUrl: '/assets/icons/share-stats.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { currentChild, selectedPeriod } = this.data;
    return {
      title: `${currentChild.name}的${selectedPeriod}作业统计`,
      query: `childId=${currentChild.id}`,
      imageUrl: '/assets/icons/share-stats.png'
    };
  },

  // 导出统计数据
  onExportStats() {
    const { currentChild, stats, selectedPeriod } = this.data;
    
    // 构建导出数据
    const exportData = {
      childName: currentChild.name,
      period: selectedPeriod,
      exportTime: new Date().toLocaleString(),
      summary: {
        totalHomework: stats.totalHomework,
        completedHomework: stats.completedHomework,
        completionRate: stats.completionRate + '%',
        totalTime: stats.totalTime + '分钟'
      },
      subjectDetails: []
    };

    // 添加科目详情
    stats.subjectStatsList.forEach(subject => {
      exportData.subjectDetails.push({
        subject: subject.subjectName,
        total: subject.total,
        completed: subject.completed,
        completionRate: Math.round((subject.completed / subject.total) * 100) + '%'
      });
    });

    // 转换为JSON字符串
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: jsonString,
      success: () => {
        wx.showToast({
          title: '统计数据已复制到剪贴板',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 刷新数据
  async onRefreshData() {
    wx.showLoading({ title: '刷新中...' });
    
    try {
      await this.loadStats();
      wx.showToast({
        title: '数据已更新',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 初始化自定义时间数据
  initCustomDateData() {
    const today = new Date();
    const todayStr = this.formatDateForAPI(today);
    
    this.setData({
      today: todayStr,
      customStartDate: '',
      customEndDate: todayStr
    });
  },

  // 显示自定义时间选择器
  onShowCustomDatePicker(e) {
    const period = e ? e.currentTarget.dataset.period : '自定义';
    this.setData({
      selectedPeriod: period,
      showCalendar: true
    });
  },

  // 隐藏日历
  onHideCalendar() {
    this.setData({
      showCalendar: false
    });
  },

  // 日历确认选择
  onCalendarConfirm(e) {
    const { startDate, endDate } = e.detail;
    
    this.setData({
      showCalendar: false,
      customStartDate: startDate,
      customEndDate: endDate,
      selectedPeriod: '自定义'
    });
    
    // 验证日期范围
    this.validateDateRange();
    
    // 加载自定义日期范围的数据
    this.loadCustomDateStats(startDate, endDate);
  },

  // 隐藏自定义时间选择器
  onHideCustomDatePicker() {
    this.setData({
      showCustomDateModal: false
    });
  },

  // 阻止事件冒泡
  stopPropagation(e) {
    // 阻止事件冒泡，防止点击弹窗内部时关闭弹窗
    // 注意：在某些情况下，事件对象可能不包含stopPropagation方法
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
  },

  // 开始日期改变
  onStartDateChange(e) {
    const startDate = e.detail.value;
    this.setData({
      customStartDate: startDate
    });
    this.validateDateRange();
  },

  // 结束日期改变
  onEndDateChange(e) {
    const endDate = e.detail.value;
    this.setData({
      customEndDate: endDate
    });
    this.validateDateRange();
  },

  // 验证日期范围
  validateDateRange() {
    const { customStartDate, customEndDate } = this.data;
    
    if (!customStartDate || !customEndDate) {
      this.setData({
        dateRangeDays: 0,
        canConfirmDate: false
      });
      return;
    }

    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const today = new Date();
    
    // 检查日期有效性
    if (start > end) {
      this.setData({
        dateRangeDays: 0,
        canConfirmDate: false
      });
      return;
    }

    if (end > today) {
      wx.showToast({
        title: '结束日期不能超过今天',
        icon: 'none'
      });
      this.setData({
        customEndDate: this.data.today,
        canConfirmDate: false
      });
      return;
    }

    // 计算天数差
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    this.setData({
      dateRangeDays: daysDiff,
      canConfirmDate: daysDiff > 0 && daysDiff <= 365
    });
  },

  // 加载自定义日期范围的统计数据
  async loadCustomDateStats(startDate, endDate) {
    if (!this.data.currentChild) return;
    
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await api.study.homework.getStats({
        child_id: this.data.currentChild.id,
        date_range: {
          start_date: startDate,
          end_date: endDate
        }
      });
      
      if (res.code === 200 && res.data) {
        const result = this.formatStatsData(res.data);
        this.setData({
          stats: result.stats,
          chartData: result.chartData
        });
      }
    } catch (error) {
      console.error('加载自定义统计数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});