/**
 * Toast 通知组件 v1.0
 * 全局 Toast 通知，支持 success/error/warning/info 四种类型
 */

/**
 * Toast 通知类
 */
class Toast {
    /**
     * 显示 Toast 通知
     * @param {string} message - 通知内容
     * @param {'success'|'error'|'warning'|'info'} type - 通知类型
     * @param {number} duration - 显示时长(ms)，默认 3000
     */
    static show(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.innerHTML = `
                <style>
                    #toast-container {
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        z-index: 99999;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        pointer-events: none;
                    }
                    .toast-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 12px 20px;
                        border-radius: 10px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 14px;
                        font-weight: 500;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                        animation: toast-in 0.3s ease;
                        pointer-events: auto;
                        max-width: 400px;
                    }
                    .toast-item.toast-out {
                        animation: toast-out 0.3s ease forwards;
                    }
                    @keyframes toast-in {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes toast-out {
                        from { opacity: 1; transform: translateY(0); }
                        to { opacity: 0; transform: translateY(-20px); }
                    }
                    .toast-success { background: linear-gradient(135deg, #2ecc71, #27ae60); color: #fff; }
                    .toast-error { background: linear-gradient(135deg, #e74c3c, #c0392b); color: #fff; }
                    .toast-warning { background: linear-gradient(135deg, #f39c12, #e67e22); color: #fff; }
                    .toast-info { background: linear-gradient(135deg, #3498db, #2980b9); color: #fff; }
                    .toast-icon { font-size: 16px; flex-shrink: 0; }
                    .toast-message { flex: 1; }
                </style>
            `;
            document.body.appendChild(container);
        }
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: '💡'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${Toast.escapeHtml(message)}</span>
        `;
        
        container.appendChild(toast);
        
        // 自动移除
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    /**
     * HTML 转义
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 全局暴露
window.Toast = Toast;
