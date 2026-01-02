export class Modal {
    constructor() {
        this.isOpen = false;
        this.title = '';
        this.content = '';
        this.actions = [];
        this.large = false;
        this.small = false;
    }

    render() {
        if (!this.isOpen) return '';

        let sizeAttr = '';
        if (this.large) {
            sizeAttr = 'data-large="true"';
        } else if (this.small) {
            sizeAttr = 'data-small="true"';
        }

        return `
            <div class="modal-overlay" onclick="modalInstance.close()">
                <div class="modal-container" ${sizeAttr} onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <div class="modal-title-wrapper">
                            <h2 class="modal-title">${this.title}</h2>
                        </div>
                        <button class="modal-close" onclick="modalInstance.close()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${this.content}
                    </div>
                    ${this.actions.length > 0 ? `
                        <div class="modal-footer">
                            ${this.actions.map(action => `
                                <button class="btn ${action.class || 'btn-secondary'}" 
                                        onclick="${action.onclick}">
                                    ${action.icon ? `<i class="${action.icon}"></i> ` : ''}${action.label}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    open(title, content, actions = [], large = false, small = false) {
        this.title = title;
        this.content = content;
        this.actions = actions;
        this.large = large;
        this.small = small;
        this.isOpen = true;
        this.updateDisplay();
    }

    close() {
        this.isOpen = false;
        this.updateDisplay();
    }

    updateDisplay() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = this.render();
        }
    }
}

