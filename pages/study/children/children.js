const api = require('../../../utils/api').api;

const app = getApp();

Page({
  data: {
    children: [],
    isLoading: false,
    familyId: null
  },

  onLoad() {
    this.loadChildren();
    this.loadFamilyId();
  },

  onShow() {
    this.loadChildren();
    this.loadFamilyId();
  },

  onPullDownRefresh() {
    this.loadChildren();
  },

  // 加载孩子列表
  async loadChildren() {
    this.setData({ isLoading: true });
    
    try {
      const res = await api.study.children.getList();
      
      if (res.code === 200) {
        this.setData({ 
          children: res.data.children || []
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载孩子列表失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 添加孩子
  onAddChild() {
    wx.navigateTo({
      url: '/pages/study/children/add-child'
    });
  },

  // 点击孩子卡片
  onChildTap(e) {
    const { child } = e.currentTarget.dataset;
    
    // 存储当前选中的孩子ID
    wx.setStorageSync('currentChildId', child.id);
    wx.setStorageSync('currentChild', child);
    
    wx.showToast({
      title: `已选择${child.name}`,
      icon: 'success'
    });
    
    // 延迟返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 编辑孩子
  onEditChild(e) {
    const { child } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/study/children/add-child?id=${child.id}`
    });
  },

  // 删除孩子
  onDeleteChild(e) {
    const { child } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除学生"${child.name}"吗？删除后相关学习记录也会被清除。`,
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteChild(child.id);
        }
      }
    });
  },

  // 执行删除操作
  async deleteChild(childId) {
    try {
      wx.showLoading({ title: '删除中...' });
      
      const res = await api.study.children.delete({
        child_id: parseInt(childId)
      });

      if (res.code === 200) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重新加载列表
        this.loadChildren();
      } else {
        wx.showToast({
          title: res.message || '删除失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('删除孩子失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载家庭ID
  loadFamilyId() {
    if (app.globalData && app.globalData.userInfo) {
      this.setData({
        familyId: app.globalData.userInfo.familyid
      });
    } else {
      this.setData({
        familyId: null
      });
    }
  },

  // 加入家庭
  onJoinFamily() {
    wx.showModal({
      title: '加入家庭',
      editable: true,
      placeholderText: '请输入家庭ID',
      content: '',
      success: (res) => {
        if (res.confirm && res.content) {
          this.joinFamily(res.content);
        }
      }
    });
  },

  // 执行加入家庭
  async joinFamily(familyId) {
    try {
      wx.showLoading({ title: '加入中...' });

      const res = await api.user.updateFamily({
        family_id: familyId
      });

      wx.hideLoading();

      if (res.code === 200) {
        wx.showToast({
          title: '加入成功',
          icon: 'success'
        });

        // 更新本地数据
        if (app.globalData.userInfo) {
          app.globalData.userInfo.familyid = familyId;
        }
        this.setData({
          familyId: familyId
        });

        // 刷新学生列表
        this.loadChildren();
      } else {
        wx.showToast({
          title: res.message || res.msg || '加入失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('加入家庭失败:', error);
      wx.hideLoading();

      // 尝试获取错误消息
      const errorMsg = error.message || error.data?.message || error.data?.msg || '加入失败，请重试';
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 复制家庭ID
  onCopyFamilyId() {
    if (!this.data.familyId) {
      return;
    }

    wx.setClipboardData({
      data: this.data.familyId,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  }
});