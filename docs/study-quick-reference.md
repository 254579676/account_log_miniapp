# 学习模块 - 数据库与接口快速参考

## 📊 数据库表结构概览

| 表名 | 用途 | 主要字段 |
|------|------|----------|
| `users` | 用户信息 | openid, nickname, avatar_url |
| `children` | 孩子信息 | name, gender, grade, school |
| `subjects` | 科目信息 | name, code, icon_url |
| `homework` | 作业管理 | title, subject_id, status, due_date |
| `exams` | 考试管理 | exam_name, score, total_score, exam_date |
| `error_questions` | 错题本 | question_content, correct_answer, mastery_level |
| `study_records` | 学习记录 | record_type, duration, content |
| `study_goals` | 学习目标 | goal_type, target_value, status |
| `study_statistics` | 学习统计 | stat_type, homework_count, exam_avg_score |

## 🔗 核心关系图

```
users (1) → (n) children (1) → (n) homework
                     ↓
                     (1) → (n) exams
                     ↓
                     (1) → (n) error_questions
                     ↓
                     (1) → (n) study_records
                     ↓
                     (1) → (n) study_goals

subjects (1) → (n) homework
subjects (1) → (n) exams
subjects (1) → (n) error_questions
```

## 🚀 核心接口清单

### 用户管理
- `POST /api/study/auth/login` - 用户登录
- `POST /api/study/user/info` - 获取用户信息

### 孩子管理
- `POST /api/study/children/list` - 获取孩子列表
- `POST /api/study/children/add` - 添加孩子
- `POST /api/study/children/update` - 更新孩子信息
- `POST /api/study/children/delete` - 删除孩子

### 作业管理
- `POST /api/study/homework/list` - 获取作业列表
- `POST /api/study/homework/add` - 添加作业
- `POST /api/study/homework/update` - 更新作业
- `POST /api/study/homework/delete` - 删除作业
- `POST /api/study/homework/stats` - 作业统计

### 考试管理
- `POST /api/study/exam/list` - 获取考试列表
- `POST /api/study/exam/add` - 添加考试
- `POST /api/study/exam/update` - 更新考试
- `POST /api/study/exam/delete` - 删除考试
- `POST /api/study/exam/stats` - 考试统计

### 错题管理
- `POST /api/study/error/list` - 获取错题列表
- `POST /api/study/error/add` - 添加错题
- `POST /api/study/error/update` - 更新错题
- `POST /api/study/error/delete` - 删除错题
- `POST /api/study/error/review` - 错题复习

### 学习统计
- `POST /api/study/statistics/overview` - 学习概览
- `POST /api/study/statistics/trend` - 学习趋势
- `POST /api/study/statistics/subject` - 科目分析

## 📱 小程序端调用示例

### 1. 获取作业列表
```javascript
function getHomeworkList(childId, date) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://your-domain.com/api/study/homework/list',
      method: 'POST',
      data: {
        token: wx.getStorageSync('token'),
        child_id: childId,
        date: date
      },
      success: (res) => {
        if (res.data.code === 200) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message));
        }
      },
      fail: reject
    });
  });
}
```

### 2. 添加作业
```javascript
function addHomework(homeworkData) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://your-domain.com/api/study/homework/add',
      method: 'POST',
      data: {
        token: wx.getStorageSync('token'),
        ...homeworkData
      },
      success: (res) => {
        if (res.data.code === 200) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message));
        }
      },
      fail: reject
    });
  });
}
```

### 3. 上传图片
```javascript
function uploadImage(filePath, type) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: 'https://your-domain.com/api/study/upload/image',
      filePath: filePath,
      name: 'file',
      formData: {
        token: wx.getStorageSync('token'),
        type: type
      },
      success: (res) => {
        const data = JSON.parse(res.data);
        if (data.code === 200) {
          resolve(data.data.url);
        } else {
          reject(new Error(data.message));
        }
      },
      fail: reject
    });
  });
}
```

## 🎯 数据流转示例

### 添加作业流程
```
1. 用户选择科目和填写作业信息
2. 上传作业图片（可选）
3. 调用 POST /api/study/homework/add
4. 服务器验证数据并保存到数据库
5. 返回作业ID
6. 更新本地缓存
```

### 考试成绩分析流程
```
1. 用户录入考试成绩
2. 调用 POST /api/study/exam/add
3. 服务器保存考试数据
4. 自动分析错题（可选）
5. 更新学习统计表
6. 返回分析结果
```

## 📈 统计查询示例

### 1. 今日学习概览
```sql
SELECT 
    COUNT(CASE WHEN h.status = '已完成' THEN 1 END) as homework_completed,
    COUNT(*) as homework_total,
    COUNT(e.id) as exam_count,
    SUM(sr.duration) as study_duration
FROM homework h
LEFT JOIN exams e ON e.child_id = h.child_id AND e.exam_date = CURDATE()
LEFT JOIN study_records sr ON sr.child_id = h.child_id AND sr.record_date = CURDATE()
WHERE h.child_id = ? AND h.due_date = CURDATE();
```

### 2. 月度成绩趋势
```sql
SELECT 
    DATE_FORMAT(exam_date, '%Y-%m') as month,
    AVG(score) as avg_score,
    COUNT(*) as exam_count
FROM exams 
WHERE child_id = ? 
    AND exam_date >= ? 
    AND exam_date <= ?
GROUP BY DATE_FORMAT(exam_date, '%Y-%m')
ORDER BY month;
```

### 3. 科目强弱分析
```sql
SELECT 
    s.name as subject_name,
    AVG(e.score) as avg_score,
    COUNT(e.id) as exam_count,
    COUNT(CASE WHEN eq.id IS NOT NULL THEN 1 END) as error_count
FROM subjects s
LEFT JOIN exams e ON e.subject_id = s.id AND e.child_id = ?
LEFT JOIN error_questions eq ON eq.subject_id = s.id AND eq.child_id = ?
GROUP BY s.id, s.name
ORDER BY avg_score DESC;
```

## 🔧 开发建议

### 1. 数据库优化
- 为常用查询字段添加索引
- 使用JSON字段存储灵活数据
- 定期清理历史数据
- 考虑读写分离

### 2. 接口优化
- 实现分页查询避免数据量过大
- 使用缓存减少数据库压力
- 批量操作提高效率
- 异步处理耗时操作

### 3. 安全考虑
- Token过期机制
- 接口频率限制
- 参数验证和过滤
- 敏感数据加密

### 4. 性能优化
- 图片压缩和CDN加速
- 数据库连接池
- 接口响应时间监控
- 前端数据缓存

## 📋 部署检查清单

### 数据库
- [ ] 创建所有表结构
- [ ] 添加初始数据（科目等）
- [ ] 创建索引
- [ ] 设置外键约束
- [ ] 配置备份策略

### 后端服务
- [ ] 实现所有接口
- [ ] 添加参数验证
- [ ] 配置跨域访问
- [ ] 设置日志记录
- [ ] 配置监控告警

### 小程序端
- [ ] 更新API调用地址
- [ ] 实现错误处理
- [ ] 添加加载状态
- [ ] 优化用户体验
- [ ] 测试所有功能

---

**🎉 这个设计涵盖了学习管理的完整功能，支持多孩子、多科目、全流程的学习数据管理！**