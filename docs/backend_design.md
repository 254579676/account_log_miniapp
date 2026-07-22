# 后端接口和数据库设计文档

## 1. 数据库表设计

### 1.1 用户表 (users)
存储用户基本信息

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|-----|-----|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 用户ID |
| openid | VARCHAR(64) | UNIQUE, NOT NULL | 微信openid |
| nickname | VARCHAR(64) |  | 用户昵称 |
| avatar_url | VARCHAR(255) |  | 用户头像URL |
| gender | TINYINT | DEFAULT 0 | 性别：0未知，1男，2女 |
| country | VARCHAR(64) |  | 国家 |
| province | VARCHAR(64) |  | 省份 |
| city | VARCHAR(64) |  | 城市 |
| language | VARCHAR(32) |  | 语言 |
| create_time | DATETIME | NOT NULL | 创建时间 |
| update_time | DATETIME | NOT NULL | 更新时间 |

### 1.2 分类表 (categories)
存储收支分类信息

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|-----|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 分类ID |
| name | VARCHAR(32) | NOT NULL | 分类名称 |
| icon | VARCHAR(64) | NOT NULL | 分类图标 |
| type | ENUM('expense', 'income') | NOT NULL | 分类类型：支出/收入 |
| user_id | BIGINT |  | 用户ID，为空表示系统默认分类 |
| sort_order | INT | DEFAULT 0 | 排序 |
| is_active | TINYINT | DEFAULT 1 | 是否启用：0否，1是 |
| create_time | DATETIME | NOT NULL | 创建时间 |
| update_time | DATETIME | NOT NULL | 更新时间 |

### 1.3 交易记录表 (transactions)
存储用户收支记录

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|-----|-----|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 交易ID |
| user_id | BIGINT | NOT NULL | 用户ID |
| type | ENUM('expense', 'income') | NOT NULL | 交易类型：支出/收入 |
| category_id | INT | NOT NULL | 分类ID |
| amount | DECIMAL(10,2) | NOT NULL | 金额 |
| description | VARCHAR(255) |  | 描述 |
| date | DATE | NOT NULL | 交易日期 |
| create_time | DATETIME | NOT NULL | 创建时间 |
| update_time | DATETIME | NOT NULL | 更新时间 |

### 1.4 预算表 (budgets)
存储用户预算设置

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|-----|-----|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 预算ID |
| user_id | BIGINT | NOT NULL | 用户ID |
| category_id | INT | NOT NULL | 分类ID |
| amount | DECIMAL(10,2) | NOT NULL | 预算金额 |
| period_type | ENUM('daily', 'weekly', 'monthly', 'yearly') | NOT NULL | 周期类型 |
| start_date | DATE | NOT NULL | 开始日期 |
| end_date | DATE |  | 结束日期 |
| is_active | TINYINT | DEFAULT 1 | 是否启用：0否，1是 |
| create_time | DATETIME | NOT NULL | 创建时间 |
| update_time | DATETIME | NOT NULL | 更新时间 |

### 1.5 统计数据表 (statistics)
存储预计算的统计数据，提高查询性能

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|-----|-----|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 统计ID |
| user_id | BIGINT | NOT NULL | 用户ID |
| stat_date | DATE | NOT NULL | 统计日期 |
| stat_type | VARCHAR(32) | NOT NULL | 统计类型（daily/monthly/yearly） |
| expense_total | DECIMAL(12,2) | DEFAULT 0 | 支出总额 |
| income_total | DECIMAL(12,2) | DEFAULT 0 | 收入总额 |
| category_stats | JSON |  | 分类统计详情 |
| create_time | DATETIME | NOT NULL | 创建时间 |
| update_time | DATETIME | NOT NULL | 更新时间 |

## 2. 后端接口设计

### 2.1 用户相关接口

#### 获取用户信息
- **接口地址**: `GET /api/users/profile`
- **请求参数**: 无
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1,
      "nickname": "张三",
      "avatar_url": "https://example.com/avatar.jpg",
      "create_time": "2023-01-01 12:00:00"
    }
  }
  ```

#### 更新用户信息
- **接口地址**: `POST /api/users/profile`
- **请求参数**:
  ```json
  {
    "nickname": "张三",
    "avatar_url": "https://example.com/avatar.jpg"
  }
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {}
  }
  ```

### 2.2 分类相关接口

#### 获取分类列表
- **接口地址**: `GET /api/categories`
- **请求参数**:
  ```
  type: expense|income|all (可选，默认all)
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
        "id": 1,
        "name": "餐饮",
        "icon": "utensils",
        "type": "expense"
      }
    ]
  }
  ```

#### 创建分类
- **接口地址**: `POST /api/categories`
- **请求参数**:
  ```json
  {
    "name": "餐饮",
    "icon": "utensils",
    "type": "expense"
  }
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1,
      "name": "餐饮",
      "icon": "utensils",
      "type": "expense"
    }
  }
  ```

#### 更新分类
- **接口地址**: `PUT /api/categories/{id}`
- **请求参数**:
  ```json
  {
    "name": "餐饮",
    "icon": "utensils"
  }
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {}
  }
  ```

#### 删除分类
- **接口地址**: `DELETE /api/categories/{id}`
- **请求参数**: 无
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {}
  }
  ```

### 2.3 交易记录相关接口

#### 获取交易记录列表
- **接口地址**: `GET /api/transactions`
- **请求参数**:
  ```
  page: 1 (可选，默认1)
  page_size: 20 (可选，默认20)
  type: expense|income|all (可选，默认all)
  category_id: 1 (可选)
  start_date: 2023-01-01 (可选)
  end_date: 2023-12-31 (可选)
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "list": [
        {
          "id": 1,
          "type": "expense",
          "category_id": 1,
          "amount": 35.50,
          "description": "午餐",
          "date": "2023-06-01"
        }
      ],
      "pagination": {
        "page": 1,
        "page_size": 20,
        "total": 100
      }
    }
  }
  ```

#### 创建交易记录
- **接口地址**: `POST /api/transactions`
- **请求参数**:
  ```json
  {
    "type": "expense",
    "category_id": 1,
    "amount": 35.50,
    "description": "午餐",
    "date": "2023-06-01"
  }
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1
    }
  }
  ```

#### 更新交易记录
- **接口地址**: `PUT /api/transactions/{id}`
- **请求参数**:
  ```json
  {
    "category_id": 1,
    "amount": 35.50,
    "description": "午餐",
    "date": "2023-06-01"
  }
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {}
  }
  ```

#### 删除交易记录
- **接口地址**: `DELETE /api/transactions/{id}`
- **请求参数**: 无
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {}
  }
  ```

### 2.4 预算相关接口

#### 获取预算列表
- **接口地址**: `GET /api/budgets`
- **请求参数**:
  ```
  year: 2023 (可选)
  month: 6 (可选)
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
        "id": 1,
        "category_id": 1,
        "amount": 1000.00,
        "period_type": "monthly",
        "start_date": "2023-06-01",
        "end_date": "2023-06-30"
      }
    ]
  }
  ```

#### 创建预算
- **接口地址**: `POST /api/budgets`
- **请求参数**:
  ```json
  {
    "category_id": 1,
    "amount": 1000.00,
    "period_type": "monthly",
    "start_date": "2023-06-01",
    "end_date": "2023-06-30"
  }
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1
    }
  }
  ```

#### 更新预算
- **接口地址**: `PUT /api/budgets/{id}`
- **请求参数**:
  ```json
  {
    "amount": 1000.00,
    "start_date": "2023-06-01",
    "end_date": "2023-06-30"
  }
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {}
  }
  ```

#### 删除预算
- **接口地址**: `DELETE /api/budgets/{id}`
- **请求参数**: 无
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {}
  }
  ```

### 2.5 统计相关接口

#### 获取统计数据
- **接口地址**: `GET /api/statistics`
- **请求参数**:
  ```
  type: daily|monthly|yearly (可选，默认monthly)
  start_date: 2023-01-01 (可选)
  end_date: 2023-12-31 (可选)
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "total_income": 5000.00,
      "total_expense": 3000.00,
      "category_stats": [
        {
          "category_id": 1,
          "category_name": "餐饮",
          "amount": 500.00,
          "percentage": 16.67
        }
      ],
      "monthly_trend": [
        {
          "month": "2023-01",
          "income": 5000.00,
          "expense": 3000.00
        }
      ]
    }
  }
  ```

#### 获取首页统计数据
- **接口地址**: `GET /api/statistics/dashboard`
- **请求参数**:
  ```
  year: 2023 (可选，默认当前年)
  month: 6 (可选，默认当前月)
  ```
- **返回数据**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "monthly_income": 5000.00,
      "monthly_expense": 3000.00,
      "monthly_balance": 2000.00,
      "budget_usage": [
        {
          "category_id": 1,
          "category_name": "餐饮",
          "budget_amount": 1000.00,
          "expense_amount": 500.00,
          "percentage": 50.00
        }
      ]
    }
  }
  ```

## 3. 接口调用示例

### 3.1 微信登录流程
1. 前端调用微信登录接口获取code
2. 前端将code发送到后端 `/api/auth/login` 接口
3. 后端通过code向微信服务器换取openid和session_key
4. 后端根据openid查找或创建用户
5. 后端生成自定义登录态token返回给前端

### 3.2 数据同步流程
1. 用户打开小程序时，前端从后端同步用户数据（分类、交易记录、预算等）
2. 用户在本地进行操作（新增/修改/删除记录）
3. 前端定期或在适当时候将本地变更同步到后端

## 4. 安全和性能考虑

### 4.1 安全性
- 使用HTTPS协议传输数据
- 用户敏感信息加密存储
- 接口访问权限控制
- 防止SQL注入和XSS攻击
- 对接口访问频率进行限制

### 4.2 性能优化
- 数据库查询添加适当索引
- 复杂统计结果进行缓存
- 分页查询避免一次性加载大量数据
- 图片资源使用CDN加速
- 接口响应数据按需返回，避免冗余信息