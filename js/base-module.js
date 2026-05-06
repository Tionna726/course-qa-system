/**
 * BaseModule 公共基类 v1.0
 * 为所有模块提供通用方法：数据加载/保存、HTML转义、Toast通知、防抖
 */

/**
 * 基础模块类
 * @class
 */
class BaseModule {
    /**
     * @param {Object} options - 配置选项
     * @param {string} options.storageKey - localStorage 键名
     */
    constructor(options = {}) {
        /** @type {Object} 模块配置 */
        this.options = options;
        /** @type {Object[]} 数据数组 */
        this.data = [];
        /** @type {number|null} 防抖定时器 */
        this.debounceTimer = null;
        /** @type {string} 主题 'dark' | 'light' */
        this.theme = this.loadTheme();
    }

    // ==================== 数据存储 ====================

    /**
     * 从 localStorage 加载数据
     * @param {string} [key] - 存储键，默认使用 options.storageKey
     * @returns {Object[]|null} 解析后的数据，失败返回 null
     */
    loadData(key = this.options?.storageKey) {
        if (!key) return null;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                this.data = JSON.parse(saved);
                return this.data;
            }
        } catch (e) {
            this.showToast('数据加载失败，可能是数据损坏', 'error');
            console.error('[BaseModule] loadData error:', e);
        }
        return null;
    }

    /**
     * 保存数据到 localStorage（带防抖）
     * @param {string} [key] - 存储键，默认使用 options.storageKey
     * @param {Object[]} [data] - 数据，默认使用 this.data
     * @param {number} [delay=500] - 防抖延迟(ms)
     */
    saveData(key = this.options?.storageKey, data = this.data, delay = 500) {
        if (!key) return;
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    this.showToast('存储空间不足，请清理浏览器数据', 'error');
                } else {
                    this.showToast('保存失败', 'error');
                }
                console.error('[BaseModule] saveData error:', e);
            }
        }, delay);
    }

    /**
     * 立即保存（无防抖，用于退出时）
     * @param {string} [key] - 存储键
     * @param {Object[]} [data] - 数据
     */
    saveDataImmediate(key = this.options?.storageKey, data = this.data) {
        if (!key) return;
        clearTimeout(this.debounceTimer);
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            this.showToast('保存失败', 'error');
        }
    }

    // ==================== 工具方法 ====================

    /**
     * HTML 转义（防止 XSS）
     * @param {string} text - 原始文本
     * @returns {string} 转义后的安全文本
     */
    escapeHtml(text) {
        if (!text && text !== 0) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * 显示 Toast 通知
     * @param {string} message - 通知内容
     * @param {'success'|'error'|'warning'|'info'} [type='info'] - 通知类型
     */
    showToast(message, type = 'info') {
        if (window.Toast) {
            Toast.show(message, type);
        } else {
            console.warn('[Toast not loaded]', message);
        }
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} [wait=500] - 等待时间(ms)
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait = 500) {
        return (...args) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * 生成唯一 ID
     * @returns {string} 时间戳 + 随机数
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // ==================== 主题管理 ====================

    /**
     * 加载保存的主题
     * @returns {string} 'dark' | 'light'
     */
    loadTheme() {
        try {
            const saved = localStorage.getItem('fq-theme');
            return saved || 'dark';
        } catch {
            return 'dark';
        }
    }

    /**
     * 保存主题偏好
     * @param {string} theme - 'dark' | 'light'
     */
    saveTheme(theme) {
        try {
            localStorage.setItem('fq-theme', theme);
            this.theme = theme;
        } catch (e) {
            console.error('[BaseModule] saveTheme error:', e);
        }
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        const newTheme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.saveTheme(newTheme);
    }

    /**
     * 应用主题到 document
     * @param {string} theme - 'dark' | 'light'
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.theme = theme;
    }

    // ==================== 数据导入/导出 ====================

    /**
     * 导出数据为 JSON
     * @param {string} [filename] - 文件名
     */
    exportAsJson(filename = 'export.json') {
        try {
            const content = JSON.stringify({
                exportTime: new Date().toISOString(),
                module: this.constructor.name,
                data: this.data
            }, null, 2);
            
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('导出成功', 'success');
        } catch (e) {
            this.showToast('导出失败', 'error');
        }
    }

    /**
     * 从 JSON 导入数据
     * @param {File} file - 文件对象
     * @returns {Promise<boolean>} 是否成功
     */
    async importFromJson(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    if (json.data && Array.isArray(json.data)) {
                        this.data = json.data;
                        this.saveData();
                        this.showToast(`成功导入 ${json.data.length} 条数据`, 'success');
                        resolve(true);
                    } else {
                        this.showToast('无效的数据格式', 'error');
                        resolve(false);
                    }
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

    // ==================== 搜索功能 ====================

    /**
     * 全文搜索
     * @param {string} query - 搜索关键词
     * @param {string[]} [fields] - 搜索字段，默认 ['content', 'title']
     * @returns {Object[]} 匹配的结果
     */
    search(query, fields = ['content', 'title']) {
        if (!query) return this.data;
        const lowerQuery = query.toLowerCase();
        return this.data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && String(value).toLowerCase().includes(lowerQuery);
            });
        });
    }
}

// 全局暴露
window.BaseModule = BaseModule;
