export class WebToolsPage {
    constructor() {
        this.activeTab = 'otp';
        // OTP Generator
        this.otpSecret = this.generateRandomSecret();
        this.otpInterval = 30;
        this.otpDigits = 6;
        this.otpAlgorithm = 'SHA1';
        this.otpCurrent = '';
        this.otpPrevious = '';
        this.otpNext = '';
        this.otpTimeRemaining = 0;
        this.otpUpdateInterval = null;
        this.qrCodeGenerated = false;
        // JWT Parser
        this.jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        this.jwtHeader = null;
        this.jwtPayload = null;
        this.jwtSignature = null;
        // Keycode Info
        this.keycodeInfo = null;
        // JSON Diff
        this.jsonDiff1 = '';
        this.jsonDiff2 = '';
        this.jsonDiffResult = null;
        // Basic Auth
        this.basicAuthUsername = '';
        this.basicAuthPassword = '';
        this.basicAuthHeader = '';
    }

    render() {
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <h1 class="page-title"><i class="fas fa-globe"></i> Web Tools</h1>
                </div>

                <div class="network-tools-container">
                    <div class="network-tabs">
                        <button class="network-tab ${this.activeTab === 'otp' ? 'active' : ''}" 
                                onclick="webToolsInstance.switchTab('otp')">
                            <i class="fas fa-mobile-alt"></i> OTP Generator
                        </button>
                        <button class="network-tab ${this.activeTab === 'jwt' ? 'active' : ''}" 
                                onclick="webToolsInstance.switchTab('jwt')">
                            <i class="fas fa-code"></i> JWT Parser
                        </button>
                        <button class="network-tab ${this.activeTab === 'keycode' ? 'active' : ''}" 
                                onclick="webToolsInstance.switchTab('keycode')">
                            <i class="fas fa-keyboard"></i> Keycode Info
                        </button>
                        <button class="network-tab ${this.activeTab === 'jsondiff' ? 'active' : ''}" 
                                onclick="webToolsInstance.switchTab('jsondiff')">
                            <i class="fas fa-code-branch"></i> JSON Diff
                        </button>
                        <button class="network-tab ${this.activeTab === 'basicauth' ? 'active' : ''}" 
                                onclick="webToolsInstance.switchTab('basicauth')">
                            <i class="fas fa-shield-alt"></i> Basic Auth
                        </button>
                    </div>

                    <div class="network-tab-content">
                        ${this.renderActiveTab()}
                    </div>
                </div>
            </div>
        `;
    }

    renderActiveTab() {
        switch (this.activeTab) {
            case 'otp':
                return this.renderOTP();
            case 'jwt':
                return this.renderJWT();
            case 'keycode':
                return this.renderKeycode();
            case 'jsondiff':
                return this.renderJSONDiff();
            case 'basicauth':
                return this.renderBasicAuth();
            default:
                return this.renderOTP();
        }
    }

    // ========== OTP Generator ==========
    renderOTP() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-key"></i> Secret
                        </label>
                        <input 
                            type="text" 
                            id="otp-secret" 
                            class="form-input" 
                            placeholder="Enter secret key"
                            value="${this.escapeHtml(this.otpSecret)}"
                            oninput="webToolsInstance.onOTPInput()"
                        />
                    </div>
                </div>
                ${this.renderOTPResults()}
            </div>
        `;
    }

    renderOTPResults() {
        if (!this.otpCurrent && !this.otpPrevious && !this.otpNext) {
            return this.renderPlaceholder('Enter a secret key to generate OTP codes');
        }

        const otpURI = this.getOTPURI();
        
        return `
            <div class="tool-results">
                <div class="otp-split-container">
                    <div class="otp-left-section">
                        <div class="otp-codes-section">
                            <div class="result-card otp-code-card" onclick="webToolsInstance.copyOTP('${this.escapeHtml(this.otpPrevious || '-')}')" title="Click to copy">
                                <div class="result-label">Previous</div>
                                <div class="result-value otp-code">${this.escapeHtml(this.otpPrevious || '-')}</div>
                                <div class="otp-copy-hint"><i class="fas fa-copy"></i> Click to copy</div>
                            </div>
                            <div class="result-card otp-current-card otp-code-card" onclick="webToolsInstance.copyOTP('${this.escapeHtml(this.otpCurrent || '-')}')" title="Click to copy">
                                <div class="result-label">Current OTP</div>
                                <div class="result-value otp-code otp-current">${this.escapeHtml(this.otpCurrent || '-')}</div>
                                ${this.otpTimeRemaining > 0 ? `
                                    <div class="otp-progress-container">
                                        <div class="otp-progress-bar">
                                            <div class="otp-progress-fill" style="width: ${((this.otpInterval - this.otpTimeRemaining) / this.otpInterval) * 100}%"></div>
                                        </div>
                                        <div class="otp-timer">Next in ${this.otpTimeRemaining}s</div>
                                    </div>
                                ` : ''}
                                <div class="otp-copy-hint"><i class="fas fa-copy"></i> Click to copy</div>
                            </div>
                            <div class="result-card otp-code-card" onclick="webToolsInstance.copyOTP('${this.escapeHtml(this.otpNext || '-')}')" title="Click to copy">
                                <div class="result-label">Next</div>
                                <div class="result-value otp-code">${this.escapeHtml(this.otpNext || '-')}</div>
                                <div class="otp-copy-hint"><i class="fas fa-copy"></i> Click to copy</div>
                            </div>
                        </div>
                        <div class="otp-info-section">
                            <div class="result-card">
                                <div class="result-label">Secret in hexadecimal</div>
                                <div class="result-value crypto-hash">${this.getSecretHex()}</div>
                            </div>
                            <div class="result-card">
                                <div class="result-label">Epoch</div>
                                <div class="result-value">${Math.floor(Date.now() / 1000)}</div>
                            </div>
                            <div class="result-card">
                                <div class="result-label">Iteration</div>
                                <div class="result-value">Count: ${this.getOTPIteration()}</div>
                            </div>
                            <div class="result-card">
                                <div class="result-label">Padded hex</div>
                                <div class="result-value crypto-hash">${this.getPaddedHex()}</div>
                            </div>
                        </div>
                    </div>
                    <div class="otp-right-section">
                        <div class="result-card">
                            <div class="result-label">QR Code</div>
                            <div class="otp-qr-container">
                                <div id="otp-qrcode"></div>
                            </div>
                            <div class="form-group" style="margin-top: 0.5rem;">
                                <button class="btn btn-secondary" onclick="webToolsInstance.downloadQRCode()">
                                    <i class="fas fa-download"></i> Download QR Code
                                </button>
                            </div>
                            <div class="form-group" style="margin-top: 0.5rem;">
                                <button class="btn btn-secondary" onclick="webToolsInstance.openOTPKeyURI()">
                                    <i class="fas fa-external-link-alt"></i> Open Key URI in new tab
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getOTPURI() {
        if (!this.otpSecret) return '';
        const label = encodeURIComponent('OTP');
        const secret = encodeURIComponent(this.otpSecret);
        const issuer = encodeURIComponent('Web Tools');
        const algorithm = this.otpAlgorithm.toLowerCase();
        const digits = this.otpDigits;
        const period = this.otpInterval;
        return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=${algorithm}&digits=${digits}&period=${period}`;
    }

    generateQRCode() {
        if (!this.otpSecret) return;
        
        const qrContainer = document.getElementById('otp-qrcode');
        if (!qrContainer) return;
        
        // Clear existing QR code
        qrContainer.innerHTML = '';
        
        const otpURI = this.getOTPURI();
        if (!otpURI) return;
        
        // Use QRCode.js if available
        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(qrContainer, {
                    text: otpURI,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            } catch (error) {
                console.error('QR Code generation error:', error);
                // Fallback: use API to generate QR code
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpURI)}`;
                qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="max-width: 100%; height: auto;" />`;
            }
        } else {
            // Fallback: use API to generate QR code
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpURI)}`;
            qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="max-width: 100%; height: auto;" />`;
        }
    }

    downloadQRCode() {
        const qrContainer = document.getElementById('otp-qrcode');
        if (!qrContainer) return;
        
        const canvas = qrContainer.querySelector('canvas');
        const img = qrContainer.querySelector('img');
        
        if (canvas) {
            // Download canvas as PNG
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'otp-qrcode.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 'image/png');
        } else if (img) {
            // Download image
            const a = document.createElement('a');
            a.href = img.src;
            a.download = 'otp-qrcode.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    // ========== JWT Parser ==========
    renderJWT() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-code"></i> JWT to decode
                        </label>
                        <textarea 
                            id="jwt-token" 
                            class="form-input" 
                            rows="3"
                            placeholder="Paste your JWT token here..."
                            oninput="webToolsInstance.onJWTInput()"
                        >${this.escapeHtml(this.jwtToken)}</textarea>
                    </div>
                </div>
                ${this.renderJWTResults()}
            </div>
        `;
    }

    renderJWTResults() {
        if (!this.jwtHeader && !this.jwtPayload) {
            return this.renderPlaceholder('Enter a JWT token to decode');
        }

        return `
            <div class="tool-results">
                <div class="jwt-results">
                    <div class="result-card">
                        <div class="result-label">Header</div>
                        <div class="jwt-table">
                            ${this.renderJWTTable(this.jwtHeader)}
                        </div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Payload</div>
                        <div class="jwt-table">
                            ${this.renderJWTTable(this.jwtPayload)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderJWTTable(data) {
        if (!data) return '<div class="jwt-empty">No data</div>';
        
        return Object.entries(data).map(([key, value]) => {
            let displayValue = value;
            let displayType = typeof value;
            
            // Format common JWT claims
            if (key === 'iat' || key === 'exp' || key === 'nbf') {
                const date = new Date(value * 1000);
                displayValue = `${value} (${date.toLocaleDateString()} ${date.toLocaleTimeString()})`;
            } else if (typeof value === 'object') {
                displayValue = JSON.stringify(value, null, 2);
                displayType = 'object';
            } else {
                displayValue = String(value);
            }
            
            return `
                <div class="jwt-row">
                    <div class="jwt-key">${this.escapeHtml(key)}</div>
                    <div class="jwt-value">
                        <span class="jwt-value-text">${this.escapeHtml(displayValue)}</span>
                        ${displayType !== 'object' ? `<span class="jwt-type">(${this.getJWTClaimName(key)})</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    getJWTClaimName(key) {
        const claims = {
            'alg': 'Algorithm',
            'typ': 'Type',
            'sub': 'Subject',
            'iss': 'Issuer',
            'aud': 'Audience',
            'exp': 'Expiration Time',
            'nbf': 'Not Before',
            'iat': 'Issued At',
            'jti': 'JWT ID',
            'name': 'Full name',
            'email': 'Email',
            'role': 'Role'
        };
        return claims[key] || key;
    }

    // ========== Keycode Info ==========
    renderKeycode() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-keyboard"></i> Press the key on your keyboard you want to get info about
                        </label>
                        <input 
                            type="text" 
                            id="keycode-input" 
                            class="form-input keycode-input" 
                            placeholder="Click here and press any key..."
                            onkeydown="webToolsInstance.onKeyDown(event)"
                            onkeyup="webToolsInstance.onKeyUp(event)"
                            autocomplete="off"
                        />
                    </div>
                </div>
                ${this.renderKeycodeResults()}
            </div>
        `;
    }

    renderKeycodeResults() {
        if (!this.keycodeInfo) {
            return this.renderPlaceholder('Press any key in the input field above');
        }

        return `
            <div class="tool-results">
                <div class="result-card">
                    <div class="keycode-info-grid">
                        <div class="keycode-item">
                            <div class="keycode-label">Key</div>
                            <div class="keycode-value">${this.escapeHtml(this.keycodeInfo.key || '-')}</div>
                        </div>
                        <div class="keycode-item">
                            <div class="keycode-label">Code</div>
                            <div class="keycode-value">${this.escapeHtml(this.keycodeInfo.code || '-')}</div>
                        </div>
                        <div class="keycode-item">
                            <div class="keycode-label">Key Code</div>
                            <div class="keycode-value">${this.keycodeInfo.keyCode || '-'}</div>
                        </div>
                        <div class="keycode-item">
                            <div class="keycode-label">Location</div>
                            <div class="keycode-value">${this.keycodeInfo.location || '-'}</div>
                        </div>
                        <div class="keycode-item">
                            <div class="keycode-label">Alt</div>
                            <div class="keycode-value">${this.keycodeInfo.altKey ? 'true' : 'false'}</div>
                        </div>
                        <div class="keycode-item">
                            <div class="keycode-label">Ctrl</div>
                            <div class="keycode-value">${this.keycodeInfo.ctrlKey ? 'true' : 'false'}</div>
                        </div>
                        <div class="keycode-item">
                            <div class="keycode-label">Shift</div>
                            <div class="keycode-value">${this.keycodeInfo.shiftKey ? 'true' : 'false'}</div>
                        </div>
                        <div class="keycode-item">
                            <div class="keycode-label">Meta</div>
                            <div class="keycode-value">${this.keycodeInfo.metaKey ? 'true' : 'false'}</div>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <button class="btn btn-secondary" onclick="webToolsInstance.copyKeycodeJSON()">
                            <i class="fas fa-copy"></i> Copy JSON
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== JSON Diff ==========
    renderJSONDiff() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-file-code"></i> Your first JSON
                        </label>
                        <textarea 
                            id="json-diff-1" 
                            class="form-input" 
                            rows="5"
                            placeholder="Paste your first JSON here..."
                            oninput="webToolsInstance.onJSONDiffInput()"
                        >${this.escapeHtml(this.jsonDiff1)}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-file-code"></i> Your JSON to compare
                        </label>
                        <textarea 
                            id="json-diff-2" 
                            class="form-input" 
                            rows="5"
                            placeholder="Paste your JSON to compare here..."
                            oninput="webToolsInstance.onJSONDiffInput()"
                        >${this.escapeHtml(this.jsonDiff2)}</textarea>
                    </div>
                </div>
                ${this.renderJSONDiffResults()}
            </div>
        `;
    }

    renderJSONDiffResults() {
        if (!this.jsonDiff1 && !this.jsonDiff2) {
            return this.renderPlaceholder('Enter two JSON objects to compare');
        }

        let json1Obj = null;
        let json2Obj = null;
        let json1Error = null;
        let json2Error = null;

        // Try to parse JSON
        if (this.jsonDiff1) {
            try {
                json1Obj = JSON.parse(this.jsonDiff1);
            } catch (e) {
                json1Error = e.message;
            }
        }

        if (this.jsonDiff2) {
            try {
                json2Obj = JSON.parse(this.jsonDiff2);
            } catch (e) {
                json2Error = e.message;
            }
        }

        if (json1Error || json2Error) {
            return `
                <div class="tool-results">
                    <div class="result-card token-error-card">
                        <div class="token-error-content">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>${this.escapeHtml(json1Error || json2Error)}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        if (!json1Obj && !json2Obj) {
            return this.renderPlaceholder('Enter two JSON objects to compare');
        }

        return `
            <div class="tool-results">
                <div class="json-diff-side-by-side">
                    <div class="json-diff-left">
                        <div class="result-card">
                            <div class="result-label">First JSON</div>
                            <pre class="json-display">${json1Obj ? this.escapeHtml(JSON.stringify(json1Obj, null, 2)) : '{}'}</pre>
                        </div>
                    </div>
                    <div class="json-diff-right">
                        <div class="result-card">
                            <div class="result-label">Second JSON</div>
                            <pre class="json-display">${json2Obj ? this.escapeHtml(JSON.stringify(json2Obj, null, 2)) : '{}'}</pre>
                        </div>
                    </div>
                </div>
                ${this.jsonDiffResult && !this.jsonDiffResult.error ? `
                    <div class="result-card" style="margin-top: 0.75rem;">
                        <div class="result-label">Differences</div>
                        <div class="json-diff-results">
                            ${this.jsonDiffResult.added.length > 0 ? `
                                <div class="json-diff-section">
                                    <div class="json-diff-title added">Added</div>
                                    ${this.jsonDiffResult.added.map(item => `
                                        <div class="json-diff-item added">
                                            <code>${this.escapeHtml(item.path)}</code>: ${this.escapeHtml(JSON.stringify(item.value))}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${this.jsonDiffResult.removed.length > 0 ? `
                                <div class="json-diff-section">
                                    <div class="json-diff-title removed">Removed</div>
                                    ${this.jsonDiffResult.removed.map(item => `
                                        <div class="json-diff-item removed">
                                            <code>${this.escapeHtml(item.path)}</code>: ${this.escapeHtml(JSON.stringify(item.value))}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${this.jsonDiffResult.changed.length > 0 ? `
                                <div class="json-diff-section">
                                    <div class="json-diff-title changed">Changed</div>
                                    ${this.jsonDiffResult.changed.map(item => `
                                        <div class="json-diff-item changed">
                                            <code>${this.escapeHtml(item.path)}</code>: 
                                            <span class="json-diff-old">${this.escapeHtml(JSON.stringify(item.oldValue))}</span> 
                                            → 
                                            <span class="json-diff-new">${this.escapeHtml(JSON.stringify(item.newValue))}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${this.jsonDiffResult.added.length === 0 && this.jsonDiffResult.removed.length === 0 && this.jsonDiffResult.changed.length === 0 ? `
                                <div class="json-diff-no-changes">No differences found - JSON objects are identical</div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ========== Basic Auth ==========
    renderBasicAuth() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-user"></i> Username
                        </label>
                        <input 
                            type="text" 
                            id="basicauth-username" 
                            class="form-input" 
                            placeholder="Your username..."
                            value="${this.escapeHtml(this.basicAuthUsername)}"
                            oninput="webToolsInstance.onBasicAuthInput()"
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-lock"></i> Password
                        </label>
                        <input 
                            type="password" 
                            id="basicauth-password" 
                            class="form-input" 
                            placeholder="Your password..."
                            value="${this.escapeHtml(this.basicAuthPassword)}"
                            oninput="webToolsInstance.onBasicAuthInput()"
                        />
                    </div>
                </div>
                ${this.renderBasicAuthResults()}
            </div>
        `;
    }

    renderBasicAuthResults() {
        if (!this.basicAuthHeader) {
            return this.renderPlaceholder('Enter username and password to generate authorization header');
        }

        return `
            <div class="tool-results">
                <div class="result-card">
                    <div class="result-label">Authorization header:</div>
                    <div class="result-value crypto-hash">
                        <code>Authorization: Basic ${this.escapeHtml(this.basicAuthHeader)}</code>
                        <button class="btn btn-sm btn-secondary" onclick="webToolsInstance.copyText('Authorization: Basic ${this.escapeHtml(this.basicAuthHeader)}', this)">
                            <i class="fas fa-copy"></i> Copy header
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== Common Rendering ==========
    renderPlaceholder(message) {
        return `
            <div class="tool-results-placeholder">
                <div class="placeholder-content">
                    <i class="fas fa-info-circle"></i>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            </div>
        `;
    }

    // ========== Event Handlers ==========
    switchTab(tab) {
        this.activeTab = tab;
        this.updateDisplay();
    }

    // ========== OTP Functions ==========
    onOTPInput() {
        const secretInput = document.getElementById('otp-secret');
        
        if (!secretInput) return;
        
        const newSecret = secretInput.value;
        const oldSecret = this.otpSecret;
        
        this.otpSecret = newSecret;
        // Use default values: 30 seconds, 6 digits, SHA1 (standard TOTP)
        this.otpInterval = 30;
        this.otpDigits = 6;
        this.otpAlgorithm = 'SHA1';
        
        // Regenerate QR code if secret changed
        if (newSecret !== oldSecret) {
            this.qrCodeGenerated = false;
        }
        
        this.generateOTP();
    }

    generateOTP() {
        if (!this.otpSecret) {
            this.otpCurrent = '';
            this.otpPrevious = '';
            this.otpNext = '';
            this.updateResultsOnly();
            return;
        }

        try {
            const currentTime = Math.floor(Date.now() / 1000);
            const currentCounter = Math.floor(currentTime / this.otpInterval);
            
            this.otpCurrent = this.generateTOTP(this.otpSecret, currentCounter);
            this.otpPrevious = this.generateTOTP(this.otpSecret, currentCounter - 1);
            this.otpNext = this.generateTOTP(this.otpSecret, currentCounter + 1);
            
            // Calculate time remaining
            const timeInInterval = currentTime % this.otpInterval;
            this.otpTimeRemaining = this.otpInterval - timeInInterval;
            
            this.updateResultsOnly();
            
            // Generate QR code only if not already generated or secret changed
            if (!this.qrCodeGenerated) {
                setTimeout(() => {
                    this.generateQRCode();
                    this.qrCodeGenerated = true;
                }, 100);
            }
            
            // Update timer every second
            if (this.otpUpdateInterval) {
                clearInterval(this.otpUpdateInterval);
            }
            this.otpUpdateInterval = setInterval(() => {
                const time = Math.floor(Date.now() / 1000);
                const timeInInterval = time % this.otpInterval;
                this.otpTimeRemaining = this.otpInterval - timeInInterval;
                
                // Regenerate if counter changed
                const newCounter = Math.floor(time / this.otpInterval);
                const oldCounter = Math.floor((time - 1) / this.otpInterval);
                if (newCounter !== oldCounter) {
                    this.generateOTP();
                } else {
                    // Only update the progress bar, don't regenerate QR code
                    this.updateOTPProgress();
                }
            }, 1000);
        } catch (error) {
            console.error('OTP generation error:', error);
            this.otpCurrent = 'Error generating OTP';
            this.updateResultsOnly();
        }
    }

    updateOTPProgress() {
        // Update only the progress bar and timer without regenerating QR code
        const progressFill = document.querySelector('.otp-progress-fill');
        const timerElement = document.querySelector('.otp-timer');
        
        if (progressFill) {
            const progress = ((this.otpInterval - this.otpTimeRemaining) / this.otpInterval) * 100;
            progressFill.style.width = `${progress}%`;
        }
        
        if (timerElement) {
            timerElement.textContent = `Next in ${this.otpTimeRemaining}s`;
        }
    }

    copyOTP(otp) {
        if (!otp || otp === '-') return;
        this.copyText(otp, null);
    }

    generateRandomSecret() {
        // Generate a random 16-character base32 secret (standard TOTP format)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        let secret = '';
        for (let i = 0; i < 16; i++) {
            secret += chars[randomBytes[i] % chars.length];
        }
        return secret;
    }

    // Base32 decoding for TOTP secrets
    decodeBase32(base32) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        base32 = base32.toUpperCase().replace(/=+$/, ''); // Remove padding
        
        let bits = 0;
        let value = 0;
        let index = 0;
        const output = new Uint8Array(Math.floor((base32.length * 5) / 8));
        
        for (let i = 0; i < base32.length; i++) {
            const char = base32[i];
            const charIndex = alphabet.indexOf(char);
            if (charIndex === -1) continue;
            
            value = (value << 5) | charIndex;
            bits += 5;
            
            if (bits >= 8) {
                output[index++] = (value >>> (bits - 8)) & 0xff;
                bits -= 8;
            }
        }
        
        return output.slice(0, index);
    }

    generateTOTP(secret, counter) {
        if (typeof CryptoJS === 'undefined') {
            return 'CryptoJS library required';
        }

        // Decode Base32 secret to bytes
        let secretBytes;
        try {
            secretBytes = this.decodeBase32(secret);
        } catch (e) {
            // If decoding fails, try treating as raw bytes (for backward compatibility)
            secretBytes = new TextEncoder().encode(secret);
        }
        
        // Convert secret bytes to WordArray for CryptoJS
        const secretHex = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const secretWordArray = CryptoJS.enc.Hex.parse(secretHex);

        // Convert counter to 8-byte array (big-endian)
        const counterBytes = new Uint8Array(8);
        let counterValue = counter;
        for (let i = 7; i >= 0; i--) {
            counterBytes[i] = counterValue & 0xff;
            counterValue = counterValue >>> 8;
        }
        
        // Convert counter bytes to WordArray for HMAC
        const counterHex = Array.from(counterBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const counterWordArray = CryptoJS.enc.Hex.parse(counterHex);
        
        // Generate HMAC using selected algorithm
        let hmac;
        switch (this.otpAlgorithm) {
            case 'SHA256':
                hmac = CryptoJS.HmacSHA256(counterWordArray, secretWordArray);
                break;
            case 'SHA512':
                hmac = CryptoJS.HmacSHA512(counterWordArray, secretWordArray);
                break;
            default:
                hmac = CryptoJS.HmacSHA1(counterWordArray, secretWordArray);
        }
        
        // Convert HMAC to bytes
        const hashHex = hmac.toString(CryptoJS.enc.Hex);
        const hashBytes = new Uint8Array(hashHex.length / 2);
        for (let i = 0; i < hashBytes.length; i++) {
            hashBytes[i] = parseInt(hashHex.substring(i * 2, i * 2 + 2), 16);
        }
        
        // Dynamic truncation (RFC 4226)
        const offset = hashBytes[hashBytes.length - 1] & 0x0f;
        const binary = ((hashBytes[offset] & 0x7f) << 24) |
                      ((hashBytes[offset + 1] & 0xff) << 16) |
                      ((hashBytes[offset + 2] & 0xff) << 8) |
                      (hashBytes[offset + 3] & 0xff);
        
        const otp = binary % Math.pow(10, this.otpDigits);
        return otp.toString().padStart(this.otpDigits, '0');
    }

    getSecretHex() {
        if (!this.otpSecret) return '-';
        return Array.from(new TextEncoder().encode(this.otpSecret))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    getOTPIteration() {
        const currentTime = Math.floor(Date.now() / 1000);
        return Math.floor(currentTime / this.otpInterval);
    }

    getPaddedHex() {
        const counter = this.getOTPIteration();
        const hex = counter.toString(16);
        return hex.padStart(16, '0');
    }

    openOTPKeyURI() {
        if (!this.otpSecret) return;
        
        const label = encodeURIComponent('OTP');
        const secret = encodeURIComponent(this.otpSecret);
        const issuer = encodeURIComponent('Web Tools');
        const algorithm = this.otpAlgorithm.toLowerCase();
        const digits = this.otpDigits;
        const period = this.otpInterval;
        
        const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=${algorithm}&digits=${digits}&period=${period}`;
        window.open(uri, '_blank');
    }

    // ========== JWT Functions ==========
    onJWTInput() {
        const tokenInput = document.getElementById('jwt-token');
        if (!tokenInput) return;
        
        this.jwtToken = tokenInput.value.trim();
        this.parseJWT();
    }

    parseJWT() {
        if (!this.jwtToken) {
            this.jwtHeader = null;
            this.jwtPayload = null;
            this.jwtSignature = null;
            this.updateResultsOnly();
            return;
        }

        try {
            const parts = this.jwtToken.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format - must have 3 parts separated by dots');
            }

            this.jwtHeader = JSON.parse(atob(parts[0]));
            this.jwtPayload = JSON.parse(atob(parts[1]));
            this.jwtSignature = parts[2];
            
            this.updateResultsOnly();
        } catch (error) {
            console.error('JWT parsing error:', error);
            this.jwtHeader = { error: error.message };
            this.jwtPayload = null;
            this.jwtSignature = null;
            this.updateResultsOnly();
        }
    }

    // ========== Keycode Functions ==========
    onKeyDown(event) {
        event.preventDefault();
        
        this.keycodeInfo = {
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            location: this.getKeyLocation(event.location),
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey
        };
        
        this.updateResultsOnly();
    }

    onKeyUp(event) {
        // Keep the info displayed
    }

    getKeyLocation(location) {
        const locations = {
            0: 'Standard',
            1: 'Left',
            2: 'Right',
            3: 'Numpad'
        };
        return locations[location] || 'Unknown';
    }

    copyKeycodeJSON() {
        if (!this.keycodeInfo) return;
        const json = JSON.stringify(this.keycodeInfo, null, 2);
        this.copyText(json, null);
    }

    // ========== JSON Diff Functions ==========
    onJSONDiffInput() {
        const json1Input = document.getElementById('json-diff-1');
        const json2Input = document.getElementById('json-diff-2');
        
        if (!json1Input || !json2Input) return;
        
        this.jsonDiff1 = json1Input.value.trim();
        this.jsonDiff2 = json2Input.value.trim();
        
        this.compareJSON();
    }

    compareJSON() {
        if (!this.jsonDiff1 || !this.jsonDiff2) {
            this.jsonDiffResult = null;
            this.updateResultsOnly();
            return;
        }

        try {
            const obj1 = JSON.parse(this.jsonDiff1);
            const obj2 = JSON.parse(this.jsonDiff2);
            
            this.jsonDiffResult = this.calculateDiff(obj1, obj2);
            this.updateResultsOnly();
        } catch (error) {
            this.jsonDiffResult = { error: 'Invalid JSON: ' + error.message };
            this.updateResultsOnly();
        }
    }

    calculateDiff(obj1, obj2, path = '') {
        const result = {
            added: [],
            removed: [],
            changed: []
        };

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        const allKeys = new Set([...keys1, ...keys2]);

        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const val1 = obj1[key];
            const val2 = obj2[key];

            if (!(key in obj1)) {
                result.added.push({ path: currentPath, value: val2 });
            } else if (!(key in obj2)) {
                result.removed.push({ path: currentPath, value: val1 });
            } else if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null && !Array.isArray(val1) && !Array.isArray(val2)) {
                const nestedDiff = this.calculateDiff(val1, val2, currentPath);
                result.added.push(...nestedDiff.added);
                result.removed.push(...nestedDiff.removed);
                result.changed.push(...nestedDiff.changed);
            } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                result.changed.push({ path: currentPath, oldValue: val1, newValue: val2 });
            }
        }

        return result;
    }

    // ========== Basic Auth Functions ==========
    onBasicAuthInput() {
        const usernameInput = document.getElementById('basicauth-username');
        const passwordInput = document.getElementById('basicauth-password');
        
        if (!usernameInput || !passwordInput) return;
        
        this.basicAuthUsername = usernameInput.value;
        this.basicAuthPassword = passwordInput.value;
        
        this.generateBasicAuth();
    }

    generateBasicAuth() {
        if (!this.basicAuthUsername && !this.basicAuthPassword) {
            this.basicAuthHeader = '';
            this.updateResultsOnly();
            return;
        }

        const credentials = `${this.basicAuthUsername}:${this.basicAuthPassword}`;
        this.basicAuthHeader = btoa(credentials);
        this.updateResultsOnly();
    }

    // ========== Utility Functions ==========
    copyText(text, buttonElement) {
        if (!text) return;
        
        navigator.clipboard.writeText(text).then(() => {
            if (buttonElement) {
                const originalText = buttonElement.innerHTML;
                buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied!';
                buttonElement.style.background = 'var(--success)';
                setTimeout(() => {
                    buttonElement.innerHTML = originalText;
                    buttonElement.style.background = '';
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = this.render();
        }
    }

    updateResultsOnly() {
        const tabContent = document.querySelector('.network-tab-content');
        if (!tabContent) return;
        
        const toolSection = tabContent.querySelector('.tool-section');
        if (!toolSection) return;
        
        const activeElement = document.activeElement;
        const activeId = activeElement && activeElement.id ? activeElement.id : null;
        const cursorPosition = activeElement && activeElement.tagName === 'INPUT' && activeElement.selectionStart !== null ? activeElement.selectionStart : null;
        const textareaPosition = activeElement && activeElement.tagName === 'TEXTAREA' && activeElement.selectionStart !== null ? activeElement.selectionStart : null;
        
        let newResultsHTML = '';
        switch (this.activeTab) {
            case 'otp':
                newResultsHTML = this.renderOTPResults();
                // Generate QR code after rendering
                setTimeout(() => {
                    this.generateQRCode();
                }, 100);
                // Force re-render for OTP to show split layout
                if (newResultsHTML) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newResultsHTML;
                    const newResultsContainer = tempDiv.firstElementChild;
                    if (newResultsContainer) {
                        const resultsContainer = toolSection.querySelector('.tool-results, .tool-results-placeholder');
                        if (resultsContainer) {
                            resultsContainer.replaceWith(newResultsContainer);
                        } else {
                            const inputSection = toolSection.querySelector('.tool-input-section');
                            if (inputSection) {
                                inputSection.insertAdjacentElement('afterend', newResultsContainer);
                            }
                        }
                        // Generate QR code after DOM update
                        setTimeout(() => {
                            this.generateQRCode();
                        }, 50);
                    }
                }
                return;
            case 'jwt':
                newResultsHTML = this.renderJWTResults();
                break;
            case 'keycode':
                newResultsHTML = this.renderKeycodeResults();
                break;
            case 'jsondiff':
                newResultsHTML = this.renderJSONDiffResults();
                break;
            case 'basicauth':
                newResultsHTML = this.renderBasicAuthResults();
                break;
        }
        
        const resultsContainer = toolSection.querySelector('.tool-results, .tool-results-placeholder');
        if (resultsContainer && newResultsHTML) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newResultsHTML;
            const newResultsContainer = tempDiv.firstElementChild;
            if (newResultsContainer) {
                resultsContainer.replaceWith(newResultsContainer);
            }
        } else if (newResultsHTML) {
            const inputSection = toolSection.querySelector('.tool-input-section');
            if (inputSection) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newResultsHTML;
                const newResultsContainer = tempDiv.firstElementChild;
                if (newResultsContainer) {
                    inputSection.insertAdjacentElement('afterend', newResultsContainer);
                }
            }
        }
        
        if (activeId) {
            setTimeout(() => {
                const element = document.getElementById(activeId);
                if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                    element.focus();
                    const pos = cursorPosition !== null ? cursorPosition : textareaPosition;
                    if (pos !== null) {
                        element.setSelectionRange(pos, pos);
                    }
                }
            }, 0);
        }
    }

    async mount() {
        window.webToolsInstance = this;
        
        // Initialize default values
        this.generateOTP();
        this.parseJWT();
        this.generateBasicAuth();
        
        this.updateDisplay();
    }

    unmount() {
        if (this.otpUpdateInterval) {
            clearInterval(this.otpUpdateInterval);
        }
        delete window.webToolsInstance;
    }
}

