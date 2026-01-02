export class CryptoToolsPage {
    constructor() {
        this.activeTab = 'rsa';
        // RSA Key Pair Generator
        this.rsaBits = 2048;
        this.rsaPublicKey = '';
        this.rsaPrivateKey = '';
        // Password Strength - default values
        this.passwordInput = 'MySecurePassword123!';
        this.passwordResult = null;
        // HMAC Generator - default values
        this.hmacText = 'Plain text to compute the hash';
        this.hmacKey = 'secret key';
        this.hmacAlgorithm = 'SHA256';
        this.hmacEncoding = 'hex';
        this.hmacResult = '';
        // BIP39 Generator - default values
        this.bip39Language = 'English';
        this.bip39Entropy = '';
        this.bip39Mnemonic = '';
        // Encrypt/Decrypt - default values
        this.encryptText = 'Lorem ipsum dolor sit amet';
        this.encryptKey = 'my secret key';
        this.encryptAlgorithm = 'AES';
        this.encryptResult = '';
        this.decryptText = '';
        this.decryptKey = 'my secret key';
        this.decryptAlgorithm = 'AES';
        this.decryptResult = '';
        // Bcrypt - default values
        this.bcryptString = 'Your string to bcrypt';
        this.bcryptSaltRounds = 10;
        this.bcryptHash = '';
        this.bcryptCompareString = '';
        this.bcryptCompareHash = '';
        this.bcryptCompareResult = null;
        // Hash Text - default values
        this.hashText = 'Your string to hash';
        this.hashEncoding = 'hex';
        this.hashResults = {}; // Store all hash results
        // Token Generator - default values
        this.tokenUppercase = true;
        this.tokenLowercase = true;
        this.tokenNumbers = true;
        this.tokenSymbols = false;
        this.tokenLength = 64;
        this.tokenGenerated = '';
        // UUID Generator - default values
        this.uuidVersion = 'v4';
        this.uuidQuantity = 1;
        this.uuidNamespace = 'DNS';
        this.uuidName = 'example.com';
        this.uuidGenerated = [];
    }

    render() {
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <h1 class="page-title"><i class="fas fa-key"></i> Crypto Tools</h1>
                </div>

                <div class="network-tools-container">
                    <div class="network-tabs">
                        <button class="network-tab ${this.activeTab === 'rsa' ? 'active' : ''}" 
                                onclick="cryptoToolsInstance.switchTab('rsa')">
                            <i class="fas fa-key"></i> RSA Key Pair
                        </button>
                        <button class="network-tab ${this.activeTab === 'password' ? 'active' : ''}" 
                                onclick="cryptoToolsInstance.switchTab('password')">
                            <i class="fas fa-shield-alt"></i> Password Strength
                        </button>
                        <button class="network-tab ${this.activeTab === 'hmac' ? 'active' : ''}" 
                                onclick="cryptoToolsInstance.switchTab('hmac')">
                            <i class="fas fa-fingerprint"></i> HMAC
                        </button>
                        <button class="network-tab ${this.activeTab === 'bip39' ? 'active' : ''}" 
                                onclick="cryptoToolsInstance.switchTab('bip39')">
                            <i class="fas fa-seedling"></i> BIP39
                        </button>
                        <button class="network-tab ${this.activeTab === 'encrypt' ? 'active' : ''}" 
                                onclick="cryptoToolsInstance.switchTab('encrypt')">
                            <i class="fas fa-lock"></i> Encrypt/Decrypt
                        </button>
                        <button class="network-tab ${this.activeTab === 'bcrypt' ? 'active' : ''}" 
                                onclick="cryptoToolsInstance.switchTab('bcrypt')">
                            <i class="fas fa-hashtag"></i> Bcrypt
                        </button>
                        <button class="network-tab ${this.activeTab === 'hash' ? 'active' : ''}" 
                                onclick="cryptoToolsInstance.switchTab('hash')">
                            <i class="fas fa-hash"></i> Hash Text
                        </button>
                        <button class="network-tab ${this.activeTab === 'token' ? 'active' : ''}" 
                                onclick="cryptoToolsInstance.switchTab('token')">
                            <i class="fas fa-key"></i> Token Generator
                        </button>
                        <button class="network-tab ${this.activeTab === 'uuid' ? 'active' : ''}" 
                                onclick="cryptoToolsInstance.switchTab('uuid')">
                            <i class="fas fa-id-card"></i> UUID Generator
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
            case 'rsa':
                return this.renderRSA();
            case 'password':
                return this.renderPasswordStrength();
            case 'hmac':
                return this.renderHMAC();
            case 'bip39':
                return this.renderBIP39();
            case 'encrypt':
                return this.renderEncryptDecrypt();
            case 'bcrypt':
                return this.renderBcrypt();
            case 'hash':
                return this.renderHash();
            case 'token':
                return this.renderTokenGenerator();
            case 'uuid':
                return this.renderUUIDGenerator();
            default:
                return this.renderRSA();
        }
    }

    // ========== RSA Key Pair Generator ==========
    renderRSA() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-sliders-h"></i> Bits
                        </label>
                        <select 
                            id="rsa-bits" 
                            class="form-input"
                            onchange="cryptoToolsInstance.onRSABitsChange()"
                        >
                            <option value="1024" ${this.rsaBits === 1024 ? 'selected' : ''}>1024</option>
                            <option value="2048" ${this.rsaBits === 2048 ? 'selected' : ''}>2048</option>
                            <option value="4096" ${this.rsaBits === 4096 ? 'selected' : ''}>4096</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button class="btn btn-primary" onclick="cryptoToolsInstance.generateRSA()">
                            <i class="fas fa-sync-alt"></i> Refresh key-pair
                        </button>
                    </div>
                </div>
                ${this.renderRSAResults()}
            </div>
        `;
    }

    renderRSAResults() {
        if (!this.rsaPublicKey && !this.rsaPrivateKey) {
            return this.renderPlaceholder('Click "Refresh key-pair" to generate RSA keys');
        }

        return `
            <div class="tool-results">
                <div class="crypto-results-grid rsa-keys-grid">
                    <div class="result-card">
                        <div class="result-label">Public key</div>
                        <div class="result-value crypto-key">
                            <pre>${this.escapeHtml(this.rsaPublicKey)}</pre>
                            <button class="btn btn-sm btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(this.rsaPublicKey)}', this)">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Private key</div>
                        <div class="result-value crypto-key">
                            <pre>${this.escapeHtml(this.rsaPrivateKey)}</pre>
                            <button class="btn btn-sm btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(this.rsaPrivateKey)}', this)">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== Password Strength ==========
    renderPasswordStrength() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-key"></i> Enter a password...
                        </label>
                        <input 
                            type="password" 
                            id="password-input" 
                            class="form-input" 
                            placeholder="Enter a password..."
                            value="${this.escapeHtml(this.passwordInput)}"
                            oninput="cryptoToolsInstance.onPasswordInput()"
                        />
                    </div>
                </div>
                ${this.passwordResult ? this.renderPasswordResults() : this.renderPlaceholder('Enter a password above to analyze strength')}
            </div>
        `;
    }

    renderPasswordResults() {
        const r = this.passwordResult;
        return `
            <div class="tool-results">
                <div class="password-strength-results">
                    <div class="result-card">
                        <div class="result-label">Duration to crack this password with brute force</div>
                        <div class="result-value highlight">${this.escapeHtml(r.crackTime)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Password length</div>
                        <div class="result-value">${r.length}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Entropy</div>
                        <div class="result-value">${r.entropy.toFixed(2)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Character set size</div>
                        <div class="result-value">${r.charSetSize}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Score</div>
                        <div class="result-value highlight">${r.score} / 100</div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== HMAC Generator ==========
    renderHMAC() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-file-alt"></i> Plain text to compute the hash
                        </label>
                        <input 
                            type="text" 
                            id="hmac-text" 
                            class="form-input" 
                            placeholder="Plain text to compute the hash..."
                            value="${this.escapeHtml(this.hmacText)}"
                            oninput="cryptoToolsInstance.onHMACInput()"
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-key"></i> Secret key
                        </label>
                        <input 
                            type="text" 
                            id="hmac-key" 
                            class="form-input" 
                            placeholder="Enter the secret key..."
                            value="${this.escapeHtml(this.hmacKey)}"
                            oninput="cryptoToolsInstance.onHMACInput()"
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-cog"></i> Hashing function
                        </label>
                        <select 
                            id="hmac-algorithm" 
                            class="form-input"
                            onchange="cryptoToolsInstance.onHMACInput()"
                        >
                            <option value="SHA256" ${this.hmacAlgorithm === 'SHA256' ? 'selected' : ''}>SHA256</option>
                            <option value="SHA1" ${this.hmacAlgorithm === 'SHA1' ? 'selected' : ''}>SHA1</option>
                            <option value="SHA512" ${this.hmacAlgorithm === 'SHA512' ? 'selected' : ''}>SHA512</option>
                            <option value="MD5" ${this.hmacAlgorithm === 'MD5' ? 'selected' : ''}>MD5</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-code"></i> Output encoding
                        </label>
                        <select 
                            id="hmac-encoding" 
                            class="form-input"
                            onchange="cryptoToolsInstance.onHMACInput()"
                        >
                            <option value="hex" ${this.hmacEncoding === 'hex' ? 'selected' : ''}>Hexadecimal (base 16)</option>
                            <option value="base64" ${this.hmacEncoding === 'base64' ? 'selected' : ''}>Base64</option>
                        </select>
                    </div>
                </div>
                ${this.renderHMACResults()}
            </div>
        `;
    }

    renderHMACResults() {
        if (!this.hmacResult) {
            return this.renderPlaceholder('Enter text and secret key above to compute HMAC');
        }

        return `
            <div class="tool-results">
                <div class="result-card full-width">
                    <div class="result-label">HMAC of your text</div>
                    <div class="result-value crypto-hash">
                        ${this.escapeHtml(this.hmacResult)}
                        <button class="btn btn-sm btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(this.hmacResult)}', this)">
                            <i class="fas fa-copy"></i> Copy HMAC
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== BIP39 Generator ==========
    renderBIP39() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-language"></i> Language
                        </label>
                        <select 
                            id="bip39-language" 
                            class="form-input"
                            onchange="cryptoToolsInstance.onBIP39Input()"
                        >
                            <option value="English" ${this.bip39Language === 'English' ? 'selected' : ''}>English</option>
                            <option value="French" ${this.bip39Language === 'French' ? 'selected' : ''}>French</option>
                            <option value="Spanish" ${this.bip39Language === 'Spanish' ? 'selected' : ''}>Spanish</option>
                            <option value="Japanese" ${this.bip39Language === 'Japanese' ? 'selected' : ''}>Japanese</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-random"></i> Entropy (seed)
                        </label>
                        <input 
                            type="text" 
                            id="bip39-entropy" 
                            class="form-input" 
                            placeholder="Leave empty to generate random"
                            value="${this.escapeHtml(this.bip39Entropy)}"
                            oninput="cryptoToolsInstance.onBIP39Input()"
                        />
                        <small class="form-hint">
                            <i class="fas fa-info-circle"></i> Enter hex entropy or leave empty for random generation
                        </small>
                    </div>
                    <div class="form-group">
                        <button class="btn btn-primary" onclick="cryptoToolsInstance.generateBIP39()">
                            <i class="fas fa-sync-alt"></i> Generate
                        </button>
                    </div>
                </div>
                ${this.renderBIP39Results()}
            </div>
        `;
    }

    renderBIP39Results() {
        if (!this.bip39Mnemonic) {
            return this.renderPlaceholder('Generate a BIP39 passphrase above');
        }

        return `
            <div class="tool-results">
                <div class="result-card full-width">
                    <div class="result-label">Entropy (seed)</div>
                    <div class="result-value">${this.escapeHtml(this.bip39Entropy || 'Random')}</div>
                </div>
                <div class="result-card full-width">
                    <div class="result-label">Passphrase (mnemonic)</div>
                    <div class="result-value crypto-mnemonic">
                        ${this.escapeHtml(this.bip39Mnemonic)}
                        <button class="btn btn-sm btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(this.bip39Mnemonic)}', this)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== Encrypt/Decrypt ==========
    renderEncryptDecrypt() {
        return `
            <div class="tool-section">
                <div class="encrypt-decrypt-container">
                    <div class="encrypt-section">
                        <h3 class="section-title">Encrypt</h3>
                        <div class="tool-input-section">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-file-alt"></i> Your text:
                                </label>
                                <textarea 
                                    id="encrypt-text" 
                                    class="form-input" 
                                    rows="3"
                                    placeholder="Lorem ipsum dolor sit amet"
                                    oninput="cryptoToolsInstance.onEncryptInput()"
                                >${this.escapeHtml(this.encryptText)}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-key"></i> Your secret key:
                                </label>
                                <input 
                                    type="text" 
                                    id="encrypt-key" 
                                    class="form-input" 
                                    placeholder="my secret key"
                                    value="${this.escapeHtml(this.encryptKey)}"
                                    oninput="cryptoToolsInstance.onEncryptInput()"
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-cog"></i> Encryption algorithm:
                                </label>
                                <select 
                                    id="encrypt-algorithm" 
                                    class="form-input"
                                    onchange="cryptoToolsInstance.onEncryptInput()"
                                >
                                    <option value="AES" ${this.encryptAlgorithm === 'AES' ? 'selected' : ''}>AES</option>
                                    <option value="TripleDES" ${this.encryptAlgorithm === 'TripleDES' ? 'selected' : ''}>TripleDES</option>
                                    <option value="Rabbit" ${this.encryptAlgorithm === 'Rabbit' ? 'selected' : ''}>Rabbit</option>
                                    <option value="RC4" ${this.encryptAlgorithm === 'RC4' ? 'selected' : ''}>RC4</option>
                                </select>
                            </div>
                        </div>
                        ${this.renderEncryptResult()}
                    </div>
                    <div class="decrypt-section">
                        <h3 class="section-title">Decrypt</h3>
                        <div class="tool-input-section">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-lock"></i> Your encrypted text:
                                </label>
                                <textarea 
                                    id="decrypt-text" 
                                    class="form-input" 
                                    rows="3"
                                    placeholder="U2FsdGVkX1/EC3+6P5dbbkZ3e1kQ5o2yzuU0NHTjmrKnLBEwreV489Kr0DIB+uBs"
                                    oninput="cryptoToolsInstance.onDecryptInput()"
                                >${this.escapeHtml(this.decryptText)}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-key"></i> Your secret key:
                                </label>
                                <input 
                                    type="text" 
                                    id="decrypt-key" 
                                    class="form-input" 
                                    placeholder="my secret key"
                                    value="${this.escapeHtml(this.decryptKey)}"
                                    oninput="cryptoToolsInstance.onDecryptInput()"
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-cog"></i> Encryption algorithm:
                                </label>
                                <select 
                                    id="decrypt-algorithm" 
                                    class="form-input"
                                    onchange="cryptoToolsInstance.onDecryptInput()"
                                >
                                    <option value="AES" ${this.decryptAlgorithm === 'AES' ? 'selected' : ''}>AES</option>
                                    <option value="TripleDES" ${this.decryptAlgorithm === 'TripleDES' ? 'selected' : ''}>TripleDES</option>
                                    <option value="Rabbit" ${this.decryptAlgorithm === 'Rabbit' ? 'selected' : ''}>Rabbit</option>
                                    <option value="RC4" ${this.decryptAlgorithm === 'RC4' ? 'selected' : ''}>RC4</option>
                                </select>
                            </div>
                        </div>
                        ${this.renderDecryptResult()}
                    </div>
                </div>
            </div>
        `;
    }

    renderEncryptResult() {
        if (!this.encryptResult) {
            return '';
        }

        return `
            <div class="tool-results">
                <div class="result-card full-width">
                    <div class="result-label">Your text encrypted:</div>
                    <div class="result-value crypto-hash">
                        ${this.escapeHtml(this.encryptResult)}
                        <button class="btn btn-sm btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(this.encryptResult)}', this)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderDecryptResult() {
        if (!this.decryptResult) {
            return '';
        }

        return `
            <div class="tool-results">
                <div class="result-card full-width">
                    <div class="result-label">Your decrypted text:</div>
                    <div class="result-value">
                        ${this.escapeHtml(this.decryptResult)}
                        <button class="btn btn-sm btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(this.decryptResult)}', this)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== Bcrypt ==========
    renderBcrypt() {
        return `
            <div class="tool-section">
                <div class="encrypt-decrypt-container">
                    <div class="encrypt-section">
                        <h3 class="section-title">Hash</h3>
                        <div class="tool-input-section">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-file-alt"></i> Your string:
                                </label>
                                <input 
                                    type="text" 
                                    id="bcrypt-string" 
                                    class="form-input" 
                                    placeholder="Your string to bcrypt..."
                                    value="${this.escapeHtml(this.bcryptString)}"
                                    oninput="cryptoToolsInstance.onBcryptHashInput()"
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-sliders-h"></i> Salt count:
                                </label>
                                <input 
                                    type="number" 
                                    id="bcrypt-salt" 
                                    class="form-input" 
                                    min="4"
                                    max="31"
                                    value="${this.bcryptSaltRounds}"
                                    oninput="cryptoToolsInstance.onBcryptHashInput()"
                                />
                            </div>
                        </div>
                        ${this.renderBcryptHashResult()}
                    </div>
                    <div class="decrypt-section">
                        <h3 class="section-title">Compare string with hash</h3>
                        <div class="tool-input-section">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-file-alt"></i> Your string:
                                </label>
                                <input 
                                    type="text" 
                                    id="bcrypt-compare-string" 
                                    class="form-input" 
                                    placeholder="Your string to compare..."
                                    value="${this.escapeHtml(this.bcryptCompareString)}"
                                    oninput="cryptoToolsInstance.onBcryptCompareInput()"
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-hashtag"></i> Your hash:
                                </label>
                                <input 
                                    type="text" 
                                    id="bcrypt-compare-hash" 
                                    class="form-input" 
                                    placeholder="Your hash to compare..."
                                    value="${this.escapeHtml(this.bcryptCompareHash)}"
                                    oninput="cryptoToolsInstance.onBcryptCompareInput()"
                                />
                            </div>
                        </div>
                        ${this.renderBcryptCompareResult()}
                    </div>
                </div>
            </div>
        `;
    }

    renderBcryptHashResult() {
        if (!this.bcryptHash) {
            return '';
        }

        return `
            <div class="tool-results">
                <div class="result-card full-width">
                    <div class="result-value crypto-hash">
                        ${this.escapeHtml(this.bcryptHash)}
                        <button class="btn btn-sm btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(this.bcryptHash)}', this)">
                            <i class="fas fa-copy"></i> Copy hash
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderBcryptCompareResult() {
        // Always show the comparison result section
        const hasInput = this.bcryptCompareString && this.bcryptCompareHash;
        
        if (!hasInput) {
            return `
                <div class="tool-results">
                    <div class="result-card full-width bcrypt-match-card">
                        <div class="result-label">Do they match ?</div>
                        <div class="result-value bcrypt-match-placeholder">-</div>
                    </div>
                </div>
            `;
        }

        if (this.bcryptCompareResult === null) {
            return `
                <div class="tool-results">
                    <div class="result-card full-width bcrypt-match-card">
                        <div class="result-label">Do they match ?</div>
                        <div class="result-value bcrypt-match-computing">Computing...</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="tool-results">
                <div class="result-card full-width bcrypt-match-card ${this.bcryptCompareResult ? 'bcrypt-match-yes' : 'bcrypt-match-no'}">
                    <div class="result-label">Do they match ?</div>
                    <div class="result-value ${this.bcryptCompareResult ? 'highlight success' : 'error'}">
                        ${this.bcryptCompareResult ? 'Yes' : 'No'}
                    </div>
                </div>
            </div>
        `;
    }

    // ========== Hash Text ==========
    renderHash() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-file-alt"></i> Your text to hash:
                        </label>
                        <textarea 
                            id="hash-text" 
                            class="form-input" 
                            rows="3"
                            placeholder="Your string to hash..."
                            oninput="cryptoToolsInstance.onHashInput()"
                        >${this.escapeHtml(this.hashText)}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-code"></i> Digest encoding
                        </label>
                        <select 
                            id="hash-encoding" 
                            class="form-input"
                            onchange="cryptoToolsInstance.onHashInput()"
                        >
                            <option value="hex" ${this.hashEncoding === 'hex' ? 'selected' : ''}>Hexadecimal (base 16)</option>
                            <option value="base64" ${this.hashEncoding === 'base64' ? 'selected' : ''}>Base64</option>
                        </select>
                    </div>
                </div>
                ${this.renderHashResults()}
            </div>
        `;
    }

    renderHashResults() {
        if (!this.hashText || Object.keys(this.hashResults).length === 0) {
            return this.renderPlaceholder('Enter text above to compute hashes');
        }

        const algorithms = [
            { name: 'MD5', key: 'MD5' },
            { name: 'SHA1', key: 'SHA1' },
            { name: 'SHA224', key: 'SHA224' },
            { name: 'SHA256', key: 'SHA256' },
            { name: 'SHA384', key: 'SHA384' },
            { name: 'SHA512', key: 'SHA512' },
            { name: 'SHA3-256', key: 'SHA3-256' },
            { name: 'SHA3-512', key: 'SHA3-512' },
            { name: 'RIPEMD160', key: 'RIPEMD160' }
        ];

        return `
            <div class="tool-results">
                <div class="hash-results-compact">
                    ${algorithms.map(algo => {
                        const hashValue = this.hashResults[algo.key] || '';
                        if (!hashValue) return '';
                        return `
                            <div class="hash-item-compact">
                                <div class="hash-label-compact">${algo.name}:</div>
                                <div class="hash-value-compact">
                                    <code>${this.escapeHtml(hashValue)}</code>
                                    <button class="btn btn-xs btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(hashValue)}', this)" title="Copy ${algo.name}">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // ========== Token Generator ==========
    renderTokenGenerator() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="token-options-grid">
                        <div class="form-group">
                            <label class="form-label checkbox-label">
                                <input 
                                    type="checkbox" 
                                    id="token-uppercase" 
                                    class="token-checkbox"
                                    ${this.tokenUppercase ? 'checked' : ''}
                                    onchange="cryptoToolsInstance.onTokenInput()"
                                />
                                <span class="checkbox-text">Uppercase (ABC...)</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label checkbox-label">
                                <input 
                                    type="checkbox" 
                                    id="token-lowercase" 
                                    class="token-checkbox"
                                    ${this.tokenLowercase ? 'checked' : ''}
                                    onchange="cryptoToolsInstance.onTokenInput()"
                                />
                                <span class="checkbox-text">Lowercase (abc...)</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label checkbox-label">
                                <input 
                                    type="checkbox" 
                                    id="token-numbers" 
                                    class="token-checkbox"
                                    ${this.tokenNumbers ? 'checked' : ''}
                                    onchange="cryptoToolsInstance.onTokenInput()"
                                />
                                <span class="checkbox-text">Numbers (123...)</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label checkbox-label">
                                <input 
                                    type="checkbox" 
                                    id="token-symbols" 
                                    class="token-checkbox"
                                    ${this.tokenSymbols ? 'checked' : ''}
                                    onchange="cryptoToolsInstance.onTokenInput()"
                                />
                                <span class="checkbox-text">Symbols (!-;...)</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-ruler"></i> Length: <span id="token-length-value">${this.tokenLength}</span>
                        </label>
                        <input 
                            type="range" 
                            id="token-length" 
                            class="form-slider" 
                            min="1"
                            max="10000"
                            value="${this.tokenLength}"
                            oninput="cryptoToolsInstance.onTokenLengthChange()"
                        />
                    </div>
                    <div class="form-group">
                        <button class="btn btn-primary" onclick="cryptoToolsInstance.generateToken()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                ${this.renderTokenResult()}
            </div>
        `;
    }

    renderTokenResult() {
        if (!this.tokenGenerated || this.tokenGenerated.includes('Please select')) {
            const isError = this.tokenGenerated && this.tokenGenerated.includes('Please select');
            if (isError) {
                return `
                    <div class="tool-results">
                        <div class="result-card token-error-card">
                            <div class="token-error-content">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>${this.escapeHtml(this.tokenGenerated)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            return this.renderPlaceholder('Click "Refresh" to generate a token');
        }

        return `
            <div class="tool-results">
                <div class="result-card full-width token-result-card">
                    <div class="result-label">Generated Token:</div>
                    <div class="result-value crypto-hash token-value">
                        <code class="token-code">${this.escapeHtml(this.tokenGenerated)}</code>
                        <button class="btn btn-sm btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(this.tokenGenerated)}', this)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== UUID Generator ==========
    renderUUIDGenerator() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="uuid-inputs-grid">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-code-branch"></i> UUID version
                            </label>
                            <select 
                                id="uuid-version" 
                                class="form-input"
                                onchange="cryptoToolsInstance.onUUIDInput()"
                            >
                                <option value="NIL" ${this.uuidVersion === 'NIL' ? 'selected' : ''}>NIL</option>
                                <option value="v1" ${this.uuidVersion === 'v1' ? 'selected' : ''}>v1</option>
                                <option value="v3" ${this.uuidVersion === 'v3' ? 'selected' : ''}>v3</option>
                                <option value="v4" ${this.uuidVersion === 'v4' ? 'selected' : ''}>v4</option>
                                <option value="v5" ${this.uuidVersion === 'v5' ? 'selected' : ''}>v5</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-sort-numeric-up"></i> Quantity
                            </label>
                            <input 
                                type="number" 
                                id="uuid-quantity" 
                                class="form-input" 
                                min="1"
                                max="100"
                                value="${this.uuidQuantity}"
                                oninput="cryptoToolsInstance.onUUIDInput()"
                            />
                        </div>
                    </div>
                    ${this.uuidVersion === 'v3' || this.uuidVersion === 'v5' ? `
                        <div class="uuid-v3v5-section">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-tag"></i> Namespace
                                </label>
                                <select 
                                    id="uuid-namespace" 
                                    class="form-input"
                                    onchange="cryptoToolsInstance.onUUIDInput()"
                                >
                                    <option value="DNS" ${this.uuidNamespace === 'DNS' ? 'selected' : ''}>DNS</option>
                                    <option value="URL" ${this.uuidNamespace === 'URL' ? 'selected' : ''}>URL</option>
                                    <option value="OID" ${this.uuidNamespace === 'OID' ? 'selected' : ''}>OID</option>
                                    <option value="X500" ${this.uuidNamespace === 'X500' ? 'selected' : ''}>X500</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-file-alt"></i> Name
                                </label>
                                <input 
                                    type="text" 
                                    id="uuid-name" 
                                    class="form-input" 
                                    placeholder="example.com (default if empty)"
                                    value="${this.escapeHtml(this.uuidName)}"
                                    oninput="cryptoToolsInstance.onUUIDInput()"
                                />
                            </div>
                        </div>
                    ` : ''}
                    <div class="form-group">
                        <button class="btn btn-primary" onclick="cryptoToolsInstance.generateUUID()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                ${this.renderUUIDResult()}
            </div>
        `;
    }

    renderUUIDResult() {
        if (!this.uuidGenerated || this.uuidGenerated.length === 0) {
            return this.renderPlaceholder('Click "Refresh" to generate UUIDs');
        }

        // Check if there are any error messages
        const hasErrors = this.uuidGenerated.some(uuid => 
            uuid.includes('Enter a name') || uuid.includes('CryptoJS library required')
        );

        return `
            <div class="tool-results">
                <div class="uuid-results-list">
                    ${this.uuidGenerated.map((uuid, index) => {
                        const isError = uuid.includes('Enter a name') || uuid.includes('CryptoJS library required');
                        if (isError) {
                            return `
                                <div class="result-card uuid-error-card">
                                    <div class="uuid-error-content">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <span>${this.escapeHtml(uuid)}</span>
                                    </div>
                                </div>
                            `;
                        }
                        return `
                            <div class="result-card uuid-item-card">
                                <div class="result-value crypto-hash">
                                    <code class="uuid-value">${this.escapeHtml(uuid)}</code>
                                    <button class="btn btn-sm btn-secondary" onclick="cryptoToolsInstance.copyText('${this.escapeHtml(uuid)}', this)" title="Copy UUID">
                                        <i class="fas fa-copy"></i> Copy
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
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

    onRSABitsChange() {
        const select = document.getElementById('rsa-bits');
        if (select) {
            this.rsaBits = parseInt(select.value);
        }
    }

    async generateRSA() {
        try {
            // First, try backend API
            const apiKey = localStorage.getItem('jwt_token');
            if (apiKey) {
                try {
                    const response = await fetch(`/api/crypto/rsa-generate?bits=${this.rsaBits}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        this.rsaPublicKey = data.publicKey.trim();
                        this.rsaPrivateKey = data.privateKey.trim();
                        this.updateResultsOnly();
                        return;
                    } else if (response.status === 401) {
                        // Authentication failed, try forge.js fallback
                        console.warn('Backend API authentication failed, trying forge.js fallback');
                    } else {
                        console.warn('Backend API failed with status:', response.status, ', trying forge.js fallback');
                    }
                } catch (apiError) {
                    console.warn('Backend API request failed, trying forge.js fallback:', apiError);
                }
            }
            
            // Fallback: try using forge.js library if available
            if (typeof forge !== 'undefined' && forge.pki && forge.pki.rsa) {
                try {
                    const keypair = forge.pki.rsa.generateKeyPair({ bits: this.rsaBits });
                    this.rsaPublicKey = forge.pki.publicKeyToPem(keypair.publicKey);
                    this.rsaPrivateKey = forge.pki.privateKeyToPem(keypair.privateKey);
                    this.updateResultsOnly();
                    return;
                } catch (forgeError) {
                    console.error('Forge.js RSA generation error:', forgeError);
                    throw new Error('Forge.js failed to generate keys: ' + forgeError.message);
                }
            }
            
            // If both methods failed, show error
            throw new Error('Failed to generate RSA keys. Please ensure you are authenticated or the forge.js library is loaded.');
        } catch (error) {
            console.error('RSA generation error:', error);
            // Don't show alert, just log and leave keys empty
            // The UI will show the placeholder message
        }
    }

    onPasswordInput() {
        const input = document.getElementById('password-input');
        if (!input) return;
        
        this.passwordInput = input.value;
        this.analyzePassword();
        this.updateResultsOnly();
    }

    analyzePassword() {
        if (!this.passwordInput) {
            this.passwordResult = null;
            return;
        }

        const password = this.passwordInput;
        const length = password.length;
        
        // Calculate character set size
        let charSetSize = 0;
        let hasLower = /[a-z]/.test(password);
        let hasUpper = /[A-Z]/.test(password);
        let hasNumbers = /[0-9]/.test(password);
        let hasSpecial = /[^a-zA-Z0-9]/.test(password);
        
        if (hasLower) charSetSize += 26;
        if (hasUpper) charSetSize += 26;
        if (hasNumbers) charSetSize += 10;
        if (hasSpecial) charSetSize += 32; // Approximate
        
        // Calculate entropy
        const entropy = length * Math.log2(charSetSize || 1);
        
        // Estimate crack time (very rough estimate)
        const guessesPerSecond = 1e9; // 1 billion guesses per second
        const totalGuesses = Math.pow(charSetSize || 1, length);
        const seconds = totalGuesses / guessesPerSecond;
        
        let crackTime = 'Instantly';
        if (seconds > 1) {
            if (seconds < 60) crackTime = `${Math.round(seconds)} seconds`;
            else if (seconds < 3600) crackTime = `${Math.round(seconds / 60)} minutes`;
            else if (seconds < 86400) crackTime = `${Math.round(seconds / 3600)} hours`;
            else if (seconds < 31536000) crackTime = `${Math.round(seconds / 86400)} days`;
            else crackTime = `${Math.round(seconds / 31536000)} years`;
        }
        
        // Calculate score (0-100)
        let score = 0;
        if (length >= 8) score += 20;
        if (length >= 12) score += 20;
        if (hasLower && hasUpper) score += 20;
        if (hasNumbers) score += 20;
        if (hasSpecial) score += 20;
        
        this.passwordResult = {
            length: length,
            entropy: entropy,
            charSetSize: charSetSize,
            crackTime: crackTime,
            score: score
        };
    }

    onHMACInput() {
        const textInput = document.getElementById('hmac-text');
        const keyInput = document.getElementById('hmac-key');
        const algorithmInput = document.getElementById('hmac-algorithm');
        const encodingInput = document.getElementById('hmac-encoding');
        
        if (!textInput || !keyInput || !algorithmInput || !encodingInput) return;
        
        this.hmacText = textInput.value;
        this.hmacKey = keyInput.value;
        this.hmacAlgorithm = algorithmInput.value;
        this.hmacEncoding = encodingInput.value;
        
        this.computeHMAC();
        this.updateResultsOnly();
    }

    async computeHMAC() {
        if (!this.hmacText || !this.hmacKey) {
            this.hmacResult = '';
            this.updateResultsOnly();
            return;
        }

        try {
            // Use CryptoJS for HMAC if available (more reliable)
            if (typeof CryptoJS !== 'undefined') {
                let hmac;
                switch (this.hmacAlgorithm) {
                    case 'SHA256':
                        hmac = CryptoJS.HmacSHA256(this.hmacText, this.hmacKey);
                        break;
                    case 'SHA1':
                        hmac = CryptoJS.HmacSHA1(this.hmacText, this.hmacKey);
                        break;
                    case 'SHA512':
                        hmac = CryptoJS.HmacSHA512(this.hmacText, this.hmacKey);
                        break;
                    case 'MD5':
                        hmac = CryptoJS.HmacMD5(this.hmacText, this.hmacKey);
                        break;
                    default:
                        hmac = CryptoJS.HmacSHA256(this.hmacText, this.hmacKey);
                }
                
                if (this.hmacEncoding === 'hex') {
                    this.hmacResult = hmac.toString(CryptoJS.enc.Hex);
                } else {
                    this.hmacResult = hmac.toString(CryptoJS.enc.Base64);
                }
                this.updateResultsOnly();
                return;
            }
            
            // Fallback to Web Crypto API
            const encoder = new TextEncoder();
            const keyData = encoder.encode(this.hmacKey);
            const textData = encoder.encode(this.hmacText);
            
            // Map algorithm names for Web Crypto API
            const algorithmMap = {
                'SHA256': 'SHA-256',
                'SHA1': 'SHA-1',
                'SHA512': 'SHA-512',
                'MD5': null // MD5 not supported in Web Crypto API
            };
            
            const webCryptoAlgo = algorithmMap[this.hmacAlgorithm];
            if (!webCryptoAlgo) {
                this.hmacResult = 'CryptoJS library required for ' + this.hmacAlgorithm + ' HMAC';
                this.updateResultsOnly();
                return;
            }
            
            // Import key for HMAC
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: webCryptoAlgo },
                false,
                ['sign']
            );
            
            // Sign (compute HMAC)
            const signature = await crypto.subtle.sign('HMAC', cryptoKey, textData);
            
            // Encode result
            if (this.hmacEncoding === 'hex') {
                this.hmacResult = Array.from(new Uint8Array(signature))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            } else {
                this.hmacResult = btoa(String.fromCharCode(...new Uint8Array(signature)));
            }
            this.updateResultsOnly();
        } catch (error) {
            console.error('HMAC computation error:', error);
            this.hmacResult = 'Error computing HMAC: ' + error.message;
            this.updateResultsOnly();
        }
    }

    onBIP39Input() {
        const languageInput = document.getElementById('bip39-language');
        const entropyInput = document.getElementById('bip39-entropy');
        
        if (!languageInput || !entropyInput) return;
        
        this.bip39Language = languageInput.value;
        this.bip39Entropy = entropyInput.value;
    }

    generateBIP39() {
        // Generate or use provided entropy
        if (!this.bip39Entropy || !this.bip39Entropy.trim()) {
            // Generate random entropy (16 bytes = 128 bits = 12 words)
            const randomBytes = new Uint8Array(16);
            crypto.getRandomValues(randomBytes);
            this.bip39Entropy = Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        
        // Use first 128 bits of entropy for 12-word mnemonic
        const entropyHex = this.bip39Entropy.substring(0, 32); // 16 bytes = 32 hex chars
        const entropyBits = parseInt(entropyHex, 16).toString(2).padStart(128, '0');
        
        // BIP39 English wordlist (first 100 words for demo - full list has 2048)
        // For production, use a complete BIP39 library
        const bip39Words = this.getBIP39WordList();
        
        // Generate mnemonic from entropy (simplified - proper BIP39 needs checksum)
        const mnemonic = [];
        for (let i = 0; i < 12; i++) {
            const startBit = i * 11;
            const endBit = startBit + 11;
            const wordIndex = parseInt(entropyBits.substring(startBit, Math.min(endBit, entropyBits.length)) || '0', 2) % bip39Words.length;
            mnemonic.push(bip39Words[wordIndex]);
        }
        
        this.bip39Mnemonic = mnemonic.join(' ');
        this.updateResultsOnly();
    }
    
    getBIP39WordList() {
        // BIP39 English wordlist (first 2048 words)
        // This is a subset - for production use a complete library
        return [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
            'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
            'action', 'actor', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult',
            'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent', 'agree',
            'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert', 'alien',
            'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter', 'always',
            'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle',
            'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety',
            'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'area', 'arena', 'argue',
            'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art',
            'article', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume', 'asthma',
            'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit', 'august', 'aunt',
            'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake', 'aware', 'away', 'awesome',
            'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony',
            'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic',
            'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef', 'before', 'begin',
            'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit', 'best', 'betray', 'better',
            'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter',
            'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom',
            'blow', 'blue', 'blur', 'blush', 'board', 'boat', 'body', 'boil', 'bomb', 'bone',
            'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss', 'bottom', 'bounce', 'box',
            'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge',
            'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown',
            'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk', 'bullet', 'bundle',
            'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy', 'butter', 'buyer', 'buzz',
            'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake', 'call', 'calm', 'camera', 'camp',
            'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital',
            'captain', 'car', 'carbon', 'card', 'care', 'career', 'careful', 'careless', 'cargo', 'carpet',
            'carry', 'cart', 'case', 'cash', 'casino', 'cast', 'casual', 'cat', 'catalog', 'catch',
            'category', 'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census',
            'century', 'cereal', 'certain', 'chair', 'chalk', 'champion', 'change', 'chaos', 'chapter', 'charge',
            'chase', 'chat', 'cheap', 'check', 'cheese', 'chef', 'cherry', 'chest', 'chicken', 'chief',
            'child', 'chimney', 'choice', 'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon',
            'circle', 'citizen', 'city', 'civil', 'claim', 'clamp', 'clarify', 'claw', 'clay', 'clean',
            'clerk', 'clever', 'click', 'client', 'cliff', 'climb', 'clinic', 'clip', 'clock', 'clog',
            'close', 'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch', 'coach', 'coast',
            'coconut', 'code', 'coffee', 'coil', 'coin', 'collect', 'color', 'column', 'combine', 'come',
            'comfort', 'comic', 'common', 'company', 'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider',
            'control', 'convince', 'cook', 'cool', 'copper', 'copy', 'coral', 'core', 'corn', 'correct',
            'cost', 'cotton', 'couch', 'country', 'couple', 'course', 'cousin', 'cover', 'coyote', 'crack',
            'cradle', 'craft', 'cram', 'crane', 'crash', 'crater', 'crawl', 'crazy', 'cream', 'credit',
            'creek', 'crew', 'cricket', 'crime', 'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd',
            'crucial', 'cruel', 'cruise', 'crumble', 'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture',
            'cup', 'cupboard', 'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle',
            'dad', 'damage', 'damp', 'dance', 'danger', 'daring', 'dark', 'dash', 'date', 'daughter',
            'dawn', 'day', 'deal', 'debate', 'debris', 'decade', 'december', 'decide', 'decline', 'decorate',
            'decrease', 'deer', 'defense', 'define', 'defy', 'degree', 'delay', 'deliver', 'demand', 'demise',
            'denial', 'dentist', 'deny', 'depart', 'depend', 'deposit', 'depth', 'deputy', 'derive', 'describe',
            'desert', 'design', 'desk', 'despair', 'destroy', 'detail', 'detect', 'develop', 'device', 'devote',
            'diagram', 'dial', 'diamond', 'diary', 'dice', 'diesel', 'diet', 'differ', 'digital', 'dignity',
            'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt', 'disagree', 'discover', 'disease', 'dish', 'dismiss',
            'disorder', 'display', 'distance', 'divert', 'divide', 'divorce', 'dizzy', 'doctor', 'document', 'dog',
            'doll', 'dolphin', 'domain', 'donate', 'donkey', 'donor', 'door', 'dose', 'double', 'dove',
            'draft', 'dragon', 'drama', 'drastic', 'draw', 'dream', 'dress', 'drift', 'drill', 'drink',
            'drip', 'drive', 'drop', 'drum', 'dry', 'duck', 'dumb', 'dune', 'during', 'dust',
            'dutch', 'duty', 'dwarf', 'dynamic', 'eager', 'eagle', 'early', 'earn', 'earth', 'easily',
            'east', 'easy', 'echo', 'ecology', 'economy', 'edge', 'edit', 'educate', 'effort', 'egg',
            'eight', 'either', 'elbow', 'elder', 'electric', 'elegant', 'element', 'elephant', 'elevator', 'elite',
            'else', 'embark', 'embody', 'embrace', 'emerge', 'emotion', 'employ', 'empower', 'empty', 'enable',
            'enact', 'end', 'endless', 'endorse', 'enemy', 'energy', 'enforce', 'engage', 'engine', 'enhance',
            'enjoy', 'enlist', 'enough', 'enrich', 'enroll', 'ensure', 'enter', 'entire', 'entry', 'envelope',
            'episode', 'equal', 'equip', 'era', 'erase', 'erode', 'erosion', 'error', 'erupt', 'escape',
            'essay', 'essence', 'estate', 'eternal', 'ethics', 'evidence', 'evil', 'evoke', 'evolve', 'exact',
            'example', 'exceed', 'excel', 'exception', 'excess', 'exchange', 'excite', 'exclude', 'excuse', 'execute',
            'exercise', 'exhaust', 'exhibit', 'exile', 'exist', 'exit', 'exotic', 'expand', 'expect', 'expire',
            'explain', 'expose', 'express', 'extend', 'extra', 'eye', 'eyebrow', 'fabric', 'face', 'faculty',
            'fade', 'faint', 'faith', 'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy',
            'fantasy', 'farm', 'fashion', 'fat', 'fatal', 'father', 'fatigue', 'fault', 'favorite', 'feature',
            'february', 'federal', 'fee', 'feed', 'feel', 'female', 'fence', 'festival', 'fetch', 'fever',
            'few', 'fiber', 'fiction', 'field', 'figure', 'file', 'film', 'filter', 'final', 'find',
            'fine', 'finger', 'finish', 'fire', 'firm', 'first', 'fiscal', 'fish', 'fit', 'fitness',
            'fix', 'flag', 'flame', 'flash', 'flat', 'flavor', 'flee', 'flight', 'flip', 'float',
            'flock', 'floor', 'flower', 'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil',
            'fold', 'follow', 'food', 'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum',
            'forward', 'fossil', 'foster', 'found', 'fox', 'fragile', 'frame', 'frequent', 'fresh', 'friend',
            'fringe', 'frog', 'front', 'frost', 'frown', 'frozen', 'fruit', 'fuel', 'fun', 'funny',
            'furnace', 'fury', 'future', 'gadget', 'gain', 'galaxy', 'gallery', 'game', 'gap', 'garage',
            'garbage', 'garden', 'garlic', 'garment', 'gas', 'gasp', 'gate', 'gather', 'gauge', 'gaze',
            'general', 'genius', 'genre', 'gentle', 'genuine', 'gesture', 'ghost', 'giant', 'gift', 'giggle',
            'ginger', 'giraffe', 'girl', 'give', 'glad', 'glance', 'glare', 'glass', 'glide', 'glimpse',
            'globe', 'gloom', 'glory', 'glove', 'glow', 'glue', 'goat', 'goddess', 'gold', 'good',
            'goose', 'gorilla', 'gospel', 'gossip', 'govern', 'gown', 'grab', 'grace', 'grain', 'grant',
            'grape', 'grass', 'gravity', 'great', 'green', 'grid', 'grief', 'grit', 'grocery', 'group',
            'grow', 'grunt', 'guard', 'guess', 'guide', 'guilt', 'guitar', 'gun', 'gym', 'habit',
            'hair', 'half', 'hammer', 'hamster', 'hand', 'happy', 'harbor', 'hard', 'harsh', 'harvest',
            'hat', 'have', 'hawk', 'hazard', 'head', 'health', 'heart', 'heavy', 'hedgehog', 'height',
            'hello', 'helmet', 'help', 'hen', 'hero', 'hidden', 'high', 'hill', 'hint', 'hip',
            'hire', 'history', 'hobby', 'hockey', 'hold', 'hole', 'holiday', 'hollow', 'home', 'honey',
            'hood', 'hope', 'horn', 'horror', 'horse', 'hospital', 'host', 'hotel', 'hour', 'hover',
            'hub', 'huge', 'human', 'humble', 'humor', 'hundred', 'hungry', 'hunt', 'hurdle', 'hurry',
            'hurt', 'husband', 'hybrid', 'ice', 'icon', 'idea', 'identify', 'idle', 'ignore', 'ill',
            'illegal', 'illness', 'image', 'imitate', 'immense', 'immune', 'impact', 'impose', 'improve', 'impulse',
            'inch', 'include', 'income', 'increase', 'index', 'indicate', 'indoor', 'industry', 'infant', 'inflict',
            'inform', 'inhale', 'inherit', 'initial', 'inject', 'injury', 'inmate', 'inner', 'innocent', 'input',
            'inquiry', 'insane', 'insect', 'inside', 'inspire', 'install', 'intact', 'interest', 'into', 'invest',
            'invite', 'involve', 'iron', 'island', 'isolate', 'issue', 'item', 'ivory', 'jacket', 'jaguar',
            'jar', 'jazz', 'jealous', 'jeans', 'jelly', 'jewel', 'job', 'join', 'joke', 'journey',
            'joy', 'judge', 'juice', 'jump', 'jungle', 'junior', 'junk', 'just', 'kangaroo', 'keen',
            'keep', 'ketchup', 'key', 'kick', 'kid', 'kidney', 'kind', 'kingdom', 'kiss', 'kit',
            'kitchen', 'kite', 'kitten', 'kiwi', 'knee', 'knife', 'knock', 'know', 'lab', 'label',
            'labor', 'ladder', 'lady', 'lake', 'lamp', 'language', 'laptop', 'large', 'later', 'latin',
            'laugh', 'laundry', 'lava', 'law', 'lawn', 'lawsuit', 'layer', 'lazy', 'leader', 'leaf',
            'learn', 'leave', 'lecture', 'left', 'leg', 'legal', 'legend', 'leisure', 'lemon', 'lend',
            'length', 'lens', 'leopard', 'lesson', 'letter', 'level', 'liar', 'liberty', 'library', 'license',
            'life', 'lift', 'light', 'like', 'limb', 'limit', 'link', 'lion', 'liquid', 'list',
            'little', 'live', 'lizard', 'load', 'loan', 'lobster', 'local', 'lock', 'logic', 'lonely',
            'long', 'loop', 'lottery', 'loud', 'lounge', 'love', 'loyal', 'lucky', 'luggage', 'lumber',
            'lunar', 'lunch', 'luxury', 'lyrics', 'machine', 'mad', 'magic', 'magnet', 'maid', 'mail',
            'main', 'major', 'make', 'mammal', 'man', 'manage', 'mandate', 'mango', 'mansion', 'manual',
            'maple', 'marble', 'march', 'margin', 'marine', 'market', 'marriage', 'mask', 'mass', 'master',
            'match', 'material', 'math', 'matrix', 'matter', 'maximum', 'maze', 'meadow', 'mean', 'measure',
            'meat', 'mechanic', 'medal', 'media', 'melody', 'melt', 'member', 'memory', 'mention', 'menu',
            'mercy', 'merge', 'merit', 'merry', 'mesh', 'message', 'metal', 'method', 'middle', 'midnight',
            'milk', 'million', 'mimic', 'mind', 'minimum', 'minor', 'minute', 'miracle', 'mirror', 'misery',
            'miss', 'mistake', 'mix', 'mixed', 'mixture', 'mobile', 'model', 'modify', 'mom', 'moment',
            'monitor', 'monkey', 'monster', 'month', 'moon', 'moral', 'more', 'morning', 'mosquito', 'mother',
            'motion', 'motor', 'mountain', 'mouse', 'move', 'movie', 'much', 'muffin', 'mule', 'multiply',
            'muscle', 'museum', 'mushroom', 'music', 'must', 'mutual', 'myself', 'mystery', 'myth', 'naive',
            'name', 'napkin', 'narrow', 'nasty', 'nation', 'nature', 'near', 'neck', 'need', 'negative',
            'neglect', 'neither', 'nephew', 'nerve', 'nest', 'net', 'network', 'neutral', 'never', 'news',
            'next', 'nice', 'night', 'noble', 'noise', 'nominee', 'noodle', 'normal', 'north', 'nose',
            'notable', 'note', 'nothing', 'notice', 'novel', 'now', 'nuclear', 'number', 'nurse', 'nut',
            'oak', 'obey', 'object', 'oblige', 'obscure', 'observe', 'obtain', 'obvious', 'occur', 'ocean',
            'october', 'odor', 'off', 'offer', 'office', 'often', 'oil', 'okay', 'old', 'olive',
            'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only', 'open', 'opera', 'opinion',
            'oppose', 'option', 'orange', 'orbit', 'orchard', 'order', 'ordinary', 'organ', 'orient', 'original',
            'orphan', 'ostrich', 'other', 'outdoor', 'outer', 'output', 'outside', 'oval', 'oven', 'over',
            'own', 'owner', 'oxygen', 'oyster', 'ozone', 'pact', 'paddle', 'page', 'pair', 'palace',
            'palm', 'panda', 'panel', 'panic', 'panther', 'paper', 'parade', 'parent', 'park', 'parrot',
            'party', 'pass', 'patch', 'path', 'patient', 'patrol', 'pattern', 'pause', 'pave', 'payment',
            'peace', 'peanut', 'pear', 'peasant', 'pelican', 'pen', 'penalty', 'pencil', 'people', 'pepper',
            'perfect', 'permit', 'person', 'pet', 'phone', 'photo', 'phrase', 'physical', 'piano', 'picnic',
            'picture', 'piece', 'pig', 'pigeon', 'pill', 'pilot', 'pink', 'pioneer', 'pipe', 'pistol',
            'pitch', 'pizza', 'place', 'planet', 'plastic', 'plate', 'play', 'please', 'pledge', 'pluck',
            'plug', 'plunge', 'poem', 'poet', 'point', 'polar', 'pole', 'police', 'pond', 'pony',
            'pool', 'popular', 'portion', 'position', 'possible', 'post', 'potato', 'pottery', 'poverty', 'powder',
            'power', 'practice', 'praise', 'predict', 'prefer', 'prepare', 'present', 'pretty', 'prevent', 'price',
            'pride', 'primary', 'print', 'priority', 'prison', 'private', 'prize', 'problem', 'process', 'produce',
            'profit', 'program', 'project', 'promote', 'proof', 'property', 'prosper', 'protect', 'proud', 'provide',
            'public', 'pudding', 'pull', 'pulp', 'pulse', 'pumpkin', 'punch', 'pupil', 'puppy', 'purchase',
            'purity', 'purpose', 'purse', 'push', 'put', 'puzzle', 'pyramid', 'quality', 'quantum', 'quarter',
            'question', 'quick', 'quit', 'quiz', 'quote', 'rabbit', 'raccoon', 'race', 'rack', 'radar',
            'radio', 'rail', 'rain', 'raise', 'rally', 'ramp', 'ranch', 'random', 'range', 'rapid',
            'rare', 'rate', 'rather', 'raven', 'raw', 'razor', 'ready', 'real', 'reason', 'rebel',
            'rebuild', 'recall', 'receive', 'recipe', 'record', 'recycle', 'reduce', 'reflect', 'reform', 'refuse',
            'region', 'regret', 'regular', 'reject', 'relax', 'release', 'relief', 'rely', 'remain', 'remember',
            'remind', 'remove', 'render', 'renew', 'rent', 'reopen', 'repair', 'repeat', 'replace', 'report',
            'require', 'rescue', 'resemble', 'resist', 'resource', 'response', 'result', 'retire', 'retreat', 'return',
            'reunion', 'reveal', 'review', 'reward', 'rhythm', 'rib', 'ribbon', 'rice', 'rich', 'ride',
            'ridge', 'rifle', 'right', 'rigid', 'ring', 'riot', 'rip', 'ripe', 'rise', 'risk',
            'rival', 'river', 'road', 'roast', 'robot', 'robust', 'rocket', 'romance', 'roof', 'rookie',
            'room', 'rose', 'rotate', 'rough', 'round', 'route', 'royal', 'rubber', 'rude', 'rug',
            'rule', 'run', 'runway', 'rural', 'sad', 'saddle', 'sadness', 'safe', 'sail', 'salad',
            'salmon', 'salon', 'salt', 'same', 'sample', 'sand', 'satisfy', 'satoshi', 'sauce', 'sausage',
            'save', 'say', 'scale', 'scan', 'scare', 'scatter', 'scene', 'scheme', 'school', 'science',
            'scissors', 'scorpion', 'scout', 'scrap', 'screen', 'script', 'scrub', 'sea', 'search', 'season',
            'seat', 'second', 'secret', 'section', 'security', 'seed', 'seek', 'segment', 'select', 'sell',
            'seminar', 'senior', 'sense', 'sentence', 'series', 'service', 'session', 'settle', 'setup', 'seven',
            'shadow', 'shaft', 'shallow', 'share', 'shed', 'shell', 'sheriff', 'shield', 'shift', 'shine',
            'ship', 'shiver', 'shock', 'shoe', 'shoot', 'shop', 'short', 'shoulder', 'shove', 'shrimp',
            'shrug', 'shuffle', 'shy', 'sibling', 'sick', 'side', 'siege', 'sight', 'sign', 'silent',
            'silk', 'silly', 'silver', 'similar', 'simple', 'since', 'sing', 'siren', 'sister', 'situate',
            'six', 'size', 'skate', 'sketch', 'ski', 'skill', 'skin', 'skirt', 'skull', 'slab',
            'slam', 'sleep', 'slender', 'slice', 'slide', 'slight', 'slim', 'slogan', 'slot', 'slow',
            'slush', 'small', 'smart', 'smile', 'smoke', 'smooth', 'snack', 'snake', 'snap', 'sniff',
            'snow', 'soap', 'soccer', 'social', 'sock', 'soda', 'soft', 'solar', 'soldier', 'solid',
            'solve', 'someone', 'song', 'soon', 'sorry', 'sort', 'soul', 'sound', 'soup', 'source',
            'south', 'space', 'spare', 'spatial', 'spawn', 'speak', 'special', 'speed', 'spell', 'spend',
            'sphere', 'spice', 'spider', 'spike', 'spin', 'spirit', 'split', 'spoil', 'sponsor', 'spoon',
            'sport', 'spot', 'spray', 'spread', 'spring', 'spy', 'square', 'squeeze', 'squirrel', 'stable',
            'stadium', 'staff', 'stage', 'stair', 'stamp', 'stand', 'start', 'state', 'stay', 'steak',
            'steel', 'stem', 'step', 'stereo', 'stick', 'still', 'sting', 'stock', 'stomach', 'stone',
            'stool', 'story', 'stove', 'strategy', 'street', 'strike', 'strong', 'struggle', 'student', 'stuff',
            'stumble', 'style', 'subject', 'submit', 'subway', 'success', 'such', 'sudden', 'suffer', 'sugar',
            'suggest', 'suit', 'summer', 'sun', 'sunny', 'sunset', 'super', 'supply', 'supreme', 'sure',
            'surface', 'surge', 'surprise', 'surround', 'survey', 'suspect', 'sustain', 'swallow', 'swamp', 'swap',
            'swarm', 'swear', 'sweet', 'swift', 'swim', 'swing', 'switch', 'sword', 'symbol', 'symptom',
            'syrup', 'system', 'table', 'tackle', 'tag', 'tail', 'talent', 'talk', 'tank', 'tape',
            'target', 'task', 'taste', 'tattoo', 'taxi', 'teach', 'team', 'tell', 'ten', 'tenant',
            'tennis', 'tent', 'term', 'test', 'text', 'thank', 'that', 'theme', 'then', 'theory',
            'there', 'they', 'thing', 'this', 'thought', 'three', 'thrive', 'throw', 'thumb', 'thunder',
            'ticket', 'tide', 'tiger', 'tilt', 'timber', 'time', 'tiny', 'tip', 'tired', 'tissue',
            'title', 'toast', 'tobacco', 'today', 'toddler', 'toe', 'together', 'toilet', 'token', 'tomato',
            'tomorrow', 'tone', 'tongue', 'tonight', 'tool', 'tooth', 'top', 'topic', 'topple', 'torch',
            'tornado', 'tortoise', 'toss', 'total', 'tourist', 'toward', 'tower', 'town', 'toy', 'track',
            'trade', 'traffic', 'tragic', 'train', 'transfer', 'trap', 'trash', 'travel', 'tray', 'treat',
            'tree', 'trend', 'trial', 'tribe', 'trick', 'trigger', 'trim', 'trip', 'trophy', 'trouble',
            'truck', 'true', 'truly', 'trumpet', 'trust', 'truth', 'try', 'tube', 'tuition', 'tumble',
            'tuna', 'tunnel', 'turkey', 'turn', 'turtle', 'twelve', 'twenty', 'twice', 'twin', 'twist',
            'two', 'type', 'typical', 'ugly', 'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under',
            'undo', 'unfair', 'unfold', 'unhappy', 'uniform', 'unique', 'unit', 'universe', 'unknown', 'unlock',
            'until', 'unusual', 'unveil', 'update', 'upgrade', 'uphold', 'upon', 'upper', 'upset', 'urban',
            'urge', 'usage', 'use', 'used', 'useful', 'useless', 'usual', 'utility', 'vacant', 'vacuum',
            'vague', 'valid', 'valley', 'valve', 'van', 'vanish', 'vapor', 'various', 'vast', 'vault',
            'vehicle', 'velvet', 'vendor', 'venture', 'venue', 'verb', 'verify', 'version', 'very', 'vessel',
            'veteran', 'viable', 'vibrant', 'vicious', 'victory', 'video', 'view', 'village', 'vintage', 'violin',
            'virtual', 'virus', 'visa', 'visit', 'visual', 'vital', 'vivid', 'vocal', 'voice', 'void',
            'volcano', 'volume', 'vote', 'voyage', 'wage', 'wagon', 'wait', 'walk', 'wall', 'walnut',
            'want', 'warfare', 'warm', 'warrior', 'wash', 'wasp', 'waste', 'water', 'wave', 'way',
            'wealth', 'weapon', 'weary', 'weather', 'weave', 'web', 'wedding', 'weekend', 'weird', 'welcome',
            'west', 'wet', 'whale', 'what', 'wheat', 'wheel', 'when', 'where', 'whip', 'whisper',
            'wide', 'width', 'wife', 'wild', 'will', 'win', 'window', 'wine', 'wing', 'wink',
            'winner', 'winter', 'wire', 'wisdom', 'wise', 'wish', 'witness', 'wolf', 'woman', 'wonder',
            'wood', 'wool', 'word', 'work', 'world', 'worry', 'worth', 'wrap', 'wreck', 'wrestle',
            'wrist', 'write', 'wrong', 'yard', 'year', 'yellow', 'you', 'young', 'youth', 'zebra',
            'zero', 'zone', 'zoo'
        ];
    }

    onEncryptInput() {
        const textInput = document.getElementById('encrypt-text');
        const keyInput = document.getElementById('encrypt-key');
        const algorithmInput = document.getElementById('encrypt-algorithm');
        
        if (!textInput || !keyInput || !algorithmInput) return;
        
        this.encryptText = textInput.value;
        this.encryptKey = keyInput.value;
        this.encryptAlgorithm = algorithmInput.value;
        
        this.encrypt();
        this.updateResultsOnly();
    }

    async encrypt() {
        if (!this.encryptText || !this.encryptKey) {
            this.encryptResult = '';
            return;
        }

        try {
            if (typeof CryptoJS === 'undefined') {
                this.encryptResult = 'CryptoJS library is required. Please ensure js/libs/crypto-js.min.js is loaded.';
                this.updateResultsOnly();
                return;
            }

            let encrypted;
            switch (this.encryptAlgorithm) {
                case 'AES':
                    encrypted = CryptoJS.AES.encrypt(this.encryptText, this.encryptKey).toString();
                    break;
                case 'TripleDES':
                    encrypted = CryptoJS.TripleDES.encrypt(this.encryptText, this.encryptKey).toString();
                    break;
                case 'Rabbit':
                    encrypted = CryptoJS.Rabbit.encrypt(this.encryptText, this.encryptKey).toString();
                    break;
                case 'RC4':
                    encrypted = CryptoJS.RC4.encrypt(this.encryptText, this.encryptKey).toString();
                    break;
                default:
                    encrypted = CryptoJS.AES.encrypt(this.encryptText, this.encryptKey).toString();
            }
            
            this.encryptResult = encrypted;
            this.updateResultsOnly();
        } catch (error) {
            console.error('Encryption error:', error);
            this.encryptResult = 'Error encrypting text: ' + error.message;
            this.updateResultsOnly();
        }
    }

    onDecryptInput() {
        const textInput = document.getElementById('decrypt-text');
        const keyInput = document.getElementById('decrypt-key');
        const algorithmInput = document.getElementById('decrypt-algorithm');
        
        if (!textInput || !keyInput || !algorithmInput) return;
        
        this.decryptText = textInput.value;
        this.decryptKey = keyInput.value;
        this.decryptAlgorithm = algorithmInput.value;
        
        // Clear result first
        this.decryptResult = '';
        this.updateResultsOnly();
        
        // Then decrypt
        this.decrypt();
    }

    async decrypt() {
        if (!this.decryptText || !this.decryptKey) {
            this.decryptResult = '';
            this.updateResultsOnly();
            return;
        }

        try {
            if (typeof CryptoJS === 'undefined') {
                this.decryptResult = 'CryptoJS library is required. Please ensure js/libs/crypto-js.min.js is loaded.';
                this.updateResultsOnly();
                return;
            }

            let decrypted;
            switch (this.decryptAlgorithm) {
                case 'AES':
                    decrypted = CryptoJS.AES.decrypt(this.decryptText, this.decryptKey);
                    break;
                case 'TripleDES':
                    decrypted = CryptoJS.TripleDES.decrypt(this.decryptText, this.decryptKey);
                    break;
                case 'Rabbit':
                    decrypted = CryptoJS.Rabbit.decrypt(this.decryptText, this.decryptKey);
                    break;
                case 'RC4':
                    decrypted = CryptoJS.RC4.decrypt(this.decryptText, this.decryptKey);
                    break;
                default:
                    decrypted = CryptoJS.AES.decrypt(this.decryptText, this.decryptKey);
            }
            
            // Convert to string and handle empty results
            const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
            if (!decryptedText || decryptedText.length === 0) {
                this.decryptResult = 'Decryption failed - check your key and encrypted text';
            } else {
                this.decryptResult = decryptedText;
            }
            this.updateResultsOnly();
        } catch (error) {
            console.error('Decryption error:', error);
            this.decryptResult = 'Error decrypting text: ' + error.message;
            this.updateResultsOnly();
        }
    }

    onBcryptHashInput() {
        const stringInput = document.getElementById('bcrypt-string');
        const saltInput = document.getElementById('bcrypt-salt');
        
        if (!stringInput || !saltInput) return;
        
        this.bcryptString = stringInput.value;
        this.bcryptSaltRounds = parseInt(saltInput.value) || 10;
        
        // Clear hash first to show it's computing
        this.bcryptHash = '';
        this.updateResultsOnly();
        
        // Then compute the hash
        this.hashBcrypt();
    }

    async hashBcrypt() {
        if (!this.bcryptString) {
            this.bcryptHash = '';
            return;
        }

        try {
            // bcryptjs exposes itself as dcodeIO.bcrypt or just bcrypt
            const bcryptLib = (typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) 
                ? dcodeIO.bcrypt 
                : (typeof bcrypt !== 'undefined' ? bcrypt : null);
            
            if (!bcryptLib) {
                this.bcryptHash = 'Bcrypt library is required. Please ensure js/libs/bcrypt.min.js is loaded.';
                this.updateResultsOnly();
                return;
            }

            const salt = bcryptLib.genSaltSync(this.bcryptSaltRounds);
            this.bcryptHash = bcryptLib.hashSync(this.bcryptString, salt);
            this.updateResultsOnly();
        } catch (error) {
            console.error('Bcrypt hash error:', error);
            this.bcryptHash = 'Error generating bcrypt hash: ' + error.message;
            this.updateResultsOnly();
        }
    }

    onBcryptCompareInput() {
        const stringInput = document.getElementById('bcrypt-compare-string');
        const hashInput = document.getElementById('bcrypt-compare-hash');
        
        if (!stringInput || !hashInput) return;
        
        this.bcryptCompareString = stringInput.value;
        this.bcryptCompareHash = hashInput.value;
        
        // Set to null first to show "Computing..." state
        this.bcryptCompareResult = null;
        this.updateResultsOnly();
        
        // Then perform the comparison
        this.compareBcrypt();
    }

    async compareBcrypt() {
        // Always update the UI to show the comparison section
        if (!this.bcryptCompareString || !this.bcryptCompareHash) {
            this.bcryptCompareResult = null;
            this.updateResultsOnly();
            return;
        }

        try {
            // bcryptjs exposes itself as dcodeIO.bcrypt or just bcrypt
            let bcryptLib = null;
            
            // Check for dcodeIO.bcrypt first (bcryptjs standard)
            if (typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) {
                bcryptLib = dcodeIO.bcrypt;
            } 
            // Check for global bcrypt
            else if (typeof bcrypt !== 'undefined') {
                bcryptLib = bcrypt;
            }
            // Check for window.bcrypt
            else if (typeof window !== 'undefined' && window.bcrypt) {
                bcryptLib = window.bcrypt;
            }
            
            if (!bcryptLib || !bcryptLib.compareSync) {
                console.error('Bcrypt library not found or compareSync method not available');
                this.bcryptCompareResult = false;
                this.updateResultsOnly();
                return;
            }

            // Perform the comparison
            const result = bcryptLib.compareSync(this.bcryptCompareString, this.bcryptCompareHash);
            this.bcryptCompareResult = result;
            this.updateResultsOnly();
        } catch (error) {
            console.error('Bcrypt compare error:', error);
            this.bcryptCompareResult = false;
            this.updateResultsOnly();
        }
    }

    onHashInput() {
        const textInput = document.getElementById('hash-text');
        const encodingInput = document.getElementById('hash-encoding');
        
        if (!textInput || !encodingInput) return;
        
        this.hashText = textInput.value;
        this.hashEncoding = encodingInput.value;
        
        this.computeAllHashes();
        this.updateResultsOnly();
    }

    async computeAllHashes() {
        if (!this.hashText) {
            this.hashResults = {};
            return;
        }

        this.hashResults = {};

        try {
            if (typeof CryptoJS === 'undefined') {
                // Fallback to Web Crypto API for SHA algorithms only
                const encoder = new TextEncoder();
                const data = encoder.encode(this.hashText);
                
                const algorithmMap = {
                    'SHA256': 'SHA-256',
                    'SHA1': 'SHA-1',
                    'SHA512': 'SHA-512',
                    'SHA224': 'SHA-224',
                    'SHA384': 'SHA-384'
                };
                
                // Compute Web Crypto API hashes
                for (const [key, webCryptoAlgo] of Object.entries(algorithmMap)) {
                    try {
                        const hashBuffer = await crypto.subtle.digest(webCryptoAlgo, data);
                        const hashArray = new Uint8Array(hashBuffer);
                        
                        if (this.hashEncoding === 'hex') {
                            this.hashResults[key] = Array.from(hashArray)
                                .map(b => b.toString(16).padStart(2, '0'))
                                .join('');
                        } else {
                            this.hashResults[key] = btoa(String.fromCharCode(...hashArray));
                        }
                    } catch (error) {
                        this.hashResults[key] = 'Error: ' + error.message;
                    }
                }
                
                // Set error for algorithms that require CryptoJS
                this.hashResults['MD5'] = 'CryptoJS library required';
                this.hashResults['SHA3-256'] = 'CryptoJS library required';
                this.hashResults['SHA3-512'] = 'CryptoJS library required';
                this.hashResults['RIPEMD160'] = 'CryptoJS library required';
                
                this.updateResultsOnly();
                return;
            }

            // Compute all hashes using CryptoJS
            const algorithms = [
                { key: 'MD5', func: () => CryptoJS.MD5(this.hashText) },
                { key: 'SHA1', func: () => CryptoJS.SHA1(this.hashText) },
                { key: 'SHA224', func: () => CryptoJS.SHA224(this.hashText) },
                { key: 'SHA256', func: () => CryptoJS.SHA256(this.hashText) },
                { key: 'SHA384', func: () => CryptoJS.SHA384(this.hashText) },
                { key: 'SHA512', func: () => CryptoJS.SHA512(this.hashText) },
                { key: 'SHA3-256', func: () => CryptoJS.SHA3(this.hashText, { outputLength: 256 }) },
                { key: 'SHA3-512', func: () => CryptoJS.SHA3(this.hashText, { outputLength: 512 }) },
                { key: 'RIPEMD160', func: () => CryptoJS.RIPEMD160(this.hashText) }
            ];

            for (const algo of algorithms) {
                try {
                    const hash = algo.func();
                    if (this.hashEncoding === 'hex') {
                        this.hashResults[algo.key] = hash.toString(CryptoJS.enc.Hex);
                    } else {
                        this.hashResults[algo.key] = hash.toString(CryptoJS.enc.Base64);
                    }
                } catch (error) {
                    this.hashResults[algo.key] = 'Error: ' + error.message;
                }
            }
            
            this.updateResultsOnly();
        } catch (error) {
            console.error('Hash computation error:', error);
            this.hashResults = { error: 'Error computing hashes: ' + error.message };
            this.updateResultsOnly();
        }
    }

    copyText(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            const button = buttonElement;
            if (button) {
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                button.classList.add('btn-success');
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('btn-success');
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy text:', err);
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
            case 'rsa':
                newResultsHTML = this.renderRSAResults();
                break;
            case 'password':
                newResultsHTML = this.passwordResult ? this.renderPasswordResults() : this.renderPlaceholder('Enter a password above to analyze strength');
                break;
            case 'hmac':
                newResultsHTML = this.renderHMACResults();
                break;
            case 'bip39':
                newResultsHTML = this.renderBIP39Results();
                break;
            case 'encrypt':
                // For encrypt/decrypt, update both sections separately
                const encryptSection = toolSection.querySelector('.encrypt-section');
                const decryptSection = toolSection.querySelector('.decrypt-section');
                
                // Update encrypt result
                if (encryptSection) {
                    const existingEncryptResults = encryptSection.querySelector('.tool-results');
                    const newEncryptHTML = this.renderEncryptResult();
                    if (existingEncryptResults) {
                        existingEncryptResults.outerHTML = newEncryptHTML;
                    } else if (this.encryptResult) {
                        const toolInputSection = encryptSection.querySelector('.tool-input-section');
                        if (toolInputSection) {
                            toolInputSection.insertAdjacentHTML('afterend', newEncryptHTML);
                        }
                    }
                }
                
                // Update decrypt result
                if (decryptSection) {
                    const existingDecryptResults = decryptSection.querySelector('.tool-results');
                    const newDecryptHTML = this.renderDecryptResult();
                    if (existingDecryptResults) {
                        existingDecryptResults.outerHTML = newDecryptHTML;
                    } else if (this.decryptResult) {
                        const toolInputSection = decryptSection.querySelector('.tool-input-section');
                        if (toolInputSection) {
                            toolInputSection.insertAdjacentHTML('afterend', newDecryptHTML);
                        }
                    }
                }
                
                // Restore focus after update
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
                return; // Don't use the default results update for encrypt/decrypt
            case 'bcrypt':
                // For bcrypt, update both hash and compare result sections
                // Update hash result section
                const bcryptEncryptSection = toolSection.querySelector('.encrypt-section');
                if (bcryptEncryptSection) {
                    const existingHashResults = bcryptEncryptSection.querySelector('.tool-results');
                    const newHashHTML = this.renderBcryptHashResult();
                    if (existingHashResults) {
                        existingHashResults.outerHTML = newHashHTML;
                    } else if (this.bcryptHash) {
                        const toolInputSection = bcryptEncryptSection.querySelector('.tool-input-section');
                        if (toolInputSection) {
                            toolInputSection.insertAdjacentHTML('afterend', newHashHTML);
                        }
                    }
                }
                // Update compare result section
                const bcryptDecryptSection = toolSection.querySelector('.decrypt-section');
                if (bcryptDecryptSection) {
                    const existingResults = bcryptDecryptSection.querySelector('.tool-results');
                    const newCompareHTML = this.renderBcryptCompareResult();
                    if (existingResults) {
                        existingResults.outerHTML = newCompareHTML;
                    } else {
                        const toolInputSection = bcryptDecryptSection.querySelector('.tool-input-section');
                        if (toolInputSection) {
                            toolInputSection.insertAdjacentHTML('afterend', newCompareHTML);
                        }
                    }
                }
                // Restore focus after update
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
                return; // Don't use the default results update for bcrypt
            case 'hash':
                newResultsHTML = this.renderHashResults();
                break;
            case 'token':
                newResultsHTML = this.renderTokenResult();
                break;
            case 'uuid':
                newResultsHTML = this.renderUUIDResult();
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
            const inputSection = toolSection.querySelector('.tool-input-section, .encrypt-decrypt-container');
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
        window.cryptoToolsInstance = this;
        
        // Calculate all default values
        await this.generateRSA();
        this.analyzePassword();
        await this.computeHMAC();
        this.generateBIP39();
        await this.encrypt();
        await this.hashBcrypt();
        await this.computeAllHashes();
        this.generateToken();
        this.generateUUID();
        
        this.updateDisplay();
    }

    // ========== Token Generator Functions ==========
    onTokenInput() {
        const uppercaseInput = document.getElementById('token-uppercase');
        const lowercaseInput = document.getElementById('token-lowercase');
        const numbersInput = document.getElementById('token-numbers');
        const symbolsInput = document.getElementById('token-symbols');
        
        if (!uppercaseInput || !lowercaseInput || !numbersInput || !symbolsInput) return;
        
        this.tokenUppercase = uppercaseInput.checked;
        this.tokenLowercase = lowercaseInput.checked;
        this.tokenNumbers = numbersInput.checked;
        this.tokenSymbols = symbolsInput.checked;
        
        this.generateToken();
    }

    onTokenLengthChange() {
        const lengthInput = document.getElementById('token-length');
        const lengthValue = document.getElementById('token-length-value');
        
        if (!lengthInput) return;
        
        this.tokenLength = parseInt(lengthInput.value) || 64;
        
        if (lengthValue) {
            lengthValue.textContent = this.tokenLength;
        }
        
        this.generateToken();
    }

    generateToken() {
        let charset = '';
        if (this.tokenUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (this.tokenLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (this.tokenNumbers) charset += '0123456789';
        if (this.tokenSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        if (!charset) {
            this.tokenGenerated = 'Please select at least one character type';
            this.updateResultsOnly();
            return;
        }
        
        const randomArray = new Uint8Array(this.tokenLength);
        crypto.getRandomValues(randomArray);
        
        let token = '';
        for (let i = 0; i < this.tokenLength; i++) {
            token += charset[randomArray[i] % charset.length];
        }
        
        this.tokenGenerated = token;
        this.updateResultsOnly();
    }

    // ========== UUID Generator Functions ==========
    onUUIDInput() {
        const versionInput = document.getElementById('uuid-version');
        const quantityInput = document.getElementById('uuid-quantity');
        const namespaceInput = document.getElementById('uuid-namespace');
        const nameInput = document.getElementById('uuid-name');
        
        if (!versionInput || !quantityInput) return;
        
        this.uuidVersion = versionInput.value;
        this.uuidQuantity = parseInt(quantityInput.value) || 1;
        
        if (namespaceInput) {
            this.uuidNamespace = namespaceInput.value;
        }
        if (nameInput) {
            this.uuidName = nameInput.value;
        }
        
        this.generateUUID();
    }

    generateUUID() {
        this.uuidGenerated = [];
        
        for (let i = 0; i < this.uuidQuantity; i++) {
            let uuid = '';
            
            switch (this.uuidVersion) {
                case 'NIL':
                    uuid = '00000000-0000-0000-0000-000000000000';
                    break;
                case 'v1':
                    uuid = this.generateUUIDv1();
                    break;
                case 'v3':
                    // Use default name if not provided
                    const nameForV3 = this.uuidName || 'example.com';
                    uuid = this.generateUUIDv3(nameForV3);
                    break;
                case 'v4':
                    uuid = this.generateUUIDv4();
                    break;
                case 'v5':
                    // Use default name if not provided
                    const nameForV5 = this.uuidName || 'example.com';
                    uuid = this.generateUUIDv5(nameForV5);
                    break;
                default:
                    uuid = this.generateUUIDv4();
            }
            
            this.uuidGenerated.push(uuid);
        }
        
        this.updateResultsOnly();
    }

    generateUUIDv1() {
        const timestamp = Date.now();
        const randomBytes = new Uint8Array(10);
        crypto.getRandomValues(randomBytes);
        
        const timeLow = (timestamp & 0xffffffff).toString(16).padStart(8, '0');
        const timeMid = ((timestamp >> 32) & 0xffff).toString(16).padStart(4, '0');
        const timeHi = ((timestamp >> 48) & 0x0fff).toString(16).padStart(4, '0');
        const clockSeq = Array.from(randomBytes.slice(0, 2)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 4);
        const node = Array.from(randomBytes.slice(2)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
        
        return `${timeLow}-${timeMid}-1${timeHi}-${(parseInt(clockSeq, 16) | 0x8000).toString(16).padStart(4, '0')}-${node}`;
    }

    generateUUIDv3(name = null) {
        if (typeof CryptoJS === 'undefined') {
            return 'CryptoJS library required for v3 UUID';
        }
        
        const nameToUse = name || this.uuidName || 'example.com';
        const namespaceUUID = this.getNamespaceUUID(this.uuidNamespace);
        const namespaceBytes = this.uuidToBytes(namespaceUUID);
        const nameBytes = new TextEncoder().encode(nameToUse);
        const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
        combined.set(namespaceBytes);
        combined.set(nameBytes, namespaceBytes.length);
        
        const hash = CryptoJS.MD5(Array.from(combined).map(b => String.fromCharCode(b)).join(''));
        const hashHex = hash.toString(CryptoJS.enc.Hex);
        
        return this.formatUUID(hashHex, 3);
    }

    generateUUIDv4() {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        
        randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
        randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;
        
        const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        return this.formatUUID(hex, 4);
    }

    generateUUIDv5(name = null) {
        if (typeof CryptoJS === 'undefined') {
            return 'CryptoJS library required for v5 UUID';
        }
        
        const nameToUse = name || this.uuidName || 'example.com';
        const namespaceUUID = this.getNamespaceUUID(this.uuidNamespace);
        const namespaceBytes = this.uuidToBytes(namespaceUUID);
        const nameBytes = new TextEncoder().encode(nameToUse);
        const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
        combined.set(namespaceBytes);
        combined.set(nameBytes, namespaceBytes.length);
        
        const hash = CryptoJS.SHA1(Array.from(combined).map(b => String.fromCharCode(b)).join(''));
        const hashHex = hash.toString(CryptoJS.enc.Hex);
        
        return this.formatUUID(hashHex.substring(0, 32), 5);
    }

    getNamespaceUUID(namespace) {
        const namespaces = {
            'DNS': '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            'URL': '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
            'OID': '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
            'X500': '6ba7b814-9dad-11d1-80b4-00c04fd430c8'
        };
        return namespaces[namespace] || namespaces['DNS'];
    }

    uuidToBytes(uuid) {
        const hex = uuid.replace(/-/g, '');
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }

    formatUUID(hex, version) {
        if (hex.length < 32) {
            hex = hex.padEnd(32, '0');
        }
        hex = hex.substring(0, 32);
        
        // UUID format: xxxxxxxx-xxxx-Vxxx-xxxx-xxxxxxxxxxxx
        // Where V is the version number (3, 4, or 5)
        const timeLow = hex.substring(0, 8);
        const timeMid = hex.substring(8, 12);
        // The version replaces the first character of the third group (position 12 in hex)
        const timeHi = hex.substring(12, 16);
        const timeHiAndVersion = version + timeHi.substring(1);
        // Variant bits: first two bits should be 10 (binary), which is 0x80-0xBF in hex
        const clockSeqHigh = hex.substring(16, 18);
        const clockSeqLow = hex.substring(18, 20);
        const clockSeqAndVariant = ((parseInt(clockSeqHigh, 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + clockSeqLow;
        const node = hex.substring(20, 32);
        
        return `${timeLow}-${timeMid}-${timeHiAndVersion}-${clockSeqAndVariant}-${node}`;
    }

    unmount() {
        delete window.cryptoToolsInstance;
    }
}

