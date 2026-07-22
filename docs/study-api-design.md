# 学习模块接口设计

## 接口规范

- **请求方式**：全部使用 POST 请求
- **数据格式**：JSON
- **字符编码**：UTF-8
- **认证方式**：JWT Token 或 Session
- **基础URL**：`https://your-domain.com/api/study`

## 通用响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1640995200
}
```

### 错误码说明
- `200` - 成功
- `400` - 参数错误
- `401` - 未授权
- `403` - 禁止访问
- `404` - 资源不存在
- `500` - 服务器错误

---

## 1. 用户相关接口

### 1.1 用户登录/注册
```
POST /api/study/auth/login
```

**请求参数：**
```json
{
  "code": "wx_login_code",
  "userInfo": {
    "nickname": "用户昵称",
    "avatar_url": "头像URL"
  }
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user_id": 1001,
    "openid": "wx_openid",
    "token": "jwt_token",
    "nickname": "用户昵称",
    "avatar_url": "头像URL"
  }
}
```

### 1.2 获取用户信息
```
POST /api/study/user/info
```

**请求参数：**
```json
{}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "user_id": 1001,
    "nickname": "用户昵称",
    "avatar_url": "头像URL",
    "phone": "13800138000",
    "created_at": "2024-01-01 10:00:00"
  }
}
```

---

## 2. 孩子管理接口

### 2.1 获取孩子列表
```
POST /api/study/children/list
```

**请求参数：**
```json
{}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "children": [
      {
        "id": 1001,
        "name": "小明",
        "gender": 1,
        "birth_date": "2010-05-15",
        "grade": "五年级",
        "class": "3班",
        "school": "实验小学",
        "avatar_url": "头像URL",
        "is_active": 1
      }
    ]
  }
}
```

### 2.2 添加孩子
```
POST /api/study/children/add
```

**请求参数：**
```json
{
  "name": "小明",
  "gender": 1,
  "birth_date": "2010-05-15",
  "grade": "五年级",
  "class": "3班",
  "school": "实验小学",
  "avatar_url": "头像URL"
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "添加成功",
  "data": {
    "child_id": 1001
  }
}
```

### 2.3 更新孩子信息
```
POST /api/study/children/update
```

**请求参数：**
```json
{
  "child_id": 1001,
  "name": "小明",
  "grade": "六年级",
  "class": "1班"
}
```

### 2.4 删除孩子
```
POST /api/study/children/delete
```

**请求参数：**
```json
{
  "child_id": 1001
}
```

---

## 3. 作业管理接口

### 3.1 获取作业列表
```
POST /api/study/homework/list
```

**请求参数：**
```json
{
  "token": "jwt_token",
  "child_id": 1001,
  "date": "2024-01-15",
  "status": "待完成",
  "subject_id": 1,
  "page": 1,
  "limit": 20
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "homework_list": [
      {
        "id": 1001,
        "subject_id": 1,
        "subject_name": "数学",
        "title": "数学练习册第10页",
        "description": "完成练习册第10页所有题目",
        "homework_type": "课后作业",
        "difficulty": "中等",
        "priority": "普通",
        "estimated_time": 30,
        "actual_time": 25,
        "due_date": "2024-01-15",
        "status": "已完成",
        "completion_rate": 100.00,
        "images": ["图片URL1", "图片URL2"],
        "created_at": "2024-01-14 18:00:00"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

### 3.2 添加作业
```
POST /api/study/homework/add
```

**请求参数：**
```json
{
  "child_id": 1001,
  "subject_id": 1,
  "title": "数学练习册第10页",
  "description": "完成练习册第10页所有题目",
  "homework_type": "课后作业",
  "difficulty": "中等",
  "priority": "普通",
  "estimated_time": 30,
  "due_date": "2024-01-15",
  "images": ["图片URL1", "图片URL2"]
}
```

### 3.3 更新作业
```
POST /api/study/homework/update
```

**请求参数：**
```json
{
  "homework_id": 1001,
  "status": "已完成",
  "actual_time": 25,
  "completion_rate": 100.00,
  "images": ["图片URL1", "图片URL2"]
}
```

### 3.4 删除作业
```
POST /api/study/homework/delete
```

**请求参数：**
```json
{
  "homework_id": 1001
}
```

### 3.5 获取作业统计
```
POST /api/study/homework/stats
```

**请求参数：**
```json
{
  "child_id": 1001,
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 45,
    "completed": 40,
    "pending": 5,
    "completion_rate": 88.89,
    "total_time": 1200,
    "avg_time": 30,
    "subject_stats": [
      {
        "subject_name": "数学",
        "total": 15,
        "completed": 14,
        "completion_rate": 93.33
      }
    ]
  }
}
```

---

## 4. 考试管理接口

### 4.1 获取考试列表
```
POST /api/study/exam/list
```

**请求参数：**
```json
{
  "child_id": 1001,
  "subject_id": 1,
  "exam_type": "期中考试",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "page": 1,
  "limit": 20
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "exam_list": [
      {
        "id": 1001,
        "subject_id": 1,
        "subject_name": "数学",
        "exam_name": "数学期中考试",
        "exam_type": "期中考试",
        "exam_date": "2024-01-15",
        "total_score": 100,
        "score": 85,
        "class_ranking": 5,
        "grade_ranking": 20,
        "class_average": 78.5,
        "grade_average": 75.2,
        "images": ["试卷图片URL"],
        "created_at": "2024-01-15 14:00:00"
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

### 4.2.1 添加考试-单元测试
```
POST /api/study/exam/add/unittest
```

**请求参数：**
```json
{
  "child_id": 1001,
  "subject_id": 1,
  "exam_type": "单元测试",
  "exam_date": "2024-01-15",
  "total_score": 100,
  "score": 85,
  "class_ranking": 5,
  "images": ["试卷图片URL"]
}
```
### 4.2.2 添加考试-综合测试
```
POST /api/study/exam/add/Comprehensivetest
```

**请求参数：**
```json
{
  "child_id": 1001,
  "exam_name": "数学期中考试",
  "exam_type": "期中测试",
  "exam_date": "2024-01-15",
  "total_score": 100,
  "score": 85,
  "class_ranking": 5,
  "grade_ranking": 20
}
```

### 4.2.3 添加考试-综合测试-添加单科成绩
```
POST /api/study/exam/add/single
```

**请求参数：**
```json
{
  "parent_exam_id":1,
  "subject_id": 1,
  "child_id": 1001,
  "exam_date": "2024-01-15",
  "total_score": 100,
  "score": 85,
  "class_ranking": 5,
  "images": ["试卷图片URL"]
}
```

### 4.3 更新考试
```
POST /api/study/exam/update
```

**请求参数：**
```json
{
  "exam_id": 1001,
  "score": 88,
  "class_ranking": 3,
  "images": ["试卷图片URL1", "试卷图片URL2"]
}
```

### 4.4 删除考试
```
POST /api/study/exam/delete
```

**请求参数：**
```json
{
  "exam_id": 1001
}
```

### 4.5 获取考试成绩统计
```
POST /api/study/exam/stats
```

**请求参数：**
```json
{
  "child_id": 1001,
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  }
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_exams": 20,
    "avg_score": 82.5,
    "highest_score": 98,
    "lowest_score": 65,
    "subject_stats": [
      {
        "subject_name": "数学",
        "exam_count": 5,
        "avg_score": 85.2,
        "highest_score": 98,
        "lowest_score": 72
      }
    ],
    "trend": [
      {
        "month": "2024-01",
        "avg_score": 78.5
      }
    ]
  }
}
```

---

## 5. 错题管理接口

### 5.1 获取错题列表
```
POST /api/study/error/list
```

**请求参数：**
```json
{
  "child_id": 1001,
  "subject_id": 1,
  "is_mastered": 0,
  "error_type": "概念错误",
  "page": 1,
  "limit": 20
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "error_list": [
      {
        "id": 1001,
        "subject_id": 1,
        "subject_name": "数学",
        "exam_id": 1001,
        "question_content": "题目内容",
        "question_type": "选择题",
        "correct_answer": "A",
        "student_answer": "B",
        "analysis": "题目解析",
        "knowledge_points": ["分数", "运算"],
        "difficulty": "中等",
        "error_type": "概念错误",
        "mastery_level": "未掌握",
        "review_count": 2,
        "last_review_at": "2024-01-14 10:00:00",
        "is_mastered": 0,
        "images": ["错题图片URL"],
        "created_at": "2024-01-13 15:00:00"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 20
  }
}
```

### 5.2 添加错题
```
POST /api/study/error/add
```

**请求参数：**
```json
{
  "child_id": 1001,
  "subject_id": 1,
  "exam_id": 1001,
  "question_content": "题目内容",
  "question_type": "选择题",
  "correct_answer": "A",
  "student_answer": "B",
  "analysis": "题目解析",
  "knowledge_points": ["分数", "运算"],
  "difficulty": "中等",
  "error_type": "概念错误",
  "images": ["错题图片URL"]
}
```

### 5.3 更新错题
```
POST /api/study/error/update
```

**请求参数：**
```json
{
  "error_id": 1001,
  "mastery_level": "基本掌握",
  "review_count": 3,
  "is_mastered": 1
}
```

### 5.4 删除错题
```
POST /api/study/error/delete
```

**请求参数：**
```json
{
  "error_id": 1001
}
```

### 5.5 错题复习
```
POST /api/study/error/review
```

**请求参数：**
```json
{
  "error_id": 1001,
  "review_result": "掌握"
}
```

---

## 6. 学习统计接口

### 6.1 获取学习概览
```
POST /api/study/statistics/overview
```

**请求参数：**
```json
{
  "child_id": 1001,
  "date": "2024-01-15"
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "today_stats": {
      "homework_completed": 3,
      "homework_total": 5,
      "exam_count": 1,
      "study_duration": 120,
      "error_questions": 2
    },
    "week_stats": {
      "homework_completion_rate": 85.5,
      "avg_score": 82.3,
      "study_duration": 600,
      "error_review_count": 8
    },
    "month_stats": {
      "homework_completion_rate": 88.2,
      "avg_score": 84.1,
      "study_duration": 2400,
      "improvement_rate": 12.5
    }
  }
}
```

### 6.2 获取学习趋势
```
POST /api/study/statistics/trend
```

**请求参数：**
```json
{
  "token": "jwt_token",
  "child_id": 1001,
  "subject_id": 1,
  "stat_type": "月",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "trend_data": [
      {
        "date": "2024-01",
        "homework_count": 45,
        "homework_completion_rate": 88.9,
        "avg_score": 82.5,
        "study_duration": 1200,
        "error_count": 15
      }
    ],
    "improvement": {
      "score_improvement": 5.2,
      "completion_improvement": 8.1,
      "time_efficiency": 12.3
    }
  }
}
```

### 6.3 获取科目分析
```
POST /api/study/statistics/subject
```

**请求参数：**
```json
{
  "child_id": 1001,
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  }
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "subject_analysis": [
      {
        "subject_id": 1,
        "subject_name": "数学",
        "homework_count": 60,
        "homework_completion_rate": 92.5,
        "exam_count": 8,
        "avg_score": 85.2,
        "error_count": 12,
        "strength": "逻辑思维强",
        "weakness": "计算速度需提高",
        "suggestion": "加强计算练习"
      }
    ],
    "ranking": {
      "best_subject": "数学",
      "worst_subject": "英语",
      "most_improved": "物理"
    }
  }
}
```

---

## 7. 科目管理接口

### 7.1 获取科目列表
```
POST /api/study/subjects/list
```

**请求参数：**
```json
{}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "subjects": [
      {
        "id": 1,
        "name": "语文",
        "code": "chinese",
        "icon_url": "图标URL",
        "sort_order": 1,
        "is_active": 1
      }
    ]
  }
}
```

---

## 8. 学习目标接口

### 8.1 获取目标列表
```
POST /api/study/goals/list
```

**请求参数：**
```json
{
  "token": "jwt_token",
  "child_id": 1001,
  "status": "进行中",
  "page": 1,
  "limit": 20
}
```

### 8.2 添加学习目标
```
POST /api/study/goals/add
```

**请求参数：**
```json
{
  "child_id": 1001,
  "subject_id": 1,
  "goal_type": "成绩目标",
  "title": "数学期末考试达到90分",
  "description": "通过系统复习和练习，提高数学成绩",
  "target_value": 90,
  "unit": "分",
  "start_date": "2024-01-01",
  "end_date": "2024-06-30",
  "priority": "高"
}
```

---

## 9. 文件上传接口

### 9.1 上传图片
```
POST /api/study/upload/image
```

**请求参数：**
```json
{
  "file": "base64编码的图片数据",
  "type": "homework"
}
```

**响应数据：**
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "图片访问URL",
    "file_id": 1001
  }
}
```

---

## 10. 批量操作接口

### 10.1 批量更新作业状态
```
POST /api/study/homework/batch-update
```

**请求参数：**
```json
{
  "homework_ids": [1001, 1002, 1003],
  "status": "已完成"
}
```

### 10.2 批量删除错题
```
POST /api/study/error/batch-delete
```

**请求参数：**
```json
{
  "error_ids": [1001, 1002, 1003]
}
```

---

## 接口调用示例

### JavaScript 调用示例
```javascript
// 获取作业列表
wx.request({
  url: 'https://your-domain.com/api/study/homework/list',
  method: 'POST',
  header: {
    token: wx.getStorageSync('token')
  },
  data: {
    child_id: 1001,
    date: '2024-01-15'
  },
  success: (res) => {
    if (res.data.code === 200) {
      console.log('作业列表:', res.data.data.homework_list);
    }
  }
});

// 添加作业
wx.request({
  url: 'https://your-domain.com/api/study/homework/add',
  method: 'POST',
  header: {
    token: wx.getStorageSync('token')
  },
  data: {
    child_id: 1001,
    subject_id: 1,
    title: '数学练习册第10页',
    description: '完成练习册第10页所有题目',
    homework_type: '课后作业',
    difficulty: '中等',
    priority: '普通',
    estimated_time: 30,
    due_date: '2024-01-15'
  },
  success: (res) => {
    if (res.data.code === 200) {
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
    }
  }
});
```

## 接口安全建议

1. **Token验证**：所有接口都需要验证用户token（已在header中自动添加）
2. **参数校验**：对输入参数进行严格校验
3. **频率限制**：对接口调用频率进行限制
4. **数据加密**：敏感数据传输时进行加密
5. **日志记录**：记录接口调用日志便于排查问题
6. **权限控制**：根据用户权限控制接口访问

## 注意事项

- **Token处理**：由于 `utils/api.js` 已自动在请求头中添加 token，前端调用时无需在请求体中重复传递
- **认证方式**：Token 通过 HTTP Header 中的 `token` 字段传递
- **请求格式**：所有接口统一使用 POST 请求，数据格式为 JSON
- **响应格式**：统一返回格式包含 code、message、data 和 timestamp 字段