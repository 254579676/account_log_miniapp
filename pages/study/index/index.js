const api = require('../../../utils/api').api;
const getBaseUrl = require('../../../utils/api').getBaseUrl;

Page({
  data: {
    children: [],
    currentChild: null,
    currentChildIndex: 0,
    todayStats: {
      homeworkCompleted: 0,
      homeworkTotal: 0,
      studyTime: '0h 0m'
    },
    recentExams: [],
    isLoading: false,
    currentDate: '',
    currentWeek: '',
    weather: {
      icon: '☀️',
      temperature: '25'
    },
    dataLoaded: false,
    showStudentPicker: false,
    baseUrl: getBaseUrl(),
    dailyQuote: '',
    loadingLock: false // 防止重复加载的锁
  },

  onLoad() {
    this.initDateTime();
    this.generateDailyQuote();
    this.loadChildren();
  },

  onShow() {
    // 每次显示都刷新当前孩子的数据（简单直接）
    if (this.data.dataLoaded && this.data.currentChild) {
      this.loadChildData();
    } else if (!this.data.dataLoaded || !this.data.children.length) {
      // 只有在数据未加载或数据过期时才重新加载
      this.loadChildren();
    }
  },

  // 初始化日期时间
  initDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[now.getDay()];
    
    this.setData({
      currentDate: `${year}年${month}月${day}日`,
      currentWeek: weekDay
    });
  },

  // 验证当前孩子是否仍然有效
  validateCurrentChild() {
    const { children, currentChild } = this.data;
    if (!currentChild || !children.find(child => child.id === currentChild.id)) {
      // 当前孩子无效，需要重新选择
      if (children.length > 0) {
        this.switchToChild(children[0]);
      } else {
        this.setData({
          currentChild: null,
          currentChildIndex: 0
        });
      }
    }
  },

  // 加载孩子列表
  async loadChildren() {
    // 防止重复请求
    if (this.data.loadingLock || this.data.isLoading) {
      console.log('正在加载中，跳过重复请求');
      return;
    }
    
    this.setData({ 
      isLoading: true,
      loadingLock: true
    });
    
    try {
      const res = await api.study.children.getList();
      
      if (res.code === 200) {
        const children = res.data.children || [];
        const currentChildId = wx.getStorageSync('currentChildId');
        let currentChild = null;
        
        if (children.length > 0) {
          // 查找当前选中的孩子，如果没有则默认选中第一个
          currentChild = children.find(child => child.id == currentChildId) || children[0];
          
          // 存储当前选中的孩子ID
          wx.setStorageSync('currentChildId', currentChild.id);
          wx.setStorageSync('currentChild', currentChild);
        }
        
        // 找到当前选中孩子的索引
        const currentChildIndex = children.findIndex(child => child.id == currentChild.id);
        
        this.setData({
          children,
          currentChild,
          currentChildIndex,
          dataLoaded: true
        });
        
        // 加载当前孩子的数据
        if (currentChild) {
          await this.loadChildData();
        }
      }
    } catch (error) {
      console.error('加载孩子列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ 
        isLoading: false,
        loadingLock: false
      });
    }
  },

  // 加载孩子数据（合并今日统计和近期考试）
  async loadChildData() {
    if (!this.data.currentChild) return;
    
    try {
      // 并行加载数据以提高效率
      const [todayStatsRes, recentExamsRes] = await Promise.all([
        api.study.homework.getToday({
          child_id: this.data.currentChild.id
        }),
        api.study.exam.getList({
          child_id: this.data.currentChild.id,
          limit: 6
        })
      ]);

      // 处理今日统计数据
      if (todayStatsRes.code === 200) {
        const data = todayStatsRes.data;
        const totalMinutes = data.total_time_minutes || 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const studyTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        this.setData({
          todayStats: {
            homeworkCompleted: data.completed_homeworks || 0,
            homeworkTotal: data.total_homeworks || 0,
            studyTime: studyTime
          }
        });
      }

      // 处理近期考试数据
      if (recentExamsRes.code === 200) {
        const exams = recentExamsRes.data.exam_list || [];
        
        const formattedExams = exams.map(exam => ({
          id: exam.id,
          subject_name: exam.subject_name || exam.subject,
          subject: exam.subject_name || exam.subject,
          exam_name: exam.exam_name,
          exam_type: exam.exam_type,
          score: exam.score,
          total_score: exam.total_score,
          exam_date: this.formatDate(exam.exam_date),
          images: exam.images || [],
          class_ranking: exam.class_ranking,
          grade_ranking: exam.grade_ranking,
          grade: exam.grade
        }));
        
        this.setData({
          recentExams: formattedExams
        });
      }
    } catch (error) {
      console.error('加载孩子数据失败:', error);
      // 失败时使用默认值
      this.setData({
        todayStats: {
          homeworkCompleted: 0,
          homeworkTotal: 0,
          studyTime: '0m'
        },
        recentExams: []
      });
    }
  },

  // 显示学生选择弹窗
  onShowStudentPicker() {
    this.setData({ showStudentPicker: true });
  },

  // 隐藏学生选择弹窗
  onHideStudentPicker() {
    this.setData({ showStudentPicker: false });
  },

  // 切换到指定孩子
  async switchToChild(student) {
    // 找到当前选中学生的索引
    const currentChildIndex = this.data.children.findIndex(child => child.id === student.id);
    
    this.setData({
      currentChildIndex,
      currentChild: student
    });
    
    wx.setStorageSync('currentChildId', student.id);
    wx.setStorageSync('currentChild', student);
    
    // 重新加载该学生的数据
    await this.loadChildData();
  },

  // 选择学生
  async onSelectStudent(e) {
    const student = e.currentTarget.dataset.student;
    
    if (this.data.currentChild && this.data.currentChild.id === student.id) {
      this.setData({ showStudentPicker: false });
      return; // 点击当前选中的学生不做处理
    }
    
    this.setData({ showStudentPicker: false });
    
    try {
      await this.switchToChild(student);
      
      wx.showToast({
        title: `已切换到${student.name}`,
        icon: 'success'
      });
    } catch (error) {
      console.error('切换学生失败:', error);
      wx.showToast({
        title: '切换失败',
        icon: 'none'
      });
    }
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },

  // 选择孩子（保留原有方法作为备用）
  async onChildSelect(e) {
    const { child } = e.currentTarget.dataset;
    
    if (this.data.currentChild && this.data.currentChild.id === child.id) {
      return; // 点击当前选中的孩子不做处理
    }
    
    try {
      await this.switchToChild(child);
      
      wx.showToast({
        title: `已切换到${child.name}`,
        icon: 'success'
      });
    } catch (error) {
      console.error('切换孩子失败:', error);
      wx.showToast({
        title: '切换失败',
        icon: 'none'
      });
    }
  },

  // 添加第一个孩子
  onAddChild() {
    wx.navigateTo({
      url: '/pages/study/children/add-child'
    });
  },



  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 生成每日鼓励诗词
  generateDailyQuote() {
    const quotes = [
      "书山有路勤为径，学海无涯苦作舟。",
      "不积跬步，无以至千里；不积小流，无以成江海。",
      "宝剑锋从磨砺出，梅花香自苦寒来。",
      "千里之行，始于足下。",
      "学而时习之，不亦说乎？",
      "温故而知新，可以为师矣。",
      "业精于勤，荒于嬉；行成于思，毁于随。",
      "少壮不努力，老大徒伤悲。",
      "黑发不知勤学早，白首方悔读书迟。",
      "读书破万卷，下笔如有神。",
      "三更灯火五更鸡，正是男儿读书时。",
      "纸上得来终觉浅，绝知此事要躬行。",
      "问渠那得清如许？为有源头活水来。",
      "山重水复疑无路，柳暗花明又一村。",
      "路漫漫其修远兮，吾将上下而求索。",
      "博学之，审问之，慎思之，明辨之，笃行之。",
      "知之者不如好之者，好之者不如乐之者。",
      "学而不思则罔，思而不学则殆。",
      "敏而好学，不耻下问。",
      "读万卷书，行万里路。",
      "天行健，君子以自强不息。",
      "锲而不舍，金石可镂。",
      "青，取之于蓝而青于蓝；冰，水为之而寒于水。",
      "吾生也有涯，而知也无涯。",
      "书到用时方恨少，事非经过不知难。",
      "旧书不厌百回读，熟读深思子自知。",
      "立身以立学为先，立学以读书为本。",
      "读书之乐，乐在心得；读书之用，用在致用。",
      "发奋识遍天下字，立志读尽人间书。",
      "富贵必从勤苦得，男儿需读五车书。"
    ];

    // 基于日期生成固定的索引，确保同一天总是显示相同的诗词
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      const char = dateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    const index = Math.abs(hash) % quotes.length;
    
    this.setData({
      dailyQuote: quotes[index]
    });
  },

  onChildTap() {
    wx.navigateTo({
      url: '/pages/study/children/children'
    });
  },

  onHomeworkTap() {
    if (!this.data.currentChild) {
      wx.showToast({
        title: '请先添加孩子',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/study/homework/homework'
    });
  },

  onExamTap() {
    if (!this.data.currentChild) {
      wx.showToast({
        title: '请先添加孩子',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/study/exam/exam'
    });
  },

  onScoreAnalysisTap() {
    if (!this.data.currentChild) {
      wx.showToast({
        title: '请先添加孩子',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/study/exam/exam-stats'
    });
  },

  onErrorAnalysisTap() {
    if (!this.data.currentChild) {
      wx.showToast({
        title: '请先添加孩子',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      // url: '/pages/study/analysis/analysis'
      url: '/pages/study/error/error-list'
    });
  },

  onImagePreview(e) {
    const { url, urls } = e.currentTarget.dataset;
    const tmpurl = url.startsWith('http') ? url : this.data.baseUrl + url;
    const tmpurls = urls.map(img => img.startsWith('http') ? img : this.data.baseUrl + img);

    wx.previewImage({
      current: tmpurl,
      urls: tmpurls
    });
  }
  
});