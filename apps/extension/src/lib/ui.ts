// BrainBox - Shared UI Components
// Contains the Folder Selector and Toast logic to be reused across content scripts

(window as any).BrainBoxUI = class BrainBoxUI {
    private styleInjected: boolean;

    constructor() {
        this.styleInjected = false;
    }

    injectStyles() {
        if (this.styleInjected) return;
        const style = document.createElement('style');
        style.textContent = `
      .brainbox-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        backdrop-filter: blur(2px);
      }
      
      .brainbox-modal {
        background: white;
        border-radius: 12px;
        padding: 20px;
        width: 320px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .brainbox-modal h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        color: #1f2937;
        font-weight: 600;
      }
      
      .brainbox-folder-list {
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
      }
      
      .brainbox-folder-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #374151;
        transition: background 0.1s;
      }
      
      .brainbox-folder-item:hover {
        background: #f3f4f6;
      }
      
      .brainbox-folder-item.selected {
        background: #e0e7ff;
        color: #4f46e5;
      }
      
      .brainbox-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      
      .brainbox-btn {
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border: none;
      }
      
      .brainbox-btn-cancel {
        background: white;
        border: 1px solid #d1d5db;
        color: #374151;
      }
      
      .brainbox-btn-primary {
        background: #4f46e5;
        color: white;
      }
      
      .brainbox-btn-primary:text {
         color: white;
      }
      
      .brainbox-new-folder {
        margin-top: 8px;
        display: flex;
        gap: 4px;
      }
      
      .brainbox-input {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
      }
    `;
        document.head.appendChild(style);
        this.styleInjected = true;
    }

    async showFolderSelector(folders: any[], onSelect?: (id: string | null) => void): Promise<string | null | undefined> {
        this.injectStyles();

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'brainbox-modal-overlay';

            const modal = document.createElement('div');
            modal.className = 'brainbox-modal';

            const title = document.createElement('h3');
            title.textContent = 'Select Folder';

            const list = document.createElement('div');
            list.className = 'brainbox-folder-list';

            let selectedId: string | null = null;

            // Default "Uncategorized" option
            const renderItem = (id: string | null, name: string) => {
                const item = document.createElement('div');
                item.className = 'brainbox-folder-item';
                
                const iconSpan = document.createElement('span');
                iconSpan.textContent = '📁';
                const nameSpan = document.createElement('span');
                nameSpan.textContent = name;
                
                item.appendChild(iconSpan);
                // Add space
                item.appendChild(document.createTextNode(' '));
                item.appendChild(nameSpan);

                item.onclick = () => {
                    document.querySelectorAll('.brainbox-folder-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                    selectedId = id;
                };
                return item;
            };

            list.appendChild(renderItem(null, 'Uncategorized'));

            folders.forEach(folder => {
                list.appendChild(renderItem(folder.id, folder.name));
            });

            const actions = document.createElement('div');
            actions.className = 'brainbox-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'brainbox-btn brainbox-btn-cancel';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => {
                overlay.remove();
                resolve(null);
            };

            const saveBtn = document.createElement('button');
            saveBtn.className = 'brainbox-btn brainbox-btn-primary';
            saveBtn.textContent = 'Save';
            saveBtn.onclick = () => {
                overlay.remove();
                if (onSelect) onSelect(selectedId);
                resolve(selectedId);
            };

            // Add buttons to actions div
            actions.appendChild(cancelBtn);
            actions.appendChild(saveBtn);

            modal.appendChild(title);
            modal.appendChild(list);
            modal.appendChild(actions);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // ESC key to close
            const escHandler = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                    resolve(undefined); // undefined = cancelled
                }
            };
            document.addEventListener('keydown', escHandler);

            // Click outside to close
            overlay.onclick = (e: MouseEvent) => {
                if (e.target === overlay) {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                    resolve(undefined);
                }
            };
        });
    }

    showToast(msg: string, type: string, retryAction: (() => void) | null = null) {
        const existing = document.querySelector('.brainbox-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `brainbox-toast ${type}`;
        
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
        const textColor = '#ffffff';
        
        toast.style.cssText = `
            position: fixed !important;
            bottom: 24px !important;
            right: 24px !important;
            padding: 14px 20px !important;
            border-radius: 12px !important;
            background: ${bgColor} !important;
            color: ${textColor} !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
            z-index: 9999999 !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            min-width: 250px !important;
            max-width: 450px !important;
            word-wrap: break-word !important;
            animation: brainbox-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            cursor: default !important;
        `;
        
        // Add animation keyframes if not exists
        if (!document.getElementById('brainbox-toast-anim')) {
            const anim = document.createElement('style');
            anim.id = 'brainbox-toast-anim';
            anim.textContent = `
                @keyframes brainbox-fade-in {
                    from { opacity: 0; transform: translateY(12px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `;
            document.head.appendChild(anim);
        }

        const icon = document.createElement('span');
        icon.style.fontSize = '18px';
        icon.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        toast.appendChild(icon);
        
        const msgSpan = document.createElement('span');
        msgSpan.textContent = msg;
        msgSpan.style.cssText = `color: ${textColor} !important; flex: 1;`;
        toast.appendChild(msgSpan);

        if (type === 'error' && retryAction) {
            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Retry';
            retryBtn.style.cssText = `
                background: rgba(255,255,255,0.2) !important;
                color: ${textColor} !important;
                border: 1px solid rgba(255,255,255,0.3) !important;
                padding: 4px 10px !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                transition: all 0.2s !important;
            `;
            retryBtn.onclick = (e) => {
                e.stopPropagation();
                toast.remove();
                retryAction();
            };
            toast.appendChild(retryBtn);
        }

        // Close button
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'cursor: pointer; font-size: 20px; opacity: 0.7; padding: 0 4px;';
        closeBtn.onclick = () => toast.remove();
        toast.appendChild(closeBtn);

        document.body.appendChild(toast);
        
        const duration = type === 'error' ? 10000 : type === 'info' ? 7000 : 5000;
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(12px)';
                toast.style.transition = 'all 0.4s ease';
                setTimeout(() => toast.remove(), 400);
            }
        }, duration);
    }

    async showConfirmation(title: string, message: string, confirmText = 'Confirm', cancelText = 'Cancel'): Promise<boolean> {
        this.injectStyles();

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'brainbox-modal-overlay';
            overlay.style.zIndex = '10000000';

            const modal = document.createElement('div');
            modal.className = 'brainbox-modal';
            modal.style.width = '380px';
            modal.style.padding = '24px';

            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            titleEl.style.marginBottom = '12px';

            const content = document.createElement('p');
            content.textContent = message;
            content.style.cssText = 'font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 24px;';

            const actions = document.createElement('div');
            actions.className = 'brainbox-actions';
            actions.style.marginTop = '0';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'brainbox-btn brainbox-btn-cancel';
            cancelBtn.textContent = cancelText;
            cancelBtn.onclick = () => {
                overlay.remove();
                resolve(false);
            };

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'brainbox-btn brainbox-btn-primary';
            confirmBtn.textContent = confirmText;
            confirmBtn.style.background = '#ef4444'; // Red for caution
            confirmBtn.onclick = () => {
                overlay.remove();
                resolve(true);
            };

            modal.appendChild(titleEl);
            modal.appendChild(content);
            modal.appendChild(actions);
            actions.appendChild(cancelBtn);
            actions.appendChild(confirmBtn);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        });
    }
}
