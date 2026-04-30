/**
 * DeepSeek 提问框系统 v2.0
 * - 独立提问板块（与笔记分开）
 * - 划线提问：选中文字 → 右键 → "划线提问"
 * - DeepSeek 智能回答
 */

class FloatingQuestionBox {
    constructor(options = {}) {
        this.options = {
            storageKey: 'fq-questions',
            defaultModel: 'deepseek-v4-flash',
            autoSaveHighlights: true,
            ...options
        };

        this.questions = [];
        this.currentQuestion = null;
        this.isDragging = false;
        this.isMinimized = false;

        // LLM 配置
        this.llmConfig = {
            enabled: false,
            apiUrl: '',
            apiKey: '',
            model: this.options.defaultModel
        };

        this.loadConfig();
        this.loadQuestions();
        this.init();
    }

    // 加载问题
    loadQuestions() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) this.questions = JSON.parse(saved);
        } catch (e) {
            this.questions = [];
        }
    }

    // 保存问题
    saveQuestions() {
        localStorage.setItem(this.options.storageKey, JSON.stringify(this.questions));
    }
    
    // 加载配置
    loadConfig() {
        try {
            const saved = localStorage.getItem('fq-llm-config');
            if (saved) {
                this.llmConfig = { ...this.llmConfig, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.log('无保存的LLM配置');
        }
    }
    
    // 保存配置
    saveConfig() {
        localStorage.setItem('fq-llm-config', JSON.stringify(this.llmConfig));
    }
    
    init() {
        this.createQuestionBox();
        this.setupKeyboardShortcuts();
        this.renderQuestions();
    }

    // 显示新问题输入框（供外部调用，如划线后）
    showNewQuestion(contextText = '') {
        document.getElementById('fq-context-text').textContent = contextText;
        document.getElementById('fq-empty').style.display = 'none';
        document.getElementById('fq-list').style.display = 'none';
        document.getElementById('fq-new-question').classList.add('active');
        document.getElementById('fq-input').focus();
        this.currentQuestion = { context: contextText };
    }
    
    // 创建提问框
    createQuestionBox() {
        // 提问框容器
        this.box = document.createElement('div');
        this.box.id = 'floating-question-box';
        this.box.innerHTML = `
            <div class="fq-header" id="fq-header">
                <div class="fq-title">
                    <span class="fq-icon">🤖</span>
                    <span class="fq-title-text">DeepSeek 提问</span>
                    <span class="fq-count" id="fq-count">0</span>
                </div>
                <div class="fq-actions">
                    <button class="fq-btn" id="fq-new" title="新建提问">➕</button>
                    <button class="fq-btn" id="fq-settings" title="LLM设置">⚙️</button>
                    <button class="fq-btn" id="fq-export" title="导出">📤</button>
                    <button class="fq-btn" id="fq-minimize" title="最小化">➖</button>
                    <button class="fq-btn fq-btn-close" id="fq-close" title="关闭">✕</button>
                </div>
            </div>
            <div class="fq-content" id="fq-content">
                <div class="fq-help" id="fq-help" style="display:none; padding: 10px; background: rgba(102,126,234,0.15); border-radius: 8px; margin-bottom: 10px; font-size: 12px; color: rgba(255,255,255,0.8);">
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
    
    // 初始化样式（内联）
    initStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #floating-question-box {
                position: fixed;
                left: 20px;
                top: 150px;
                width: 320px;
                max-height: 500px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow: hidden;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            #floating-question-box:hover {
                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.15);
            }
            
            #floating-question-box.minimized {
                max-height: 48px;
            }
            
            #floating-question-box.minimized .fq-content,
            #floating-question-box.minimized .fq-new-question {
                display: none;
            }
            
            .fq-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: rgba(255,255,255,0.05);
                border-bottom: 1px solid rgba(255,255,255,0.1);
                cursor: move;
                user-select: none;
            }
            
            .fq-title {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .fq-icon {
                font-size: 18px;
            }
            
            .fq-title-text {
                color: #fff;
                font-weight: 600;
                font-size: 14px;
            }
            
            .fq-count {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #fff;
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: 600;
            }
            
            .fq-actions {
                display: flex;
                gap: 4px;
            }
            
            .fq-btn {
                width: 28px;
                height: 28px;
                border: none;
                background: rgba(255,255,255,0.1);
                color: #fff;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }
            
            .fq-btn:hover {
                background: rgba(255,255,255,0.2);
            }
            
            .fq-btn-close:hover {
                background: #e74c3c;
            }
            
            /* 移动端适配 */
            @media (max-width: 768px) {
                #floating-question-box {
                    left: 10px !important;
                    right: 10px !important;
                    width: auto !important;
                    max-width: calc(100vw - 20px);
                    max-height: 60vh;
                }
                
                #fq-settings-panel {
                    left: 10px !important;
                    right: 10px !important;
                    width: auto !important;
                }
            }
            
            .fq-content {
                max-height: 350px;
                overflow-y: auto;
                padding: 12px;
            }
            
            .fq-empty {
                text-align: center;
                padding: 32px 16px;
                color: rgba(255,255,255,0.6);
            }
            
            .fq-empty-icon {
                font-size: 32px;
                margin-bottom: 12px;
            }
            
            .fq-empty-text {
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .fq-empty-hint {
                font-size: 12px;
                color: rgba(255,255,255,0.4);
            }
            
            .fq-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .fq-question-item {
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
                padding: 12px;
                border-left: 3px solid #667eea;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .fq-question-item:hover {
                background: rgba(255,255,255,0.1);
                transform: translateX(4px);
            }
            
            .fq-question-item.answered {
                border-left-color: #2ecc71;
            }
            
            .fq-question-context {
                font-size: 12px;
                color: rgba(255,255,255,0.5);
                margin-bottom: 6px;
                padding: 6px 8px;
                background: rgba(255,255,255,0.05);
                border-radius: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .fq-question-text {
                color: #fff;
                font-size: 13px;
                line-height: 1.5;
            }
            
            .fq-question-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 8px;
                font-size: 11px;
                color: rgba(255,255,255,0.4);
            }
            
            .fq-new-question {
                display: none;
                padding: 16px;
                border-top: 1px solid rgba(255,255,255,0.1);
                background: rgba(0,0,0,0.2);
            }
            
            .fq-new-question.active {
                display: block;
            }
            
            .fq-context {
                margin-bottom: 12px;
            }
            
            .fq-context-label {
                font-size: 11px;
                color: rgba(255,255,255,0.5);
                margin-bottom: 4px;
            }
            
            .fq-context-text {
                color: #fff;
                font-size: 13px;
                padding: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 6px;
                border-left: 3px solid #f39c12;
                max-height: 80px;
                overflow-y: auto;
            }
            
            .fq-input-area textarea {
                width: 100%;
                padding: 10px 12px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                color: #fff;
                font-size: 13px;
                font-family: inherit;
                resize: none;
                box-sizing: border-box;
            }
            
            .fq-input-area textarea:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .fq-input-area textarea::placeholder {
                color: rgba(255,255,255,0.4);
            }
            
            .fq-input-actions {
                display: flex;
                gap: 8px;
                margin-top: 10px;
            }
            
            .fq-btn-submit {
                flex: 1;
                padding: 8px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 6px;
                color: #fff;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, opacity 0.2s;
            }
            
            .fq-btn-submit:hover {
                transform: scale(1.02);
            }
            
            .fq-btn-cancel {
                padding: 8px 16px;
                background: rgba(255,255,255,0.1);
                border: none;
                border-radius: 6px;
                color: rgba(255,255,255,0.7);
                font-size: 13px;
                cursor: pointer;
            }
            
            .fq-btn-cancel:hover {
                background: rgba(255,255,255,0.2);
            }
        `;
        document.head.appendChild(style);
    }
    
    // 绑定事件
    bindEvents() {
        // 拖动功能
        const header = document.getElementById('fq-header');
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('fq-btn')) return;
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
        document.getElementById('fq-new').addEventListener('click', () => this.showNewQuestion());
        document.getElementById('fq-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('fq-export').addEventListener('click', () => this.exportQuestions());
        document.getElementById('fq-minimize').addEventListener('click', () => {
            this.isMinimized = !this.isMinimized;
            this.box.classList.toggle('minimized', this.isMinimized);
        });
        document.getElementById('fq-close').addEventListener('click', () => this.hide());
        document.getElementById('fq-submit').addEventListener('click', () => this.submitQuestion());
        document.getElementById('fq-cancel').addEventListener('click', () => this.hideNewQuestion());
        document.getElementById('fq-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.submitQuestion();
        });

        // 监听划线事件（来自 highlight-manager）
        window.addEventListener('highlight-created', (e) => {
            this.showNewQuestion(e.detail.highlight.text);
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
    
    // 隐藏新问题输入框
    hideNewQuestion() {
        document.getElementById('fq-new-question').classList.remove('active');
        document.getElementById('fq-input').value = '';
        
        if (this.questions.length > 0) {
            document.getElementById('fq-empty').style.display = 'none';
            document.getElementById('fq-list').style.display = 'flex';
        } else {
            document.getElementById('fq-empty').style.display = 'block';
            document.getElementById('fq-list').style.display = 'none';
        }
        
        this.currentQuestion = null;
    }
    
    // 提交问题
    submitQuestion() {
        const input = document.getElementById('fq-input');
        const questionText = input.value.trim();
        if (!questionText) return;

        const question = {
            id: Date.now(),
            context: this.currentQuestion?.context || '',
            question: questionText,
            answered: false,
            answer: null,
            timestamp: new Date().toISOString()
        };

        this.questions.unshift(question);
        this.saveQuestions();
        this.renderQuestions();
        this.hideNewQuestion();
        this.handleAnswer(question);
    }
    
    // 如果配置了LLM，显示帮助提示
    showHelpIfNeeded() {
        const help = document.getElementById('fq-help');
        if (help && this.llmConfig.enabled && this.llmConfig.apiKey) {
            help.style.display = 'block';
        }
    }
    
    // 处理回答（LLM或固定话术）
    async handleAnswer(question) {
        if (this.llmConfig.enabled && this.llmConfig.apiUrl) {
            await this.callLLM(question);
        } else {
            this.showFixedAnswer(question);
        }
    }
    
    // 显示固定话术
    showFixedAnswer(question) {
        question.answered = true;
        question.answer = '💡 这个问题很有价值！请在答疑课上集中讨论，或联系讲师获取详细解答。';
        this.renderQuestions();
    }
    
    // 调用 LLM API
    async callLLM(question) {
        const loadingAnswer = '🤖 正在思考中...\n(首次调用可能需要3-5秒)';
        question.answer = loadingAnswer;
        this.renderQuestions();
        
        // 检查配置
        if (!this.llmConfig.apiKey) {
            question.answer = '❌ 请先填写 API Key！\n\n点击 ⚙️ 按钮，填入你的 DeepSeek API Key。';
            this.renderQuestions();
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
            
            const data = await response.json();
            
            // 兼容不同 API 格式
            let answer = null;
            if (data.choices?.[0]?.message?.content) {
                // OpenAI 格式
                answer = data.choices[0].message.content;
            } else if (data.response) {
                // 兼容某些国内 API
                answer = data.response;
            } else if (data.result) {
                // 另一种格式
                answer = data.result;
            }
            
            if (answer) {
                question.answer = answer;
                question.answered = true;
            } else {
                question.answer = '⚠️ 未能解析 API 响应，请查看控制台日志';
            }
        } catch (error) {
            let errorMsg = `❌ 调用失败: ${error.message}`;
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMsg += '\n\n💡 可能原因:';
                errorMsg += '\n• CORS 跨域限制（浏览器安全策略）';
                errorMsg += '\n• API 地址无法访问';
                errorMsg += '\n• 请使用 OneAPI 等代理服务';
            }
            
            question.answer = errorMsg;
        }
        
        this.renderQuestions();
    }
    
    // 构建提示词（专家视角，非小白口吻）
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
    
    // 显示设置面板
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
                    <select id="fq-preset" style="width:100%; padding:8px 12px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:6px; color:#fff; font-size:13px;">
                        <option value="">-- 选择服务商 --</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="openai">OpenAI</option>
                        <option value="oneapi">OneAPI / 国内代理</option>
                    </select>
                </div>
                
                <div class="fq-settings-field">
                    <label>API 地址</label>
                    <input type="text" id="fq-llm-url" placeholder="https://api.deepseek.com/chat/completions" value="${this.llmConfig.apiUrl || ''}">
                </div>
                <div class="fq-settings-field">
                    <label>API Key</label>
                    <input type="password" id="fq-llm-key" placeholder="sk-..." value="${this.llmConfig.apiKey || ''}">
                </div>
                <div class="fq-settings-field">
                    <label>模型名称</label>
                    <input type="text" id="fq-llm-model" placeholder="deepseek-v4-flash" value="${this.llmConfig.model || 'deepseek-v4-flash'}">
                </div>
                <button class="fq-settings-save" id="fq-settings-save">保存设置</button>
            </div>
        `;
        
        panel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 150px;
            width: 300px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            z-index: 10002;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        `;
        
        const panelStyle = document.createElement('style');
        panelStyle.id = 'fq-settings-panel-style';
        panelStyle.textContent = `
            #fq-settings-panel .fq-settings-title {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: rgba(255,255,255,0.05);
                border-bottom: 1px solid rgba(255,255,255,0.1);
                color: #fff;
                font-weight: 600;
                font-size: 14px;
            }
            #fq-settings-panel .fq-settings-close { cursor: pointer; opacity: 0.7; }
            #fq-settings-panel .fq-settings-close:hover { opacity: 1; }
            #fq-settings-panel .fq-settings-content { padding: 16px; }
            #fq-settings-panel .fq-settings-label {
                display: flex;
                align-items: center;
                gap: 10px;
                color: #fff;
                font-size: 13px;
                cursor: pointer;
                margin-bottom: 16px;
            }
            #fq-settings-panel .fq-settings-field { margin-bottom: 12px; }
            #fq-settings-panel .fq-settings-field label {
                display: block;
                color: rgba(255,255,255,0.7);
                font-size: 12px;
                margin-bottom: 6px;
            }
            #fq-settings-panel .fq-settings-field input {
                width: 100%;
                padding: 8px 12px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 6px;
                color: #fff;
                font-size: 13px;
                box-sizing: border-box;
            }
            #fq-settings-panel .fq-settings-save {
                width: 100%;
                padding: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 8px;
            }
        `;
        document.head.appendChild(panelStyle);
        document.body.appendChild(panel);
        
        // 绑定事件
        document.getElementById('fq-settings-close').addEventListener('click', () => panel.remove());
        document.getElementById('fq-settings-save').addEventListener('click', () => {
            this.llmConfig.enabled = document.getElementById('fq-llm-enabled').checked;
            this.llmConfig.apiUrl = document.getElementById('fq-llm-url').value.trim();
            this.llmConfig.apiKey = document.getElementById('fq-llm-key').value.trim();
            this.llmConfig.model = document.getElementById('fq-llm-model').value.trim() || 'deepseek-v4-flash';
            this.saveConfig();
            panel.remove();
            alert('设置已保存！');
        });
        
        // 预设选项切换
        document.getElementById('fq-preset').addEventListener('change', (e) => {
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
        });
    }
    
    // 渲染问题列表
    renderQuestions() {
        const list = document.getElementById('fq-list');
        list.innerHTML = this.questions.map((q, index) => `
            <div class="fq-question-item ${q.answered ? 'answered' : ''}" data-id="${q.id}">
                <div class="fq-question-context">${this.escapeHtml(q.context)}</div>
                <div class="fq-question-text">${this.escapeHtml(q.question)}</div>
                ${q.answer ? `<div class="fq-answer">${this.formatAnswer(q.answer)}</div>` : ''}
                <div class="fq-question-meta">
                    <span>${q.timestamp}</span>
                    <span class="fq-status">${q.answered ? '✅ 已回答' : '⏳ 待回答'}</span>
                </div>
            </div>
        `).join('');
    }

    // 格式化回答（支持换行）
    formatAnswer(answer) {
        return this.escapeHtml(answer).replace(/\n/g, '<br>');
    }
    
    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 导出问题
    exportQuestions() {
        if (this.questions.length === 0) {
            alert('暂无问题可导出');
            return;
        }
        
        const timestamp = new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-').replace(/\s/g, '_');
        let content, filename, mimeType;
        
        content = this.generateTxtContent();
        filename = `课件问题_${timestamp}.txt`;
        mimeType = 'text/plain';
        
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    // 生成文本内容
    generateTxtContent() {
        let content = '=== 课件问题收集 ===\n\n';
        content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
        content += `问题总数: ${this.questions.length}\n`;
        content += '='.repeat(40) + '\n\n';
        
        this.questions.forEach((q, index) => {
            content += `【问题 ${index + 1}】\n`;
            content += `原文摘录: ${q.context}\n`;
            content += `提问内容: ${q.question}\n`;
            if (q.answer) {
                content += `回答内容: ${q.answer}\n`;
            }
            content += `提问时间: ${q.timestamp}\n`;
            content += `状态: ${q.answered ? '✅ 已回答' : '⏳ 待回答'}\n`;
            content += '-'.repeat(40) + '\n\n';
        });
        
        return content;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.floatingQuestion = new FloatingQuestionBox();
});

// 也支持直接加载
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.floatingQuestion = new FloatingQuestionBox();
}
