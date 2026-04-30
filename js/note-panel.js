/**
 * 笔记面板 - Note Panel v2.0
 * 独立笔记板块，支持划线转笔记、标签分类、检索导出
 */

class NotePanel {
    constructor(options = {}) {
        this.options = {
            storageKey: 'fq-notes',
            enableExport: true,
            enableTags: true,
            ...options
        };
        this.notes = [];
        this.currentTag = null;
        this.searchQuery = '';
        this.loadNotes();
        this.init();
    }

    init() {
        this.createPanel();
        this.bindEvents();
        this.renderNotes();
    }

    loadNotes() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) this.notes = JSON.parse(saved);
        } catch (e) {
            this.notes = [];
        }
    }

    saveNotes() {
        localStorage.setItem(this.options.storageKey, JSON.stringify(this.notes));
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'note-panel';
        this.panel.innerHTML = `
            <div class="np-header" id="np-header">
                <div class="np-title"><span>📝</span><span>学习笔记</span><span class="np-count" id="np-count">0</span></div>
                <div class="np-actions">
                    <button class="np-btn" id="np-add" title="新建">➕</button>
                    <button class="np-btn" id="np-export" title="导出">📤</button>
                    <button class="np-btn" id="np-close" title="关闭">✕</button>
                </div>
            </div>
            <div class="np-content" id="np-content">
                <div class="np-empty" id="np-empty">暂无笔记</div>
                <div class="np-list" id="np-list"></div>
            </div>
            <div class="np-editor" id="np-editor" style="display: none;">
                <div class="np-editor-header">
                    <input type="text" id="np-editor-title" placeholder="笔记标题...">
                </div>
                <div class="np-editor-context" id="np-editor-context"></div>
                <textarea id="np-editor-content" placeholder="写下笔记..."></textarea>
                <div class="np-editor-actions">
                    <button class="np-btn-primary" id="np-save">保存</button>
                    <button class="np-btn-secondary" id="np-cancel">取消</button>
                </div>
            </div>
        `;
        this.panel.style.cssText = `
            position: fixed; right: 20px; top: 150px; width: 340px; max-height: 500px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            z-index: 10000; font-family: -apple-system, sans-serif; overflow: hidden; display: none;
        `;
        document.body.appendChild(this.panel);
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('np-styles')) return;
        const style = document.createElement('style');
        style.id = 'np-styles';
        style.textContent = `
            #note-panel .np-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.1);cursor:move}
            #note-panel .np-title{display:flex;align-items:center;gap:8px;color:#fff;font-weight:600;font-size:14px}
            #note-panel .np-count{background:linear-gradient(135deg,#00b894,#00cec9);color:#fff;font-size:11px;padding:2px 8px;border-radius:10px}
            #note-panel .np-actions{display:flex;gap:4px}
            #note-panel .np-btn{width:28px;height:28px;border:none;background:rgba(255,255,255,0.1);color:#fff;border-radius:6px;cursor:pointer;font-size:12px}
            #note-panel .np-btn:hover{background:rgba(255,255,255,0.2)}
            #note-panel .np-content{max-height:350px;overflow-y:auto;padding:12px}
            #note-panel .np-empty{text-align:center;padding:32px;color:rgba(255,255,255,0.6)}
            #note-panel .np-list{display:flex;flex-direction:column;gap:10px}
            #note-panel .np-note-item{background:rgba(255,255,255,0.05);border-radius:10px;padding:12px;border-left:3px solid #00b894;cursor:pointer}
            #note-panel .np-note-item:hover{background:rgba(255,255,255,0.1)}
            #note-panel .np-note-title{color:#fff;font-size:14px;font-weight:600;margin-bottom:6px}
            #note-panel .np-note-context{font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;padding:6px 8px;background:rgba(255,255,255,0.05);border-radius:4px}
            #note-panel .np-note-content{color:rgba(255,255,255,0.8);font-size:13px;line-height:1.5}
            #note-panel .np-note-meta{display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:rgba(255,255,255,0.4)}
            #note-panel .np-editor{position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,#1a1a2e,#16213e);padding:16px;display:flex;flex-direction:column}
            #note-panel .np-editor-header input{width:100%;padding:8px 12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#fff;font-size:14px;font-weight:600;margin-bottom:12px}
            #note-panel .np-editor-context{font-size:11px;color:rgba(255,255,255,0.6);padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;margin-bottom:12px}
            #note-panel .np-editor textarea{flex:1;width:100%;padding:12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#fff;font-size:13px;resize:none}
            #note-panel .np-editor-actions{display:flex;gap:8px;margin-top:10px}
            #note-panel .np-btn-primary{flex:1;padding:10px;background:linear-gradient(135deg,#00b894,#00cec9);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer}
            #note-panel .np-btn-secondary{padding:10px 16px;background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:rgba(255,255,255,0.7);cursor:pointer}
            #note-panel .np-content::-webkit-scrollbar{width:6px}
            #note-panel .np-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.2);border-radius:3px}
            @media(max-width:768px){#note-panel{left:10px!important;right:10px!important;width:auto!important}}
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        document.getElementById('np-add').onclick = () => this.showEditor();
        document.getElementById('np-export').onclick = () => this.exportNotes();
        document.getElementById('np-close').onclick = () => this.hide();
        document.getElementById('np-save').onclick = () => this.saveNote();
        document.getElementById('np-cancel').onclick = () => this.hideEditor();

        document.addEventListener('keydown', (e) => {
            if ((e.key === 'n' || e.key === 'N') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.show();
                this.showEditor();
            }
        });
    }

    show() { this.panel.style.display = 'block'; this.renderNotes(); }
    hide() { this.panel.style.display = 'none'; }
    showEditor(note = null) {
        document.getElementById('np-editor').style.display = 'flex';
        document.getElementById('np-editor-title').value = note ? note.title : '';
        document.getElementById('np-editor-context').innerHTML = note?.context ? `<strong>原文：</strong>${note.context.substring(0, 100)}...` : '';
        document.getElementById('np-editor-content').value = note ? note.content : '';
        this.editingNote = note;
    }
    hideEditor() { document.getElementById('np-editor').style.display = 'none'; this.editingNote = null; }

    saveNote() {
        const title = document.getElementById('np-editor-title').value.trim() || '无标题笔记';
        const content = document.getElementById('np-editor-content').value.trim();
        if (!content) { alert('请输入笔记内容'); return; }

        if (this.editingNote) {
            this.editingNote.title = title;
            this.editingNote.content = content;
            this.editingNote.updatedAt = new Date().toISOString();
        } else {
            this.notes.unshift({
                id: Date.now(), title, content,
                context: this.editingNote?.context || '',
                createdAt: new Date().toISOString()
            });
        }
        this.saveNotes();
        this.hideEditor();
        this.renderNotes();
    }

    addNote(noteData) {
        this.notes.unshift({
            id: Date.now(),
            title: noteData.title || '无标题笔记',
            content: noteData.content,
            context: noteData.context || '',
            createdAt: new Date().toISOString()
        });
        this.saveNotes();
        this.renderNotes();
    }

    deleteNote(id) {
        if (confirm('确定删除这条笔记？')) {
            this.notes = this.notes.filter(n => n.id !== id);
            this.saveNotes();
            this.renderNotes();
        }
    }

    renderNotes() {
        const list = document.getElementById('np-list');
        const empty = document.getElementById('np-empty');
        document.getElementById('np-count').textContent = this.notes.length;

        if (this.notes.length === 0) {
            empty.style.display = 'block';
            list.innerHTML = '';
            return;
        }
        empty.style.display = 'none';
        list.innerHTML = this.notes.map(note => `
            <div class="np-note-item" data-id="${note.id}">
                <div class="np-note-title">${note.title}</div>
                ${note.context ? `<div class="np-note-context">${note.context.substring(0, 50)}...</div>` : ''}
                <div class="np-note-content">${note.content}</div>
                <div class="np-note-meta">
                    <span>${new Date(note.createdAt).toLocaleDateString('zh-CN')}</span>
                    <button onclick="event.stopPropagation(); notePanel.deleteNote(${note.id})">🗑️</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.np-note-item').forEach(item => {
            item.onclick = () => {
                const note = this.notes.find(n => n.id === parseInt(item.dataset.id));
                this.showEditor(note);
            };
        });
    }

    exportNotes() {
        if (this.notes.length === 0) { alert('暂无笔记'); return; }
        const content = this.notes.map((n, i) => `=== 笔记 ${i+1} ===\n标题：${n.title}\n${n.context ? `原文：${n.context}\n` : ''}内容：${n.content}\n时间：${n.createdAt}\n`).join('\n\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `学习笔记_${new Date().toLocaleDateString('zh-CN')}.txt`;
        a.click();
    }
}

document.addEventListener('DOMContentLoaded', () => { window.notePanel = new NotePanel(); });
