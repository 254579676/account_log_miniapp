const api = require('../../../utils/api').api;

Page({
  data: {
    childId: null,
    formData: {
      name: '',
      gender: 1,
      birth_date: '',
      grade: '',
      class: '',
      school: '',
      avatar_url: ''
    },
    // 年级选项（从全局获取）
    gradeOptions: [],
    selectedGradeIndex: 0,
    genderOptions: ['男', '女'],
    isLoading: false
  },

  onLoad(options) {
    // 从全局获取年级数据
    this.initGradeOptions();

    if (options.id) {
      this.setData({ childId: options.id });
      this.loadChild(options.id);
    } else {
      // 新增时，默认选择第一个年级
      this.setDefaultGrade();
    }
  },

  /**
   * 初始化年级选项
   */
  initGradeOptions() {
    const app = getApp();
    const gradeOptions = app.globalData.grades || [];
    this.setData({ gradeOptions });
  },

  /**
   * 设置默认年级
   */
  setDefaultGrade() {
    if (this.data.gradeOptions.length > 0) {
      this.setData({
        selectedGradeIndex: 0,
        'formData.grade': this.data.gradeOptions[0].name
      });
    }
  },

  // 加载学生信息
  async loadChild(childId) {
    try {
      wx.showLoading({ title: '加载中...' });

      // 获取孩子列表，找到对应的孩子
      const res = await api.study.children.getList();
      if (res.code === 200) {
        const child = res.data.children.find(c => c.id == childId);
        if (child) {
          // 查找年级索引
          const gradeIndex = this.data.gradeOptions.findIndex(g => g.name === child.grade);

          this.setData({
            formData: {
              name: child.name || '',
              gender: child.gender || 1,
              birth_date: child.birth_date || '',
              grade: child.grade || '',
              class: child.class || '',
              school: child.school || '',
              avatar_url: child.avatar_url || ''
            },
            selectedGradeIndex: gradeIndex >= 0 ? gradeIndex : 0
          });
        }
      }
    } catch (error) {
      console.error('加载学生信息失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  // 选择性别
  onGenderChange(e) {
    this.setData({
      'formData.gender': parseInt(e.detail.value) + 1
    });
  },

  // 选择出生日期
  onBirthDateChange(e) {
    this.setData({
      'formData.birth_date': e.detail.value
    });
  },

  // 选择年级
  onGradeChange(e) {
    const index = parseInt(e.detail.value);
    const selectedGrade = this.data.gradeOptions[index];

    this.setData({
      'formData.grade': selectedGrade.name,
      selectedGradeIndex: index
    });
  },

  // 输入班级
  onClassInput(e) {
    this.setData({
      'formData.class': e.detail.value
    });
  },

  // 输入学校
  onSchoolInput(e) {
    this.setData({
      'formData.school': e.detail.value
    });
  },

  // 选择头像
  onChooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];

        try {
          wx.showLoading({ title: '上传中...' });

          // 上传图片到服务器
          const uploadRes = await this.uploadImage(tempFilePath);

          if (uploadRes.code === 200) {
            this.setData({
              'formData.avatar_url': uploadRes.data.url
            });
            wx.showToast({
              title: '头像上传成功',
              icon: 'success'
            });
          }
        } catch (error) {
          console.error('头像上传失败:', error);
          wx.showToast({
            title: '头像上传失败',
            icon: 'none'
          });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  // 上传图片
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        encoding: 'base64',
        success: (res) => {
          api.study.upload.image({
            file: res.data,
            type: 'avatar'
          }).then(resolve).catch(reject);
        },
        fail: reject
      });
    });
  },

  // 保存学生信息
  async onSave() {
    const { formData, childId } = this.data;

    // 表单验证
    if (!formData.name.trim()) {
      wx.showToast({
        title: '请输入学生姓名',
        icon: 'none'
      });
      return;
    }

    if (!formData.grade) {
      wx.showToast({
        title: '请选择年级',
        icon: 'none'
      });
      return;
    }

    this.setData({ isLoading: true });
    wx.showLoading({ title: childId ? '保存中...' : '添加中...' });

    try {
      let res;

      if (childId) {
        // 更新学生信息
        res = await api.study.children.update({
          child_id: parseInt(childId),
          ...formData
        });
      } else {
        // 添加新学生
        res = await api.study.children.add(formData);
      }

      if (res.code === 200) {
        wx.showToast({
          title: childId ? '修改成功' : '添加成功',
          icon: 'success'
        });

        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('保存学生信息失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
      wx.hideLoading();
    }
  },

  // 删除学生
  async onDelete() {
    const { childId } = this.data;

    if (!childId) {
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个学生吗？此操作不可恢复。',
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });

            const deleteRes = await api.study.children.delete({
              child_id: parseInt(childId)
            });

            if (deleteRes.code === 200) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });

              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else {
              wx.showToast({
                title: deleteRes.message || '删除失败',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('删除学生失败:', error);
            wx.showToast({
              title: '网络错误，请重试',
              icon: 'none'
            });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 取消添加学生
  onCancel() {
    wx.navigateBack();
  }
});
