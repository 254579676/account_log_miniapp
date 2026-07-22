Component({
  options: {
    multipleSlots: true // 启用多slot支持
  },
  
  properties: {
    // 画布ID
    canvasId: {
      type: String,
      value: 'pieCanvas'
    },
    // 画布宽度
    width: {
      type: Number,
      value: 300
    },
    // 画布高度
    height: {
      type: Number,
      value: 300
    },
    // 数据
    series: {
      type: Array,
      value: []
    },
    // 中心文本
    centerText: {
      type: String,
      value: '总支出'
    },
    // 是否显示中心文本
    showCenterText: {
      type: Boolean,
      value: true
    }
  },

  data: {
    hasData: true,
    totalAmount: 0,
    tableData: [], // 表格数据
    showTooltip: false, // 是否显示浮窗
    tooltipX: 0, // 浮窗X坐标
    tooltipY: 0, // 浮窗Y坐标
    selectedCategory: {}, // 选中的分类
    canvas: null, // Canvas实例
    ctx: null,     // 绘图上下文
    selectedSliceIndex: -1, // 当前选中的扇形索引
    animationId: null // 动画ID
  },

  observers: {
    'series': function(newSeries) {
      this.drawChart();
      this.updateTableData();
    }
  },

  lifetimes: {
    attached: function() {
      // 初始化Canvas
      this.initCanvas();
    },
    
    ready: function() {
      // 布局完成后绘制图表
      this.drawChart();
      this.updateTableData();
    },
    
    detached: function() {
      // 组件销毁时取消动画
      if (this.data.animationId) {
        cancelAnimationFrame(this.data.animationId);
      }
    }
  },

  methods: {
    // 初始化Canvas
    initCanvas() {
      const query = wx.createSelectorQuery().in(this);
      query.select(`#${this.data.canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || res.length === 0) return;
          
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          // 获取设备像素比，解决高清屏模糊问题
          const dpr = wx.getWindowInfo().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);
          
          this.setData({
            canvas,
            ctx
          });
        });
    },

    drawChart: function() {
      const { series, width, height, canvas, ctx, selectedSliceIndex } = this.data;
      
      // 检查Canvas是否初始化完成
      if (!canvas || !ctx) {
        // 延迟重试
        setTimeout(() => this.drawChart(), 100);
        return;
      }
      
      // 检查是否有数据
      const hasData = series && series.length > 0;
      this.setData({ hasData });
      
      if (!hasData) {
        console.log('Native pie chart: no data to display');
        return;
      }
      
      // 计算总金额
      const totalAmount = series.reduce((total, item) => total + item.value, 0);
      this.setData({ totalAmount });
      
      // 清空画布
      ctx.clearRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 * 0.8;
      
      // 颜色数组
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFBE0B', '#FB5607', 
        '#FF006E', '#8338EC', '#3A86FF', '#38B000', '#9EF01A'
      ];
      
      let startAngle = -Math.PI / 2; // 从顶部开始绘制
      
      // 绘制饼图
      series.forEach((item, index) => {
        const sliceAngle = (item.value / totalAmount) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        
        // 绘制扇形
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        
        // 如果当前扇形被选中，绘制稍大的扇形以实现突出效果
        let currentRadius = radius;
        if (index === selectedSliceIndex) {
          currentRadius = radius * 1.05; // 突出显示选中的扇形
        }
        
        ctx.arc(centerX, centerY, currentRadius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        
        // 绘制分割线
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + currentRadius * Math.cos(startAngle),
          centerY + currentRadius * Math.sin(startAngle)
        );
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        startAngle = endAngle;
      });
      
      // 绘制中心圆（创建空心效果）
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      
      // 绘制中心总金额
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      ctx.fillText('¥' + totalAmount.toFixed(2), centerX, centerY - 10);
      
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText(this.data.centerText, centerX, centerY + 15);
      
      // 绘制百分比文字
      startAngle = -Math.PI / 2;
      series.forEach((item, index) => {
        const sliceAngle = (item.value / totalAmount) * 2 * Math.PI;
        const middleAngle = startAngle + sliceAngle / 2;
        
        // 调整显示标签的条件
        const showLabel = index < 5 || (item.value / totalAmount) > 0.02;
        
        if (showLabel) {
          const labelRadius = radius * 0.7;
          const labelX = centerX + labelRadius * Math.cos(middleAngle);
          const labelY = centerY + labelRadius * Math.sin(middleAngle);
          
          // 绘制百分比
          const percentage = ((item.value / totalAmount) * 100).toFixed(1) + '%';
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#333333';
          ctx.textAlign = 'center';
          ctx.fillText(percentage, labelX, labelY);
          
          // 绘制分类名称
          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#666666';
          ctx.fillText(item.name, labelX, labelY + 15);
        }
        
        startAngle += sliceAngle;
      });
    },
    
    // 更新表格数据
    updateTableData: function() {
      const { series } = this.data;
      
      // 检查是否有数据
      const hasData = series && series.length > 0;
      if (!hasData) {
        this.setData({ tableData: [] });
        return;
      }
      
      // 计算总金额
      const totalAmount = series.reduce((total, item) => total + item.value, 0);
      
      // 构造表格数据
      const tableData = series.map(item => {
        return {
          name: item.name,
          value: item.value ? item.value.toFixed(2) : '0.00',
          percentage: totalAmount ? ((item.value / totalAmount) * 100).toFixed(1) : '0.0'
        };
      });
      
      this.setData({ tableData, totalAmount });
    },
    
    // 处理画布点击事件
    onCanvasTap: function(e) {
      const { series, width, height } = this.data;
      
      if (!series || series.length === 0) {
        console.log('Native pie chart: no series data available');
        return;
      }
      
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 * 0.8;
      
      // 获取点击位置相对于画布的坐标
      const query = wx.createSelectorQuery().in(this);
      query.select('#' + this.data.canvasId).boundingClientRect((res) => {
        if (!res) {
          console.log('Native pie chart: failed to get canvas bounding rect');
          return;
        }
        
        const x = e.detail.x - res.left;
        const y = e.detail.y - res.top;
        
        // 计算点击位置与中心点的距离
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        
        // 如果点击位置在饼图范围内
        if (distance <= radius && distance >= radius * 0.4) {
          // 计算点击位置的角度
          let angle = Math.atan2(y - centerY, x - centerX);
          // 调整角度范围到 [0, 2π]
          if (angle < 0) {
            angle += 2 * Math.PI;
          }
          
          // 从顶部开始计算的起始角度
          let startAngle = Math.PI * 3 / 2; // -Math.PI/2 转换为 [0, 2π] 范围
          if (startAngle >= 2 * Math.PI) {
            startAngle -= 2 * Math.PI;
          }
          
          // 查找被点击的扇形
          const totalValue = series.reduce((total, item) => total + (item.value || 0), 0);
          
          for (let i = 0; i < series.length; i++) {
            const sliceAngle = (series[i].value / totalValue) * 2 * Math.PI;
            let endAngle = startAngle + sliceAngle;

            // 处理角度跨越 0 的情况
            if (endAngle >= 2 * Math.PI) {
              if (angle >= startAngle || angle <= endAngle - 2 * Math.PI) {
                // 更新选中的扇形索引并重新绘制
                this.setData({ selectedSliceIndex: i });
                this.drawChart();
                this.showTooltip(series[i], totalValue);
                return;
              }
            } else {
              if (angle >= startAngle && angle <= endAngle) {
                // 更新选中的扇形索引并重新绘制
                this.setData({ selectedSliceIndex: i });
                this.drawChart();
                this.showTooltip(series[i], totalValue);
                return;
              }
            }
            
            startAngle = endAngle;
            if (startAngle >= 2 * Math.PI) {
              startAngle -= 2 * Math.PI;
            }
          }
        } else {
          // 点击在饼图外区域，隐藏浮窗并取消选中
          this.setData({ 
            showTooltip: false,
            selectedSliceIndex: -1
          });
          this.drawChart();
        }
      });
      
      query.exec();
    },
    
    // 显示浮窗
    showTooltip: function(category, totalValue) {
      // 添加默认值检查
      const value = category && category.value ? category.value : 0;
      const name = category && category.name ? category.name : '未知分类';
      const percentage = totalValue ? ((value / totalValue) * 100).toFixed(1) : '0.0';
      
      this.setData({
        showTooltip: true,
        selectedCategory: {
          name: name,
          value: value.toFixed(2),
          percentage: percentage
        }
      });
      // 5秒后自动隐藏浮窗
      setTimeout(() => {
        this.setData({ showTooltip: false });
      }, 3000);
    }
  }
})