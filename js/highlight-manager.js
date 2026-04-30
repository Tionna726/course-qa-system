/**
 * 划线管理器 - Highlight Manager v2.0
 *
 * 功能：
 * - 划线高亮显示
 * - 保存到本地存储
 * - 自动关联到笔记
 * - 支持全文检索
 */

class HighlightManager {
    constructor(options = {}) {
        this.options = {
            color: '#ffeaa7',           // 默认高亮颜色
            hoverColor: '#f9ca24',      // 悬停高亮颜色
            activeColor: '#fd79a8',     // 激活高亮颜色
            storageKey: 'fq-highlights',
            autoSave: true,             // 自动保存到笔记
            ...options
        };

        this.highlights = [];
        this.loadHighlights();
        this.init();
    }

    // 初始化
    init() {
        this.setupSelectionListener();
        this.setupContextMenu();
        this.renderHighlights();
        this.injectStyles();
    }

    // 加载保存的划线
    loadHighlights() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) {
                this.highlights = JSON.parse(saved);
            }
        } catch (e) {
            console.error('加载划线失败:', e);
            this.highlights = [];
        }
    }

    // 保存划线
    saveHighlights() {
        try {
            localStorage.setItem(this.options.storageKey, JSON.stringify(this.highlights));
        } catch (e) {
            console.error('保存划线失败:', e);
        }
    }

    // 设置选择监听
    setupSelectionListener() {
        document.addEventListener('mouseup', (e) => {
            // 忽略按钮点击
            if (e.target.closest('button')) return;

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

    // 显示右键菜单
    showContextMenu(e, text) {
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.id = 'hm-context-menu';
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
        `;

        this.positionMenu(menu, e.clientX, e.clientY);
        document.body.appendChild(menu);

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
    }

    // 定位菜单
    positionMenu(menu, x, y) {
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 调整位置避免超出屏幕
        let posX = x;
        let posY = y;

        if (x + 160 > viewportWidth) {
            posX = viewportWidth - 170;
        }
        if (y + 120 > viewportHeight) {
            posY = viewportHeight - 130;
        }

        menu.style.cssText = `
            position: fixed;
            left: ${posX}px;
            top: ${posY}px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            padding: 6px;
            z-index: 10001;
            min-width: 160px;
        `;
    }

    // 隐藏菜单
    hideContextMenu() {
        const menu = document.getElementById('hm-context-menu');
        if (menu) menu.remove();
    }

    // 创建划线
    createHighlight(text, metadata = {}) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const parentElement = container.nodeType === 3 ? container.parentElement : container;

        // 检查是否已经在高亮中
        if (parentElement.classList.contains('hm-highlight')) {
            // 移除高亮
            this.removeHighlight(parentElement);
            return;
        }

        // 获取页面信息
        const pageInfo = this.getPageInfo();

        // 创建高亮元素
        const span = document.createElement('span');
        span.className = 'hm-highlight';
        span.dataset.id = Date.now();
        span.dataset.text = text;
        span.dataset.page = pageInfo.title;
        span.dataset.url = pageInfo.url;
        span.dataset.timestamp = new Date().toISOString();
        span.dataset.note = metadata.note || '';

        try {
            range.surroundContents(span);
        } catch (e) {
            // 跨多个元素的情况
            const documentFragment = range.extractContents();
            span.appendChild(documentFragment);
            range.insertNode(span);
        }

        // 保存到列表
        this.highlights.push({
            id: span.dataset.id,
            text: text,
            page: pageInfo.title,
            url: pageInfo.url,
            timestamp: span.dataset.timestamp,
            note: metadata.note || '',
            color: this.options.color
        });

        this.saveHighlights();

        // 触发事件（用于其他组件监听）
        window.dispatchEvent(new CustomEvent('highlight-created', {
            detail: { highlight: this.highlights[this.highlights.length - 1] }
        }));
    }

    // 创建划线+笔记
    createHighlightWithNote(text) {
        const note = prompt('添加笔记（可选）：');
        this.createHighlight(text, { note: note || '' });

        // 如果有笔记，同步到笔记面板
        if (note && window.notePanel) {
            window.notePanel.addNote({
                content: note,
                context: text,
                type: 'highlight-note'
            });
        }
    }

    // 创建划线+提问
    createHighlightWithQuestion(text) {
        this.createHighlight(text);

        // 打开提问面板
        if (window.floatingQuestion) {
            window.floatingQuestion.showNewQuestion(text);
        }
    }

    // 移除划线
    removeHighlight(element) {
        const id = element.dataset.id;
        const parent = element.parentNode;

        // 保留文本内容
        while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);

        // 从列表移除
        this.highlights = this.highlights.filter(h => h.id !== id);
        this.saveHighlights();
    }

    // 渲染页面上的划线
    renderHighlights() {
        // 清除现有渲染
        document.querySelectorAll('.hm-highlight').forEach(el => el.remove());

        const pageInfo = this.getPageInfo();

        this.highlights.forEach(h => {
            // 只渲染当前页面的划线
            if (h.url === pageInfo.url || h.page === pageInfo.title) {
                this.renderHighlightInPage(h);
            }
        });
    }

    // 在页面中渲染单个划线
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

                try {
                    range.surroundContents(span);
                    break; // 只渲染第一个
                } catch (e) {
                    // 忽略跨元素的情况
                }
            }
        }
    }

    // 获取页面信息
    getPageInfo() {
        return {
            title: document.title || '未命名页面',
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }

    // 获取所有划线
    getAllHighlights() {
        return this.highlights;
    }

    // 搜索划线
    searchHighlights(query) {
        const lowerQuery = query.toLowerCase();
        return this.highlights.filter(h =>
            h.text.toLowerCase().includes(lowerQuery) ||
            h.note.toLowerCase().includes(lowerQuery) ||
            h.page.toLowerCase().includes(lowerQuery)
        );
    }

    // 更新划线笔记
    updateHighlightNote(id, note) {
        const highlight = this.highlights.find(h => h.id === id);
        if (highlight) {
            highlight.note = note;
            this.saveHighlights();

            // 更新页面元素
            const element = document.querySelector(`.hm-highlight[data-id="${id}"]`);
            if (element) {
                element.dataset.note = note;
            }
        }
    }

    // 导出划线
    exportHighlights() {
        return {
            exportTime: new Date().toISOString(),
            page: this.getPageInfo(),
            highlights: this.highlights
        };
    }

    // 注入样式
    injectStyles() {
        if (document.getElementById('hm-styles')) return;

        const style = document.createElement('style');
        style.id = 'hm-styles';
        style.textContent = `
            .hm-highlight {
                background: ${this.options.color};
                background-size: 100% 40%;
                background-repeat: no-repeat;
                background-position: 0 90%;
                padding: 2px 0;
                border-radius: 2px;
                cursor: pointer;
                transition: background 0.3s;
                position: relative;
            }

            .hm-highlight:hover {
                background: ${this.options.hoverColor};
            }

            .hm-highlight.active {
                background: ${this.options.activeColor};
            }

            /* 悬停显示笔记 */
            .hm-highlight[data-note]:hover::after {
                content: attr(data-note);
                position: absolute;
                bottom: 100%;
                left: 0;
                background: #1a1a2e;
                color: #fff;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                white-space: nowrap;
                max-width: 300px;
                overflow: hidden;
                text-overflow: ellipsis;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }

            /* 右键菜单样式 */
            #hm-context-menu {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .hm-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                color: #fff;
                font-size: 13px;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .hm-menu-item:hover {
                background: rgba(255,255,255,0.1);
            }

            .hm-menu-icon {
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.highlightManager = new HighlightManager();
});
