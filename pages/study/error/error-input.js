const api = require('../../../utils/api').api;
const getBaseUrl = require('../../../utils/api').getBaseUrl;

Page({
  data: {
    currentChild: null,
    subjects: [],
    questionTypes: [],
    mistakeReasons: [],
    mistakeReasonSubtypes: [],
    
    // 编辑模式相关
    isEditMode: false,
    errorId: null,
    
    // 表单数据
    selectedSourceType: '作业',
    selectedSourceTypeText: '作业',
    sourceTypes: [
      { value: '练习', text: '练习' },
      { value: '作业', text: '作业' },
      { value: '考试', text: '考试' }
    ],
    selectedSubject: '',
    selectedSubjectId: '',
    selectedQuestionType: '',
    selectedQuestionTypeId: '',
    selectedMistakeReason: '',
    selectedMistakeReasonText: '',
    selectedMistakeReasonSubtype: '',
    selectedMistakeReasonSubtypeId:'',
    selectedMistakeReasonSubtypeText: '',
    selectedDifficulty: 'medium',
    selectedDifficultyText: '中等',
    difficultyLevels: [
      { value: 'easy', text: '简单' },
      { value: 'medium', text: '中等' },
      { value: 'hard', text: '困难' }
    ],
    
    selectedMasteryLevel: '未掌握',
    masteryLevels: [
      { value: 'not_mastered', text: '未掌握' },
      { value: 'partially_mastered', text: '基本掌握' },
      { value: 'mastered', text: '熟练掌握' }
    ],
    
    questionContent: '',
    solutionContent: '',
    recordDate: '',
    isLoading: false,
    solutionImages: [],
    baseUrl: getBaseUrl(),
    continueAdd: false
  },

  onLoad(options) {
    // 检查是否为编辑模式
    if (options.id) {
      this.setData({ 
        isEditMode: true,
        errorId: options.id 
      });
      wx.setNavigationBarTitle({
        title: '编辑错题'
      });
    }
    
    this.initData();
    this.loadBasicData();
  },

  async initData() {
    try {
      const currentChild = wx.getStorageSync('currentChild');
      
      if (currentChild) {
        this.setData({ currentChild });
      } else {
        const res = await api.study.children.getList();
        
        if (res.code === 200) {
          const children = res.data.children || [];
          const currentChildId = wx.getStorageSync('currentChildId');
          let currentChild = null;
          
          if (children.length > 0) {
            currentChild = children.find(child => child.id == currentChildId) || children[0];
            wx.setStorageSync('currentChildId', currentChild.id);
            wx.setStorageSync('currentChild', currentChild);
          }
          
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
        }
      }
    } catch (error) {
      console.error('加载孩子数据失败:', error);
      const currentChild = wx.getStorageSync('currentChild');
      
      if (currentChild) {
        this.setData({ currentChild });
      } else {
        wx.showToast({
          title: '请先添加孩子',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    }
  },

  async loadErrorDetail() {
    try {
      const res = await api.study.error.detail({
        child_id: this.data.currentChild.id,
        mistake_id: this.data.errorId
      });

      if (res.code === 200) {
        const errorData = res.data;
        
        // 处理图片数据
        let solutionImages = [];
        if (errorData.solution_image) {
          if (typeof errorData.solution_image === 'string') {
            try {
              const parsed = JSON.parse(errorData.solution_image);
              // 如果解析结果是字符串数组，转换为对象格式
              if (Array.isArray(parsed)) {
                solutionImages = parsed.map(url => ({ url: url }));
              }
            } catch (e) {
              solutionImages = [];
            }
          } else if (Array.isArray(errorData.solution_image)) {
            // 如果是字符串数组，转换为对象格式
            solutionImages = errorData.solution_image.map(url => ({ url: url }));
          }
        }

        this.setData({
          selectedSubject: errorData.subject_name || '',
          selectedSubjectId: errorData.subject_id || '',
          selectedSourceType: errorData.source_type || '作业',
          selectedSourceTypeText: errorData.source_type || '作业',
          selectedQuestionType: errorData.question_type_name || '',
          selectedQuestionTypeId: errorData.question_type_id || '',
          selectedMistakeReasonText: errorData.mistake_reason_label || '',
          selectedMistakeReasonSubtypeText: errorData.mistake_reason_subtype_label || '',
          selectedMistakeReasonSubtypeId: errorData.mistake_reason_subtype_id || '',
          selectedDifficultyText: errorData.difficulty || '中等',
          selectedMasteryLevel: errorData.mastery_level || '未掌握',
          selectedMasteryLevelText: errorData.mastery_level || '未掌握',
          questionContent: errorData.question_content || '',
          solutionContent: errorData.solution_content || '',
          recordDate: errorData.record_date || '',
          solutionImages: solutionImages
        });

        // 设置索引和加载相关数据
        // 确保错题原因数据已加载完成后再设置索引
        if (this.data.mistakeReasons.length > 0) {
          this.updateSelectedIndexes();
        } else {
          // 如果错题原因还没加载完成，等待一下再设置索引
          setTimeout(() => {
            if (this.data.mistakeReasons.length > 0) {
              this.updateSelectedIndexes();
            }
          }, 500);
        }
        
        // 加载对应科目的题型
        if (errorData.subject_id) {
          await this.loadQuestionTypes(errorData.subject_id);
        }
      } else {
        wx.showToast({
          title: '错题不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('加载错题详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  updateSelectedIndexes() {
    // 更新难度等级索引
    const difficultyIndex = this.data.difficultyLevels.findIndex(
      item => item.text === this.data.selectedDifficultyText
    );
    if (difficultyIndex !== -1) {
      this.setData({
        selectedDifficultyIndex: difficultyIndex,
        selectedDifficulty: this.data.difficultyLevels[difficultyIndex].value
      });
    }

    // 更新掌握程度索引
    const masteryIndex = this.data.masteryLevels.findIndex(
      item => item.text === this.data.selectedMasteryLevelText
    );
    if (masteryIndex !== -1) {
      this.setData({
        selectedMasteryLevelIndex: masteryIndex,
        selectedMasteryLevel: this.data.masteryLevels[masteryIndex].text
      });
    }

    // 更新错题原因索引
    const reasonIndex = this.data.mistakeReasons.findIndex(
      item => item.text === this.data.selectedMistakeReasonText
    );
    if (reasonIndex !== -1) {
      this.setData({
        selectedMistakeReasonIndex: reasonIndex,
        selectedMistakeReason: this.data.mistakeReasons[reasonIndex].value,
        mistakeReasonSubtypes: this.data.mistakeReasons[reasonIndex].subtypes || []
      });

      // 更新错题根因索引
      if (this.data.selectedMistakeReasonSubtypeId) {
        const subtypeIndex = this.data.mistakeReasonSubtypes.findIndex(
          item => item.id === this.data.selectedMistakeReasonSubtypeId
        );
        if (subtypeIndex !== -1) {
          this.setData({
            selectedMistakeReasonSubtypeIndex: subtypeIndex,
            selectedMistakeReasonSubtype: this.data.mistakeReasonSubtypes[subtypeIndex].value
          });
        }
      }
    } else {
      // 如果找不到匹配的错题原因，尝试使用第一个作为默认值
      if (this.data.mistakeReasons.length > 0) {
        const firstReason = this.data.mistakeReasons[0];
        this.setData({
          selectedMistakeReasonIndex: 0,
          selectedMistakeReason: firstReason.value,
          selectedMistakeReasonText: firstReason.text,
          mistakeReasonSubtypes: firstReason.subtypes || []
        });
      }
    }
  },

  async loadBasicData() {
    try {
      // 从全局获取科目数据
      const app = getApp();
      const globalSubjects = app.globalData.subjects || [];
      const subjects = globalSubjects.length > 0 ? globalSubjects : [];

      this.setData({
        subjects: subjects
      });

      // 只在新增模式下设置默认值
      if (!this.data.isEditMode && subjects.length > 0) {
        const chineseSubject = subjects.find(subject => subject.name === '语文') || subjects[0];
        this.setData({
          selectedSubject: chineseSubject.name,
          selectedSubjectId: chineseSubject.id
        });

        // 加载对应科目的题型
        this.loadQuestionTypes(chineseSubject.id);
      }

      // 题型数据已经在加载科目数据时通过 loadQuestionTypes 方法加载，这里不再重复加载

      // 加载错题原因数据
      const mistakeReasonsRes = await api.study.mistakeReasons.getList();
      if (mistakeReasonsRes.code === 200) {
        // 根据后端返回的数据格式处理错题原因
        const mistakeReasons = mistakeReasonsRes.data.map(reason => ({
          value: reason.value,
          text: reason.label,
          subtypes: reason.subtypes.map(subtype => ({
            id: subtype.id,
            value: subtype.value,
            text: subtype.label
          }))
        })) || [];

        this.setData({
          mistakeReasons: mistakeReasons
        });
      }

      // 只在新增模式下设置默认日期
      if (!this.data.isEditMode) {
        const today = new Date().toISOString().split('T')[0];
        this.setData({ recordDate: today });
      } else {
        // 编辑模式：加载错题详情
        await this.loadErrorDetail();
      }

    } catch (error) {
      console.error('加载基础数据失败:', error);
      // 使用默认数据
      this.setDefaultData();

      // 编辑模式下如果加载基础数据失败，也要尝试加载错题详情
      if (this.data.isEditMode) {
        await this.loadErrorDetail();
      }
    }
  },

  setDefaultData() {
    // 从全局获取科目数据
    const app = getApp();
    const globalSubjects = app.globalData.subjects || [];
    const defaultSubjects = globalSubjects.length > 0 ? globalSubjects : [];

    // 设置默认错题原因（根据数据库设计）
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
      ]},
      { value: 'method', text: '方法不当', subtypes: [
        { value: 'wrong_approach', text: '解题方法错误' },
        { value: 'inefficient_method', text: '方法低效' },
        { value: 'no_method', text: '没有解题思路' }
      ]},
      { value: 'memory', text: '记忆错误', subtypes: [
        { value: 'forget_knowledge', text: '忘记知识点' },
        { value: 'knowledge_confusion', text: '知识点混淆' },
        { value: 'incomplete_memory', text: '记忆不完整' }
      ]},
      { value: 'reading', text: '读题问题', subtypes: [
        { value: 'misunderstand_question', text: '理解偏差' },
        { value: 'ignore_condition', text: '忽略条件' },
        { value: 'wrong_question', text: '看错题目' }
      ]},
      { value: 'other', text: '其他原因', subtypes: [
        { value: 'time_pressure', text: '时间紧张' },
        { value: 'external_factors', text: '外部因素' },
        { value: 'unknown_reason', text: '原因不明' }
      ]}
    ];

    this.setData({
      subjects: defaultSubjects,
      mistakeReasons: defaultMistakeReasons
    });

    // 默认选中第一个科目
    const chineseSubject = defaultSubjects[0];
    if (chineseSubject) {
      this.setData({
        selectedSubject: chineseSubject.name,
        selectedSubjectId: chineseSubject.id
      });

      // 加载对应科目的题型
      this.loadQuestionTypes(chineseSubject.id);
    }

    const today = new Date().toISOString().split('T')[0];
    this.setData({ recordDate: today });
  },

  onSubjectChange(e) {
    const index = e.detail.value;
    const subject = this.data.subjects[index];
    this.setData({
      selectedSubject: subject.name,
      selectedSubjectId: subject.id,
      selectedQuestionType: '',
      selectedQuestionTypeId: '',
      questionTypes: []
    });
    this.loadQuestionTypes(subject.id);
  },

  async loadQuestionTypes(subjectId) {
    try {
      const res = await api.study.questionTypes.getList({ subject_id: subjectId });
      if (res.code === 200) {
        // 根据后端返回的数据格式处理题目类型
        const questionTypes = res.data.map(item => ({
          id: item.id,
          code: item.type_code,
          name: item.type_name
        })) || [];
        
        this.setData({
          questionTypes: questionTypes
        });
      }
    } catch (error) {
      console.error('加载题型失败:', error);
      // 使用默认题型
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
      this.setData({ questionTypes: defaultQuestionTypes });
    }
  },

  onQuestionTypeChange(e) {
    const index = e.detail.value;
    const questionType = this.data.questionTypes[index];
    this.setData({
      selectedQuestionType: questionType.name,
      selectedQuestionTypeId: questionType.id
    });
  },

  onSourceTypeChange(e) {
    const index = e.detail.value;
    const sourceType = this.data.sourceTypes[index];
    this.setData({
      selectedSourceType: sourceType.value,
      selectedSourceTypeText: sourceType.text
    });
  },

  onMistakeReasonChange(e) {
    const index = e.detail.value;
    const reason = this.data.mistakeReasons[index];
    this.setData({
      selectedMistakeReason: reason.value,
      selectedMistakeReasonText: reason.text,
      mistakeReasonSubtypes: reason.subtypes || [],
      selectedMistakeReasonSubtype: '',
      selectedMistakeReasonSubtypeText: ''
    });
  },

  onMistakeReasonSubtypeChange(e) {
    const index = e.detail.value;
    const subtype = this.data.mistakeReasonSubtypes[index];
    this.setData({
      selectedMistakeReasonSubtypeId: subtype.id,
      selectedMistakeReasonSubtype: subtype.value,
      selectedMistakeReasonSubtypeText: subtype.text
    });
  },

  onDifficultyChange(e) {
    const index = e.detail.value;
    const difficulty = this.data.difficultyLevels[index];
    this.setData({
      selectedDifficulty: difficulty.value,
      selectedDifficultyText: difficulty.text
    });
  },

  onMasteryLevelChange(e) {
    const index = e.detail.value;
    const mastery = this.data.masteryLevels[index];
    this.setData({
      selectedMasteryLevel: mastery.text
    });
  },

  onDateChange(e) {
    this.setData({
      recordDate: e.detail.value
    });
  },

  onQuestionContentInput(e) {
    this.setData({
      questionContent: e.detail.value
    });
  },

  onSolutionContentInput(e) {
    this.setData({
      solutionContent: e.detail.value
    });
  },

  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.setData({ isLoading: true });

    try {
      const submitData = {
        child_id: this.data.currentChild.id,
        student_name: this.data.currentChild.name,
        subject_id: this.data.selectedSubjectId,
        question_type_id: this.data.selectedQuestionTypeId,
        source_type: this.data.selectedSourceType,
        question_content: this.data.questionContent,
        solution_content: this.data.solutionContent,
        mistake_reason_subtype_id: this.data.selectedMistakeReasonSubtypeId,
        difficulty: this.data.selectedDifficultyText,
        mastery_level: this.data.selectedMasteryLevel,
        record_date: this.data.recordDate,
        solution_image: this.data.solutionImages.map(img => img.url) || []
      };

      // 编辑模式添加ID
      if (this.data.isEditMode) {
        submitData.mistake_id = this.data.errorId;
      }

      let res;
      if (this.data.isEditMode) {
        res = await api.study.error.update(submitData);
      } else {
        res = await api.study.error.add(submitData);
      }

      if (res.code === 200) {
        wx.showToast({
          title: this.data.isEditMode ? '修改成功' : '错题录入成功',
          icon: 'success',
          duration: 1500
        });

        // 判断是否继续添加
        if (this.data.continueAdd && !this.data.isEditMode) {
          // 重置表单，保留科目和日期
          const today = new Date().toISOString().split('T')[0];
          const currentSubjectId = this.data.selectedSubjectId;
          const currentSubject = this.data.selectedSubject;
          const currentSourceType = this.data.selectedSourceType;
          const currentSourceTypeText = this.data.selectedSourceTypeText;

          // 设置默认的错题原因和题目类型
          const defaultMistakeReason = this.data.mistakeReasons[0];
          const defaultQuestionType = this.data.questionTypes[0];
          const defaultDifficulty = this.data.difficultyLevels[0];

          this.setData({
            selectedSubject: currentSubject,
            selectedSubjectId: currentSubjectId,
            selectedSourceType: currentSourceType,
            selectedSourceTypeText: currentSourceTypeText,
            recordDate: today,
            selectedQuestionType: defaultQuestionType?.name || '',
            selectedQuestionTypeId: defaultQuestionType?.id || '',
            selectedDifficulty: defaultDifficulty?.value || 'medium',
            selectedDifficultyText: defaultDifficulty?.text || '中等',
            selectedMistakeReason: defaultMistakeReason?.value || '',
            selectedMistakeReasonText: defaultMistakeReason?.text || '',
            selectedMistakeReasonSubtype: '',
            selectedMistakeReasonSubtypeText: '',
            selectedMistakeReasonSubtypeId: '',
            questionContent: '',
            solutionContent: '',
            solutionImages: [],
            mistakeReasonSubtypes: defaultMistakeReason?.subtypes || []
          });
        } else {
          if (!this.data.isEditMode) {
            this.clearForm();
          }
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      } else {
        wx.showToast({
          title: res.message || (this.data.isEditMode ? '修改失败' : '录入失败'),
          icon: 'none'
        });
      }
    } catch (error) {
      console.error(this.data.isEditMode ? '错题修改失败:' : '错题录入失败:', error);
      wx.showToast({
        title: this.data.isEditMode ? '修改失败' : '录入失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  validateForm() {
    if (!this.data.selectedSubject) {
      wx.showToast({
        title: '请选择科目',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedQuestionType) {
      wx.showToast({
        title: '请选择题型',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedMistakeReason) {
      wx.showToast({
        title: '请选择错题原因',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedMistakeReasonSubtype) {
      wx.showToast({
        title: '请选择错题根因',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedDifficulty) {
      wx.showToast({
        title: '请选择难度等级',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.questionContent.trim()) {
      wx.showToast({
        title: '请输入错题内容',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  clearForm() {
    this.setData({
      selectedSubject: '',
      selectedSubjectId: '',
      selectedQuestionType: '',
      selectedQuestionTypeId: '',
      selectedSourceType: 'practice',
      selectedSourceTypeText: '练习',
      selectedMistakeReason: '',
      selectedMistakeReasonText: '',
      selectedMistakeReasonSubtype: '',
      selectedMistakeReasonSubtypeText: '',
      selectedDifficulty: 'medium',
      selectedDifficultyText: '中等',
      selectedMasteryLevel: '未掌握',
      questionContent: '',
      solutionContent: '',
      solutionImages: [],
      mistakeReasonSubtypes: []
    });
  },

  onCancel() {
    wx.navigateBack();
  },

  onToggleContinueAdd() {
    this.setData({
      continueAdd: !this.data.continueAdd
    });
  },



  onChooseSolutionImage() {
    const currentImages = this.data.solutionImages || [];
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

          for (let filePath of tempFilePaths) {
            try {
              const uploadRes = await this.uploadImage(filePath);
              if (uploadRes.code === 200) {
                uploadedImages.push({
                  url: uploadRes.data.url
                });
              } else {
                console.error('图片上传失败:', uploadRes.message);
                wx.showToast({
                  title: '部分图片上传失败',
                  icon: 'none'
                });
              }
            } catch (error) {
              console.error('图片上传异常:', error);
            }
          }

          if (uploadedImages.length > 0) {
            this.setData({
              solutionImages: [...currentImages, ...uploadedImages]
            });

            wx.showToast({
              title: '图片上传成功',
              icon: 'success'
            });
          }
        } catch (error) {
          console.error('上传处理异常:', error);
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: getBaseUrl() + '/api/study/upload/image',
        filePath: filePath,
        name: 'file',
        formData: {
          type: 'mistake'
        },
        header: {
          'content-type': 'multipart/form-data',
          'token': getApp().globalData.token || ''
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
          reject({
            code: -1,
            message: err.errMsg || '网络异常'
          });
        }
      });
    });
  },

  onSolutionImagePreview(e) {
    const { url, urls } = e.currentTarget.dataset;
    
    // 确保url存在
    if (!url) {
      console.error('图片URL不存在');
      return;
    }
    
    // 构建当前图片的完整URL
    const tmpurl = url.startsWith('http') ? url : this.data.baseUrl + url;
    
    // 构建所有图片的完整URL列表
    const tmpurls = urls.map(img => {
      const imgUrl = img.url || img; // 兼容两种格式
      return imgUrl.startsWith('http') ? imgUrl : this.data.baseUrl + imgUrl;
    });

    wx.previewImage({
      current: tmpurl,
      urls: tmpurls
    });
  },

  onDeleteSolutionImage(e) {
    const { index } = e.currentTarget.dataset;
    
    const currentImages = [...this.data.solutionImages];
    currentImages.splice(index, 1);
    this.setData({ solutionImages: currentImages });
    
    wx.showToast({
      title: '图片已删除',
      icon: 'success',
      duration: 1000
    });
  }
});