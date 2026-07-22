// 组件功能特性
// 高度可配置

// chartId - 画布ID
// chartData - 图表数据
// barColor - 柱子颜色
// enableTouch - 是否启用触摸
// 自动绘图

// 监听 chartData 变化自动重绘
// 动态计算柱子布局
// 支持空状态显示
// 触摸交互

// 柱子触摸检测
// 自定义事件触发
// tooltip显示控制
Component({
  properties: {
    chartId: {
      type: String,
      value: 'barChart'
    },
    chartData: {
      type: Array,
      value: []
    },
    chartTitle: {
      type: String,
      value: '成绩趋势'
    },
    barColor: {
      type: String,
      value: '#2196F3'
    },
    enableTouch: {
      type: Boolean,
      value: true
    }
  },

  data: {
    canvasWidth: 350,
    canvasHeight: 200,
    barPositions: [],
    tooltipBar: null // 当前显示tooltip的柱子
  },

  ctx: null, // 缓存canvas上下文

  lifetimes: {
    attached() {
      this.setData({
        canvasWidth: 350,
        canvasHeight: 200
      });
    },
    
    ready() {
      // 如果有数据，立即绘制
      if (this.properties.chartData && this.properties.chartData.length > 0) {
        setTimeout(() => {
          this.drawChart();
        }, 100);
      }
    }
  },

  observers: {
    'chartData': function(chartData) {
      if (chartData && chartData.length > 0) {
        // 确保在组件完全准备好后再绘制
        setTimeout(() => {
          this.drawChart();
        }, 50);
      } else {
        this.drawEmptyChart();
      }
    }
  },

  methods: {
    /**
     * 绘制图表
     */
    drawChart() {
      const { chartData, barColor } = this.properties;
      const { canvasWidth, canvasHeight } = this.data;
      
      if (!chartData || chartData.length === 0) {
        this.drawEmptyChart();
        return;
      }

      // 使用缓存的context，如果没有则创建
      if (!this.ctx) {
        this.ctx = wx.createCanvasContext(this.properties.chartId, this);
      }
      const ctx = this.ctx;

      // 清空画布
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // 计算数据范围 - 动态调整Y轴最大值
      const scores = chartData.map(item => item.score || 0);
      let maxScore = Math.max(...scores);
      // 确保最小Y轴刻度至少为10，避免数据太小导致柱子太大
      maxScore = Math.max(maxScore, 10);
      // 增加10%的余量让图表看起来更舒适，并向上取整
      maxScore = Math.ceil(maxScore * 1.1);

      const minScore = 0;
      const scoreRange = maxScore - minScore;

      // 绘制坐标轴和刻度线
      this.drawAxes(ctx, scoreRange);

      // 绘制柱状图
      this.drawBars(ctx, chartData, scoreRange, barColor);

      // 绘制tooltip（如果有选中的柱子）
      const tooltipBar = this.data.tooltipBar;
      if (tooltipBar) {
        this.drawTooltip(ctx, tooltipBar);
      }

      ctx.draw(false, () => {
        // 存储柱子位置信息用于触摸检测
        this.setData({ barPositions: this.getBarPositions(chartData, scoreRange) });
      });
    },
    
    /**
     * 绘制空状态图表
     */
    drawEmptyChart() {
      const { canvasWidth, canvasHeight } = this.data;

      // 使用缓存的context，如果没有则创建
      if (!this.ctx) {
        this.ctx = wx.createCanvasContext(this.properties.chartId, this);
      }
      const ctx = this.ctx;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // 绘制坐标轴（空状态使用10作为默认最大值）
      this.drawAxes(ctx, 10);

      // 绘制暂无数据文字
      ctx.setFillStyle('#999');
      ctx.setFontSize(14);
      ctx.setTextAlign('center');
      ctx.fillText('暂无数据', canvasWidth / 2, canvasHeight / 2);
      ctx.setTextAlign('left');

      ctx.draw();

      this.setData({ barPositions: [] });
    },
    
    /**
     * 绘制坐标轴和刻度线
     */
    drawAxes(ctx, scoreRange) {
      const { canvasWidth, canvasHeight } = this.data;

      ctx.setStrokeStyle('#e0e0e0');
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(35, 20);
      ctx.lineTo(35, canvasHeight - 30);
      ctx.lineTo(canvasWidth - 15, canvasHeight - 30);
      ctx.stroke();

      // 绘制Y轴刻度
      ctx.setFillStyle('#666');
      ctx.setFontSize(10);
      ctx.setTextAlign('left'); // 确保左对齐
      for (let i = 0; i <= 5; i++) {
        const y = canvasHeight - 30 - (i * (canvasHeight - 50) / 5);
        const value = Math.round(scoreRange * i / 5);
        ctx.fillText(value.toString(), 5, y + 3);

        // 绘制网格线
        if (i > 0) {
          ctx.setStrokeStyle('#f0f0f0');
          ctx.beginPath();
          ctx.moveTo(35, y);
          ctx.lineTo(canvasWidth - 15, y);
          ctx.stroke();
        }
      }
    },
    
    /**
     * 绘制柱状图
     */
    drawBars(ctx, data, scoreRange, barColor) {
      const { canvasWidth, canvasHeight } = this.data;

      // 动态计算柱子宽度和间距，确保所有柱子都能显示在画布内
      const chartWidth = canvasWidth - 50; // 可用宽度（除去左右边距）
      const maxBarWidth = 40; // 最大柱子宽度
      const minBarWidth = 15; // 最小柱子宽度
      const barCount = data.length;

      // 计算每个柱子的可用空间
      const availableWidthPerBar = chartWidth / barCount;

      // 动态计算柱子宽度：根据数据量自动调整
      let barWidth;
      if (availableWidthPerBar >= maxBarWidth + 10) {
        // 空间充足，使用最大宽度
        barWidth = maxBarWidth;
      } else if (availableWidthPerBar >= minBarWidth + 2) {
        // 空间有限，使用可用空间的70%
        barWidth = Math.max(availableWidthPerBar * 0.7, minBarWidth);
      } else {
        // 数据量很大，使用最小宽度
        barWidth = minBarWidth;
      }

      // 计算间距，确保所有柱子均匀分布且不溢出
      const totalBarWidth = barWidth * barCount;
      const totalSpacing = chartWidth - totalBarWidth;
      const barSpacing = totalSpacing / (barCount + 1); // +1 是左右两边的边距

      data.forEach((item, index) => {
        // x 坐标 = 左边距 + 间距 + 柱子宽度 * 索引 + 间距 * 索引
        const x = 35 + barSpacing + index * (barWidth + barSpacing);
        const barHeight = ((item.score - 0) / scoreRange) * (canvasHeight - 50);
        const y = canvasHeight - 30 - barHeight;

        // 绘制柱子
        ctx.setFillStyle(barColor);
        ctx.fillRect(x, y, barWidth, barHeight);

        // 绘制分数标签（柱子太窄时省略）
        if (barWidth >= 20) {
          ctx.setFillStyle('#fff');
          ctx.setFontSize(barWidth >= 25 ? 12 : 10);
          ctx.setTextAlign('center');
          ctx.setTextBaseline('middle');
          ctx.fillText(item.score.toString(), x + barWidth / 2, y + barHeight / 2);
          ctx.setTextAlign('left');
          ctx.setTextBaseline('alphabetic');
        }

        // 绘制日期标签
        ctx.setFillStyle('#666');
        ctx.setFontSize(barWidth >= 20 ? 9 : 7);
        ctx.setTextAlign('center');
        let displayDate = item.date || '';
        if (displayDate.length > 8) {
          const dateParts = displayDate.split('-');
          if (dateParts.length === 3) {
            displayDate = `${dateParts[1]}-${dateParts[2]}`;
          }
        }
        ctx.fillText(displayDate, x + barWidth / 2, canvasHeight - 8);
        ctx.setTextAlign('left');
      });
    },
    
    /**
     * 获取柱子位置信息
     */
    getBarPositions(data, scoreRange) {
      const { canvasWidth, canvasHeight } = this.data;
      const chartWidth = canvasWidth - 50;
      const maxBarWidth = 40;
      const minBarWidth = 15;
      const barCount = data.length;

      const availableWidthPerBar = chartWidth / barCount;

      let barWidth;
      if (availableWidthPerBar >= maxBarWidth + 10) {
        barWidth = maxBarWidth;
      } else if (availableWidthPerBar >= minBarWidth + 2) {
        barWidth = Math.max(availableWidthPerBar * 0.7, minBarWidth);
      } else {
        barWidth = minBarWidth;
      }

      const totalBarWidth = barWidth * barCount;
      const totalSpacing = chartWidth - totalBarWidth;
      const barSpacing = totalSpacing / (barCount + 1);

      return data.map((item, index) => {
        const x = 35 + barSpacing + index * (barWidth + barSpacing);
        const barHeight = ((item.score - 0) / scoreRange) * (canvasHeight - 50);
        const y = canvasHeight - 30 - barHeight;

        return {
          x: x,
          y: y,
          width: barWidth,
          height: barHeight,
          data: item
        };
      });
    },
    
    /**
     * 处理图表触摸事件
     */
    handleChartTouch(e) {
      if (!this.properties.enableTouch) return;

      const touch = e.touches[0];
      const x = touch.x;
      const y = touch.y;

      const barPositions = this.data.barPositions;
      if (!barPositions || barPositions.length === 0) return;

      let touchedBar = null;
      for (let bar of barPositions) {
        if (x >= bar.x && x <= bar.x + bar.width &&
            y >= bar.y && y <= bar.y + bar.height) {
          touchedBar = bar;
          break;
        }
      }

      const currentTooltipBar = this.data.tooltipBar;

      // 只有状态真正改变时才更新和重绘
      if (touchedBar) {
        // 判断是否是同一个柱子
        const isSameBar = currentTooltipBar &&
                         currentTooltipBar.data.id === touchedBar.data.id;

        if (!isSameBar) {
          this.setData({ tooltipBar: touchedBar }, () => {
            this.drawChart();
          });
        }
        this.triggerEvent('bartouch', {
          barData: touchedBar.data
        });
      } else {
        // 清除tooltip并重绘
        if (currentTooltipBar) {
          this.setData({ tooltipBar: null }, () => {
            this.drawChart();
          });
        }
        this.triggerEvent('bartouchend');
      }
    },
    
    /**
     * 触摸开始
     */
    onTouchStart(e) {
      this.handleChartTouch(e);
    },
    
    /**
     * 触摸移动
     */
    onTouchMove(e) {
      this.handleChartTouch(e);
    },
    
    /**
     * 触摸结束
     */
    onTouchEnd() {
      if (this.data.tooltipBar) {
        this.setData({ tooltipBar: null }, () => {
          this.drawChart();
        });
      }
      this.triggerEvent('bartouchend');
    },

    /**
     * 绘制tooltip到canvas上
     */
    drawTooltip(ctx, bar) {
      const { canvasWidth, canvasHeight } = this.data;
      const data = bar.data;
      const barCenterX = bar.x + bar.width / 2;

      // 计算tooltip位置（柱子顶部上方）
      const tooltipY = bar.y - 8;
      const tooltipX = barCenterX;

      // 计算tooltip文本宽度，汉字大小24rpx（对应canvas中12px）
      const nameText = data.exam_name || data.exam_type || '考试';
      const scoreText = `${data.score}分`;
      const dateText = data.date || '';

      ctx.setFontSize(12); // 24rpx
      const nameWidth = ctx.measureText(nameText).width;
      const scoreWidth = ctx.measureText(scoreText).width;
      const dateWidth = dateText ? ctx.measureText(dateText).width : 0;
      const maxTextWidth = Math.max(nameWidth, scoreWidth, dateWidth);

      // 按照约6个汉字宽度设计，每个汉字约12px，6个约72px，加上padding约80px
      const tooltipWidth = Math.min(maxTextWidth + 20, 80);

      // 绘制tooltip背景
      ctx.setFillStyle('rgba(0, 0, 0, 0.8)');
      ctx.fillRect(tooltipX - tooltipWidth / 2, tooltipY, tooltipWidth, 55);

      // 绘制考试名称（24rpx）
      ctx.setFillStyle('#ffffff');
      ctx.setFontSize(12);
      ctx.setTextAlign('center');
      ctx.fillText(nameText, tooltipX, tooltipY + 18);

      // 绘制分数（24rpx）
      ctx.setFillStyle('#4CAF50');
      ctx.setFontSize(12);
      ctx.setTextAlign('center');
      ctx.fillText(scoreText, tooltipX, tooltipY + 35);

      // 绘制日期（20rpx，略小一点）
      if (dateText) {
        ctx.setFillStyle('#cccccc');
        ctx.setFontSize(10);
        ctx.fillText(dateText, tooltipX, tooltipY + 50);
      }

      // 绘制箭头
      ctx.setFillStyle('rgba(0, 0, 0, 0.8)');
      ctx.beginPath();
      ctx.moveTo(tooltipX, tooltipY + 55);
      ctx.lineTo(tooltipX - 5, tooltipY + 60);
      ctx.lineTo(tooltipX + 5, tooltipY + 60);
      ctx.closePath();
      ctx.fill();

      // 恢复canvas状态，防止影响后续绘制
      ctx.setFillStyle('#666');
      ctx.setFontSize(10);
      ctx.setTextAlign('left');
    }
  }
});