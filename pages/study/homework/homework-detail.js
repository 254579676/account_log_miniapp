const utilsApi = require('../../../utils/api');
const api = utilsApi.api;
const getBaseUrl = utilsApi.getBaseUrl;

Page({
  data: {
    homeworkId: '',
    homework: null,
    currentChild: null,
    isLoading: false,
    completionImages: [], // 完成打卡图片
    baseUrl: getBaseUrl(), // 基础URL用于图片显示
    actualTime: '', // 实际完成时间
    canComplete: false // 是否可以完成
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ homeworkId: options.id });
      this.loadHomeworkDetail();
    }
  },

  // 加载作业详情
  async loadHomeworkDetail() {
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

    try {
      wx.showLoading({ title: '加载中...' });

      // 使用作业id查询作业详情
      const res = await api.study.homework.getList({
        homework_id: this.data.homeworkId,
        child_id: currentChild.id
      });

      if (res.code === 200) {
        const homeworkList = res.data.homework_list || [];
        const homework = homeworkList.length > 0 ? homeworkList[0] : null;

        // 处理图片URL，确保显示时使用完整地址
        let completionImages = [];

        if (homework) {
          homework.images = homework.images ? homework.images.map(img => {
            return img.startsWith('http') ? img : getBaseUrl() + (img.startsWith('/') ? img : '/' + img);
          }) : [];

          // 处理完成打卡图片
          completionImages = homework.completion_images ? homework.completion_images.map(img => {
            return img.startsWith('http') ? img : getBaseUrl() + (img.startsWith('/') ? img : '/' + img);
          }) : [];
        }

        // 初始化实际完成时间
        const actualTime = homework.actual_time ? homework.actual_time.toString() : '';
        const canComplete = homework.status === '已完成' || (actualTime && parseInt(actualTime) > 0);

        this.setData({
          currentChild,
          homework,
          completionImages,
          actualTime,
          canComplete
        });

        if (!homework) {
          wx.showToast({
            title: '作业不存在',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载作业详情失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  onImagePreview(e) {
    const { url } = e.currentTarget.dataset;
    // 合并作业图片和完成打卡图片
    const allImages = [
      ...(this.data.homework.images || []),
      ...(this.data.completionImages || [])
    ];
    wx.previewImage({
      current: url,
      urls: allImages
    });
  },

  // 拍照打卡完成
  onCheckIn() {
    // 验证实际完成时间
    if (!this.data.actualTime || parseInt(this.data.actualTime) <= 0) {
      wx.showToast({
        title: '请先录入实际完成时间',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: 3,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: async (res) => {
        const tempFilePaths = res.tempFilePaths;
        
        if (!tempFilePaths || tempFilePaths.length === 0) {
          return;
        }
        
        wx.showLoading({ title: '上传中...' });
        
        try {
          const uploadedImages = [];
          
          // 上传每张图片
          for (let filePath of tempFilePaths) {
            try {
              const uploadRes = await this.uploadImage(filePath);
              if (uploadRes.code === 200) {
                uploadedImages.push(uploadRes.data.url);
              }
            } catch (error) {
              console.error('图片上传失败:', error);
            }
          }
          
          if (uploadedImages.length > 0) {
            // 更新作业的完成打卡图片
            await this.updateCompletionImages(uploadedImages);
            
            wx.showToast({
              title: '打卡成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            });
          }
        } catch (error) {
          console.error('打卡失败:', error);
          wx.showToast({
            title: '打卡失败，请重试',
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
      wx.uploadFile({
        url: getBaseUrl() + '/api/study/upload/image',
        filePath: filePath,
        name: 'file',
        formData: {
          type: 'homework_completion'
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

  // 更新完成打卡图片
  async updateCompletionImages(images) {
    const { homework, actualTime } = this.data;

    try {
      const res = await api.study.homework.update({
        homework_id: homework.id,
        completion_images: images,
        status: '已完成',
        actual_time: parseInt(actualTime)
      });

      if (res.code === 200) {
        // 更新本地数据
        const completionImages = images.map(img => {
          return img.startsWith('http') ? img : getBaseUrl() + (img.startsWith('/') ? img : '/' + img);
        });

        this.setData({
          completionImages,
          'homework.status': '已完成',
          'homework.actual_time': parseInt(actualTime),
          'homework.complete_time': new Date().toLocaleString()
        });
      } else {
        throw new Error(res.message || '更新失败');
      }
    } catch (error) {
      console.error('更新完成打卡图片失败:', error);
      throw error;
    }
  },

  // 切换完成状态
  async onToggleComplete() {
    const { homework, actualTime } = this.data;
    
    if (this.data.isLoading) return;

    // 如果是标记为完成，需要验证实际完成时间
    if (homework.status !== '已完成') {
      if (!actualTime || parseInt(actualTime) <= 0) {
        wx.showToast({
          title: '请先录入实际完成时间',
          icon: 'none'
        });
        return;
      }
    }
    
    this.setData({ isLoading: true });
    
    try {
      const newStatus = homework.status === '已完成' ? '待完成' : '已完成';
      const actualTimeValue = newStatus === '已完成' ? parseInt(actualTime) : homework.actual_time;
      
      const res = await api.study.homework.update({
        homework_id: homework.id,
        status: newStatus,
        actual_time: actualTimeValue
      });

      if (res.code === 200) {
        this.setData({
          'homework.status': newStatus,
          'homework.actual_time': actualTimeValue,
          'homework.complete_time': newStatus === '已完成' ? new Date().toLocaleString() : null
        });

        wx.showToast({
          title: newStatus === '已完成' ? '已完成' : '已取消完成',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('更新作业状态失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 删除作业
  async onDeleteHomework() {
    const { homework } = this.data;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个作业吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            
            const deleteRes = await api.study.homework.delete({
              homework_id: homework.id
            });
            
            if (deleteRes.code === 200) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });

              // 获取页面栈，通知前一个页面（列表页）刷新
              const pages = getCurrentPages();
              const prevPage = pages[pages.length - 2]; // 前一个页面

              if (prevPage && prevPage.route === 'pages/study/homework/homework') {
                // 调用列表页的刷新方法
                prevPage.loadHomeworkList && prevPage.loadHomeworkList();
              }

              // 延迟返回，让用户看到成功提示
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
            console.error('删除作业失败:', error);
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

  // 实际完成时间输入处理
  onActualTimeInput(e) {
    let value = e.detail.value;
    // 限制只能输入数字，最多3位
    value = value.replace(/\D/g, '').substring(0, 3);
    
    const canComplete = value && parseInt(value) > 0;
    
    this.setData({
      actualTime: value,
      canComplete
    });
  },

  // 返回
  onBack() {
    wx.navigateBack();
  }
});