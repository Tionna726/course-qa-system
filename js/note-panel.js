/**
 * 笔记面板 - Note Panel v2.1
 *
 * 功能：
 * - 独立笔记板块，支持划线转笔记
 * - 标签分类、检索导出
 * - 数据导入/导出 JSON
 *
 * 安全修复：
 * - 继承 BaseModule，使用 escapeHtml 转义
 * - 监听 CustomEvent 接收划线事件
 * - 错误处理添加 Toast 通知
 */

/**
 * 笔记面板类
 * @class
 */
class NotePanel extends BaseModule {
    /**
     * @param {Object} options - 配置选项
     * @param {string} [options.storageKey='fq-notes'] - 存储键
     * @param {boolean} [options.enableExport=true] - 启用导出
     * @param {boolean} [options.enableTags=true] - 启用标签
     */
    constructor(options = {}) {
        super({
            storageKey: 'fq-notes',
            enableExport: true,
            enableTags: true,
            ...options
        });

        /** @type {string|null} 当前选中的标签 */
        this.currentTag = null;
        /** @type {string} 搜索关键词 */
        this.searchQuery = '';
        /** @type {Object|null} 当前编辑的笔记 */
        this.editingNote = null;
        /** @type {string[]} 所有标签 */
        this.allTags = [];

        this.loadData();
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        this.createPanel();
        this.bindEvents();
        this.renderNotes();
        this.extractTags();
        this.setupEventListeners();
        this.applyTheme();
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 监听划线事件
        window.addEventListener('highlight-with-note', (e) => {
            this.addNote({
                content: e.detail.note,
                context: e.detail.text,
                title: '来自划线的笔记'
            });
        });

        // 监听主题切换
        window.addEventListener('theme-changed', (e) => {
            this.applyTheme(e.detail?.theme);
        });
    }

    /**
     * 加载笔记
     * @returns {Object[]} 笔记列表
     */
    loadNotes() {
        const result = this.loadData();
        if (result === null) {
            this.data = [];
        }
        return this.data;
    }

    /**
     * 保存笔记
     */
    saveNotes() {
        this.saveData();
    }

    /**
     * 创建面板
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'note-panel';
        this.panel.className = 'fq-panel';
        this.panel.innerHTML = `
            <div class="np-header" id="np-header">
                <div class="np-title">
                    <span>📝</span>
                    <span>学习笔记</span>
                    <span class="np-count" id="np-count">0</span>
                </div>
                <div class="np-actions">
                    <button class="fq-theme-toggle" id="np-theme" title="切换主题">🌓</button>
                    <button class="np-btn" id="np-add" title="新建">➕</button>
                    <button class="np-btn" id="np-export" title="导出">📤</button>
                    <button class="np-btn" id="np-import" title="导入">📥</button>
                    <button class="np-btn" id="np-close" title="关闭">✕</button>
                </div>
            </div>
            <div class="np-content" id="np-content">
                <div class="np-search" id="np-search" style="margin-bottom: 12px;">
                    <input type="text" id="np-search-input" placeholder="搜索笔记..."
                           style="width: 100%; padding: 8px 12px; background: var(--fq-bg-tertiary);
                                  border: 1px solid var(--fq-border); border-radius: 8px;
                                  color: var(--fq-text-primary); font-size: 13px; box-sizing: border-box;">
                </div>
                <div class="np-tags" id="np-tags" style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px;"></div>
                <div class="np-empty" id="np-empty">暂无笔记</div>
                <div class="np-list" id="np-list"></div>
            </div>
            <div class="np-editor" id="np-editor">
                <div class="np-editor-header">
                    <input type="text" id="np-editor-title" placeholder="笔记标题...">
                </div>
                <div class="np-editor-context" id="np-editor-context"></div>
                <textarea id="np-editor-content" placeholder="写下笔记..."></textarea>
                <div class="np-editor-tags" style="margin-top: 8px;">
                    <input type="text" id="np-editor-tags" placeholder="标签（用逗号分隔）" style="
                        width: 100%; padding: 8px 12px; background: var(--fq-bg-tertiary);
                        border: 1px solid var(--fq-border); border-radius: 8px;
                        color: var(--fq-text-primary); font-size: 13px; box-sizing: border-box;">
                </div>
                <div class="np-editor-actions">
                    <button class="np-btn-primary" id="np-save">保存</button>
                    <button class="np-btn-secondary" id="np-cancel">取消</button>
                </div>
            </div>
        `;
        this.panel.style.cssText = `
            right: 20px;
            top: 150px;
            width: 340px;
            max-height: 500px;
            background: linear-gradient(135deg, var(--fq-bg-primary) 0%, var(--fq-bg-secondary) 100%);
            border-radius: var(--fq-radius-xl);
            box-shadow: 0 8px 32px var(--fq-shadow);
            z-index: 10000;
            font-family: -apple-system, sans-serif;
            overflow: hidden;
            display: none;
        `;
        document.body.appendChild(this.panel);
        this.injectStyles();
    }

    /**
     * 注入样式
     */
    injectStyles() {
        if (document.getElementById('np-styles')) return;
        // 样式已在 css/styles.css 中定义，此处仅添加特殊样式
        const style = document.createElement('style');
        style.id = 'np-styles';
        style.textContent = `
            /* 搜索框聚焦 */
            #np-search-input:focus {
                outline: none;
                border-color: var(--fq-accent-primary);
            }
            
            /* 标签样式 */
            .np-tag-item {
                padding: 4px 10px;
                background: var(--fq-bg-tertiary);
                border-radius: 12px;
                font-size: 11px;
                color: var(--fq-text-secondary);
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
            }
            
            .np-tag-item:hover {
                background: var(--fq-border-hover);
            }
            
            .np-tag-item.active {
                background: var(--fq-accent-primary);
                color: #fff;
            }
            
            .np-tag-all {
                background: var(--fq-info);
                color: #fff;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        document.getElementById('np-theme').onclick = () => this.toggleTheme();
        document.getElementById('np-add').onclick = () => this.showEditor();
        document.getElementById('np-export').onclick = () => this.exportNotes();
        document.getElementById('np-import').onclick = () => this.importNotes();
        document.getElementById('np-close').onclick = () => this.hide();
        document.getElementById('np-save').onclick = () => this.saveNote();
        document.getElementById('np-cancel').onclick = () => this.hideEditor();

        // 搜索事件
        const searchInput = document.getElementById('np-search-input');
        searchInput.oninput = this.debounce(() => {
            this.searchQuery = searchInput.value.trim();
            this.renderNotes();
        }, 300);

        // 快捷键
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'n' || e.key === 'N') &&
                e.target.tagName !== 'INPUT' &&
                e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.show();
                this.showEditor();
            }
        });
    }

    /**
     * 显示面板
     */
    show() {
        this.panel.style.display = 'block';
        this.renderNotes();
    }

    /**
     * 隐藏面板
     */
    hide() {
        this.panel.style.display = 'none';
    }

    /**
     * 显示编辑器
     * @param {Object|null} note - 要编辑的笔记，null 表示新建
     */
    showEditor(note = null) {
        document.getElementById('np-editor').classList.add('active');
        document.getElementById('np-editor-title').value = note ? this.escapeHtml(note.title || '') : '';
        document.getElementById('np-editor-context').innerHTML = note?.context
            ? `<strong>原文：</strong>${this.escapeHtml(note.context.substring(0, 100))}...`
            : '';
        document.getElementById('np-editor-content').value = note ? this.escapeHtml(note.content || '') : '';
        document.getElementById('np-editor-tags').value = note?.tags?.join(', ') || '';
        this.editingNote = note;

        // 聚焦到标题输入框
        document.getElementById('np-editor-title').focus();
    }

    /**
     * 隐藏编辑器
     */
    hideEditor() {
        document.getElementById('np-editor').classList.remove('active');
        document.getElementById('np-editor-title').value = '';
        document.getElementById('np-editor-content').value = '';
        document.getElementById('np-editor-tags').value = '';
        document.getElementById('np-editor-context').innerHTML = '';
        this.editingNote = null;
    }

    /**
     * 保存笔记
     */
    saveNote() {
        const title = document.getElementById('np-editor-title').value.trim() || '无标题笔记';
        const content = document.getElementById('np-editor-content').value.trim();
        const tagsInput = document.getElementById('np-editor-tags').value.trim();
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

        if (!content) {
            this.showToast('请输入笔记内容', 'warning');
            return;
        }

        // 转义保存
        const escapedContent = this.escapeHtml(content);
        const escapedTitle = this.escapeHtml(title);

        if (this.editingNote) {
            // 更新现有笔记
            this.editingNote.title = escapedTitle;
            this.editingNote.content = escapedContent;
            this.editingNote.tags = tags;
            this.editingNote.updatedAt = new Date().toISOString();
            this.showToast('笔记已更新', 'success');
        } else {
            // 新建笔记
            const note = {
                id: this.generateId(),
                title: escapedTitle,
                content: escapedContent,
                tags: tags,
                context: this.editingNote?.context || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.data.unshift(note);
            this.showToast('笔记已保存', 'success');
        }

        this.saveNotes();
        this.extractTags();
        this.hideEditor();
        this.renderNotes();
    }

    /**
     * 添加笔记（外部调用）
     * @param {Object} noteData - 笔记数据
     * @param {string} noteData.title - 标题
     * @param {string} noteData.content - 内容
     * @param {string} [noteData.context] - 上下文
     */
    addNote(noteData) {
        const note = {
            id: this.generateId(),
            title: this.escapeHtml(noteData.title || '无标题笔记'),
            content: this.escapeHtml(noteData.content),
            tags: noteData.tags || [],
            context: noteData.context ? this.escapeHtml(noteData.context) : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.data.unshift(note);
        this.saveNotes();
        this.extractTags();
        this.renderNotes();
        this.showToast('笔记已添加', 'success');
    }

    /**
     * 删除笔记
     * @param {string} id - 笔记ID
     */
    deleteNote(id) {
        if (confirm('确定删除这条笔记？')) {
            this.data = this.data.filter(n => n.id !== id);
            this.saveNotes();
            this.extractTags();
            this.renderNotes();
            this.showToast('笔记已删除', 'info');
        }
    }

    /**
     * 提取所有标签
     */
    extractTags() {
        const tagSet = new Set();
        this.data.forEach(note => {
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach(tag => tagSet.add(tag));
            }
        });
        this.allTags = Array.from(tagSet);
    }

    /**
     * 渲染标签列表
     */
    renderTags() {
        const container = document.getElementById('np-tags');
        if (!container) return;

        const allTagsHtml = `<span class="np-tag-item np-tag-all ${!this.currentTag ? 'active' : ''}" data-tag="">全部</span>`;
        const tagsHtml = this.allTags.map(tag =>
            `<span class="np-tag-item ${this.currentTag === tag ? 'active' : ''}" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</span>`
        ).join('');

        container.innerHTML = allTagsHtml + tagsHtml;

        // 绑定标签点击事件
        container.querySelectorAll('.np-tag-item').forEach(item => {
            item.onclick = () => {
                this.currentTag = item.dataset.tag || null;
                this.renderTags();
                this.renderNotes();
            };
        });
    }

    /**
     * 渲染笔记列表
     */
    renderNotes() {
        const list = document.getElementById('np-list');
        const empty = document.getElementById('np-empty');
        const count = document.getElementById('np-count');

        // 计算可见笔记
        let visibleNotes = this.data;
        if (this.currentTag) {
            visibleNotes = visibleNotes.filter(n =>
                n.tags && n.tags.includes(this.currentTag)
            );
        }
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            visibleNotes = visibleNotes.filter(n =>
                n.title.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query)
            );
        }

        count.textContent = visibleNotes.length;

        if (visibleNotes.length === 0) {
            empty.style.display = 'block';
            list.innerHTML = '';
            return;
        }

        empty.style.display = 'none';

        // 安全转义渲染
        list.innerHTML = visibleNotes.map(note => `
            <div class="np-note-item" data-id="${note.id}">
                <div class="np-note-title">${this.escapeHtml(note.title)}</div>
                ${note.context ? `<div class="np-note-context">${this.escapeHtml(note.context.substring(0, 50))}...</div>` : ''}
                ${note.tags && note.tags.length > 0 ? `<div class="np-note-tags" style="margin-bottom: 6px;">${note.tags.map(t => `<span class="np-tag-item" style="cursor: default;">${this.escapeHtml(t)}</span>`).join('')}</div>` : ''}
                <div class="np-note-content">${this.escapeHtml(note.content)}</div>
                <div class="np-note-meta">
                    <span>${new Date(note.createdAt).toLocaleDateString('zh-CN')}</span>
                    <button onclick="event.stopPropagation(); window.notePanel.deleteNote('${note.id}')">🗑️</button>
                </div>
            </div>
        `).join('');

        // 绑定点击事件
        list.querySelectorAll('.np-note-item').forEach(item => {
            item.onclick = () => {
                const note = this.data.find(n => n.id === item.dataset.id);
                if (note) {
                    this.showEditor(note);
                }
            };
        });

        this.renderTags();
    }

    /**
     * 导出笔记
     * @param {'txt'|'json'} [format='txt'] - 导出格式
     */
    exportNotes(format = 'txt') {
        if (this.data.length === 0) {
            this.showToast('暂无笔记可导出', 'warning');
            return;
        }

        const timestamp = new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-').replace(/\s/g, '_');

        if (format === 'json') {
            this.exportAsJson(`学习笔记_${timestamp}.json`);
        } else {
            let content = '=== 课件学习笔记 ===\n\n';
            content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
            content += `笔记总数: ${this.data.length}\n`;
            content += '='.repeat(40) + '\n\n';

            this.data.forEach((n, i) => {
                content += `【笔记 ${i + 1}】\n`;
                content += `标题: ${n.title}\n`;
                if (n.tags && n.tags.length > 0) {
                    content += `标签: ${n.tags.join(', ')}\n`;
                }
                if (n.context) {
                    content += `原文: ${n.context}\n`;
                }
                content += `内容: ${n.content}\n`;
                content += `时间: ${n.createdAt}\n`;
                content += '-'.repeat(40) + '\n\n';
            });

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `学习笔记_${timestamp}.txt`;
            a.click();
            URL.revokeObjectURL(a.href);
            this.showToast('导出成功', 'success');
        }
    }

    /**
     * 导入笔记
     */
    importNotes() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.importFromJson(file);
                this.extractTags();
                this.renderNotes();
            }
        };
        input.click();
    }

    /**
     * 从 JSON 导入
     * @param {File} file - 文件
     * @returns {Promise<boolean>}
     */
    async importFromJson(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    let imported = [];

                    if (Array.isArray(json)) {
                        imported = json;
                    } else if (json.data && Array.isArray(json.data)) {
                        imported = json.data;
                    } else {
                        this.showToast('无效的数据格式', 'error');
                        resolve(false);
                        return;
                    }

                    // 合并导入（避免 ID 冲突）
                    const existingIds = new Set(this.data.map(n => n.id));
                    const newNotes = imported.filter(n => !existingIds.has(n.id));

                    this.data = [...newNotes, ...this.data];
                    this.saveNotes();
                    this.showToast(`成功导入 ${newNotes.length} 条笔记`, 'success');
                    resolve(true);
                } catch (err) {
                    this.showToast('文件解析失败', 'error');
                    resolve(false);
                }
            };
            reader.onerror = () => {
                this.showToast('文件读取失败', 'error');
                resolve(false);
            };
            reader.readAsText(file);
        });
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.notePanel = new NotePanel();
});
