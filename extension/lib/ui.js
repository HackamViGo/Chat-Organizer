// BrainBox - Shared UI Components
// Contains the Folder Selector and Toast logic to be reused across content scripts

// BrainBox - Shared UI Components
// Contains the Folder Selector and Toast logic to be reused across content scripts

window.BrainBoxUI = class BrainBoxUI {
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

    async showFolderSelector(folders, onSelect) {
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

            let selectedId = null;

            // Default "Uncategorized" option
            const renderItem = (id, name) => {
                const item = document.createElement('div');
                item.className = 'brainbox-folder-item';
                item.innerHTML = `<span>📁</span> <span>${name}</span>`;
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
                resolve(selectedId);
            };

            modal.appendChild(title);
            modal.appendChild(list);
            modal.appendChild(actions);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        });
    }
}
