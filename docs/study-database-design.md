# 学习模块数据库设计

## 功能模块分析

根据代码分析，学习模块包含以下核心功能：
1. **孩子管理** - 添加、编辑、删除孩子信息
2. **作业管理** - 作业记录、完成状态、图片上传
3. **考试管理** - 考试记录、成绩、错题管理
4. **统计分析** - 学习数据统计、趋势分析
5. **错题本** - 错题收集、分类管理

## 数据库建表结构

### 1. 用户表 (users)
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    openid VARCHAR(100) UNIQUE NOT NULL COMMENT '微信openid',
    unionid VARCHAR(100) COMMENT '微信unionid',
    nickname VARCHAR(50) COMMENT '昵称',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    phone VARCHAR(20) COMMENT '手机号',
    status TINYINT DEFAULT 1 COMMENT '状态：1-正常，0-禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_openid (openid),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

### 2. 孩子信息表 (children)
```sql
CREATE TABLE children (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '孩子ID',
    user_id BIGINT NOT NULL COMMENT '家长用户ID',
    name VARCHAR(50) NOT NULL COMMENT '孩子姓名',
    gender TINYINT COMMENT '性别：1-男，2-女',
    birth_date DATE COMMENT '出生日期',
    grade VARCHAR(20) COMMENT '年级',
    class VARCHAR(20) COMMENT '班级',
    school VARCHAR(100) COMMENT '学校名称',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    is_active TINYINT DEFAULT 1 COMMENT '是否激活：1-是，0-否',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='孩子信息表';
```

### 3. 科目表 (subjects)
```sql
CREATE TABLE subjects (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '科目ID',
    name VARCHAR(20) NOT NULL COMMENT '科目名称',
    code VARCHAR(10) COMMENT '科目代码',
    icon_url VARCHAR(500) COMMENT '图标URL',
    sort_order INT DEFAULT 0 COMMENT '排序',
    is_active TINYINT DEFAULT 1 COMMENT '是否激活：1-是，0-否',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_name (name),
    INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='科目表';
```

### 4. 作业表 (homework)
```sql
CREATE TABLE homework (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '作业ID',
    child_id BIGINT NOT NULL COMMENT '孩子ID',
    grade varchar(5) DEFAULT NULL COMMENT '年级',
    subject_id BIGINT NOT NULL COMMENT '科目ID',
    title VARCHAR(200) NOT NULL COMMENT '作业标题',
    description TEXT COMMENT '作业描述',
    homework_type ENUM('课后作业', '预习作业', '复习作业', '实践作业', '其他') DEFAULT '课后作业' COMMENT '作业类型',
    difficulty ENUM('简单', '中等', '困难') DEFAULT '中等' COMMENT '难度等级',
    priority ENUM('低', '普通', '高', '紧急') DEFAULT '普通' COMMENT '优先级',
    estimated_time INT COMMENT '预计用时（分钟）',
    actual_time INT COMMENT '实际用时（分钟）',
    due_date DATE COMMENT '截止日期',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    status ENUM('待完成', '进行中', '已完成', '已逾期') DEFAULT '待完成' COMMENT '作业状态',
    completion_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '完成率（%）',
    images JSON COMMENT '作业图片URLs',
    attachments JSON COMMENT '附件信息',
    remarks TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_child_id (child_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业表';
```

### 5. 考试表 (exams)
```sql
CREATE TABLE exams (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '考试ID',
    child_id BIGINT NOT NULL COMMENT '孩子ID',
    grade varchar(5) DEFAULT NULL COMMENT '年级',
    subject_id BIGINT NOT NULL COMMENT '科目ID',
    exam_name VARCHAR(100) NOT NULL COMMENT '考试名称',
    exam_type ENUM('月考', '期中考试', '期末考试', '单元测试', '模拟考试', '其他') DEFAULT '单元测试' COMMENT '考试类型',
    exam_date DATE NOT NULL COMMENT '考试日期',
    total_score DECIMAL(5,2) NOT NULL COMMENT '总分',
    score DECIMAL(5,2) NOT NULL COMMENT '得分',
    class_ranking INT COMMENT '班级排名',
    grade_ranking INT COMMENT '年级排名',
    images JSON COMMENT '试卷图片URLs',
    attachments JSON COMMENT '附件信息',
    remarks TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_child_id (child_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_exam_date (exam_date),
    INDEX idx_exam_type (exam_type),
    INDEX idx_score (score),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试表';
```

### 6. 错题表 (s_mistakes)
```sql
 错题表（s_mistakes）
CREATE TABLE `s_mistakes` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '错题ID',
  `student_id` varchar(50) COLLATE utf8mb4_bin NOT NULL COMMENT '学生ID',
  `student_name` varchar(100) COLLATE utf8mb4_bin NOT NULL COMMENT '学生姓名',
  `exam_id` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '关联的考试ID（如适用）',
  `homework_id` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '关联的作业ID（如适用）',
  `source_type` enum('exam','homework','practice') COLLATE utf8mb4_bin DEFAULT 'practice' COMMENT '来源类型：考试/作业/练习',
  `subject_id` bigint(20) NOT NULL COMMENT '科目ID（关联s_subjects.id）',
  `question_type_id` bigint(20) NOT NULL COMMENT '题型ID（关联s_question_types.id）',
  `question_content` text COLLATE utf8mb4_bin NOT NULL COMMENT '错题内容（题目原文）',
  `solution_content` text COLLATE utf8mb4_bin COMMENT '解题思路/正确答案内容',
  `solution_image` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '解题图片路径（手写解答/批注）',
  `mistake_reason_value` varchar(50) COLLATE utf8mb4_bin NOT NULL COMMENT '错题原因值（关联s_mistake_reasons.value）',
  `mistake_reason_subtype_value` varchar(50) COLLATE utf8mb4_bin NOT NULL COMMENT '错题原因子类型值（关联s_mistake_reason_subtypes.value）',
  `difficulty` varchar(20) COLLATE utf8mb4_bin DEFAULT 'medium' COMMENT '难度等级：easy/medium/hard',
  `mastery_level` varchar(20) COLLATE utf8mb4_bin DEFAULT 'not_mastered' COMMENT '掌握程度：not_mastered/partially_mastered/mastered',
  `record_date` date NOT NULL COMMENT '记录日期',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_student` (`student_id`),
  KEY `idx_subject` (`subject_id`),
  KEY `idx_question_type` (`question_type_id`),
  KEY `idx_mistake_reason` (`mistake_reason_value`,`mistake_reason_subtype_value`),
  KEY `idx_source` (`source_type`,`exam_id`,`homework_id`),
  KEY `idx_date` (`record_date`),
  KEY `idx_mastery` (`mastery_level`),
  KEY `fk_mistakes_reason_subtype` (`mistake_reason_subtype_value`),
  CONSTRAINT `fk_mistakes_question_type` FOREIGN KEY (`question_type_id`) REFERENCES `s_question_types` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_mistakes_reason` FOREIGN KEY (`mistake_reason_value`) REFERENCES `s_mistake_reasons` (`value`) ON UPDATE CASCADE,
  CONSTRAINT `fk_mistakes_reason_subtype` FOREIGN KEY (`mistake_reason_subtype_value`) REFERENCES `s_mistake_reason_subtypes` (`value`) ON UPDATE CASCADE,
  CONSTRAINT `fk_mistakes_subject` FOREIGN KEY (`subject_id`) REFERENCES `s_subjects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='精简版错题记录表';
```
-- 5. 错题表 (s_mistake_reasons)
CREATE TABLE s_mistake_reasons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  value VARCHAR(50) NOT NULL COMMENT '枚举值',
  label VARCHAR(100) NOT NULL COMMENT '显示标签',
  category VARCHAR(50) NOT NULL COMMENT '分类',
  description TEXT COMMENT '详细描述',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_value (value)
) COMMENT='错题原因枚举表';

--6. 错题原因数据初始化（s_mistake_reasons）
INSERT INTO s_mistake_reasons (value, label, category, description, sort_order) VALUES
('understanding', '理解错误', '理解类', '题意理解不准确，概念理解有偏差', 1),
('calculation', '计算错误', '计算类', '计算过程出现失误', 2),
('carelessness', '粗心大意', '粗心类', '因疏忽导致的错误', 3),
('method', '方法不当', '方法类', '解题思路或方法选择不当', 4),
('memory', '记忆错误', '记忆类', '知识点记忆不准确或遗忘', 5),
('reading', '读题问题', '读题类', '题目阅读理解问题', 6),
('other', '其他原因', '其他类', '其他类型的错误原因', 7);

--7. 错题原因子类型表 (s_mistake_reason_subtypes)
CREATE TABLE `s_mistake_reason_subtypes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reason_value` varchar(50) COLLATE utf8mb4_bin NOT NULL COMMENT '关联的主原因值',
  `value` varchar(50) COLLATE utf8mb4_bin NOT NULL COMMENT '子类型枚举值',
  `label` varchar(100) COLLATE utf8mb4_bin NOT NULL COMMENT '子类型显示标签',
  `sort_order` int(11) DEFAULT '0' COMMENT '排序',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reason_value` (`reason_value`,`value`),
  UNIQUE KEY `uk_subtype_value` (`value`),
  CONSTRAINT `s_mistake_reason_subtypes_ibfk_1` FOREIGN KEY (`reason_value`) REFERENCES `s_mistake_reasons` (`value`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='错题原因子类型表';

-- 错题原因子类型数据初始化
INSERT INTO s_mistake_reason_subtypes (reason_value, value, label, sort_order) VALUES
-- 理解类子类型
('understanding', 'meaning_error', '题意理解错误', 1),
('understanding', 'concept_confusion', '概念理解不清', 2),
('understanding', 'knowledge_mix', '知识点混淆', 3),
('understanding', 'logic_error', '逻辑关系错误', 4),

-- 计算类子类型
('calculation', 'basic_calc', '基本计算错误', 1),
('calculation', 'step_missing', '步骤遗漏', 2),
('calculation', 'formula_error', '公式应用错误', 3),
('calculation', 'unit_error', '单位换算错误', 4),

-- 粗心类子类型
('carelessness', 'misread', '看错题目', 1),
('carelessness', 'wrong_answer', '写错答案', 2),
('carelessness', 'miss_question', '漏题跳题', 3),
('carelessness', 'copy_error', '抄写错误', 4),

-- 方法类子类型
('method', 'wrong_approach', '解题思路错误', 1),
('method', 'poor_strategy', '方法选择不当', 2),
('method', 'unreasonable', '策略不合理', 3),
('method', 'incomplete_steps', '步骤不完整', 4),

-- 记忆类子类型
('memory', 'wrong_memory', '单词/公式记错', 1),
('memory', 'forgotten', '知识点遗忘', 2),
('memory', 'weak_basic', '基础不牢固', 3),
('memory', 'confused', '记忆混淆', 4),

-- 读题类子类型
('reading', 'miss_condition', '漏读条件', 1),
('reading', 'misunderstand', '误解题意', 2),
('reading', 'ignore_limit', '忽略限制', 3),
('reading', 'careless_read', '审题不仔细', 4),

-- 其他类子类型
('other', 'time_management', '时间管理不当', 1),
('other', 'mental_state', '心态影响', 2),
('other', 'environment', '环境干扰', 3),
('other', 'miscellaneous', '其他', 4);

--8. 题目类型表 (s_question_types)
-- 题目类型表（关联科目）
CREATE TABLE `s_question_types` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `subject_id` bigint(20) NOT NULL COMMENT '关联科目序号（关联subjects.id）',
  `type_code` varchar(50) NOT NULL COMMENT '题型编码（唯一）',
  `type_name` varchar(20) NOT NULL COMMENT '题型名称',
  `description` varchar(200) DEFAULT '' COMMENT '题型说明',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subject_type` (`subject_id`,`type_code`),
  CONSTRAINT `fk_question_type_subject` FOREIGN KEY (`subject_id`) REFERENCES `s_subjects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='各科目题目类型表';

-- 第二步：初始化语文题型（subject_id=1）
INSERT INTO `s_question_types` (`subject_id`, `type_code`, `type_name`, `description`) 
VALUES
(1, 'chinese_single_choice', '单选题', '考查字音、字形、词语、病句、标点、文学常识等基础知识点，四选一'),
(1, 'chinese_multiple_choice', '多选题', '考查现代文/文言文阅读理解、文学鉴赏等，多选/漏选均不得分'),
(1, 'chinese_fill_blank', '填空题', '包括古诗文默写、词语填空、句子补写等，侧重基础积累'),
(1, 'chinese_cloze', '语用填空（完形）', '语段型语用补全，考查语境理解、词语运用、句式衔接'),
(1, 'chinese_read_modern', '现代文阅读题', '分记叙文/议论文/说明文阅读，含概括、赏析、理解、探究类子问题'),
(1, 'chinese_read_classic', '文言文阅读题', '含断句、字词释义、句子翻译、内容理解、主旨分析等子问题'),
(1, 'chinese_read_poetry', '古诗词/曲鉴赏题', '考查意象、手法、情感、炼字、主旨等鉴赏要点'),
(1, 'chinese_sentence_modify', '病句修改题', '识别并修改语序不当、搭配不当、成分残缺等病句'),
(1, 'chinese_writing_small', '小作文/应用文', '包括书信、通知、倡议书、短评等，考查格式和语言表达'),
(1, 'chinese_writing_big', '大作文（议论文/记叙文）', '给定主题/材料，考查立意、结构、语言表达能力'),
(1, 'chinese_word_explain', '字词解释题', '单独考查文言实词/虚词、现代文重点词语的含义');

-- 第三步：初始化数学题型（subject_id=2）
INSERT INTO `s_question_types` (`subject_id`, `type_code`, `type_name`, `description`) 
VALUES
(2, 'math_single_choice', '单选题', '代数、几何、概率等知识点，四选一，侧重基础运算和概念辨析'),
(2, 'math_multiple_choice', '多选题', '考查综合知识点，多选/漏选/错选均有评分规则（如部分对得部分分）'),
(2, 'math_fill_blank', '填空题', '含直接填空、开放型填空，侧重计算结果，部分需写解题关键步骤'),
(2, 'math_fill_blank_with_process', '解答型填空', '填空题但需写出核心解题步骤，按步骤给分'),
(2, 'math_calculation', '计算题', '纯运算类题目（如解方程、求导、积分、几何计算），按步骤给分'),
(2, 'math_proof', '证明题', '几何证明、代数证明等，需严谨推导逻辑，按证明步骤给分'),
(2, 'math_application', '应用题', '结合实际场景（行程、利润、几何应用等），考查建模和解题能力'),
(2, 'math_exploration', '探究题', '开放型题目，考查规律总结、逻辑推理、创新思维'),
(2, 'math_graph_analysis', '图形分析题', '函数图像、几何图形的解读、绘制、分析，含读图、画图、析图子问题');

-- 第四步：初始化英语题型（subject_id=3）
INSERT INTO `s_question_types` (`subject_id`, `type_code`, `type_name`, `description`) 
VALUES
(3, 'english_single_choice', '单选题', '考查语法、词汇、固定搭配、情景交际，四选一'),
(3, 'english_multiple_choice', '多选题', '考查词汇辨析、语篇理解，多选/漏选不得分'),
(3, 'english_cloze', '完形填空', '短文型完形，考查词汇、语法、语境理解，分四选一型/自由填空型'),
(3, 'english_reading', '阅读理解题', '分记叙文/说明文/议论文/应用文阅读，含细节题、主旨题、推理题、词义猜测题等子题型'),
(3, 'english_reading_skimming', '快速阅读题', '侧重信息检索能力，短时间内提取关键信息'),
(3, 'english_listening_choice', '听力选择题', '短对话/长对话/独白听力，四选一作答'),
(3, 'english_listening_fill', '听力填空题', '听力材料中提取单词/短语/句子填空，考查精准捕捉信息能力'),
(3, 'english_sentence_translate', '句子翻译题', '汉译英/英译汉，考查词汇、语法、句式表达'),
(3, 'english_passage_translate', '篇章翻译题', '小语段翻译，考查语境理解和流畅表达'),
(3, 'english_error_correction', '改错题', '单句/短文改错题，考查语法、拼写、用词错误识别和修正'),
(3, 'english_writing_small', '小作文（应用文）', '书信、邮件、通知、倡议书等，考查格式和基础表达'),
(3, 'english_writing_big', '大作文（议论文/记叙文）', '给定话题/图表，考查逻辑结构和语言表达能力'),
(3, 'english_word_spelling', '单词拼写题', '听音写词/根据句意写词，考查词汇掌握'),
(3, 'english_phrasal_verb', '短语运用题', '单独考查短语搭配、固定表达的使用');

-- 第五步：初始化物理题型（subject_id=4）
INSERT INTO `s_question_types` (`subject_id`, `type_code`, `type_name`, `description`) 
VALUES
(4, 'physics_single_choice', '单选题', '力学、热学、电磁学、光学等基础知识点，四选一'),
(4, 'physics_multiple_choice', '多选题', '考查综合知识点，多选/漏选/错选按规则评分'),
(4, 'physics_fill_blank', '填空题', '概念填空、公式填空、计算结果填空，侧重基础积累和运算'),
(4, 'physics_calculation', '计算题', '结合公式和实际场景计算（如受力分析、电路计算、能量守恒），按步骤给分'),
(4, 'physics_experiment', '实验题', '含实验原理、步骤、现象、数据处理、误差分析，分填空/问答/设计型'),
(4, 'physics_experiment_design', '实验设计题', '自主设计实验方案，考查实验思路和创新能力'),
(4, 'physics_analysis', '分析论述题', '对物理现象、原理进行分析说明，考查逻辑表达和原理应用'),
(4, 'physics_graph_analysis', '图像分析题', '运动图像、电场图像、电路图像等的解读和分析');

-- 第六步：初始化化学题型（subject_id=5）
INSERT INTO `s_question_types` (`subject_id`, `type_code`, `type_name`, `description`) 
VALUES
(5, 'chemistry_single_choice', '单选题', '元素、化合物、反应原理、实验等基础知识点，四选一'),
(5, 'chemistry_multiple_choice', '多选题', '考查综合知识点，多选/漏选/错选按规则评分'),
(5, 'chemistry_fill_blank', '填空题', '化学用语（方程式、电子式）、概念、计算结果填空'),
(5, 'chemistry_equation_write', '化学方程式书写题', '考查化学方程式、离子方程式、电极反应式的书写（含配平）'),
(5, 'chemistry_calculation', '计算题', '物质的量、浓度、产率、反应热等计算，按步骤给分'),
(5, 'chemistry_experiment', '实验题', '实验操作、现象、结论、误差分析，分填空/问答/设计型'),
(5, 'chemistry_experiment_design', '实验设计题', '设计实验验证假设、分离提纯方案等，考查实验创新能力'),
(5, 'chemistry_industrial_analysis', '工业流程题', '分析工业制备流程，考查反应原理、除杂、条件控制等'),
(5, 'chemistry_inorganic_analysis', '无机推断题', '基于物质性质、反应现象推断物质种类，考查知识综合应用'),
(5, 'chemistry_organic_analysis', '有机推断题', '基于官能团、反应类型推断有机物结构，考查有机化学核心知识点');

-- 第七步：初始化生物题型（subject_id=6）
INSERT INTO `s_question_types` (`subject_id`, `type_code`, `type_name`, `description`) 
VALUES
(6, 'biology_single_choice', '单选题', '细胞、代谢、遗传、生态等基础知识点，四选一'),
(6, 'biology_multiple_choice', '多选题', '考查综合知识点，多选/漏选/错选按规则评分'),
(6, 'biology_fill_blank', '填空题', '概念、结构、过程、实验数据等填空，侧重基础积累'),
(6, 'biology_experiment', '实验题', '实验原理、步骤、现象、结论、误差分析，分填空/问答/设计型'),
(6, 'biology_experiment_design', '实验设计题', '设计实验验证生物学假设，考查实验思路和变量控制'),
(6, 'biology_analysis', '分析论述题', '对生命现象、生理过程、生态问题进行分析说明，考查逻辑表达'),
(6, 'biology_graph_analysis', '图像分析题', '细胞分裂图、物质跨膜图、生态曲线图等的解读和分析'),
(6, 'biology_genetic_calculation', '遗传计算题', '基因频率、概率、遗传规律相关计算，按步骤给分'),
(6, 'biology_case_analysis', '案例分析题', '结合实际生物案例（如疾病、生态修复），考查知识应用能力');

-- 第八步：初始化历史题型（subject_id=7）
INSERT INTO `s_question_types` (`subject_id`, `type_code`, `type_name`, `description`) 
VALUES
(7, 'history_single_choice', '单选题', '史实、时间、人物、制度等基础知识点，四选一'),
(7, 'history_multiple_choice', '多选题', '考查历史事件背景、影响、评价，多选/漏选/错选按规则评分'),
(7, 'history_fill_blank', '填空题', '史实、时间、文献名句、制度名称等填空'),
(7, 'history_material_analysis', '材料分析题', '结合文字/图片/图表材料，分析背景、原因、影响、评价，分问答/论述子题型'),
(7, 'history_argumentative', '论述题', '给定观点/主题，结合史实论证，考查逻辑和史料应用能力'),
(7, 'history_comparative', '比较题', '对比不同历史事件、人物、制度，分析异同点和本质'),
(7, 'history_inference', '推理题', '基于史实和材料，推理历史发展趋势、人物行为动机等'),
(7, 'history_map_analysis', '地图分析题', '结合历史地图（疆域、战役、贸易路线），分析地理与历史的关联');

-- 第九步：初始化地理题型（subject_id=8）
INSERT INTO `s_question_types` (`subject_id`, `type_code`, `type_name`, `description`) 
VALUES
(8, 'geography_single_choice', '单选题', '自然地理、人文地理、区域地理基础知识点，四选一'),
(8, 'geography_multiple_choice', '多选题', '考查综合知识点（如气候+地形+农业），多选/漏选/错选按规则评分'),
(8, 'geography_fill_blank', '填空题', '地理概念、数据、地名、规律等填空'),
(8, 'geography_map_analysis', '地图分析题', '地形图、气候图、政区图、等值线图等的解读、绘图、分析'),
(8, 'geography_case_analysis', '案例分析题', '结合区域发展、生态问题、自然灾害等案例，分析原因、措施、影响'),
(8, 'geography_comprehensive', '综合题', '跨模块考查（自然+人文+区域），含填空、问答、论述子题型'),
(8, 'geography_calculation', '计算题', '经纬度、海拔、气温、人口增长率、比例尺等计算'),
(8, 'geography_policy_analysis', '政策分析题', '分析地理相关政策（如乡村振兴、碳中和）的地理背景和影响');

-- 第十步：初始化政治题型（subject_id=9）
INSERT INTO `s_question_types` (`subject_id`, `type_code`, `type_name`, `description`) 
VALUES
(9, 'politics_single_choice', '单选题', '经济、政治、文化、哲学基础知识点，四选一'),
(9, 'politics_multiple_choice', '多选题', '考查综合知识点，多选/漏选/错选按规则评分'),
(9, 'politics_fill_blank', '填空题', '概念、原理、政策表述等填空'),
(9, 'politics_material_analysis', '材料分析题', '结合时政、社会现象材料，分析体现的政治/经济/文化/哲学原理，分问答/论述子题型'),
(9, 'politics_argumentative', '论述题', '给定观点/主题，结合原理和实际论证，考查逻辑和应用能力'),
(9, 'politics_judgment', '判断题', '判断观点/表述是否符合原理，部分需说明理由'),
(9, 'politics_policy_interpretation', '政策解读题', '解读时政政策（如两会政策、中央文件），分析其理论依据和现实意义'),
(9, 'politics_case_analysis', '案例分析题', '结合社会热点案例，分析背后的政治/经济/文化逻辑');

### 7. 学习记录表 (study_records)
```sql
CREATE TABLE study_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    child_id BIGINT NOT NULL COMMENT '孩子ID',
    subject_id BIGINT NOT NULL COMMENT '科目ID',
    record_type ENUM('作业', '考试', '复习', '预习', '其他') DEFAULT '作业' COMMENT '记录类型',
    record_date DATE NOT NULL COMMENT '学习日期',
    duration INT COMMENT '学习时长（分钟）',
    content TEXT COMMENT '学习内容',
    achievement TEXT COMMENT '学习成果',
    difficulty ENUM('简单', '中等', '困难') DEFAULT '中等' COMMENT '难度等级',
    mood ENUM('很好', '好', '一般', '差', '很差') DEFAULT '一般' COMMENT '学习心情',
    images JSON COMMENT '相关图片URLs',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_child_id (child_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_record_date (record_date),
    INDEX idx_record_type (record_type),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习记录表';
```

### 8. 学习目标表 (study_goals)
```sql
CREATE TABLE study_goals (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '目标ID',
    child_id BIGINT NOT NULL COMMENT '孩子ID',
    subject_id BIGINT COMMENT '科目ID',
    goal_type ENUM('成绩目标', '作业完成率', '学习时长', '错题掌握', '其他') DEFAULT '成绩目标' COMMENT '目标类型',
    title VARCHAR(200) NOT NULL COMMENT '目标标题',
    description TEXT COMMENT '目标描述',
    target_value DECIMAL(10,2) COMMENT '目标值',
    current_value DECIMAL(10,2) DEFAULT 0.00 COMMENT '当前值',
    unit VARCHAR(20) COMMENT '单位',
    start_date DATE NOT NULL COMMENT '开始日期',
    end_date DATE NOT NULL COMMENT '结束日期',
    status ENUM('进行中', '已完成', '已暂停', '已取消') DEFAULT '进行中' COMMENT '目标状态',
    priority ENUM('低', '普通', '高', '紧急') DEFAULT '普通' COMMENT '优先级',
    completion_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '完成率（%）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_child_id (child_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_status (status),
    INDEX idx_end_date (end_date),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习目标表';
```

### 9. 学习统计表 (study_statistics)
```sql
CREATE TABLE study_statistics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '统计ID',
    child_id BIGINT NOT NULL COMMENT '孩子ID',
    subject_id BIGINT COMMENT '科目ID',
    stat_date DATE NOT NULL COMMENT '统计日期',
    stat_type ENUM('日', '周', '月', '学期', '年') DEFAULT '日' COMMENT '统计类型',
    homework_count INT DEFAULT 0 COMMENT '作业数量',
    homework_completed INT DEFAULT 0 COMMENT '作业完成数',
    homework_duration INT DEFAULT 0 COMMENT '作业总时长（分钟）',
    exam_count INT DEFAULT 0 COMMENT '考试数量',
    exam_avg_score DECIMAL(5,2) DEFAULT 0.00 COMMENT '考试平均分',
    error_question_count INT DEFAULT 0 COMMENT '错题数量',
    study_duration INT DEFAULT 0 COMMENT '学习总时长（分钟）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_child_subject_date_type (child_id, subject_id, stat_date, stat_type),
    INDEX idx_child_id (child_id),
    INDEX idx_stat_date (stat_date),
    INDEX idx_stat_type (stat_type),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习统计表';
```

## 数据库初始化

### 科目初始数据
```sql
INSERT INTO subjects (name, code, sort_order) VALUES
('语文', 'chinese', 1),
('数学', 'math', 2),
('英语', 'english', 3),
('物理', 'physics', 4),
('化学', 'chemistry', 5),
('生物', 'biology', 6),
('历史', 'history', 7),
('地理', 'geography', 8),
('政治', 'politics', 9);
```

## 索引优化建议

1. **复合索引**：
   ```sql
   -- 作业查询优化
   CREATE INDEX idx_homework_child_status_date ON homework(child_id, status, due_date);
   
   -- 考试查询优化
   CREATE INDEX idx_exam_child_date_type ON exams(child_id, exam_date, exam_type);
   
   -- 错题查询优化
   CREATE INDEX idx_error_child_subject_mastery ON error_questions(child_id, subject_id, is_mastered);
   ```

2. **分区表**（大数据量时）：
   ```sql
   -- 按月分区学习记录表
   ALTER TABLE study_records PARTITION BY RANGE (YEAR(record_date) * 100 + MONTH(record_date)) (
       PARTITION p202401 VALUES LESS THAN (202402),
       PARTITION p202402 VALUES LESS THAN (202403),
       -- ... 更多分区
   );
   ```

## 数据库设计特点

1. **多对多关系**：通过外键关联实现数据完整性
2. **JSON字段**：存储图片、附件等灵活数据
3. **枚举类型**：规范数据输入，提高查询效率
4. **索引优化**：针对常用查询场景建立索引
5. **软删除**：通过status字段实现软删除
6. **时间戳**：记录创建和更新时间
7. **级联删除**：保证数据一致性