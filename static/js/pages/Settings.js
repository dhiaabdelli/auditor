export class SettingsPage {
    constructor() {
        this.mfaEnabled = false;
        this.loading = false;
        this.showTokenModal = false;
        this.pendingEnable = false;
        this.mfaStep = 'none'; // 'none', 'generate', 'validate', 'enabled'
        this.qrCodeURL = '';
        this.secret = '';
        this.backupCodes = [];
    }

    async render() {
        return `
            <div class="page-container">
                <div class="page-header">
                    <div class="page-header-content">
                        <div>
                            <h1 class="page-title">⚙️ Settings</h1>
                            <p class="page-subtitle">Manage your account settings and security preferences</p>
                        </div>
                    </div>
                </div>

                <div class="page-content">
                    <div class="settings-section">
                        <div class="settings-card">
                            <div class="settings-card-header">
                                <h2><i class="fas fa-shield-alt"></i> Security</h2>
                                <p class="settings-card-description">Manage your security settings and authentication preferences</p>
                            </div>
                            <div class="settings-card-body">
                                <div class="settings-item">
                                    <div class="settings-item-content">
                                        <div class="settings-item-info">
                                            <h3>Multi-Factor Authentication (MFA)</h3>
                                            <p>Add an extra layer of security to your account by requiring a second authentication factor</p>
                                        </div>
                                        <div class="settings-item-action">
                                            <label class="toggle-switch">
                                                <input type="checkbox" id="mfa-toggle" ${this.mfaEnabled ? 'checked' : ''} onchange="settingsPageInstance.toggleMFA(this.checked)" ${this.mfaStep === 'generate' || this.mfaStep === 'validate' ? 'disabled' : ''}>
                                                <span class="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    ${this.mfaEnabled ? `
                                        <div class="settings-item-details" id="mfa-details">
                                            <div class="mfa-status">
                                                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                                                <span>MFA is enabled</span>
                                            </div>
                                        </div>
                                    ` : ''}
                                    ${this.mfaStep === 'generate' ? `
                                        <div class="settings-item-details" id="mfa-setup">
                                            <div class="mfa-setup-step">
                                                <h4><i class="fas fa-qrcode"></i> Step 1: Scan QR Code</h4>
                                                <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                                                ${this.qrCodeURL ? `
                                                    <div class="qr-code-container">
                                                        <div id="mfa-qrcode"></div>
                                                    </div>
                                                    <div class="mfa-secret-info">
                                                        <p><strong>Secret:</strong> <code>${this.secret}</code></p>
                                                        <p class="form-hint">If you can't scan the QR code, enter this secret manually in your authenticator app</p>
                                                    </div>
                                                    <button class="btn btn-primary" onclick="settingsPageInstance.proceedToValidate()">
                                                        <i class="fas fa-arrow-right"></i> I've scanned the QR code
                                                    </button>
                                                ` : '<div class="loading"><div class="spinner"></div></div>'}
                                            </div>
                                        </div>
                                    ` : ''}
                                    ${this.mfaStep === 'validate' ? `
                                        <div class="settings-item-details" id="mfa-validate">
                                            <div class="mfa-setup-step">
                                                <h4><i class="fas fa-key"></i> Step 2: Validate Code</h4>
                                                <p>Enter the 6-digit code from your authenticator app to verify setup</p>
                                                <div class="settings-form-group">
                                                    <label for="mfa-code-input">Verification Code</label>
                                                    <input 
                                                        type="text" 
                                                        id="mfa-code-input" 
                                                        class="form-control" 
                                                        placeholder="000000"
                                                        maxlength="6"
                                                        pattern="[0-9]{6}"
                                                        autocomplete="off"
                                                        onkeypress="if(event.key === 'Enter') settingsPageInstance.validateCode()"
                                                    />
                                                </div>
                                                <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                                                    <button class="btn btn-secondary" onclick="settingsPageInstance.backToGenerate()">
                                                        <i class="fas fa-arrow-left"></i> Back
                                                    </button>
                                                    <button class="btn btn-primary" onclick="settingsPageInstance.validateCode()">
                                                        <i class="fas fa-check"></i> Validate
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MFA Backup Codes Modal -->
            <div class="modal" id="mfa-backup-codes-modal" style="display: ${this.backupCodes.length > 0 ? 'flex' : 'none'};">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-key"></i> Backup Codes</h2>
                        <button class="modal-close" onclick="settingsPageInstance.closeBackupCodesModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="mfa-backup-codes-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p><strong>Important:</strong> Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator app.</p>
                        </div>
                        <div class="backup-codes-list">
                            ${this.backupCodes.map(code => `
                                <div class="backup-code-item">
                                    <code>${code}</code>
                                    <button class="btn-copy-code" onclick="settingsPageInstance.copyBackupCode('${code}')" title="Copy">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <div class="mfa-backup-codes-hint">
                            <p>Each code can only be used once. Generate new codes if you run out.</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="settingsPageInstance.closeBackupCodesModal()">
                            <i class="fas fa-check"></i> I've saved my backup codes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.settingsPageInstance = this;
        await this.loadSettings();
    }

    async loadSettings() {
        this.loading = true;
        try {
            const response = await fetch('/api/settings/mfa');
            if (response.ok) {
                const data = await response.json();
                this.mfaEnabled = data.enabled || false;
                
                // Determine current step
                if (this.mfaEnabled) {
                    this.mfaStep = 'enabled';
                } else if (data.hasSecret && data.secretValidated) {
                    this.mfaStep = 'validate'; // Ready to enable
                } else if (data.hasSecret && !data.secretValidated) {
                    this.mfaStep = 'validate'; // Need to validate
                } else {
                    this.mfaStep = 'none';
                }
                
                await this.updateDisplay();
            } else {
                console.error('Failed to load MFA settings');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            this.loading = false;
        }
    }

    async toggleMFA(enabled) {
        // If disabling MFA, proceed directly
        if (!enabled) {
            await this.doToggleMFA(false);
            return;
        }

        // If enabling MFA, start the setup process
        // Step 1: Generate TOTP secret
        await this.generateTOTPSecret();
    }

    async generateTOTPSecret() {
        this.loading = true;
        this.mfaStep = 'generate';
        await this.updateDisplay();

        try {
            const response = await fetch('/api/settings/mfa/totp/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({}) // Empty body but valid JSON
            });

            if (response.ok) {
                const data = await response.json();
                this.qrCodeURL = data.qr_code_url || '';
                this.secret = data.secret || '';
                await this.updateDisplay();
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                alert(`Failed to generate TOTP secret: ${errorData.error || 'Unknown error'}`);
                this.mfaStep = 'none';
                const toggle = document.getElementById('mfa-toggle');
                if (toggle) {
                    toggle.checked = false;
                }
                await this.updateDisplay();
            }
        } catch (error) {
            console.error('Error generating TOTP secret:', error);
            alert(`Failed to generate TOTP secret: ${error.message}`);
            this.mfaStep = 'none';
            const toggle = document.getElementById('mfa-toggle');
            if (toggle) {
                toggle.checked = false;
            }
            await this.updateDisplay();
        } finally {
            this.loading = false;
        }
    }

    proceedToValidate() {
        this.mfaStep = 'validate';
        this.updateDisplay();
        setTimeout(() => {
            const input = document.getElementById('mfa-code-input');
            if (input) {
                input.focus();
            }
        }, 100);
    }

    backToGenerate() {
        this.mfaStep = 'generate';
        this.updateDisplay();
    }

    async validateCode() {
        const codeInput = document.getElementById('mfa-code-input');
        if (!codeInput) {
            return;
        }

        const code = codeInput.value.trim();
        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            alert('Please enter a valid 6-digit code');
            codeInput.focus();
            return;
        }

        this.loading = true;
        try {
            const response = await fetch('/api/settings/mfa/totp/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.valid) {
                    // Code validated, now enable MFA
                    await this.enableMFA();
                } else {
                    alert(`Validation failed: ${data.message || 'Invalid code'}`);
                    codeInput.value = '';
                    codeInput.focus();
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                alert(`Validation failed: ${errorData.error || 'Unknown error'}`);
                codeInput.value = '';
                codeInput.focus();
            }
        } catch (error) {
            console.error('Error validating code:', error);
            alert(`Failed to validate code: ${error.message}`);
            codeInput.value = '';
            codeInput.focus();
        } finally {
            this.loading = false;
        }
    }

    async enableMFA() {
        this.loading = true;
        try {
            const response = await fetch('/api/settings/mfa/totp/enable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.mfaEnabled = data.enabled || false;
                this.backupCodes = data.backup_codes || [];
                this.mfaStep = 'enabled';
                
                await this.updateDisplay();
                
                // Show backup codes modal
                if (this.backupCodes.length > 0) {
                    await this.updateDisplay(); // Update to show modal
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                alert(`Failed to enable MFA: ${errorData.error || 'Unknown error'}`);
                this.mfaStep = 'validate';
                await this.updateDisplay();
            }
        } catch (error) {
            console.error('Error enabling MFA:', error);
            alert(`Failed to enable MFA: ${error.message}`);
            this.mfaStep = 'validate';
            await this.updateDisplay();
        } finally {
            this.loading = false;
        }
    }

    async closeBackupCodesModal() {
        this.backupCodes = [];
        this.mfaStep = 'enabled';
        await this.updateDisplay();
    }

    copyBackupCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            // Show feedback
            const btn = event.target.closest('.btn-copy-code');
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-check';
                    setTimeout(() => {
                        icon.className = 'fas fa-copy';
                    }, 2000);
                }
            }
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    }

    async doToggleMFA(enabled) {
        this.loading = true;
        try {
            const response = await fetch('/api/settings/mfa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });

            if (response.ok) {
                const data = await response.json();
                this.mfaEnabled = data.enabled || false;
                this.mfaStep = this.mfaEnabled ? 'enabled' : 'none';
                await this.updateDisplay();
                
                if (!this.mfaEnabled) {
                    console.log('MFA disabled successfully');
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                alert(`Failed to ${enabled ? 'enable' : 'disable'} MFA: ${errorData.error || 'Unknown error'}`);
                // Revert toggle
                const toggle = document.getElementById('mfa-toggle');
                if (toggle) {
                    toggle.checked = !enabled;
                }
            }
        } catch (error) {
            console.error('Error toggling MFA:', error);
            alert(`Failed to ${enabled ? 'enable' : 'disable'} MFA: ${error.message}`);
            // Revert toggle
            const toggle = document.getElementById('mfa-toggle');
            if (toggle) {
                toggle.checked = !enabled;
            }
        } finally {
            this.loading = false;
        }
    }

    async updateDisplay() {
        const container = document.getElementById('page-content');
        if (container) {
            const html = await this.render();
            container.innerHTML = html;
            // Re-attach event listeners after re-render
            const toggle = document.getElementById('mfa-toggle');
            if (toggle) {
                toggle.onchange = (e) => this.toggleMFA(e.target.checked);
            }
            // Generate QR code if we have the URL
            if (this.mfaStep === 'generate' && this.qrCodeURL) {
                this.generateQRCode();
            }
        }
    }

    generateQRCode() {
        const qrContainer = document.getElementById('mfa-qrcode');
        if (!qrContainer || !this.qrCodeURL) {
            return;
        }

        // Clear existing QR code
        qrContainer.innerHTML = '';

        // Use QRCode.js if available
        if (typeof QRCode !== 'undefined') {
            try {
                // Create a white background container for better contrast
                qrContainer.style.backgroundColor = '#ffffff';
                qrContainer.style.padding = '20px';
                qrContainer.style.borderRadius = '8px';
                
                new QRCode(qrContainer, {
                    text: this.qrCodeURL,
                    width: 300,
                    height: 300,
                    colorDark: '#000000', // Pure black for maximum contrast
                    colorLight: '#ffffff', // Pure white for maximum contrast
                    correctLevel: QRCode.CorrectLevel.H // High error correction for better scanning
                });
            } catch (error) {
                console.error('QR Code generation error:', error);
                // Fallback: show error message
                qrContainer.innerHTML = '<p style="color: #ef4444;">Failed to generate QR code. Please use the secret manually.</p>';
            }
        } else {
            // Fallback: show error message
            qrContainer.innerHTML = '<p style="color: #ef4444;">QR Code library not available. Please use the secret manually.</p>';
        }
    }

    cleanup() {
        // Cleanup if needed
    }
}
