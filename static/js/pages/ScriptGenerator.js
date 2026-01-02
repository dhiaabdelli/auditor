export class ScriptGeneratorPage {
    constructor() {
        this.adapterCount = 1;
    }

    async render() {
        return `
            <div class="page-container">
                <div class="page-header">
                    <h1 class="page-title">🔧 PowerShell Script Generator</h1>
                    <p class="page-subtitle">Generate ready-to-use PowerShell scripts for network adapter configuration</p>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Network Adapters</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-section">
                            <div id="adapters-container" class="adapters-container">
                                <div class="adapter-input-group">
                                    <input type="text" class="adapter-input" placeholder="Enter network adapter name (e.g., Ethernet, Wi-Fi)" data-index="0">
                                    <button type="button" class="btn btn-danger btn-remove" onclick="scriptGeneratorInstance.removeAdapter(this)" style="display: none;">Remove</button>
                                </div>
                            </div>
                            <button type="button" class="btn btn-primary btn-add" onclick="scriptGeneratorInstance.addAdapter()">
                                <i class="fas fa-plus"></i> Add Another Adapter
                            </button>
                        </div>

                        <div class="actions">
                            <button type="button" class="btn btn-primary" onclick="scriptGeneratorInstance.generateScript()">
                                <i class="fas fa-code"></i> Generate Script
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="scriptGeneratorInstance.downloadScript()">
                                <i class="fas fa-download"></i> Download Script
                            </button>
                        </div>
                    </div>
                </div>

                <div id="preview-section" class="preview-section" style="display: none;">
                    <h2>Generated Script Preview</h2>
                    <div class="script-preview">
                        <pre id="script-content"></pre>
                    </div>
                    <button type="button" class="btn btn-primary btn-copy" onclick="scriptGeneratorInstance.copyToClipboard()">
                        <i class="fas fa-copy"></i> Copy to Clipboard
                    </button>
                </div>

                <div id="message" class="message"></div>
            </div>
        `;
    }

    async mount() {
        // Set global instance
        window.scriptGeneratorInstance = this;
        this.updateRemoveButtons();
    }

    addAdapter() {
        const container = document.getElementById('adapters-container');
        const newGroup = document.createElement('div');
        newGroup.className = 'adapter-input-group';
        newGroup.innerHTML = `
            <input type="text" class="adapter-input" placeholder="Enter network adapter name (e.g., Ethernet, Wi-Fi)" data-index="${this.adapterCount}">
            <button type="button" class="btn btn-danger btn-remove" onclick="scriptGeneratorInstance.removeAdapter(this)">Remove</button>
        `;
        container.appendChild(newGroup);
        this.adapterCount++;
        this.updateRemoveButtons();
    }

    removeAdapter(button) {
        const container = document.getElementById('adapters-container');
        if (container.children.length > 1) {
            button.parentElement.remove();
            this.updateRemoveButtons();
        }
    }

    updateRemoveButtons() {
        const container = document.getElementById('adapters-container');
        const removeButtons = container.querySelectorAll('.btn-remove');
        removeButtons.forEach(btn => {
            btn.style.display = container.children.length > 1 ? 'block' : 'none';
        });
    }

    getAdapters() {
        const inputs = document.querySelectorAll('.adapter-input');
        const adapters = [];
        inputs.forEach(input => {
            const name = input.value.trim();
            if (name) {
                adapters.push({ name: name });
            }
        });
        return adapters;
    }

    showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    async generateScript() {
        const adapters = this.getAdapters();
        
        if (adapters.length === 0) {
            this.showMessage('Please enter at least one network adapter name.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/generate-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ adapters: adapters })
            });

            if (!response.ok) {
                throw new Error('Failed to generate script');
            }

            const data = await response.json();
            document.getElementById('script-content').textContent = data.script;
            document.getElementById('preview-section').style.display = 'block';
            
            // Scroll to preview
            document.getElementById('preview-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            this.showMessage('Script generated successfully!', 'success');
        } catch (error) {
            this.showMessage('Error generating script: ' + error.message, 'error');
        }
    }

    async downloadScript() {
        const adapters = this.getAdapters();
        
        if (adapters.length === 0) {
            this.showMessage('Please enter at least one network adapter name.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/download-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ adapters: adapters })
            });

            if (!response.ok) {
                throw new Error('Failed to download script');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `network-setup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ps1`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            this.showMessage('Script downloaded successfully!', 'success');
        } catch (error) {
            this.showMessage('Error downloading script: ' + error.message, 'error');
        }
    }

    copyToClipboard() {
        const scriptContent = document.getElementById('script-content').textContent;
        navigator.clipboard.writeText(scriptContent).then(() => {
            this.showMessage('Script copied to clipboard!', 'success');
        }).catch(err => {
            this.showMessage('Failed to copy to clipboard: ' + err.message, 'error');
        });
    }
}

// Global instance
window.scriptGeneratorInstance = null;

