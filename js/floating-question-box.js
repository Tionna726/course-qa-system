/**
 * DeepSeek 提问框系统 v2.1
 *
 * 功能：
 * - 独立提问板块（与笔记分开）
 * - 划线提问：选中文字 → 右键 → "划线提问"
 * - DeepSeek 智能回答
 * - 专家视角 Prompt 设计
 *
 * 安全修复：
 * - API Key 使用 sessionStorage 存储
 * - 继承 BaseModule，使用 escapeHtml 转义
 * - 监听 CustomEvent 接收划线事件
 * - 所有错误添加 Toast 通知
 */

/**
 * 提问框类
 * @class
 */
class FloatingQuestionBox extends BaseModule {
    /**
     * @param {Object} options - 配置选项
     * @param {string} [options.storageKey='fq-questions'] - 存储键
     * @param {string} [options.defaultModel='deepseek-v4-flash'] - 默认模型
     */
    constructor(options = {}) {
        super({
            storageKey: 'fq-questions',
            defaultModel: 'deepseek-v4-flash',
            ...options
        });

        /** @type {Object|null} 当前问题 */
        this.currentQuestion = null;
        /** @type {boolean} 拖动状态 */
        this.isDragging = false;
        /** @type {boolean} 最小化状态 */
        this.isMinimized = false;

        /** @type {Object} LLM 配置 */
        this.llmConfig = {
            enabled: false,
            apiUrl: '',
            apiKey: '',
            model: options.defaultModel || 'deepseek-v4-flash'
        };

        this.loadConfig();
        this.loadData();
        this.init();
    }

    /**
     * 加载问题
     * @returns {Object[]} 问题列表
     */
    loadQuestions() {
        const result = this.loadData();
        if (result === null) {
            this.data = [];
        }
        return this.data;
    }

    /**
     * 保存问题
     */
    saveQuestions() {
        this.saveData();
    }

    /**
     * 加载配置（使用 sessionStorage 存储敏感信息）
     */
    loadConfig() {
        try {
            // API Key 从 sessionStorage 加载
            const keySaved = sessionStorage.getItem('fq-llm-api-key');
            const configSaved = localStorage.getItem('fq-llm-config');

            if (configSaved) {
                const config = JSON.parse(configSaved);
                this.llmConfig = {
                    ...this.llmConfig,
                    enabled: config.enabled || false,
                    apiUrl: config.apiUrl || '',
                    model: config.model || this.options.defaultModel
                };
            }

            if (keySaved) {
                this.llmConfig.apiKey = keySaved;
            }
        } catch (e) {
            console.error('[FloatingQuestionBox] loadConfig error:', e);
            this.showToast('配置加载失败', 'error');
        }
    }

    /**
     * 保存配置（敏感信息分离存储）
     */
    saveConfig() {
        try {
            // API Key 存储在 sessionStorage（会话级）
            if (this.llmConfig.apiKey) {
                sessionStorage.setItem('fq-llm-api-key', this.llmConfig.apiKey);
            } else {
                sessionStorage.removeItem('fq-llm-api-key');
            }

            // 其他配置存储在 localStorage
            const publicConfig = {
                enabled: this.llmConfig.enabled,
                apiUrl: this.llmConfig.apiUrl,
                model: this.llmConfig.model
            };
            localStorage.setItem('fq-llm-config', JSON.stringify(publicConfig));
        } catch (e) {
            this.showToast('配置保存失败', 'error');
            console.error('[FloatingQuestionBox] saveConfig error:', e);
        }
    }

    /**
     * 初始化
     */
    init() {
        this.createQuestionBox();
        this.setupKeyboardShortcuts();
        this.renderQuestions();
        this.setupEventListeners();
        this.applyTheme();
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 监听划线事件
        window.addEventListener('highlight-with-question', (e) => {
            this.showNewQuestion(e.detail.text);
        });

        // 监听主题切换
        window.addEventListener('theme-changed', (e) => {
            this.applyTheme(e.detail?.theme);
        });
    }

    /**
     * 应用主题
     * @param {string} [theme]
     */
    applyTheme(theme) {
        // 样式已在 CSS 中处理
    }

    /**
     * 显示新问题输入框（供外部调用，如划线后）
     * @param {string} [contextText=''] - 上下文文本
     */
    showNewQuestion(contextText = '') {
        document.getElementById('fq-context-text').textContent = contextText;
        document.getElementById('fq-empty').style.display = 'none';
        document.getElementById('fq-list').style.display = 'none';
        document.getElementById('fq-new-question').classList.add('active');
        document.getElementById('fq-input').focus();
        this.currentQuestion = { context: contextText };
    }

    /**
     * 创建提问框
     */
    createQuestionBox() {
        // 提问框容器
        this.box = document.createElement('div');
        this.box.id = 'floating-question-box';
        this.box.className = 'fq-panel';
        this.box.innerHTML = `
            <div class="fq-header" id="fq-header">
                <div class="fq-title">
                    <span class="fq-icon">🤖</span>
                    <span class="fq-title-text">DeepSeek 提问</span>
                    <span class="fq-count" id="fq-count">0</span>
                </div>
                <div class="fq-actions">
                    <button class="fq-theme-toggle" id="fq-theme" title="切换主题">🌓</button>
                    <button class="fq-btn" id="fq-new" title="新建提问">➕</button>
                    <button class="fq-btn" id="fq-settings" title="LLM设置">⚙️</button>
                    <button class="fq-btn" id="fq-export" title="导出">📤</button>
                    <button class="fq-btn" id="fq-minimize" title="最小化">➖</button>
                    <button class="fq-btn fq-btn-close" id="fq-close" title="关闭">✕</button>
                </div>
            </div>
            <div class="fq-content" id="fq-content">
                <div class="fq-help" id="fq-help" style="display:none; padding: 10px; background: rgba(102,126,234,0.15); border-radius: 8px; margin-bottom: 10px; font-size: 12px; color: var(--fq-text-secondary);">
                    <strong>💡 提问方式：</strong><br>
                    1. 选中文字 → 右键"划线提问"<br>
                    2. 或点击 ➕ 直接提问<br>
                    3. Ctrl+Enter 提交
                </div>
                <div class="fq-empty" id="fq-empty">
                    <div class="fq-empty-icon">❓</div>
                    <div class="fq-empty-text">DeepSeek 智能答疑</div>
                    <div class="fq-empty-hint">选中文字划线或点击 + 新建提问</div>
                </div>
                <div class="fq-list" id="fq-list"></div>
            </div>
            <div class="fq-new-question" id="fq-new-question">
                <div class="fq-context" id="fq-context">
                    <div class="fq-context-label">提问内容：</div>
                    <div class="fq-context-text" id="fq-context-text"></div>
                </div>
                <div class="fq-input-area">
                    <textarea id="fq-input" placeholder="输入你的问题..." rows="3"></textarea>
                    <div class="fq-input-actions">
                        <button class="fq-btn-submit" id="fq-submit">提交提问</button>
                        <button class="fq-btn-cancel" id="fq-cancel">取消</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.box);

        // 初始化样式和事件
        this.initStyles();
        this.bindEvents();

        // 拖动功能
        this.box.style.left = '20px';
        this.box.style.top = '150px';
    }

    /**
     * 初始化样式（仅添加面板特定样式）
     */
    initStyles() {
        // 已在 css/styles.css 中定义通用样式
        // 此处仅添加面板特定样式
        if (document.getElementById('fq-panel-styles')) return;

        const style = document.createElement('style');
        style.id = 'fq-panel-styles';
        style.textContent = `
            #floating-question-box {
                left: 20px;
                top: 150px;
                width: 320px;
                max-height: 500px;
            }

            #fq-context-text {
                white-space: pre-wrap;
                word-break: break-word;
            }

            .fq-answer {
                white-space: pre-wrap;
                word-break: break-word;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 拖动功能
        const header = document.getElementById('fq-header');
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('fq-btn') || e.target.classList.contains('fq-theme-toggle')) return;
            this.isDragging = true;
            this.offsetX = e.clientX - this.box.getBoundingClientRect().left;
            this.offsetY = e.clientY - this.box.getBoundingClientRect().top;
            this.box.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            let newX = e.clientX - this.offsetX;
            let newY = e.clientY - this.offsetY;

            // 边界限制
            newX = Math.max(0, Math.min(newX, window.innerWidth - 320));
            newY = Math.max(0, Math.min(newY, window.innerHeight - 48));

            this.box.style.left = newX + 'px';
            this.box.style.top = newY + 'px';
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.box.style.cursor = '';
        });

        // 按钮事件
        document.getElementById('fq-theme').onclick = () => this.toggleTheme();
        document.getElementById('fq-new').onclick = () => this.showNewQuestion();
        document.getElementById('fq-settings').onclick = () => this.showSettings();
        document.getElementById('fq-export').onclick = () => this.exportQuestions();
        document.getElementById('fq-minimize').onclick = () => {
            this.isMinimized = !this.isMinimized;
            this.box.classList.toggle('minimized', this.isMinimized);
        };
        document.getElementById('fq-close').onclick = () => this.hide();
        document.getElementById('fq-submit').onclick = () => this.submitQuestion();
        document.getElementById('fq-cancel').onclick = () => this.hideNewQuestion();

        document.getElementById('fq-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.submitQuestion();
            }
        });

        // 显示/隐藏快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'q' || e.key === 'Q') {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    this.toggle();
                }
            }
        });
    }

    toggle() {
        if (this.box.style.display === 'none' || !this.box.style.display) {
            this.show();
        } else {
            this.hide();
        }
    }

    show() {
        this.box.style.display = 'block';
        this.renderQuestions();
    }

    hide() {
        this.box.style.display = 'none';
    }

    /**
     * 隐藏新问题输入框
     */
    hideNewQuestion() {
        document.getElementById('fq-new-question').classList.remove('active');
        document.getElementById('fq-input').value = '';

        if (this.data.length > 0) {
            document.getElementById('fq-empty').style.display = 'none';
            document.getElementById('fq-list').style.display = 'flex';
        } else {
            document.getElementById('fq-empty').style.display = 'block';
            document.getElementById('fq-list').style.display = 'none';
        }

        this.currentQuestion = null;
    }

    /**
     * 提交问题
     */
    submitQuestion() {
        const input = document.getElementById('fq-input');
        const questionText = input.value.trim();

        if (!questionText) {
            this.showToast('请输入问题', 'warning');
            return;
        }

        const question = {
            id: this.generateId(),
            context: this.currentQuestion?.context || '',
            question: this.escapeHtml(questionText),
            answered: false,
            answer: null,
            timestamp: new Date().toISOString()
        };

        this.data.unshift(question);
        this.saveQuestions();
        this.renderQuestions();
        this.hideNewQuestion();
        this.handleAnswer(question);
    }

    /**
     * 如果配置了LLM，显示帮助提示
     */
    showHelpIfNeeded() {
        const help = document.getElementById('fq-help');
        if (help && this.llmConfig.enabled && this.llmConfig.apiKey) {
            help.style.display = 'block';
        }
    }

    /**
     * 处理回答（LLM或固定话术）
     * @param {Object} question - 问题对象
     */
    async handleAnswer(question) {
        if (this.llmConfig.enabled && this.llmConfig.apiUrl) {
            await this.callLLM(question);
        } else {
            this.showFixedAnswer(question);
        }
    }

    /**
     * 显示固定话术
     * @param {Object} question - 问题对象
     */
    showFixedAnswer(question) {
        question.answered = true;
        question.answer = '💡 这个问题很有价值！请在答疑课上集中讨论，或联系讲师获取详细解答。\n\n💡 提示：配置 LLM API 可以获得智能回答哦~';
        this.renderQuestions();
    }

    /**
     * 调用 LLM API
     * @param {Object} question - 问题对象
     */
    async callLLM(question) {
        const loadingAnswer = '🤖 正在思考中...\n(首次调用可能需要3-5秒)';
        question.answer = loadingAnswer;
        this.renderQuestions();

        // 检查配置
        if (!this.llmConfig.apiKey) {
            question.answer = '❌ 请先填写 API Key！\n\n点击 ⚙️ 按钮，填入你的 DeepSeek API Key。';
            this.renderQuestions();
            this.showToast('请先配置 API Key', 'warning');
            return;
        }

        try {
            const prompt = this.buildPrompt(question);

            const response = await fetch(this.llmConfig.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.llmConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: this.llmConfig.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 请求失败 (${response.status}): ${errorText.substring(0, 200)}`);
            }

            const result = await response.json();

            // 兼容不同 API 格式
            let answer = null;
            if (result.choices?.[0]?.message?.content) {
                answer = result.choices[0].message.content;
            } else if (result.response) {
                answer = result.response;
            } else if (result.result) {
                answer = result.result;
            }

            if (answer) {
                question.answer = answer;
                question.answered = true;
                this.showToast('回答已生成', 'success');
            } else {
                question.answer = '⚠️ 未能解析 API 响应，请查看控制台日志';
                this.showToast('响应解析失败', 'error');
            }
        } catch (error) {
            let errorMsg = `❌ 调用失败: ${error.message}`;

            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMsg += '\n\n💡 可能原因:';
                errorMsg += '\n• CORS 跨域限制（浏览器安全策略）';
                errorMsg += '\n• API 地址无法访问';
                errorMsg += '\n• 请使用 OneAPI 等代理服务';
                this.showToast('网络错误，请检查配置', 'error');
            } else {
                this.showToast('API 调用失败', 'error');
            }

            question.answer = errorMsg;
        }

        this.saveQuestions();
        this.renderQuestions();
    }

    /**
     * 构建提示词（专家视角，非小白口吻）
     * @param {Object} question - 问题对象
     * @returns {string} 提示词
     */
    buildPrompt(question) {
        return `你是本课程领域的专家导师。请用专家视角回答，保留关键术语，不要使用"小白口吻"或通俗类比。

【原文摘录】
${question.context}

【学员提问】
${question.question}

请按以下结构回答：
1. **抽象层级**：这个概念/问题位于哪个层级？（代码层/模块层/系统层/架构层/范式层）
2. **直接回答**：简明回答学员提问
3. **横向关联**：列出相邻概念、替代方案、依赖关系
4. **深挖关键词**：指出学员应该继续学习的 2-3 个关键词

注意：不要使用"就像..."这类通俗类比，保留专业术语。`;
    }

    /**
     * 显示设置面板
     */
    showSettings() {
        const existing = document.getElementById('fq-settings-panel');
        if (existing) {
            existing.remove();
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'fq-settings-panel';
        panel.innerHTML = `
            <div class="fq-settings-title">
                <span>⚙️ LLM 设置</span>
                <span class="fq-settings-close" id="fq-settings-close">✕</span>
            </div>
            <div class="fq-settings-content">
                <label class="fq-settings-label">
                    <input type="checkbox" id="fq-llm-enabled" ${this.llmConfig.enabled ? 'checked' : ''}>
                    <span>启用 LLM 智能回答</span>
                </label>

                <div class="fq-settings-field">
                    <label>快速选择</label>
                    <select id="fq-preset" style="width:100%; padding:8px 12px; background:var(--fq-bg-tertiary); border:1px solid var(--fq-border); border-radius:6px; color:var(--fq-text-primary); font-size:13px;">
                        <option value="">-- 选择服务商 --</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="openai">OpenAI</option>
                        <option value="oneapi">OneAPI / 国内代理</option>
                    </select>
                </div>

                <div class="fq-settings-field">
                    <label>API 地址</label>
                    <input type="text" id="fq-llm-url" placeholder="https://api.deepseek.com/chat/completions" value="${this.escapeHtml(this.llmConfig.apiUrl || '')}">
                </div>
                <div class="fq-settings-field">
                    <label>API Key（会话级存储）</label>
                    <input type="password" id="fq-llm-key" placeholder="sk-..." value="${this.escapeHtml(this.llmConfig.apiKey || '')}">
                    <small style="color: var(--fq-text-muted); font-size: 11px; margin-top: 4px; display: block;">API Key 仅保存在本次会话，关闭标签页后自动清除</small>
                </div>
                <div class="fq-settings-field">
                    <label>模型名称</label>
                    <input type="text" id="fq-llm-model" placeholder="deepseek-v4-flash" value="${this.escapeHtml(this.llmConfig.model || 'deepseek-v4-flash')}">
                </div>
                <button class="fq-settings-save" id="fq-settings-save">保存设置</button>
            </div>
        `;

        panel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 150px;
            width: 300px;
            background: linear-gradient(135deg, var(--fq-bg-primary) 0%, var(--fq-bg-secondary) 100%);
            border-radius: var(--fq-radius-lg);
            box-shadow: 0 8px 32px var(--fq-shadow);
            z-index: 10002;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        `;

        document.body.appendChild(panel);

        // 绑定事件
        document.getElementById('fq-settings-close').onclick = () => panel.remove();
        document.getElementById('fq-settings-save').onclick = () => {
            this.llmConfig.enabled = document.getElementById('fq-llm-enabled').checked;
            this.llmConfig.apiUrl = document.getElementById('fq-llm-url').value.trim();
            this.llmConfig.apiKey = document.getElementById('fq-llm-key').value.trim();
            this.llmConfig.model = document.getElementById('fq-llm-model').value.trim() || 'deepseek-v4-flash';
            this.saveConfig();
            panel.remove();
            this.showToast('设置已保存！', 'success');
        };

        // 预设选项切换
        document.getElementById('fq-preset').onchange = (e) => {
            const presets = {
                'deepseek': {
                    url: 'https://api.deepseek.com/chat/completions',
                    model: 'deepseek-v4-flash'
                },
                'openai': {
                    url: 'https://api.openai.com/v1/chat/completions',
                    model: 'gpt-3.5-turbo'
                },
                'oneapi': {
                    url: 'http://localhost:3000/v1/chat/completions',
                    model: 'gpt-3.5-turbo'
                }
            };

            const preset = presets[e.target.value];
            if (preset) {
                document.getElementById('fq-llm-url').value = preset.url;
                document.getElementById('fq-llm-model').value = preset.model;
            }
        };
    }

    /**
     * 渲染问题列表
     */
    renderQuestions() {
        const list = document.getElementById('fq-list');
        const count = document.getElementById('fq-count');

        count.textContent = this.data.length;

        if (this.data.length === 0) {
            list.innerHTML = '';
            return;
        }

        list.innerHTML = this.data.map(q => `
            <div class="fq-question-item ${q.answered ? 'answered' : ''}" data-id="${q.id}">
                <div class="fq-question-context">${this.escapeHtml(q.context)}</div>
                <div class="fq-question-text">${this.escapeHtml(q.question)}</div>
                ${q.answer ? `<div class="fq-answer">${this.formatAnswer(q.answer)}</div>` : ''}
                <div class="fq-question-meta">
                    <span>${new Date(q.timestamp).toLocaleString('zh-CN')}</span>
                    <span class="fq-status">${q.answered ? '✅ 已回答' : '⏳ 待回答'}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * 格式化回答（支持换行）
     * @param {string} answer - 回答文本
     * @returns {string} HTML 格式的回答
     */
    formatAnswer(answer) {
        // 先转义 HTML，再处理换行
        return this.escapeHtml(answer).replace(/\n/g, '<br>');
    }

    /**
     * 导出问题
     * @param {'txt'|'json'} [format='txt'] - 导出格式
     */
    exportQuestions(format = 'txt') {
        if (this.data.length === 0) {
            this.showToast('暂无问题可导出', 'warning');
            return;
        }

        const timestamp = new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-').replace(/\s/g, '_');

        if (format === 'json') {
            const jsonData = {
                exportTime: new Date().toISOString(),
                totalCount: this.data.length,
                questions: this.data
            };
            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `课件问题_${timestamp}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } else {
            const content = this.generateTxtContent();
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `课件问题_${timestamp}.txt`;
            link.click();
            URL.revokeObjectURL(url);
        }

        this.showToast('导出成功', 'success');
    }

    /**
     * 生成文本内容
     * @returns {string} 文本内容
     */
    generateTxtContent() {
        let content = '=== 课件问题收集 ===\n\n';
        content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
        content += `问题总数: ${this.data.length}\n`;
        content += '='.repeat(40) + '\n\n';

        this.data.forEach((q, index) => {
            content += `【问题 ${index + 1}】\n`;
            content += `原文摘录: ${q.context}\n`;
            content += `提问内容: ${q.question}\n`;
            if (q.answer) {
                content += `回答内容: ${q.answer.replace(/<br>/g, '\n')}\n`;
            }
            content += `提问时间: ${q.timestamp}\n`;
            content += `状态: ${q.answered ? '✅ 已回答' : '⏳ 待回答'}\n`;
            content += '-'.repeat(40) + '\n\n';
        });

        return content;
    }
}

// 初始化 - 使用防重复初始化标志
if (!window._floatingQuestionInitialized) {
    window._floatingQuestionInitialized = true;
    document.addEventListener('DOMContentLoaded', () => {
        window.floatingQuestion = new FloatingQuestionBox();
    });
}
