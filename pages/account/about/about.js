// import * as echarts from '../../../components/ec-canvas/echarts';
// require('../../../components/ec-canvas/chalk')
function initChart(canvas, width, height, dpr) {
  const chart = echarts.init(canvas, 'chalk', {
    width: width,
    height: height,
    devicePixelRatio: dpr // 解决高清屏模糊问题
  });
  canvas.setChart(chart);

  // 配置图表数据（以折线图为例）
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['Email', 'Union Ads', 'Video Ads', 'Direct', 'Search Engine']
    },
    toolbox: {
      show: true,
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        dataView: { readOnly: false },
        magicType: { type: ['line', 'bar'] },
        restore: {},
        saveAsImage: {}
      }
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月']
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: [120, 200, 150, 80, 250],
      type: 'line',
      smooth: true
    }]
  };

  chart.setOption(option);
  return chart;
}

Page({
  data: {
    ec: {
      onInit: initChart // 绑定初始化函数
    }
  }
});