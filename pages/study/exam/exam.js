const utilsApi = require('../../../utils/api');
const api = utilsApi.api;
const getBaseUrl = utilsApi.getBaseUrl;

Page({
  data: {
    // 当前学生信息
    currentChild: null,
    
    // 考试列表数据
    examList: [],
    unitTestList: [],
    otherExamList: [],
    
    // 分页控制
    hasMoreUnitTests: false,
    hasMoreOtherExams: false,
    MAX_INITIAL_ITEMS: 50,
    
    // 界面状态
    activeTab: 'comprehensive',
    showEditOptions: false,
    showUnitTestOptions: false,
    showErrorInputModal: false,
    showUnitTestModal: false,
    showComprehensiveModal: false,
    showSingleSubjectModal: false,
    continueAddSingleSubject: false,
    continueAddError: false,
    
    // 选中的数据
    selectedExam: null,
    selectedErrorExam: null,
    editingExam: null,
    editingSingleSubject: null,
    selectedSubjectIndex: 0,
    errorQuestionTypeIndex: 0,
    
    // 基础配置数据（从 app.js 获取）
    subjects: [],
    subjectList: [],
    grades: [],
    examTypes: ['月考', '期中考试', '期末考试', '模拟考试'],
    
    // 年级筛选相关
    gradeFilterOptions: ['选择年级'],
    selectedGradeIndex: 0,
    selectedGradeText: '选择年级',
    difficultyLevels: [
      { id: '简单', text: '简单' },
      { id: '中等', text: '中等' },
      { id: '困难', text: '困难' }
    ],
    
    // URL配置
    baseUrl: getBaseUrl(),
    
    // 展开状态管理
    expandedExams: {},
    singleSubjectDetails: {},
    
    // 表单数据
    unitTestData: {
      subject_id: '',
      subject_name: '',
      exam_name: '',
      exam_type: '单元测试',
      score: '',
      total_score: '',
      exam_date: '',
      class_ranking: '',
      images: [],
      remarks: ''
    },
    
    comprehensiveTestData: {
      exam_name: '',
      exam_type: '',
      score: '',
      total_score: '',
      exam_date: '',
      class_ranking: '',
      grade_ranking: '',
      remarks: ''
    },
    
    singleSubjectData: {
      parent_exam_id: '',
      subject_id: '',
      subject_name: '',
      exam_name: '',
      exam_type: '单科成绩',
      score: '',
      total_score: '',
      exam_date: '',
      class_ranking: '',
      images: []
    },
    
    errorInputData: {
      subject_id: '',
      subject_name: '',
      question_type_name: '',
      question_type_id: '',
      difficulty: '',
      mistake_reason: '',
      mistake_reason_subtype: '',
      mistake_reason_subtype_label: '',
      record_date: '',
      question_content: '',
      solution_content: '',
      exam_date: '',
      exam_id: '',
      source_type: '考试',
      solution_image: []
    },
    
    // 错题相关动态数据
    errorQuestionTypes: [],
    errorMistakeReasons: [],
    errorMistakeReasonSubtypes: []
  },

  onLoad() {
    this.initPageData();
  },

  onShow() {
    // 页面显示时不需要重新加载数据，避免重复请求
  },

  onPullDownRefresh() {
    this.loadExamList().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /** 
   * 处理年级选项数据
   * @param {Array} grades - 年级数据数组（字典格式）
   * @returns {Array} - 处理后的年级名称数组
   */
  processGradeOptions(grades) {
    if (!Array.isArray(grades)) return [];
    
    return grades.map(grade => {
      if (typeof grade === 'object' && grade !== null) {
        return grade.name || grade.text || grade.label || '未知年级';
      }
      return String(grade);
    });
  },

  /** 
   * 获取默认年级索引
   * @param {string} currentGrade - 当前学生的年级
   * @param {Array} gradeOptions - 年级选项数组
   * @returns {number} - 默认选中的年级索引
   */
  getDefaultGradeIndex(currentGrade, gradeOptions) {
    if (!currentGrade) return 0; // 默认为第一个年级
    
    // 查找当前年级在选项中的位置
    const index = gradeOptions.findIndex(grade => {
      // 支持多种匹配方式
      return grade === currentGrade || 
             grade.includes(currentGrade) || 
             currentGrade.includes(grade);
    });
    
    return index >= 0 ? index : 0; // 直接返回匹配的索引
  },

  /** 
   * 初始化页面数据
   */
  initPageData() {
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

    // 获取全局数据
    const app = getApp();
    const globalSubjects = app.globalData.subjects || [];
    const globalGrades = app.globalData.grades || [];

    // 处理年级数据：将字典格式转换为picker可用的数组
    const processedGrades = this.processGradeOptions(globalGrades);
    
    // 直接使用年级列表，不包含"选择年级"选项
    const gradeFilterOptions = processedGrades;
    
    // 设置默认选中的年级索引
    const selectedGradeIndex = this.getDefaultGradeIndex(currentChild.grade, processedGrades);
    
    // 设置数据
    this.setData({
      currentChild,
      subjects: globalSubjects.map(subject => subject.name),
      subjectList: globalSubjects,
      grades: globalGrades,
      gradeFilterOptions: gradeFilterOptions,
      selectedGradeIndex: selectedGradeIndex,
      selectedGradeText: gradeFilterOptions[selectedGradeIndex] || '选择年级'
    });

    // 加载考试数据
    this.loadExamList();
  },

  /** 
   * 加载考试列表
   */
  async loadExamList() {
    if (!this.data.currentChild) return;

    try {
      wx.showLoading({ title: '加载中...' });
      
      // 构建请求参数
      const params = {
        child_id: this.data.currentChild.id
      };
      
      // 添加年级筛选参数
      if (this.data.selectedGradeIndex >= 0) {
        params.grade = this.data.gradeFilterOptions[this.data.selectedGradeIndex];
      }
      
      const res = await api.study.exam.getList(params);

      if (res.code === 200) {
        const exams = res.data.exam_list || [];
        
        // 处理图片URL
        const processedExams = exams.map(exam => {
          if (!exam.images || !Array.isArray(exam.images)) {
            exam.images = [];
          }
          return { ...exam };
        });

        // 分类考试列表
        const unitTestList = processedExams.filter(exam => exam.exam_type === '单元测试');
        const otherExamList = processedExams.filter(exam => exam.exam_type !== '单元测试');

        this.setData({
          examList: processedExams,
          unitTestList: unitTestList.slice(0, this.data.MAX_INITIAL_ITEMS),
          otherExamList: otherExamList.slice(0, this.data.MAX_INITIAL_ITEMS),
          hasMoreUnitTests: unitTestList.length > this.data.MAX_INITIAL_ITEMS,
          hasMoreOtherExams: otherExamList.length > this.data.MAX_INITIAL_ITEMS
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载考试列表失败:', error);
      wx.showToast({
        title: '网络异常',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /** 
   * 年级筛选变化
   */
  onGradeFilterChange(e) {
    const gradeIndex = parseInt(e.detail.value);
    const gradeText = this.data.gradeFilterOptions[gradeIndex];
    
    this.setData({
      selectedGradeIndex: gradeIndex,
      selectedGradeText: gradeText
    });
    
    // 重新加载考试列表
    this.loadExamList();
  },

  /** 
   * 标签页切换
   */
  onTabChange(e) {
    this.setData({
      activeTab: e.currentTarget.dataset.tab
    });
  },

  /** 
   * 查看统计
   */
  onViewStats() {
    wx.navigateTo({
      url: '/pages/study/exam/exam-stats'
    });
  },

  /** 
   * 展开/收起考试详情
   */
  async onViewDetail(e) {
    const exam = e.currentTarget.dataset.exam;
    const examId = exam.id;
    
    const { expandedExams } = this.data;
    const isExpanded = expandedExams[examId];
    
    if (isExpanded) {
      this.setData({
        [`expandedExams.${examId}`]: false
      });
    } else {
      try {
        wx.showLoading({ title: '加载中...' });
        
        const res = await api.study.exam.getDetailList({
          exam_id: examId,
          child_id: this.data.currentChild.id
        });
        
        if (res.code === 200) {
          const subjects = res.data || [];
          const { subjectList } = this.data;
          
          const processedSubjects = subjects.map(subject => {
            const subjectInfo = subjectList.find(s => s.id === subject.subject_id);
            return {
              ...subject,
              subject_name: subjectInfo ? subjectInfo.name : `科目${subject.subject_id}`
            };
          });
          
          this.setData({
            [`expandedExams.${examId}`]: true,
            [`singleSubjectDetails.${examId}`]: processedSubjects
          });
        } else {
          wx.showToast({
            title: res.message || '加载详情失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('加载单科成绩详情失败:', error);
        wx.showToast({
          title: '网络异常',
          icon: 'none'
        });
      } finally {
        wx.hideLoading();
      }
    }
  },

  /** 
   * 图片预览
   */
  onImagePreview(e) {
    const { url, urls } = e.currentTarget.dataset;
    
    if (urls) {
      const tmpurls = urls.map(img => img.startsWith('http') ? img : this.data.baseUrl + img);
      const tmpurl = url.startsWith('http') ? url : this.data.baseUrl + url;
      
      wx.previewImage({
        current: tmpurl,
        urls: tmpurls
      });
    }
  },

  // ==================== 单元测试相关方法 ====================

  /** 
   * 添加单元测试
   */
  onAddUnitTest() {
    const today = new Date().toISOString().split('T')[0];
    const { subjects, subjectList } = this.data;

    const defaultSubjectName = subjects[0] || '';
    const defaultSubjectId = subjectList[0]?.id || 1;

    this.setData({
      showUnitTestModal: true,
      editingExam: null,
      selectedSubjectIndex: 0,
      unitTestData: {
        subject_id: defaultSubjectId,
        subject_name: defaultSubjectName,
        exam_name: defaultSubjectName + '单元测试',
        exam_type: '单元测试',
        score: '',
        total_score: '100',
        exam_date: today,
        class_ranking: '',
        images: [],
        remarks: ''
      }
    });
  },

  /** 
   * 单元测试科目选择
   */
  onUnitTestSubjectChange(e) {
    const subjectIndex = e.detail.value;
    const subjectName = this.data.subjects[subjectIndex];
    const subjectList = this.data.subjectList;

    let subjectId = subjectIndex + 1;
    if (subjectList && subjectList[subjectIndex]) {
      subjectId = subjectList[subjectIndex].id;
    }

    this.setData({
      selectedSubjectIndex: subjectIndex,
      'unitTestData.subject_id': subjectId,
      'unitTestData.subject_name': subjectName,
      'unitTestData.exam_name': subjectName + '单元测试'
    });
  },

  /** 
   * 单元测试输入变化
   */
  onUnitTestInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`unitTestData.${field}`]: e.detail.value
    });
  },

  /** 
   * 保存单元测试
   */
  async onSaveUnitTest() {
    const { unitTestData, currentChild, editingExam } = this.data;

    if (!unitTestData.subject_name) {
      wx.showToast({ title: '请选择科目', icon: 'none' });
      return;
    }

    if (!unitTestData.score || !unitTestData.total_score) {
      wx.showToast({ title: '请输入分数', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: editingExam ? '更新中...' : '保存中...' });

      const examData = {
        child_id: currentChild.id,
        subject_id: unitTestData.subject_id,
        exam_name: unitTestData.exam_name,
        exam_type: unitTestData.exam_type,
        exam_date: unitTestData.exam_date,
        total_score: parseFloat(unitTestData.total_score),
        score: parseFloat(unitTestData.score),
        class_ranking: unitTestData.class_ranking ? parseInt(unitTestData.class_ranking) : null,
        images: unitTestData.images,
        remarks: unitTestData.remarks
      };

      if (editingExam) {
        examData.exam_id = editingExam.id;
        await api.study.exam.updateUnitTest(examData);
      } else {
        await api.study.exam.addUnitTest(examData);
      }

      this.setData({ showUnitTestModal: false });
      this.loadExamList();
      wx.showToast({
        title: editingExam ? '更新成功' : '添加成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('保存单元测试失败:', error);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /** 
   * 取消单元测试
   */
  onCancelUnitTest() {
    this.setData({ showUnitTestModal: false });
  },

  // ==================== 综合测试相关方法 ====================

  /** 
   * 添加综合测试
   */
  onAddComprehensiveTest() {
    const today = new Date().toISOString().split('T')[0];
    const { examTypes } = this.data;

    this.setData({
      showComprehensiveModal: true,
      editingExam: null,
      comprehensiveTestData: {
        exam_name: '综合测试',
        exam_type: examTypes[0] || '月考',
        score: '',
        total_score: '',
        exam_date: today,
        class_ranking: '',
        grade_ranking: '',
        remarks: ''
      }
    });
  },

  /** 
   * 考试类型选择
   */
  onExamTypeChange(e) {
    this.setData({
      'comprehensiveTestData.exam_type': this.data.examTypes[e.detail.value]
    });
  },

  /** 
   * 综合测试输入变化
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`comprehensiveTestData.${field}`]: e.detail.value
    });
  },

  /** 
   * 日期选择
   */
  onDateChange(e) {
    this.setData({
      'comprehensiveTestData.exam_date': e.detail.value
    });
  },

  /** 
   * 保存综合测试
   */
  async onSaveComprehensiveTest() {
    const { comprehensiveTestData, currentChild, editingExam } = this.data;

    if (!comprehensiveTestData.exam_type) {
      wx.showToast({ title: '请选择考试类型', icon: 'none' });
      return;
    }

    if (!comprehensiveTestData.score || !comprehensiveTestData.total_score) {
      wx.showToast({ title: '请输入分数', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: editingExam ? '更新中...' : '保存中...' });

      const examData = {
        child_id: currentChild.id,
        exam_name: comprehensiveTestData.exam_name,
        exam_type: comprehensiveTestData.exam_type,
        exam_date: comprehensiveTestData.exam_date,
        total_score: parseFloat(comprehensiveTestData.total_score),
        score: parseFloat(comprehensiveTestData.score),
        class_ranking: comprehensiveTestData.class_ranking ? parseInt(comprehensiveTestData.class_ranking) : null,
        grade_ranking: comprehensiveTestData.grade_ranking ? parseInt(comprehensiveTestData.grade_ranking) : null,
        remarks: comprehensiveTestData.remarks
      };

      if (editingExam) {
        examData.exam_id = editingExam.id;
        await api.study.exam.updateComprehensive(examData);
      } else {
        await api.study.exam.addComprehensive(examData);
      }

      this.setData({ showComprehensiveModal: false });
      this.loadExamList();
      wx.showToast({
        title: editingExam ? '更新成功' : '添加成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('保存综合测试失败:', error);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /** 
   * 取消综合测试
   */
  onCancelComprehensive() {
    this.setData({ showComprehensiveModal: false });
  },

  // ==================== 编辑选项相关方法 ====================

  /** 
   * 显示综合考试编辑选项
   */
  onShowEditOptions(e) {
    const exam = e.currentTarget.dataset.exam;
    this.setData({
      showEditOptions: true,
      selectedExam: exam
    });
  },

  /** 
   * 显示单元测试编辑选项
   */
  onShowUnitTestOptions(e) {
    const exam = e.currentTarget.dataset.exam;
    this.setData({
      showUnitTestOptions: true,
      selectedExam: exam
    });
  },

  /** 
   * 隐藏综合考试编辑选项
   */
  onHideEditOptions() {
    this.setData({
      showEditOptions: false,
      selectedExam: null
    });
  },

  /** 
   * 隐藏单元测试编辑选项
   */
  onHideUnitTestOptions() {
    this.setData({
      showUnitTestOptions: false,
      selectedExam: null
    });
  },

  /** 
   * 编辑综合成绩
   */
  onEditComprehensiveScore() {
    const { selectedExam, examTypes } = this.data;
    if (!selectedExam) return;
    
    this.setData({
      showComprehensiveModal: true,
      showEditOptions: false,
      editingExam: selectedExam,
      comprehensiveTestData: {
        id: selectedExam.id,
        exam_name: selectedExam.exam_name || '',
        exam_type: selectedExam.exam_type || examTypes[0] || '月考',
        score: selectedExam.score ? selectedExam.score.toString() : '',
        total_score: selectedExam.total_score ? selectedExam.total_score.toString() : '',
        exam_date: selectedExam.exam_date || '',
        class_ranking: selectedExam.class_ranking ? selectedExam.class_ranking.toString() : '',
        grade_ranking: selectedExam.grade_ranking ? selectedExam.grade_ranking.toString() : '',
        remarks: selectedExam.remarks || ''
      }
    });
  },

  /** 
   * 编辑单元测试
   */
  onEditUnitTest() {
    const { selectedExam, subjectList } = this.data;
    if (!selectedExam) return;
    
    const subjectInfo = subjectList.find(subject => subject.id === selectedExam.subject_id);
    if (subjectInfo) {
      selectedExam.subject_name = subjectInfo.name;
    }

    this.setData({
      showUnitTestOptions: false,
      showUnitTestModal: true,
      editingExam: selectedExam,
      unitTestData: {
        id: selectedExam.id,
        subject_id: selectedExam.subject_id || '',
        subject_name: selectedExam.subject_name || '',
        exam_name: selectedExam.exam_name || '',
        exam_type: selectedExam.exam_type || '单元测试',
        score: selectedExam.score ? selectedExam.score.toString() : '',
        total_score: selectedExam.total_score ? selectedExam.total_score.toString() : '',
        exam_date: selectedExam.exam_date || '',
        class_ranking: selectedExam.class_ranking ? selectedExam.class_ranking.toString() : '',
        images: selectedExam.images || [],
        remarks: selectedExam.remarks || ''
      }
    });
  },

  // ==================== 单科成绩相关方法 ====================

  /** 
   * 添加单科成绩
   */
  onAddSingleSubject(e) {
    const exam = e.currentTarget.dataset.exam;
    const today = new Date().toISOString().split('T')[0];
    const { subjects, subjectList } = this.data;

    const defaultSubjectName = subjects[0] || '';
    const defaultSubjectId = subjectList[0]?.id || 1;

    this.setData({
      showSingleSubjectModal: true,
      editingSingleSubject: null,
      selectedSubjectIndex: 0,
      singleSubjectData: {
        parent_exam_id: exam.id,
        subject_id: defaultSubjectId,
        subject_name: defaultSubjectName,
        exam_name: defaultSubjectName + '单科成绩',
        exam_type: '单科成绩',
        score: '',
        total_score: '100',
        exam_date: exam.exam_date || today,
        class_ranking: '',
        images: []
      }
    });
  },

  /** 
   * 编辑单科成绩
   */
  onEditSingleSubject(e) {
    const subject = e.currentTarget.dataset.subject;
    const { subjects, subjectList } = this.data;
    
    let subjectIndex = 0;
    if (subject.subject_id) {
      const subjectInfo = subjectList.find(s => s.id === subject.subject_id);
      if (subjectInfo) {
        subjectIndex = subjects.indexOf(subjectInfo.name);
        if (subjectIndex === -1) subjectIndex = 0;
      }
    }

    const processedImages = subject.images || [];

    this.setData({
      showSingleSubjectModal: true,
      editingSingleSubject: subject,
      selectedSubjectIndex: subjectIndex,
      singleSubjectData: {
        id: subject.id,
        parent_exam_id: subject.parent_exam_id,
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        exam_name: subject.exam_name || subject.subject_name + '单科成绩',
        exam_type: subject.exam_type || '单科成绩',
        score: subject.score ? subject.score.toString() : '',
        total_score: subject.total_score ? subject.total_score.toString() : '',
        exam_date: subject.exam_date || '',
        class_ranking: subject.class_ranking ? subject.class_ranking.toString() : '',
        images: processedImages
      }
    });
  },

  /** 
   * 单科成绩科目选择
   */
  onSingleSubjectChange(e) {
    const subjectIndex = e.detail.value;
    const subjectName = this.data.subjects[subjectIndex];
    const subjectList = this.data.subjectList;

    let subjectId = subjectIndex + 1;
    if (subjectList && subjectList[subjectIndex]) {
      subjectId = subjectList[subjectIndex].id;
    }

    this.setData({
      selectedSubjectIndex: subjectIndex,
      'singleSubjectData.subject_id': subjectId,
      'singleSubjectData.subject_name': subjectName,
      'singleSubjectData.exam_name': subjectName + '单科成绩'
    });
  },

  /** 
   * 单科成绩输入变化
   */
  onSingleSubjectInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`singleSubjectData.${field}`]: e.detail.value
    });
  },

  /** 
   * 保存单科成绩
   */
  async onSaveSingleSubject() {
    const { singleSubjectData, currentChild, editingSingleSubject, continueAddSingleSubject } = this.data;

    if (!singleSubjectData.subject_name) {
      wx.showToast({ title: '请选择科目', icon: 'none' });
      return;
    }

    if (!singleSubjectData.score || !singleSubjectData.total_score) {
      wx.showToast({ title: '请输入分数', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: editingSingleSubject ? '更新中...' : '保存中...' });

      const examData = {
        child_id: currentChild.id,
        parent_exam_id: singleSubjectData.parent_exam_id,
        subject_id: singleSubjectData.subject_id,
        exam_name: singleSubjectData.exam_name,
        exam_type: singleSubjectData.exam_type,
        exam_date: singleSubjectData.exam_date,
        total_score: parseFloat(singleSubjectData.total_score),
        score: parseFloat(singleSubjectData.score),
        class_ranking: singleSubjectData.class_ranking ? parseInt(singleSubjectData.class_ranking) : null,
        images: singleSubjectData.images
      };

      if (editingSingleSubject) {
        examData.exam_id = editingSingleSubject.id;
        await api.study.exam.updateSingle(examData);
      } else {
        await api.study.exam.addSingle(examData);
      }

      // 显示成功提示
      wx.showToast({
        title: editingSingleSubject ? '更新成功' : '添加成功',
        icon: 'success',
        duration: 1500
      });

      // 刷新列表和详情
      if (singleSubjectData.parent_exam_id && this.data.expandedExams[singleSubjectData.parent_exam_id]) {
        await this.refreshSingleSubjectDetails(singleSubjectData.parent_exam_id);
      }
      this.loadExamList();

      // 判断是否继续添加
      if (continueAddSingleSubject && !editingSingleSubject) {
        // 重置表单，保留科目和考试日期
        const today = new Date().toISOString().split('T')[0];
        const { subjects, subjectList } = this.data;
        const currentSubjectName = singleSubjectData.subject_name;
        const currentSubjectId = singleSubjectData.subject_id;

        this.setData({
          editingSingleSubject: null,
          singleSubjectData: {
            parent_exam_id: singleSubjectData.parent_exam_id,
            subject_id: currentSubjectId,
            subject_name: currentSubjectName,
            exam_name: currentSubjectName + '单科成绩',
            exam_type: '单科成绩',
            score: '',
            total_score: '100',
            exam_date: singleSubjectData.exam_date || today,
            class_ranking: '',
            images: []
          }
        });
      } else {
        this.setData({ showSingleSubjectModal: false });
      }
    } catch (error) {
      console.error('保存单科成绩失败:', error);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /** 
   * 取消单科成绩
   */
  onCancelSingleSubject() {
    this.setData({ showSingleSubjectModal: false });
  },

  /** 
   * 切换继续添加单科成绩选项
   */
  onToggleContinueAddSingleSubject() {
    this.setData({
      continueAddSingleSubject: !this.data.continueAddSingleSubject
    });
  },

  /** 
   * 刷新单科成绩详情
   */
  async refreshSingleSubjectDetails(examId) {
    try {
      const res = await api.study.exam.getDetailList({
        exam_id: examId,
        child_id: this.data.currentChild.id
      });
      
      if (res.code === 200) {
        const subjects = res.data || [];
        const { subjectList } = this.data;
        
        const processedSubjects = subjects.map(subject => {
          const subjectInfo = subjectList.find(s => s.id === subject.subject_id);
          return {
            ...subject,
            subject_name: subjectInfo ? subjectInfo.name : `科目${subject.subject_id}`
          };
        });
        
        this.setData({
          [`singleSubjectDetails.${examId}`]: processedSubjects
        });
      }
    } catch (error) {
      console.error('刷新单科成绩详情失败:', error);
    }
  },

  // ==================== 图片上传相关方法 ====================

  /** 
   * 选择单元测试图片
   */
  onChooseImage() {
    this.chooseAndUploadImages('unitTestData');
  },

  /** 
   * 选择单科成绩图片
   */
  onChooseSingleSubjectImage() {
    this.chooseAndUploadImages('singleSubjectData');
  },

  /** 
   * 选择错题图片
   */
  onChooseErrorImage() {
    this.chooseAndUploadImages('errorInputData', 'solution_image');
  },

  /** 
   * 通用图片选择上传方法
   */
  async chooseAndUploadImages(dataField, imageField = 'images') {
    const currentImages = this.data[dataField][imageField] || [];
    const maxCount = 9;

    wx.chooseImage({
      count: maxCount - currentImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePaths = res.tempFilePaths;

        if (!tempFilePaths || tempFilePaths.length === 0) {
          return;
        }

        wx.showLoading({ title: '上传中...' });

        try {
          const uploadedImages = [];

          // 关键：串行上传，确保每个图片上传完成后再传下一个
          for (let i = 0; i < tempFilePaths.length; i++) {
            const filePath = tempFilePaths[i];
            
            try {
              // 等待前一个上传完全完成再传下一个
              const uploadRes = await this.uploadImageWithRetry(filePath);
              
              if (uploadRes && uploadRes.code === 200) {
                uploadedImages.push(uploadRes.data.url);
              } else {
                wx.showToast({
                  title: '上传失败',
                  icon: 'none'
                });
              }
            } catch (error) {
              console.error('图片上传异常:', error);
              wx.showToast({
                title: '上传失败',
                icon: 'none'
              });
            }
          }

          if (uploadedImages.length > 0) {
            const newImages = [...currentImages, ...uploadedImages];
            
            // 确保 setData 完全完成
            await new Promise(resolve => {
              this.setData({
                [`${dataField}.${imageField}`]: newImages
              }, resolve);
            });

            // 短暂延迟确保界面更新完成
            setTimeout(() => {
              wx.showToast({
                title: '图片上传成功',
                icon: 'success'
              });
            }, 200);
          } else {
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            });
          }
        } catch (error) {
          console.error('上传处理异常:', error);
          wx.showToast({
            title: '上传异常，请重试',
            icon: 'none'
          });
        } finally {
          wx.hideLoading();
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) {
          return;
        }
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  /** 
   * 带重试机制的图片上传方法
   */
  async uploadImageWithRetry(filePath, type = 'exam', maxRetries = 3) {
    return new Promise((resolve, reject) => {
      const uploadUrl = getBaseUrl() + '/api/study/upload/image';
      const token = getApp().globalData.token || '';
      
      const attemptUpload = (attempt) => {
        wx.uploadFile({
          url: uploadUrl,
          filePath: filePath,
          name: 'file',
          formData: { type },
          header: {
            'content-type': 'multipart/form-data',
            'token': token
          },
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              if (res.statusCode === 200) {
                resolve(data);
              } else {
                reject({
                  code: res.statusCode,
                  message: data.message || '上传失败'
                });
              }
            } catch (error) {
              reject({
                code: -1,
                message: '解析响应失败'
              });
            }
          },
          fail: (err) => {
            if (attempt < maxRetries) {
              console.log(`上传失败，${1000}ms后重试 (${attempt}/${maxRetries}):`, err.errMsg);
              setTimeout(() => attemptUpload(attempt + 1), 1000);
            } else {
              reject({
                code: -1,
                message: err.errMsg || '网络异常'
              });
            }
          }
        });
      };

      attemptUpload(1);
    });
  },

  /** 
   * 删除单元测试图片
   */
  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const currentImages = [...this.data.unitTestData.images];
    currentImages.splice(index, 1);
    this.setData({ 'unitTestData.images': currentImages });
  },

  /** 
   * 删除单科成绩图片
   */
  onDeleteSingleSubjectImage(e) {
    const { index } = e.currentTarget.dataset;
    const currentImages = [...this.data.singleSubjectData.images];
    currentImages.splice(index, 1);
    this.setData({ 'singleSubjectData.images': currentImages });
  },

  /** 
   * 删除错题图片
   */
  onDeleteErrorImage(e) {
    const { index } = e.currentTarget.dataset;
    const currentImages = [...this.data.errorInputData.solution_image];
    currentImages.splice(index, 1);
    this.setData({ 'errorInputData.solution_image': currentImages });
  },

  /** 
   * 错题图片预览
   */
  onErrorImagePreview(e) {
    const { url } = e.currentTarget.dataset;
    const images = this.data.errorInputData.solution_image || [];
    const urls = images.map(img => img.startsWith('http') ? img : this.data.baseUrl + img);
    const currentUrl = url.startsWith('http') ? url : this.data.baseUrl + url;

    wx.previewImage({
      current: currentUrl,
      urls: urls
    });
  },

  /** 
   * 上传图片
   */
  uploadImage(filePath, type = 'exam') {
    return new Promise((resolve, reject) => {
      this.showDebugModal('=== 开始上传单个图片 ===', `filePath: ${filePath}\ntype: ${type}`);
      
      const uploadUrl = getBaseUrl() + '/api/study/upload/image';
      const token = getApp().globalData.token || '';
      
      this.showDebugModal('上传准备', `URL: ${uploadUrl}\nToken: ${token ? '有' : '无'}`);
      
      wx.uploadFile({
        url: uploadUrl,
        filePath: filePath,
        name: 'file',
        formData: { type },
        header: {
          'content-type': 'multipart/form-data',
          'token': token
        },
        success: (res) => {
          this.showDebugModal('服务器响应', `状态码: ${res.statusCode}\n响应数据: ${res.data}`);
          
          try {
            const data = JSON.parse(res.data);
            this.showDebugModal('JSON解析成功', JSON.stringify(data));
            
            if (res.statusCode === 200) {
              this.showDebugModal('上传成功', '返回解析后的数据');
              resolve(data);
            } else {
              this.showDebugModal('上传失败', `状态码: ${res.statusCode}\n错误信息: ${data.message || '上传失败'}`);
              reject({
                code: res.statusCode,
                message: data.message || '上传失败'
              });
            }
          } catch (error) {
            this.showDebugModal('JSON解析失败', `错误: ${error.message}\n原始数据: ${res.data}`);
            reject({
              code: -1,
              message: '解析响应失败'
            });
          }
        },
        fail: (err) => {
          this.showDebugModal('请求失败', err.errMsg || JSON.stringify(err));
          reject({
            code: -1,
            message: err.errMsg || '网络异常'
          });
        }
      });
    });
  },

  // ==================== 错题录入相关方法 ====================

  /** 
   * 综合测试添加错题
   */
  async onEditAddError() {
    const { selectedExam, subjects, difficultyLevels, subjectList } = this.data;
    if (!selectedExam) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    const defaultSubjectName = subjects[0] || '数学';
    const defaultSubjectId = subjectList[0]?.id || 2;
    
    let subjectIndex = 0;
    if (selectedExam.subject_name) {
      subjectIndex = subjects.indexOf(selectedExam.subject_name);
      if (subjectIndex === -1) subjectIndex = 1;
    }
    
    this.setData({
      showEditOptions: false,
      showErrorInputModal: true,
      selectedErrorExam: selectedExam,
      selectedSubjectIndex: subjectIndex,
      errorInputData: {
        subject_id: selectedExam.subject_id || defaultSubjectId,
        subject_name: selectedExam.subject_name || defaultSubjectName,
        question_type_name: '',
        question_type_id: '',
        difficulty: difficultyLevels[0]?.id || '中等',
        mistake_reason: '',
        mistake_reason_subtype: '',
        mistake_reason_subtype_label: '',
        record_date: selectedExam.exam_date || today,
        question_content: '',
        solution_content: '',
        exam_id: selectedExam.id,
        source_type: '考试',
        solution_image: []
      }
    });

    await this.loadErrorMistakeReasons();
    const subjectId = selectedExam.subject_id || defaultSubjectId;
    await this.loadErrorQuestionTypes(subjectId);
    
    this.setDefaultQuestionType();
  },

  /** 
   * 单元测试添加错题
   */
  async onAddErrorToUnitTest() {
    const { selectedExam, subjects, difficultyLevels, subjectList } = this.data;
    if (!selectedExam) return;
    
    const today = new Date().toISOString().split('T')[0];

    let subjectIndex = selectedExam.subject_id ;
    const defaultSubjectName = subjects[subjectIndex-1] || '数学';
    const defaultSubjectId = selectedExam.subject_id  || 2;

    this.setData({
      showUnitTestOptions: false,
      showErrorInputModal: true,
      selectedErrorExam: selectedExam,
      selectedSubjectIndex: subjectIndex,
      errorInputData: {
        subject_id: defaultSubjectId,
        subject_name: defaultSubjectName,
        question_type_name: '',
        question_type_id: '',
        difficulty: difficultyLevels[0]?.id || '中等',
        mistake_reason: '',
        mistake_reason_subtype: '',
        mistake_reason_subtype_label: '',
        record_date: selectedExam.exam_date || today,
        question_content: '',
        solution_content: '',
        exam_id: selectedExam.id,
        source_type: '考试',
        solution_image: []
      }
    });
    
    await this.loadErrorMistakeReasons();
    await this.loadErrorQuestionTypes(defaultSubjectId);
    this.setDefaultQuestionType();
  },

  /** 
   * 设置默认题目类型
   */
  setDefaultQuestionType() {
    const { errorQuestionTypes } = this.data;
    if (errorQuestionTypes && errorQuestionTypes.length > 0) {
      this.setData({
        'errorInputData.question_type_id': errorQuestionTypes[0].id,
        'errorInputData.question_type_name': errorQuestionTypes[0].name,
        errorQuestionTypeIndex: 0
      });
    }
  },

  /** 
   * 加载错题原因
   */
  async loadErrorMistakeReasons() {
    try {
      const mistakeReasonsRes = await api.study.mistakeReasons.getList();
      if (mistakeReasonsRes.code === 200) {
        const mistakeReasons = mistakeReasonsRes.data.map(reason => ({
          value: reason.value,
          text: reason.label,
          subtypes: reason.subtypes.map(subtype => ({
            id: subtype.id,
            value: subtype.value,
            text: subtype.label
          }))
        })) || [];
        
        this.setData({ errorMistakeReasons: mistakeReasons });
      }
    } catch (error) {
      console.error('加载错题原因失败:', error);
      const defaultMistakeReasons = [
        { value: 'understanding', text: '理解错误', subtypes: [
          { value: 'concept_misunderstanding', text: '概念理解偏差' },
          { value: 'principle_confusion', text: '原理混淆' },
          { value: 'logic_error', text: '逻辑错误' }
        ]},
        { value: 'calculation', text: '计算错误', subtypes: [
          { value: 'arithmetic_mistake', text: '运算错误' },
          { value: 'process_error', text: '步骤错误' },
          { value: 'precision_issue', text: '精度问题' }
        ]},
        { value: 'carelessness', text: '粗心大意', subtypes: [
          { value: 'copy_error', text: '抄写错误' },
          { value: 'sign_mistake', text: '符号错误' },
          { value: 'unit_error', text: '单位错误' }
        ]}
      ];
      this.setData({ errorMistakeReasons: defaultMistakeReasons });
    }
  },

  /** 
   * 加载题目类型
   */
  async loadErrorQuestionTypes(subjectId) {
    try {
      const res = await api.study.questionTypes.getList({ subject_id: subjectId });
      if (res.code === 200) {
        const questionTypes = res.data.map(item => ({
          id: item.id,
          code: item.type_code,
          name: item.type_name
        })) || [];
        
        this.setData({
          errorQuestionTypes: questionTypes,
          errorQuestionTypeIndex: 0
        });

        if (questionTypes && questionTypes.length > 0) {
          this.setData({
            'errorInputData.question_type_id': questionTypes[0].id,
            'errorInputData.question_type_name': questionTypes[0].name
          });
        }
      }
    } catch (error) {
      console.error('加载题型失败:', error);
      const defaultQuestionTypes = [
        { id: 1, name: '选择题' },
        { id: 2, name: '填空题' },
        { id: 3, name: '判断题' },
        { id: 4, name: '简答题' },
        { id: 5, name: '计算题' },
        { id: 6, name: '应用题' },
        { id: 7, name: '证明题' },
        { id: 8, name: '作文题' }
      ];
      this.setData({ 
        errorQuestionTypes: defaultQuestionTypes,
        errorQuestionTypeIndex: 0
      });

      if (defaultQuestionTypes && defaultQuestionTypes.length > 0) {
        this.setData({
          'errorInputData.question_type_id': defaultQuestionTypes[0].id,
          'errorInputData.question_type_name': defaultQuestionTypes[0].name
        });
      }
    }
  },

  /** 
   * 错题输入变化
   */
  onErrorInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`errorInputData.${field}`]: e.detail.value
    });
  },

  /** 
   * 错题科目选择
   */
  async onErrorSubjectChange(e) {
    const subjectIndex = e.detail.value;
    const subjectName = this.data.subjects[subjectIndex];
    const subjectList = this.data.subjectList;

    let subjectId = subjectIndex + 1;
    if (subjectList && subjectList[subjectIndex]) {
      subjectId = subjectList[subjectIndex].id;
    }

    this.setData({
      'errorInputData.subject_id': subjectId,
      'errorInputData.subject_name': subjectName
    });

    await this.loadErrorQuestionTypes(subjectId);
    this.setDefaultQuestionType();
  },

  /** 
   * 题目类型选择
   */
  onErrorQuestionTypeChange(e) {
    const questionTypeIndex = e.detail.value;
    const questionType = this.data.errorQuestionTypes[questionTypeIndex];
    
    if (questionType) {
      this.setData({
        'errorInputData.question_type_id': questionType.id,
        'errorInputData.question_type_name': questionType.name,
        errorQuestionTypeIndex: parseInt(questionTypeIndex)
      });
    }
  },

  /** 
   * 难度选择
   */
  onErrorDifficultyChange(e) {
    const difficultyIndex = e.detail.value;
    const difficulty = this.data.difficultyLevels[difficultyIndex];
    
    this.setData({
      'errorInputData.difficulty': difficulty.text
    });
  },

  /** 
   * 错题原因选择
   */
  onErrorMistakeReasonChange(e) {
    const reasonIndex = e.detail.value;
    const reason = this.data.errorMistakeReasons[reasonIndex];
    const subtypes = reason.subtypes || [];
    
    this.setData({
      'errorInputData.mistake_reason': reason.text,
      'errorInputData.mistake_reason_subtype': '',
      'errorInputData.mistake_reason_subtype_label': '',
      errorMistakeReasonSubtypes: subtypes
    });
  },

  /** 
   * 错题根因选择
   */
  onErrorMistakeReasonSubtypeChange(e) {
    const subtypeIndex = e.detail.value;
    const subtype = this.data.errorMistakeReasonSubtypes[subtypeIndex];
    
    this.setData({
      'errorInputData.mistake_reason_subtype': subtype.text,
      'errorInputData.mistake_reason_subtype_label': subtype.text
    });
  },

  /** 
   * 记录日期选择
   */
  onErrorRecordDateChange(e) {
    this.setData({
      'errorInputData.record_date': e.detail.value
    });
  },

  /** 
   * 考试日期选择
   */
  onErrorDateChange(e) {
    this.setData({
      'errorInputData.exam_date': e.detail.value
    });
  },

  /**
   * 保存错题
   */
  async onSaveError() {
    const { errorInputData, selectedErrorExam, currentChild, continueAddError, errorMistakeReasons, errorQuestionTypes, difficultyLevels } = this.data;

    if (!errorInputData.subject_name) {
      wx.showToast({ title: '请选择科目', icon: 'none' });
      return;
    }

    if (!errorInputData.question_type_name || !errorInputData.question_type_id) {
      wx.showToast({ title: '请选择题目类型', icon: 'none' });
      return;
    }

    if (!errorInputData.difficulty) {
      wx.showToast({ title: '请选择难度等级', icon: 'none' });
      return;
    }

    if (!errorInputData.mistake_reason) {
      wx.showToast({ title: '请选择错题原因', icon: 'none' });
      return;
    }

    if (!errorInputData.mistake_reason_subtype) {
      wx.showToast({ title: '请选择错题根因', icon: 'none' });
      return;
    }

    if (!errorInputData.question_content.trim()) {
      wx.showToast({ title: '请输入错题描述', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });

      const errorData = {
        child_id: currentChild.id,
        exam_id: selectedErrorExam ? selectedErrorExam.id : errorInputData.exam_id,
        subject_id: errorInputData.subject_id,
        question_type_id: errorInputData.question_type_id,
        difficulty: errorInputData.difficulty,
        mistake_reason: errorInputData.mistake_reason,
        mistake_reason_subtype: errorInputData.mistake_reason_subtype,
        mistake_reason_subtype_id: this.getMistakeReasonSubtypeId(errorInputData.mistake_reason_subtype),
        question_content: errorInputData.question_content,
        solution_content: errorInputData.solution_content || '',
        source_type: errorInputData.source_type,
        record_date: errorInputData.record_date || selectedErrorExam?.exam_date,
        exam_date: errorInputData.exam_date || selectedErrorExam?.exam_date,
        solution_image: errorInputData.solution_image || []
      };

      const res = await api.study.error.add(errorData);

      if (res.code === 200) {
        // 显示成功提示
        wx.showToast({
          title: '错题录入成功',
          icon: 'success',
          duration: 1500
        });

        // 判断是否继续添加
        if (continueAddError) {
          // 重置表单，保留科目和考试信息
          const today = new Date().toISOString().split('T')[0];
          const currentSubjectId = errorInputData.subject_id;
          const currentSubjectName = errorInputData.subject_name;
          const currentExamId = errorInputData.exam_id;

          // 设置默认的错题原因和题目类型
          const defaultMistakeReason = errorMistakeReasons[0];
          const defaultQuestionType = errorQuestionTypes[0];
          const defaultDifficulty = difficultyLevels[0];

          this.setData({
            editingSingleSubject: null,
            errorInputData: {
              subject_id: currentSubjectId,
              subject_name: currentSubjectName,
              question_type_name: defaultQuestionType?.name || '',
              question_type_id: defaultQuestionType?.id || '',
              difficulty: defaultDifficulty?.text || '中等',
              mistake_reason: defaultMistakeReason?.text || '',
              mistake_reason_subtype: '',
              mistake_reason_subtype_label: '',
              record_date: today,
              question_content: '',
              solution_content: '',
              exam_date: today,
              exam_id: currentExamId,
              source_type: '考试',
              solution_image: []
            },
            errorMistakeReasonSubtypes: defaultMistakeReason?.subtypes || []
          });
        } else {
          this.setData({
            showErrorInputModal: false,
            errorInputData: {
              subject_id: '',
              subject_name: '',
              question_type_name: '',
              question_type_id: '',
              difficulty: '',
              mistake_reason: '',
              mistake_reason_subtype: '',
              mistake_reason_subtype_label: '',
              record_date: '',
              question_content: '',
              solution_content: '',
              exam_date: '',
              exam_id: '',
              source_type: '考试',
              solution_image: []
            }
          });
        }
      } else {
        wx.showToast({
          title: res.message || '保存失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('保存错题失败:', error);
      wx.showToast({
        title: '网络异常',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 取消错题输入
   */
  onCancelErrorInput() {
    this.setData({
      showErrorInputModal: false,
      errorInputData: {
        subject_id: '',
        subject_name: '',
        question_type_name: '',
        question_type_id: '',
        difficulty: '',
        mistake_reason: '',
        mistake_reason_subtype: '',
        mistake_reason_subtype_label: '',
        record_date: '',
        question_content: '',
        solution_content: '',
        exam_date: '',
        exam_id: '',
        source_type: '考试',
        solution_image: []
      }
    });
  },

  /**
   * 切换继续添加错题选项
   */
  onToggleContinueAddError() {
    this.setData({
      continueAddError: !this.data.continueAddError
    });
  },

  /** 
   * 获取错题根因ID
   */
  getMistakeReasonSubtypeId(subtypeText) {
    const { errorMistakeReasons } = this.data;
    if (!errorMistakeReasons || !subtypeText) {
      return null;
    }
    
    for (const reason of errorMistakeReasons) {
      if (reason.subtypes) {
        const foundSubtype = reason.subtypes.find(subtype => subtype.text === subtypeText);
        if (foundSubtype) {
          return foundSubtype.id;
        }
      }
    }
    
    return null;
  },

  /** 
   * 添加单科成绩（从编辑选项）
   */
  onEditAddSingleSubject() {
    const { selectedExam } = this.data;
    if (!selectedExam) return;
    
    this.setData({ showEditOptions: false });
    this.onAddSingleSubject({ currentTarget: { dataset: { exam: selectedExam } } });
  },



  /** 
   * 模拟弹窗延迟（用于测试时序问题）
   */
  async simulateModalDelay(title, content) {
    console.log(`[模拟弹窗] ${title}:`, content);
    // 模拟用户查看弹窗并点击"继续"的时间（500ms）
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`[模拟弹窗继续] ${title}`);
        resolve();
      }, 500);
    });
  },

  /** 
   * 显示调试弹窗
   */
  showDebugModal(title, content) {
    wx.showModal({
      title: title,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      showCancel: false,
      confirmText: '继续',
      success: () => {
        // 继续执行
      }
    });
  },

  /** 
   * 阻止弹窗内容区域的事件冒泡
   */
  onModalContentTap() {
    // 空方法，仅用于阻止事件冒泡
  }
});