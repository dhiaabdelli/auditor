export class BatchGeneratorPage {
    constructor() {
        this.commandCount = 1;
    }

    async render() {
        return `
            <div class="page-container">
                <div class="page-header">
                    <h1 class="page-title">📝 Batch Script Generator</h1>
                    <p class="page-subtitle">Generate Windows batch scripts for system and network configuration</p>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Batch Commands</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-section">
                            <div id="commands-container" class="adapters-container">
                                <div class="adapter-input-group">
                                    <input type="text" class="adapter-input" placeholder="Enter batch command (e.g., ipconfig /all, netstat -an)" data-index="0">
                                    <button type="button" class="btn btn-danger btn-remove" onclick="batchGeneratorInstance.removeCommand(this)" style="display: none;">Remove</button>
                                </div>
                            </div>
                            <button type="button" class="btn btn-primary btn-add" onclick="batchGeneratorInstance.addCommand()">
                                <i class="fas fa-plus"></i> Add Another Command
                            </button>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Script Options</label>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" id="pause-at-end" checked>
                                    <span>Pause at end</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" id="run-as-admin">
                                    <span>Run as administrator</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" id="echo-commands" checked>
                                    <span>Echo commands</span>
                                </label>
                            </div>
                        </div>

                        <div class="actions">
                            <button type="button" class="btn btn-primary" onclick="batchGeneratorInstance.generateScript()">
                                <i class="fas fa-code"></i> Generate Script
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="batchGeneratorInstance.downloadScript()">
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
                    <button type="button" class="btn btn-primary btn-copy" onclick="batchGeneratorInstance.copyToClipboard()">
                        <i class="fas fa-copy"></i> Copy to Clipboard
                    </button>
                </div>

                <div id="message" class="message"></div>
            </div>
        `;
    }

    async mount() {
        window.batchGeneratorInstance = this;
        this.updateRemoveButtons();
    }

    addCommand() {
        const container = document.getElementById('commands-container');
        const newGroup = document.createElement('div');
        newGroup.className = 'adapter-input-group';
        newGroup.innerHTML = `
            <input type="text" class="adapter-input" placeholder="Enter batch command" data-index="${this.commandCount}">
            <button type="button" class="btn btn-danger btn-remove" onclick="batchGeneratorInstance.removeCommand(this)">Remove</button>
        `;
        container.appendChild(newGroup);
        this.commandCount++;
        this.updateRemoveButtons();
    }

    removeCommand(button) {
        const container = document.getElementById('commands-container');
        if (container.children.length > 1) {
            button.parentElement.remove();
            this.updateRemoveButtons();
        }
    }

    updateRemoveButtons() {
        const container = document.getElementById('commands-container');
        const removeButtons = container.querySelectorAll('.btn-remove');
        removeButtons.forEach(btn => {
            btn.style.display = container.children.length > 1 ? 'block' : 'none';
        });
    }

    getCommands() {
        const inputs = document.querySelectorAll('#commands-container .adapter-input');
        const commands = [];
        inputs.forEach(input => {
            const cmd = input.value.trim();
            if (cmd) {
                commands.push(cmd);
            }
        });
        return commands;
    }

    showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    generateScript() {
        const commands = this.getCommands();
        
        if (commands.length === 0) {
            this.showMessage('Please enter at least one command.', 'error');
            return;
        }

        const pauseAtEnd = document.getElementById('pause-at-end').checked;
        const runAsAdmin = document.getElementById('run-as-admin').checked;
        const echoCommands = document.getElementById('echo-commands').checked;

        let script = '@echo off\n';
        
        if (runAsAdmin) {
            script += ':: Check for administrator privileges\n';
            script += 'net session >nul 2>&1\n';
            script += 'if %errorLevel% neq 0 (\n';
            script += '    echo This script requires administrator privileges.\n';
            script += '    echo Please run as administrator.\n';
            script += '    pause\n';
            script += '    exit /b 1\n';
            script += ')\n\n';
        }

        if (echoCommands) {
            script += 'echo Starting batch script execution...\n';
            script += 'echo.\n\n';
        }

        commands.forEach((cmd, index) => {
            if (echoCommands) {
                script += `echo Executing: ${cmd}\n`;
            }
            script += `${cmd}\n`;
            if (echoCommands && index < commands.length - 1) {
                script += 'echo.\n';
            }
        });

        if (pauseAtEnd) {
            script += '\necho.\necho Script execution completed.\npause\n';
        }

        document.getElementById('script-content').textContent = script;
        document.getElementById('preview-section').style.display = 'block';
        document.getElementById('preview-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.showMessage('Script generated successfully!', 'success');
    }

    downloadScript() {
        const scriptContent = document.getElementById('script-content').textContent;
        if (!scriptContent) {
            this.showMessage('Please generate the script first.', 'error');
            return;
        }

        const blob = new Blob([scriptContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batch-script-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.bat`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showMessage('Script downloaded successfully!', 'success');
    }

    copyToClipboard() {
        const scriptContent = document.getElementById('script-content').textContent;
        if (!scriptContent) {
            this.showMessage('Please generate the script first.', 'error');
            return;
        }
        navigator.clipboard.writeText(scriptContent).then(() => {
            this.showMessage('Script copied to clipboard!', 'success');
        }).catch(err => {
            this.showMessage('Failed to copy to clipboard: ' + err.message, 'error');
        });
    }
}

window.batchGeneratorInstance = null;

