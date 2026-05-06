/**
 * 划线管理器 - Highlight Manager v2.1
 *
 * 功能：
 * - 划线高亮显示（支持多种颜色）
 * - 保存到本地存储
 * - 事件驱动与其他组件通信
 * - CustomEvent 解耦
 *
 * 安全修复：
 * - 所有文本使用 escapeHtml 转义
 * - 使用 CustomEvent 替代全局变量直接访问
 * - 错误处理添加 Toast 通知
 */

/**
 * 划线管理器类
 * @class
 */
class HighlightManager extends BaseModule {
    /**
     * @param {Object} options - 配置选项
     * @param {string} [options.color='#ffeaa7'] - 默认高亮颜色
     * @param {string} [options.hoverColor='#f9ca24'] - 悬停颜色
     * @param {string} [options.activeColor='#fd79a8'] - 激活颜色
     * @param {string} [options.storageKey='fq-highlights'] - 存储键
     */
    constructor(options = {}) {
        super({
            storageKey: 'fq-highlights',
            ...options
        });

        /** @type {string} 当前划线颜色 */
        this.currentColor = options.color || '#ffeaa7';
        /** @type {Object} 划线颜色映射 */
        this.colorMap = {
            yellow: { main: '#ffeaa7', hover: '#f9ca24' },
            pink: { main: '#fd79a8', hover: '#ff6b9d' },
            green: { main: '#55efc4', hover: '#00cec9' },
            blue: { main: '#74b9ff', hover: '#0984e3' },
            orange: { main: '#fdcb6e', hover: '#f9a825' }
        };

        this.loadData();
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        this.setupSelectionListener();
        this.renderHighlights();
        this.injectStyles();
        this.setupEventListeners();
        this.applyTheme();
    }

    /**
     * 设置事件监听（接收其他组件事件）
     */
    setupEventListeners() {
        // 监听主题切换
        window.addEventListener('theme-changed', (e) => {
            this.applyTheme(e.detail?.theme);
        });
    }

    /**
     * 应用主题
     * @param {string} [theme] - 主题名称
     */
    applyTheme(theme) {
        const currentTheme = theme || this.loadTheme();
        // 划线颜色适配浅色主题
        if (currentTheme === 'light') {
            this.colorMap.yellow.main = '#fff3cd';
            this.colorMap.yellow.hover = '#ffeeba';
        } else {
            this.colorMap.yellow.main = '#ffeaa7';
            this.colorMap.yellow.hover = '#f9ca24';
        }
    }

    /**
     * 设置选择监听
     */
    setupSelectionListener() {
        document.addEventListener('mouseup', (e) => {
            // 忽略按钮点击和面板内点击
            if (e.target.closest('button')) return;
            if (e.target.closest('#hm-context-menu')) return;
            if (e.target.closest('.fq-panel')) return;

            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText.length > 0 && selectedText.length < 1000) {
                this.showContextMenu(e, selectedText);
            }
        });

        // 点击其他地方隐藏菜单
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('#hm-context-menu')) {
                this.hideContextMenu();
            }
        });
    }

    /**
     * 显示右键菜单
     * @param {MouseEvent} e - 鼠标事件
     * @param {string} text - 选中文本
     */
    showContextMenu(e, text) {
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.id = 'hm-context-menu';

        // 构建颜色选择 HTML
        const colorOptions = Object.keys(this.colorMap).map(color => `
            <div class="hm-color-option ${color === 'yellow' ? 'selected' : ''}"
                 data-color="${color}"
                 style="background: ${this.colorMap[color].main}"
                 title="${color}">
            </div>
        `).join('');

        menu.innerHTML = `
            <div class="hm-menu-item" data-action="highlight">
                <span class="hm-menu-icon">🖍️</span>
                <span>划线高亮</span>
            </div>
            <div class="hm-menu-item" data-action="highlight-note">
                <span class="hm-menu-icon">📝</span>
                <span>划线+笔记</span>
            </div>
            <div class="hm-menu-item" data-action="highlight-question">
                <span class="hm-menu-icon">❓</span>
                <span>划线提问</span>
            </div>
            <div class="hm-color-picker">
                ${colorOptions}
            </div>
        `;

        this.positionMenu(menu, e.clientX, e.clientY);
        document.body.appendChild(menu);

        // 存储当前选中文本
        this._currentSelectedText = text;

        // 绑定菜单项事件
        menu.querySelector('[data-action="highlight"]').addEventListener('click', () => {
            this.createHighlight(text);
            this.hideContextMenu();
        });

        menu.querySelector('[data-action="highlight-note"]').addEventListener('click', () => {
            this.createHighlightWithNote(text);
            this.hideContextMenu();
        });

        menu.querySelector('[data-action="highlight-question"]').addEventListener('click', () => {
            this.createHighlightWithQuestion(text);
            this.hideContextMenu();
        });

        // 绑定颜色选择事件
        menu.querySelectorAll('.hm-color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = option.dataset.color;
                this.currentColor = this.colorMap[color].main;
                this._selectedColor = color;

                // 更新选中状态
                menu.querySelectorAll('.hm-color-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });
    }

    /**
     * 定位菜单
     * @param {HTMLElement} menu - 菜单元素
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    positionMenu(menu, x, y) {
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let posX = x;
        let posY = y;

        if (x + 170 > viewportWidth) {
            posX = viewportWidth - 180;
        }
        if (y + 160 > viewportHeight) {
            posY = viewportHeight - 170;
        }

        menu.style.cssText = `
            position: fixed;
            left: ${posX}px;
            top: ${posY}px;
            background: var(--fq-bg-primary);
            border-radius: var(--fq-radius-lg);
            box-shadow: 0 4px 20px var(--fq-shadow);
            padding: 6px;
            z-index: 10001;
            min-width: 160px;
        `;
    }

    /**
     * 隐藏菜单
     */
    hideContextMenu() {
        const menu = document.getElementById('hm-context-menu');
        if (menu) menu.remove();
        this._currentSelectedText = null;
        this._selectedColor = null;
    }

    /**
     * 创建划线
     * @param {string} text - 划线文本
     * @param {Object} [metadata={}] - 元数据
     * @param {string} [metadata.note] - 笔记内容
     */
    createHighlight(text, metadata = {}) {
        const selection = window.getSelection();
        
        // 使用保存的文本（优先）或当前选区
        const highlightText = text || this._currentSelectedText;
        if (!highlightText) {
            this.showToast('请先选中要划线的文本', 'warning');
            return;
        }

        // 如果没有选区，尝试从保存的文本重新选中
        if (!selection.rangeCount) {
            this.showToast('选区已失效，请重新选中文本', 'warning');
            return;
        }

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const parentElement = container.nodeType === 3 ? container.parentElement : container;

        // 检查是否已经在高亮中
        if (parentElement.classList.contains('hm-highlight')) {
            this.removeHighlight(parentElement);
            return;
        }

        // 获取页面信息
        const pageInfo = this.getPageInfo();

        // 创建高亮元素
        const span = document.createElement('span');
        span.className = 'hm-highlight';
        const id = this.generateId();
        span.dataset.id = id;
        span.dataset.text = highlightText;
        span.dataset.page = pageInfo.title;
        span.dataset.url = pageInfo.url;
        span.dataset.timestamp = new Date().toISOString();
        span.dataset.note = metadata.note || '';
        span.dataset.color = this._selectedColor || 'yellow';

        try {
            range.surroundContents(span);
        } catch (e) {
            // 跨多个元素的情况
            try {
                const documentFragment = range.extractContents();
                span.appendChild(documentFragment);
                range.insertNode(span);
            } catch (innerError) {
                this.showToast('划线失败：文本结构不支持', 'error');
                console.error('[HighlightManager] surroundContents error:', innerError);
                return;
            }
        }

        // 保存到列表
        const highlight = {
            id: id,
            text: highlightText,
            page: pageInfo.title,
            url: pageInfo.url,
            timestamp: span.dataset.timestamp,
            note: metadata.note || '',
            color: this._selectedColor || 'yellow'
        };

        this.data.push(highlight);
        this.saveData();

        // 触发事件（用于其他组件监听）
        window.dispatchEvent(new CustomEvent('highlight-created', {
            detail: { highlight: highlight }
        }));

        this.showToast('划线已保存', 'success');
    }

    /**
     * 创建划线+笔记
     * @param {string} text - 划线文本
     */
    createHighlightWithNote(text) {
        const note = prompt('添加笔记（可选）：');
        this.createHighlight(text, { note: note || '' });

        // 使用 CustomEvent 通知笔记面板
        if (note) {
            window.dispatchEvent(new CustomEvent('highlight-with-note', {
                detail: {
                    text: text,
                    note: note,
                    timestamp: new Date().toISOString()
                }
            }));
        }
    }

    /**
     * 创建划线+提问
     * @param {string} text - 划线文本
     */
    createHighlightWithQuestion(text) {
        this.createHighlight(text);

        // 使用 CustomEvent 通知提问面板
        window.dispatchEvent(new CustomEvent('highlight-with-question', {
            detail: {
                text: text,
                timestamp: new Date().toISOString()
            }
        }));
    }

    /**
     * 移除划线
     * @param {HTMLElement} element - 划线元素
     */
    removeHighlight(element) {
        const id = element.dataset.id;
        const parent = element.parentNode;

        // 保留文本内容
        while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);

        // 从列表移除
        this.data = this.data.filter(h => h.id !== id);
        this.saveData();
        this.showToast('划线已移除', 'info');
    }

    /**
     * 渲染页面上的划线
     */
    renderHighlights() {
        // 清除现有渲染
        document.querySelectorAll('.hm-highlight').forEach(el => el.remove());

        const pageInfo = this.getPageInfo();

        this.data.forEach(h => {
            // 只渲染当前页面的划线
            if (h.url === pageInfo.url || h.page === pageInfo.title) {
                this.renderHighlightInPage(h);
            }
        });
    }

    /**
     * 在页面中渲染单个划线
     * @param {Object} highlight - 划线数据
     */
    renderHighlightInPage(highlight) {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent;
            const index = text.indexOf(highlight.text);

            if (index !== -1) {
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + highlight.text.length);

                const span = document.createElement('span');
                span.className = 'hm-highlight';
                span.dataset.id = highlight.id;
                span.dataset.note = highlight.note;
                span.dataset.color = highlight.color;

                try {
                    range.surroundContents(span);
                    break; // 只渲染第一个
                } catch (e) {
                    // 忽略跨元素的情况
                }
            }
        }
    }

    /**
     * 获取页面信息
     * @returns {Object} 页面信息
     */
    getPageInfo() {
        return {
            title: document.title || '未命名页面',
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 获取所有划线
     * @returns {Object[]} 划线列表
     */
    getAllHighlights() {
        return this.data;
    }

    /**
     * 搜索划线
     * @param {string} query - 搜索关键词
     * @returns {Object[]} 匹配结果
     */
    searchHighlights(query) {
        return this.search(query, ['text', 'note', 'page']);
    }

    /**
     * 更新划线笔记
     * @param {string} id - 划线ID
     * @param {string} note - 新笔记内容
     */
    updateHighlightNote(id, note) {
        const highlight = this.data.find(h => h.id === id);
        if (highlight) {
            highlight.note = note;
            this.saveData();

            // 更新页面元素
            const element = document.querySelector(`.hm-highlight[data-id="${id}"]`);
            if (element) {
                element.dataset.note = note;
            }
            this.showToast('笔记已更新', 'success');
        }
    }

    /**
     * 导出划线
     * @returns {Object} 导出数据
     */
    exportHighlights() {
        return {
            exportTime: new Date().toISOString(),
            page: this.getPageInfo(),
            highlights: this.data
        };
    }

    /**
     * 注入样式（仅包含右键菜单相关样式，划线样式由 css/styles.css 提供）
     */
    injectStyles() {
        if (document.getElementById('hm-styles')) return;

        const style = document.createElement('style');
        style.id = 'hm-styles';
        style.textContent = `
            /* 右键菜单样式 */
            #hm-context-menu {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .hm-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                color: var(--fq-text-primary);
                font-size: 13px;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .hm-menu-item:hover {
                background: var(--fq-border-hover);
            }
            
            .hm-menu-icon {
                font-size: 16px;
            }
            
            .hm-color-picker {
                display: flex;
                gap: 6px;
                padding: 8px 14px;
                border-top: 1px solid var(--fq-border);
                margin-top: 4px;
            }
            
            .hm-color-option {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                cursor: pointer;
                border: 2px solid transparent;
                transition: transform 0.2s, border-color 0.2s;
            }
            
            .hm-color-option:hover {
                transform: scale(1.2);
            }
            
            .hm-color-option.selected {
                border-color: var(--fq-text-primary);
            }
        `;
        document.head.appendChild(style);
    }
}

// 初始化 - 使用防重复初始化标志
if (!window._highlightManagerInitialized) {
    window._highlightManagerInitialized = true;
    document.addEventListener('DOMContentLoaded', () => {
        window.highlightManager = new HighlightManager();
    });
}
