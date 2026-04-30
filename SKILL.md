---
name: course-qa-system
description: |
  课程智能问答与笔记系统 v2.0。支持提问/笔记双板块、划线功能、LLM 集成、思维框架设计。
  This skill should be used when users want to add an interactive Q&A and note-taking feature to their course website.
  Triggers: "添加问答功能"、"课程提问系统"、"划线提问"、"智能答疑"、"笔记功能"
---

# 课程智能问答与笔记系统 v2.0

为静态课件添加智能问答、笔记和划线功能。

## 快速开始

### 1. 引入脚本

```html
<!-- 划线管理器（必须首先加载） -->
<script src="js/highlight-manager.js"></script>

<!-- 笔记面板 -->
<script src="js/note-panel.js"></script>

<!-- DeepSeek 提问 -->
<script src="js/floating-question-box.js"></script>
```

### 2. 使用示例

```bash
# 克隆仓库
git clone https://github.com/Tionna726/course-qa-system.git

# 复制 js/ 目录到你的课件项目
cp -r course-qa-system/js/* your-project/js/
```

## 功能特性

| 功能 | 说明 |
|------|------|
| 🖍️ 划线高亮 | 选中文字 → 右键菜单，支持三种模式 |
| 📝 笔记面板 | 独立笔记板块，按 N 键快速新建 |
| 🤖 智能提问 | 划线后右键"划线提问"，LLM 智能回答 |
| 📤 导出功能 | 笔记导出 TXT，问题导出 JSON |
| ⌨️ 快捷键 | Q 切换提问面板，N 新建笔记 |

## 思维框架设计

本 skill 内置认知方法论：

**核心命题**：在发散与收束之间重建可生长的认知结构

- **纵向拆解**：代码层 → 模块层 → 系统层 → 架构层 → 范式层
- **横向关联**：相邻概念、替代方案、依赖关系、跨域名称

## 文件结构

```
course-qa-system/
├── SKILL.md                      # Skill 定义文件
├── README.md                     # 项目说明
├── LICENSE                       # MIT 协议
├── js/
│   ├── highlight-manager.js      # 划线管理器
│   ├── note-panel.js            # 笔记面板
│   └── floating-question-box.js # 提问框
└── examples/
    └── index.html               # 示例课件
```

## LLM 配置

提问框支持接入 LLM API：

1. 点击提问框的 ⚙️ 按钮
2. 填入 API 地址、Key、模型名称
3. 推荐使用 DeepSeek（免费可用）

预设选项：
- DeepSeek: `https://api.deepseek.com/chat/completions`
- OpenAI: `https://api.openai.com/v1/chat/completions`
- OneAPI: `http://localhost:3000/v1/chat/completions`

## 注意事项

1. **脚本加载顺序**：必须先加载 `highlight-manager.js`
2. **CORS 限制**：浏览器直接调用 API 可能遇到跨域问题，建议使用代理
3. **本地存储**：所有数据保存在 localStorage，清空浏览器数据会丢失

## 技术支持

- GitHub: https://github.com/Tionna726/course-qa-system
- Issues: https://github.com/Tionna726/course-qa-system/issues
