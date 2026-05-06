# 🎓 Course QA System v2.1

**课程智能问答与笔记系统** - 为静态课件网站添加智能问答、笔记和划线功能。

> 核心理念：**先诊断再设计**，让课件真正解决用户问题。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Tionna726/course-qa-system?style=social)](https://github.com/Tionna726/course-qa-system)

---

## ✨ 新增功能 (v2.1)

### 🔒 安全修复
- **XSS 防护**：所有用户输入经过 `escapeHtml()` 转义后再插入 DOM
- **API Key 安全存储**：使用 `sessionStorage` 替代 `localStorage`，会话级保护
- **组件解耦**：使用 `CustomEvent` 替代全局变量直接访问

### 🎨 主题支持
- **深色/浅色主题切换**：点击面板上的 🌓 按钮或页面右上角切换
- **CSS 变量系统**：统一管理颜色、间距、圆角等样式变量
- **主题偏好持久化**：自动保存到 localStorage

### 🛠 架构重构
- **BaseModule 公共基类**：统一数据加载/保存、错误处理、Toast 通知
- **Toast 通知组件**：所有操作都有可见的反馈提示
- **Debounce 防抖**：数据保存自动防抖，避免频繁写入

### 🎯 功能增强
- **划线颜色选择**：右键菜单支持 5 种划线颜色
- **笔记标签系统**：支持添加标签、按标签筛选
- **数据导入/导出**：支持 JSON 格式导出和导入
- **全文搜索**：笔记支持实时搜索过滤

---

## 🎯 三大核心模块

| 模块 | 功能 | 快捷键 |
|------|------|--------|
| **划线管理器** | 选中文字划线、多色选择、全文检索、本地存储 | 选中文字+右键 |
| **笔记面板** | 独立笔记板块、标签分类、导入导出、搜索 | `N` |
| **DeepSeek 提问** | 划线提问、专家视角回答、问题导出 | `Q` |

---

## 🚀 快速开始

### 安装

1. 克隆仓库到本地：
```bash
git clone https://github.com/Tionna726/course-qa-system.git
```

2. 复制文件和目录到你的项目：
```bash
cp -r js/ css/ your-project/
```

### 在网页中使用

在 HTML 中引入脚本（**顺序很重要**）：

```html
<!-- 1. Toast 通知组件（必须首先加载） -->
<script src="js/toast.js"></script>

<!-- 2. 公共基类 -->
<script src="js/base-module.js"></script>

<!-- 3. 统一样式（可选，推荐使用） -->
<link rel="stylesheet" href="css/styles.css">

<!-- 4. 功能模块（按顺序加载） -->
<script src="js/highlight-manager.js"></script>
<script src="js/note-panel.js"></script>
<script src="js/floating-question-box.js"></script>
```

3. 查看 `examples/index.html` 获取完整示例。

---

## 🎨 主题切换

系统支持深色/浅色主题自动切换：

```javascript
// 方式1：通过面板上的 🌓 按钮
// 方式2：通过代码切换
document.documentElement.setAttribute('data-theme', 'light');  // 浅色
document.documentElement.setAttribute('data-theme', 'dark');    // 深色

// 方式3：通过 BaseModule 方法
window.highlightManager.toggleTheme();
```

---

## 📂 文件结构

```
course-qa-system/
├── SKILL.md                      # Skill 定义文件（CodeBuddy 用）
├── README.md                     # 项目说明
├── LICENSE                       # MIT 协议
├── css/
│   └── styles.css               # 统一样式文件（新增）
├── js/
│   ├── base-module.js           # 公共基类（新增）
│   ├── toast.js                 # Toast 通知组件（新增）
│   ├── highlight-manager.js     # 划线管理器
│   ├── note-panel.js            # 笔记面板
│   └── floating-question-box.js # 提问框
└── examples/
    └── index.html               # 示例课件
```

---

## 🔧 LLM 配置

提问框支持接入 LLM API：

1. 按 `Q` 打开提问面板
2. 点击 ⚙️ 按钮打开设置
3. 选择服务商或手动填入配置
4. 保存设置

**预设选项**：
- **DeepSeek**: `https://api.deepseek.com/chat/completions`
- **OpenAI**: `https://api.openai.com/v1/chat/completions`
- **OneAPI**: `http://localhost:3000/v1/chat/completions`

**安全说明**：API Key 使用 `sessionStorage` 存储，关闭浏览器标签页后自动清除。

**注意**：浏览器直接调用 API 可能遇到 CORS 跨域问题，建议使用代理服务。

---

## 🛠 技术栈

- **前端**：原生 JavaScript ES6+（无框架依赖）
- **存储**：localStorage（数据）+ sessionStorage（API Key）
- **样式**：独立 CSS + CSS 变量
- **安全**：XSS 防护、组件解耦

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

本课程设计方法论受以下文章启发：

- **《顶层思维》** by lencx（公众号：**浮之静**）
  - 原文链接：https://mp.weixin.qq.com/s/GVc5XgR75Hxg04CGq-eERg
  - 核心思想：在发散与收束之间重建可生长的认知结构

感谢所有为课程设计方法论贡献思想的教育者和技术专家。

> **警句**（源自 lencx《顶层思维》）：执行成本下降之后，抽象错误的代价反而更大——
> 以前慢慢错，现在可以**高速错、批量错、系统性地错**。
