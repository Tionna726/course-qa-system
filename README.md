# 🎓 Course QA System v2.0

**课程智能问答与笔记系统** - 为静态课件网站添加智能问答、笔记和划线功能。

> 核心理念：**先诊断再设计**，让课件真正解决用户问题。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Tionna726/course-qa-system?style=social)](https://github.com/Tionna726/course-qa-system)

---

## ✨ 特性

### 🎯 三大核心模块

| 模块 | 功能 | 快捷键 |
|------|------|--------|
| **划线管理器** | 选中文字划线、全文检索、本地存储 | 选中文字+右键 |
| **笔记面板** | 独立笔记板块、标签分类、导出 | `N` |
| **DeepSeek 提问** | 划线提问、专家视角回答、问题导出 | `Q` |

### 🧠 思维框架设计方法论

不仅仅是工具，更是一套**课程设计方法论**：

- **纵向拆解**：代码层 → 模块层 → 系统层 → 架构层 → 范式层
- **横向关联**：相邻概念、替代方案、依赖关系、跨域名称
- **顶层思维**：在发散与收束之间重建可生长的认知结构

---

## 🚀 快速开始

### 安装到 CodeBuddy

1. 克隆仓库到本地：
```bash
git clone https://github.com/Tionna726/course-qa-system.git
```

2. 复制 `SKILL.md` 和 `js/` 目录到 CodeBuddy skills 目录：
```bash
# Windows
mkdir "%USERPROFILE%\.codebuddy\skills\course-qa-system"
copy SKILL.md "%USERPROFILE%\.codebuddy\skills\course-qa-system\"
xcopy /E js "%USERPROFILE%\.codebuddy\skills\course-qa-system\scripts\"
```

### 在网页中使用

1. 复制 `js/` 目录到你的项目：
```bash
cp -r js/* your-project/js/
```

2. 在 HTML 中引入脚本：
```html
<!-- 划线管理器（必须首先加载） -->
<script src="js/highlight-manager.js"></script>

<!-- 笔记面板 -->
<script src="js/note-panel.js"></script>

<!-- DeepSeek 提问 -->
<script src="js/floating-question-box.js"></script>
```

3. 查看 `examples/index.html` 获取完整示例。

---

## 📚 课程设计方法论

### 核心命题

> **顶层思维 ≠ 站位高、看大局**
>
> 顶层思维 = **在发散与收束之间重建可生长的认知结构**
>
> 具体表现：面对问题时能立刻判断：
> - 我现在卡在哪一层？
> - 是细节不会、结构混乱，还是抽象层级本身错了？

### 设计流程

```
用户需求 → 问题诊断 → 思维框架 → 课件内容 → 划线落地
```

### AI 学习方法论

**反对**：让 AI 用「小白口吻」解释
- 类比是**拐杖**，不是**骨骼**
- 会让你舒服，但不让你成长

**推荐**：专家视角 Prompt

```
请用专家视角解释 [概念]，保留关键术语。

请按以下结构回答：
1. 这个概念位于哪个**抽象层级**？
2. 它**横向关联**哪些概念？
3. 我应该继续深挖哪些**关键词**？
```

---

## 📂 文件结构

```
course-qa-system/
├── SKILL.md                      # Skill 定义文件（CodeBuddy 用）
├── README.md                     # 项目说明
├── LICENSE                       # MIT 协议
├── js/                          # JavaScript 模块
│   ├── highlight-manager.js     # 划线管理器
│   ├── note-panel.js            # 笔记面板
│   └── floating-question-box.js # 提问框
└── examples/                    # 示例代码
    └── index.html               # 示例课件
```

---

## 🎯 使用场景

### 场景 1：教师创建智能课件

1. 使用本 skill 的思维框架设计课程
2. 创建课件 HTML 文件
3. 引入三大脚本模块
4. 学员可使用划线、笔记、提问功能

### 场景 2：学员使用课件学习

1. 选中文字 → 右键 → 划线高亮
2. 按 `N` 打开笔记面板记录心得
3. 按 `Q` 打开提问框向 AI 提问
4. 所有数据保存在本地，随时查看

---

## 🔧 LLM 配置

提问框支持接入 LLM API：

1. 点击提问框的 ⚙️ 按钮
2. 填入 API 地址、Key、模型名称
3. 推荐使用 DeepSeek（免费可用）

**预设选项**：
- **DeepSeek**: `https://api.deepseek.com/chat/completions`
- **OpenAI**: `https://api.openai.com/v1/chat/completions`
- **OneAPI**: `http://localhost:3000/v1/chat/completions`

**注意**：浏览器直接调用 API 可能遇到 CORS 跨域问题，建议使用代理服务。

---

## 🛠️ 技术栈

- **前端**：原生 JavaScript（无框架依赖）
- **存储**：localStorage（本地持久化）
- **样式**：内联 CSS（可自定义）
- **AI**：DeepSeek API（可替换为其他 LLM）

---

## 📖 思维框架设计示例

以 "Banana Slides LLM 配置" 为例：

```
【顶层抽象】
API 请求适配器模式 —— 同一接口，多后端实现

【纵向拆解】
代码层：Settings.tsx（前端表单）
模块层：LAZYLLM_SOURCES、ALLOWED_LAZYLLM_VENDORS
系统层：Provider Format 系统（gemini/openai/lazyllm）
架构层：API 请求适配层（统一接口，多后端实现）
范式层：配置覆盖优先级范式

【横向关联】
api_key ← → base_url（必须匹配）
Provider Format ← → 中转站格式（必须一致）
LazyLLM 厂商 ← → ALLOWED_LAZYLLM_VENDORS（白名单）
```

**学员应该能问出**：
- 「ai_provider_format 在哪一层的配置？」
- 「为什么 Per-Model 配置优先级更高？」
- 「如果我要添加新厂商，需要改哪几层？」

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

**贡献指南**：
1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

---

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🌟 支持项目

如果这个项目对你有帮助，请给它一个 ⭐️！

---

## 📧 联系方式

- 作者：Tiona
- 项目主页：[https://github.com/Tionna726/course-qa-system](https://github.com/Tionna726/course-qa-system)
- 问题反馈：[Issues](https://github.com/Tionna726/course-qa-system/issues)

---

## 🎓 致谢

感谢所有为课程设计方法论贡献思想的教育者和技术专家。

> **警句**：执行成本下降之后，抽象错误的代价反而更大——
> 以前慢慢错，现在可以**高速错、批量错、系统性地错**。
