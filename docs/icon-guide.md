# 图标使用指南

## 基本用法

在页面中使用图标：

```xml
<fa-icon name="home" size="32" color="#4CAF50"></fa-icon>
```

## 参数说明

- `name`: 图标名称，如 "home", "camera" 等
- `size`: 图标大小，单位为 rpx，默认为 32
- `color`: 图标颜色，如 "#4CAF50", "red" 等

## 可用图标列表

### 基础图标
- home - 首页
- camera - 相机
- microphone - 麦克风
- calendar/time - 日历/时间
- search - 搜索
- info-circle - 信息
- question-circle - 问题
- check-circle - 成功
- times-circle - 错误

### 导航图标
- chevron-right - 向右箭头
- chevron-left - 向左箭头
- chevron-down - 向下箭头
- chevron-up - 向上箭头

### 操作图标
- plus - 添加
- minus - 减少
- pencil/edit - 编辑
- trash/delete - 删除
- refresh - 刷新
- download - 下载
- filter - 筛选

### 状态图标
- check - 成功/确认
- times - 取消/关闭
- info - 信息
- warning - 警告

### 业务图标
- cutlery/shop - 餐饮
- car/location - 交通
- shopping-bag/cart - 购物
- film/video - 娱乐
- phone - 通讯
- medkit - 医疗
- book/note - 教育
- money/card - 金融
- gift - 礼物
- user/my - 用户
- comment - 评论
- bell/notice - 通知
- tag - 标签
- crown/favor - 特权/收藏

## 在页面中引入

在页面的 JSON 文件中添加：

```json
{
  "usingComponents": {
    "fa-icon": "/components/fa-icon/fa-icon"
  }
}
```

## 注意事项

1. 图标库基于微信小程序官方的 WeUI 图标库实现
2. 部分图标可能与 FontAwesome 的名称有所不同
3. 如需更多图标，可以在 weui-icon 组件中扩展