Component({
  options: {
    multipleSlots: true
  },
  
  properties: {
    // 画布ID
    canvasId: {
      type: String,
      value: 'barCanvas'
    },
    // 画布宽度
    width: {
      type: Number,
      value: 350
    },
    // 画布高度
    height: {
      type: Number,
      value: 300
    },
    // X轴标签
    xLabels: {
      type: Array,
      value: []
    },
    // 数据系列
    series: {
      type: Array,
      value: []
    }
  },

  data: {
    hasData: true,
    canvas: null,  // Canvas实例
    ctx: null      // 绘图上下文
  },

  observers: {
    'series, xLabels': function(newSeries, newLabels) {
      this.drawChart();
    }
  },

  lifetimes: {
    attached: function() {
      // 初始化Canvas
      this.initCanvas();
    },
    
    ready: function() {
      // 在组件在视图层布局完成后执行
      this.drawChart();
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
      const { series, xLabels, width, height, canvas, ctx } = this.data;
      
      // 检查Canvas是否初始化完成
      if (!canvas || !ctx) {
        // 延迟重试
        setTimeout(() => this.drawChart(), 100);
        return;
      }
      
      // 检查是否有数据
      const hasData = series && series.length > 0 && xLabels && xLabels.length > 0;
      this.setData({ hasData });
      
      if (!hasData) {
        return;
      }
      
      // 清空画布
      ctx.clearRect(0, 0, width, height);
      
      // 图表边距
      const margin = {
        top: 20,
        right: 20,
        bottom: 50,
        left: 50
      };
      
      // 绘图区域尺寸
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      
      // 获取最大值，用于计算比例
      let maxValue = 0;
      series.forEach(serie => {
        serie.data.forEach(value => {
          if (value > maxValue) maxValue = value;
        });
      });
      
      // 如果最大值为0，则设置默认值
      if (maxValue === 0) {
        maxValue = 100;
      }
      
      // 添加10%的顶部边距
      maxValue *= 1.1;
      
      // X轴和Y轴的坐标
      const xAxisY = margin.top + chartHeight;
      
      // 绘制Y轴
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, xAxisY);
      ctx.strokeStyle = '#CCCCCC';
      ctx.stroke();
      
      // 绘制Y轴刻度和标签
      const yTickCount = 5;
      const yTickStep = maxValue / yTickCount;
      for (let i = 0; i <= yTickCount; i++) {
        const y = xAxisY - (i * chartHeight / yTickCount);
        
        // 绘制网格线
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.strokeStyle = '#EEEEEE';
        ctx.stroke();
        
        // 绘制Y轴标签
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'right';
        ctx.fillText('¥' + (yTickStep * i).toFixed(0), margin.left - 5, y + 4);
      }
      
      // 绘制X轴
      ctx.beginPath();
      ctx.moveTo(margin.left, xAxisY);
      ctx.lineTo(width - margin.right, xAxisY);
      ctx.strokeStyle = '#CCCCCC';
      ctx.stroke();
      
      // 柱状图参数
      const barWidth = chartWidth / (xLabels.length * series.length + xLabels.length + 1);
      const barSpacing = barWidth * 0.5;
      const groupWidth = barWidth * series.length + barSpacing;
      
      // 颜色数组
      const colors = ['#4CAF50', '#F44336', '#2196F3', '#FFC107'];
      
      // 绘制柱状图
      xLabels.forEach((label, labelIndex) => {
        const groupX = margin.left + barSpacing + (labelIndex + 1) * (chartWidth / (xLabels.length + 1)) - groupWidth / 2;
        
        // 绘制X轴标签
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.fillText(label, margin.left + (labelIndex + 1) * (chartWidth / (xLabels.length + 1)), xAxisY + 20);
        
        // 绘制每个系列的柱子
        series.forEach((serie, serieIndex) => {
          const value = serie.data[labelIndex] || 0;
          const barHeight = (value / maxValue) * chartHeight;
          const x = groupX + serieIndex * (barWidth + barSpacing);
          const y = xAxisY - barHeight;
          
          // 绘制柱子
          ctx.fillStyle = colors[serieIndex % colors.length];
          ctx.fillRect(x, y, barWidth, barHeight);
          
          // 绘制数值标签
          if (value > 0) {
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#333333';
            ctx.textAlign = 'center';
            ctx.fillText('¥' + value.toFixed(0), x + barWidth / 2, y - 5);
          }
        });
      });
      
      // 绘制图例
      series.forEach((serie, index) => {
        const legendX = margin.left + index * 80;
        const legendY = margin.top - 15;
        
        // 绘制颜色方块
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(legendX, legendY, 10, 10);
        
        // 绘制图例文字
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'left';
        ctx.fillText(serie.name, legendX + 15, legendY + 9);
      });
    },
    
    onCanvasTap: function(e) {
      // 可以在这里处理点击事件
      this.triggerEvent('chartTap', e);
    }
  }
})
