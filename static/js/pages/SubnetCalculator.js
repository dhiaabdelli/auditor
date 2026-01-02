export class SubnetCalculatorPage {
    constructor() {
        this.activeTab = 'subnet';
        // Subnet Calculator - default values
        this.subnetInput = '192.168.0.1/24';
        this.subnetResult = null;
        // IP Converter - default values
        this.converterInput = '192.168.1.1';
        this.converterResult = null;
        // Range Expander - default values
        this.rangeStart = '192.168.1.1';
        this.rangeEnd = '192.168.6.255';
        this.rangeResult = null;
        // MAC Lookup - default values
        this.macLookupInput = '20:37:06:12:34:56';
        this.macLookupResult = null;
        this.macLookupTimeout = null;
        // MAC Generator - default values
        this.macQuantity = 1;
        this.macPrefix = '64:16:7F';
        this.macCase = 'uppercase';
        this.macSeparator = ':';
        this.macGenerated = [];
    }

    render() {
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <h1 class="page-title"><i class="fas fa-network-wired"></i> Network Tools</h1>
                </div>

                <div class="network-tools-container">
                    <div class="network-tabs">
                        <button class="network-tab ${this.activeTab === 'subnet' ? 'active' : ''}" 
                                onclick="subnetCalculatorInstance.switchTab('subnet')">
                            <i class="fas fa-calculator"></i> Subnet Calculator
                        </button>
                        <button class="network-tab ${this.activeTab === 'converter' ? 'active' : ''}" 
                                onclick="subnetCalculatorInstance.switchTab('converter')">
                            <i class="fas fa-exchange-alt"></i> IP Converter
                        </button>
                        <button class="network-tab ${this.activeTab === 'range' ? 'active' : ''}" 
                                onclick="subnetCalculatorInstance.switchTab('range')">
                            <i class="fas fa-arrows-alt-h"></i> Range Expander
                        </button>
                        <button class="network-tab ${this.activeTab === 'mac-lookup' ? 'active' : ''}" 
                                onclick="subnetCalculatorInstance.switchTab('mac-lookup')">
                            <i class="fas fa-search"></i> MAC Lookup
                        </button>
                        <button class="network-tab ${this.activeTab === 'mac-generator' ? 'active' : ''}" 
                                onclick="subnetCalculatorInstance.switchTab('mac-generator')">
                            <i class="fas fa-random"></i> MAC Generator
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
            case 'subnet':
                return this.renderSubnetCalculator();
            case 'converter':
                return this.renderIPConverter();
            case 'range':
                return this.renderRangeExpander();
            case 'mac-lookup':
                return this.renderMACLookup();
            case 'mac-generator':
                return this.renderMACGenerator();
            default:
                return this.renderSubnetCalculator();
        }
    }

    // ========== Subnet Calculator ==========
    renderSubnetCalculator() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-network-wired"></i> IPv4 Address (with or without mask)
                        </label>
                        <input 
                            type="text" 
                            id="subnet-input" 
                            class="form-input" 
                            placeholder="192.168.0.1/24 or 192.168.0.1"
                            value="${this.escapeHtml(this.subnetInput)}"
                            oninput="subnetCalculatorInstance.onSubnetInput()"
                        />
                        <small class="form-hint">
                            <i class="fas fa-info-circle"></i> Enter IP address with CIDR notation (e.g., 192.168.0.1/24) or IP address only
                        </small>
                    </div>
                </div>
                ${this.subnetResult ? this.renderSubnetResults() : this.renderPlaceholder('Enter an IPv4 address above to calculate subnet information')}
            </div>
        `;
    }

    renderSubnetResults() {
        if (this.subnetResult.error) {
            return this.renderError(this.subnetResult.error);
        }

        const r = this.subnetResult;
        return `
            <div class="tool-results">
                <div class="results-grid">
                    <div class="result-card">
                        <div class="result-label">IPv4 Address</div>
                        <div class="result-value">${this.escapeHtml(r.ipAddress)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Netmask</div>
                        <div class="result-value">${this.escapeHtml(r.netmask)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Network Address</div>
                        <div class="result-value highlight">${this.escapeHtml(r.networkAddress)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Network Mask</div>
                        <div class="result-value">${this.escapeHtml(r.networkMask)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Network Mask (Binary)</div>
                        <div class="result-value binary">${this.escapeHtml(r.networkMaskBinary)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">CIDR Notation</div>
                        <div class="result-value">${this.escapeHtml(r.cidrNotation)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Wildcard Mask</div>
                        <div class="result-value">${this.escapeHtml(r.wildcardMask)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Network Size</div>
                        <div class="result-value highlight">${this.escapeHtml(r.networkSize.toString())}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">First Address</div>
                        <div class="result-value">${this.escapeHtml(r.firstAddress)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Last Address</div>
                        <div class="result-value">${this.escapeHtml(r.lastAddress)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Broadcast Address</div>
                        <div class="result-value highlight">${this.escapeHtml(r.broadcastAddress)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">IP Class</div>
                        <div class="result-value">${this.escapeHtml(r.ipClass)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== IP Converter ==========
    renderIPConverter() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-exchange-alt"></i> IPv4 Address
                        </label>
                        <input 
                            type="text" 
                            id="converter-input" 
                            class="form-input" 
                            placeholder="192.168.1.1"
                            value="${this.escapeHtml(this.converterInput)}"
                            oninput="subnetCalculatorInstance.onConverterInput()"
                        />
                        <small class="form-hint">
                            <i class="fas fa-info-circle"></i> Enter an IPv4 address to convert
                        </small>
                    </div>
                </div>
                ${this.converterResult ? this.renderConverterResults() : this.renderPlaceholder('Enter an IPv4 address above to see conversions')}
            </div>
        `;
    }

    renderConverterResults() {
        if (this.converterResult.error) {
            return this.renderError(this.converterResult.error);
        }

        const r = this.converterResult;
        return `
            <div class="tool-results">
                <div class="results-grid">
                    <div class="result-card">
                        <div class="result-label">IPv4 Address</div>
                        <div class="result-value">${this.escapeHtml(r.ipAddress)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Decimal</div>
                        <div class="result-value highlight">${this.escapeHtml(r.decimal.toString())}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Hexadecimal</div>
                        <div class="result-value">${this.escapeHtml(r.hexadecimal)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">Binary</div>
                        <div class="result-value binary">${this.escapeHtml(r.binary)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">IPv6</div>
                        <div class="result-value">${this.escapeHtml(r.ipv6)}</div>
                    </div>
                    <div class="result-card">
                        <div class="result-label">IPv6 (Short)</div>
                        <div class="result-value">${this.escapeHtml(r.ipv6Short)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== Range Expander ==========
    renderRangeExpander() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-arrows-alt-h"></i> Start Address
                        </label>
                        <input 
                            type="text" 
                            id="range-start" 
                            class="form-input" 
                            placeholder="192.168.1.1"
                            value="${this.escapeHtml(this.rangeStart)}"
                            oninput="subnetCalculatorInstance.onRangeInput()"
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-arrows-alt-h"></i> End Address
                        </label>
                        <input 
                            type="text" 
                            id="range-end" 
                            class="form-input" 
                            placeholder="192.168.6.255"
                            value="${this.escapeHtml(this.rangeEnd)}"
                            oninput="subnetCalculatorInstance.onRangeInput()"
                        />
                        <small class="form-hint">
                            <i class="fas fa-info-circle"></i> Enter start and end IPv4 addresses to calculate subnet
                        </small>
                    </div>
                </div>
                ${this.rangeResult ? this.renderRangeResults() : this.renderPlaceholder('Enter start and end addresses above to calculate subnet')}
            </div>
        `;
    }

    renderRangeResults() {
        if (this.rangeResult.error) {
            return this.renderError(this.rangeResult.error);
        }

        const r = this.rangeResult;
        const formatNumber = (num) => num.toLocaleString();
        
        return `
            <div class="tool-results">
                <div class="range-results-table">
                    <table class="range-comparison-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Old Value</th>
                                <th>New Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Start Address</strong></td>
                                <td>${this.escapeHtml(r.oldStart)}</td>
                                <td class="new-value">${this.escapeHtml(r.newStart)}</td>
                            </tr>
                            <tr>
                                <td><strong>End Address</strong></td>
                                <td>${this.escapeHtml(r.oldEnd)}</td>
                                <td class="new-value">${this.escapeHtml(r.newEnd)}</td>
                            </tr>
                            <tr>
                                <td><strong>Addresses in Range</strong></td>
                                <td>${formatNumber(r.oldCount)}</td>
                                <td class="new-value">${formatNumber(r.newCount)}</td>
                            </tr>
                            <tr>
                                <td><strong>CIDR</strong></td>
                                <td colspan="2" class="cidr-value">${this.escapeHtml(r.cidr)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ========== MAC Lookup ==========
    renderMACLookup() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-search"></i> MAC Address
                        </label>
                        <input 
                            type="text" 
                            id="mac-lookup-input" 
                            class="form-input" 
                            placeholder="20:37:06:12:34:56"
                            value="${this.escapeHtml(this.macLookupInput)}"
                            oninput="subnetCalculatorInstance.onMACLookupInput()"
                        />
                        <small class="form-hint">
                            <i class="fas fa-info-circle"></i> Enter a MAC address to lookup vendor information
                        </small>
                    </div>
                </div>
                ${this.macLookupResult ? this.renderMACLookupResults() : this.renderPlaceholder('Enter a MAC address above to lookup vendor information')}
            </div>
        `;
    }

    renderMACLookupResults() {
        if (this.macLookupResult.error) {
            return this.renderError(this.macLookupResult.error);
        }

        const r = this.macLookupResult;
        return `
            <div class="tool-results">
                <div class="results-grid">
                    <div class="result-card full-width">
                        <div class="result-label">MAC Address</div>
                        <div class="result-value">${this.escapeHtml(r.macAddress)}</div>
                    </div>
                    <div class="result-card full-width">
                        <div class="result-label">Vendor Info</div>
                        <div class="result-value vendor-info">
                            ${r.vendorInfo ? r.vendorInfo.split('\n').map(line => `<div>${this.escapeHtml(line)}</div>`).join('') : 'No vendor information found'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== MAC Generator ==========
    renderMACGenerator() {
        return `
            <div class="tool-section">
                <div class="tool-input-section">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-random"></i> Quantity
                        </label>
                        <input 
                            type="number" 
                            id="mac-quantity" 
                            class="form-input" 
                            min="1"
                            max="100"
                            value="${this.macQuantity}"
                            oninput="subnetCalculatorInstance.onMACGeneratorInput()"
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-tag"></i> MAC Address Prefix (optional)
                        </label>
                        <input 
                            type="text" 
                            id="mac-prefix" 
                            class="form-input" 
                            placeholder="64:16:7F"
                            value="${this.escapeHtml(this.macPrefix)}"
                            oninput="subnetCalculatorInstance.onMACGeneratorInput()"
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-font"></i> Case
                        </label>
                        <select 
                            id="mac-case" 
                            class="form-input"
                            onchange="subnetCalculatorInstance.onMACGeneratorInput()"
                        >
                            <option value="uppercase" ${this.macCase === 'uppercase' ? 'selected' : ''}>Uppercase</option>
                            <option value="lowercase" ${this.macCase === 'lowercase' ? 'selected' : ''}>Lowercase</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-minus"></i> Separator
                        </label>
                        <select 
                            id="mac-separator" 
                            class="form-input"
                            onchange="subnetCalculatorInstance.onMACGeneratorInput()"
                        >
                            <option value=":" ${this.macSeparator === ':' ? 'selected' : ''}>:</option>
                            <option value="-" ${this.macSeparator === '-' ? 'selected' : ''}>-</option>
                            <option value="." ${this.macSeparator === '.' ? 'selected' : ''}>.</option>
                            <option value="" ${this.macSeparator === '' ? 'selected' : ''}>None</option>
                        </select>
                    </div>
                </div>
                ${this.renderMACGeneratorResults()}
            </div>
        `;
    }

    renderMACGeneratorResults() {
        if (this.macGenerated.length === 0) {
            return this.renderPlaceholder('Configure settings above and MAC addresses will be generated automatically');
        }

        return `
            <div class="tool-results">
                <div class="mac-generated-list">
                    ${this.macGenerated.map((mac, index) => `
                        <div class="mac-item">
                            <div class="mac-value">${this.escapeHtml(mac)}</div>
                            <button class="btn btn-sm btn-secondary" onclick="subnetCalculatorInstance.copyMAC('${this.escapeHtml(mac)}')">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                    `).join('')}
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

    renderError(message) {
        return `
            <div class="tool-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    // ========== Event Handlers ==========
    switchTab(tab) {
        this.activeTab = tab;
        this.updateDisplay();
        
        // Focus on first input after tab switch
        setTimeout(() => {
            const firstInput = document.querySelector(`#${tab === 'subnet' ? 'subnet' : tab === 'converter' ? 'converter' : tab === 'range' ? 'range-start' : tab === 'mac-lookup' ? 'mac-lookup' : 'mac-quantity'}-input`);
            if (firstInput) firstInput.focus();
        }, 100);
    }

    onSubnetInput() {
        const input = document.getElementById('subnet-input');
        if (!input) return;
        
        this.subnetInput = input.value;
        this.calculateSubnet();
        this.updateResultsOnly();
    }

    onConverterInput() {
        const input = document.getElementById('converter-input');
        if (!input) return;
        
        this.converterInput = input.value;
        this.convertIP();
        this.updateResultsOnly();
    }

    onRangeInput() {
        const startInput = document.getElementById('range-start');
        const endInput = document.getElementById('range-end');
        if (!startInput || !endInput) return;
        
        this.rangeStart = startInput.value;
        this.rangeEnd = endInput.value;
        this.expandRange();
        this.updateResultsOnly();
    }

    onMACLookupInput() {
        const input = document.getElementById('mac-lookup-input');
        if (!input) return;
        
        this.macLookupInput = input.value;
        this.lookupMAC();
        // lookupMAC will call updateDisplay when done
    }

    onMACGeneratorInput() {
        const quantityInput = document.getElementById('mac-quantity');
        const prefixInput = document.getElementById('mac-prefix');
        const caseInput = document.getElementById('mac-case');
        const separatorInput = document.getElementById('mac-separator');
        
        if (!quantityInput || !prefixInput || !caseInput || !separatorInput) return;
        
        this.macQuantity = parseInt(quantityInput.value) || 1;
        this.macPrefix = prefixInput.value;
        this.macCase = caseInput.value;
        this.macSeparator = separatorInput.value;
        
        this.generateMAC();
        this.updateResultsOnly();
    }

    // ========== Calculation Functions ==========
    calculateSubnet() {
        if (!this.subnetInput) {
            this.subnetResult = null;
            this.updateDisplay();
            return;
        }

        try {
            this.subnetResult = this.calculateSubnetInfo(this.subnetInput);
        } catch (error) {
            this.subnetResult = { error: error.message || 'Invalid IPv4 address format' };
        }

        this.updateDisplay();
    }

    convertIP() {
        if (!this.converterInput || !this.converterInput.trim()) {
            this.converterResult = null;
            return;
        }

        const trimmed = this.converterInput.trim();
        if (!this.isValidIP(trimmed)) {
            this.converterResult = { error: 'Invalid IPv4 address format' };
            return;
        }

        try {
            const ipNum = this.ipToNumber(trimmed);
            const hex = ipNum.toString(16).toUpperCase().padStart(8, '0');
            const binary = this.ipToBinary(trimmed);
            const ipv6 = `0000:0000:0000:0000:0000:ffff:${hex.substring(0, 4)}:${hex.substring(4)}`;
            const ipv6Short = `::ffff:${hex.substring(0, 4)}:${hex.substring(4)}`;

            this.converterResult = {
                ipAddress: trimmed,
                decimal: ipNum >>> 0, // Unsigned
                hexadecimal: hex,
                binary: binary,
                ipv6: ipv6,
                ipv6Short: ipv6Short
            };
        } catch (error) {
            this.converterResult = { error: error.message || 'Conversion failed' };
        }
    }

    expandRange() {
        if (!this.rangeStart || !this.rangeStart.trim() || !this.rangeEnd || !this.rangeEnd.trim()) {
            this.rangeResult = null;
            return;
        }

        const trimmedStart = this.rangeStart.trim();
        const trimmedEnd = this.rangeEnd.trim();
        
        if (!this.isValidIP(trimmedStart) || !this.isValidIP(trimmedEnd)) {
            this.rangeResult = { error: 'Invalid IPv4 address format' };
            return;
        }

        try {
            const startNum = this.ipToNumber(trimmedStart);
            const endNum = this.ipToNumber(trimmedEnd);

            if (startNum > endNum) {
                this.rangeResult = { error: 'Start address must be less than or equal to end address' };
                return;
            }

            // Calculate the smallest subnet that contains both addresses
            const range = endNum - startNum + 1;
            let cidr = 32;
            while (Math.pow(2, 32 - cidr) < range) {
                cidr--;
            }

            const maskNum = this.cidrToMask(cidr);
            const networkNum = startNum & maskNum;
            const networkAddress = this.numberToIP(networkNum);
            const broadcastNum = networkNum | (~maskNum >>> 0);
            const broadcastAddress = this.numberToIP(broadcastNum);
            const newCount = Math.pow(2, 32 - cidr);

            this.rangeResult = {
                oldStart: trimmedStart,
                oldEnd: trimmedEnd,
                oldCount: range,
                newStart: networkAddress,
                newEnd: broadcastAddress,
                newCount: newCount,
                cidr: `${networkAddress}/${cidr}`
            };
        } catch (error) {
            this.rangeResult = { error: error.message || 'Range expansion failed' };
        }
    }

    async lookupMAC() {
        // Clear existing timeout
        if (this.macLookupTimeout) {
            clearTimeout(this.macLookupTimeout);
        }

        // Debounce API calls (wait 500ms after user stops typing)
        this.macLookupTimeout = setTimeout(async () => {
            if (!this.macLookupInput || !this.macLookupInput.trim()) {
                this.macLookupResult = null;
                this.updateResultsOnly();
                return;
            }

            // Normalize MAC address
            const normalized = this.normalizeMAC(this.macLookupInput.trim());
            if (!normalized) {
                this.macLookupResult = { error: 'Invalid MAC address format' };
                this.updateResultsOnly();
                return;
            }

            // Show loading state
            this.macLookupResult = {
                macAddress: normalized,
                vendorInfo: 'Looking up vendor information...'
            };
            this.updateResultsOnly();

            try {
                // Use macvendors.com API (free, no API key required)
                // Note: This API may have CORS restrictions, so we'll handle errors gracefully
                const response = await fetch(`https://api.macvendors.com/${encodeURIComponent(normalized)}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    mode: 'cors'
                });

                if (response.ok) {
                    const data = await response.text();
                    this.macLookupResult = {
                        macAddress: normalized,
                        vendorInfo: data || 'No vendor information found'
                    };
                } else {
                    this.macLookupResult = {
                        macAddress: normalized,
                        vendorInfo: 'No vendor information found'
                    };
                }
            } catch (error) {
                // If CORS fails, try alternative approach or show message
                this.macLookupResult = {
                    macAddress: normalized,
                    vendorInfo: 'Unable to lookup vendor information. The MAC address format is valid, but vendor lookup service is unavailable.'
                };
            }

            this.updateResultsOnly();
        }, 500);
    }

    generateMAC() {
        this.macGenerated = [];
        
        for (let i = 0; i < this.macQuantity; i++) {
            let mac = '';
            
            if (this.macPrefix && this.macPrefix.trim()) {
                // Use prefix if provided
                const prefixParts = this.macPrefix.trim().split(/[:.\-]/).filter(p => p);
                if (prefixParts.length <= 6) {
                    mac = prefixParts.map(p => p.padStart(2, '0')).join(this.macSeparator);
                    // Fill remaining octets
                    const remaining = 6 - prefixParts.length;
                    for (let j = 0; j < remaining; j++) {
                        if (this.macSeparator) mac += this.macSeparator;
                        mac += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
                    }
                } else {
                    // Prefix too long, use first 6 parts
                    mac = prefixParts.slice(0, 6).map(p => p.padStart(2, '0')).join(this.macSeparator);
                }
            } else {
                // Generate random MAC
                const parts = [];
                for (let j = 0; j < 6; j++) {
                    parts.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
                }
                mac = parts.join(this.macSeparator);
            }
            
            // Apply case
            mac = this.macCase === 'uppercase' ? mac.toUpperCase() : mac.toLowerCase();
            
            this.macGenerated.push(mac);
        }
    }

    copyMAC(mac) {
        navigator.clipboard.writeText(mac).then(() => {
            // Show feedback
            const button = event.target.closest('button');
            if (button) {
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                button.classList.add('btn-success');
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('btn-success');
                }, 2000);
            }
        });
    }

    // ========== Helper Functions ==========
    calculateSubnetInfo(input) {
        let ipAddress, cidr;

        if (input.includes('/')) {
            const parts = input.split('/');
            ipAddress = parts[0].trim();
            cidr = parseInt(parts[1].trim(), 10);
            
            if (isNaN(cidr) || cidr < 0 || cidr > 32) {
                throw new Error('CIDR notation must be between 0 and 32');
            }
        } else {
            ipAddress = input.trim();
            cidr = 24;
        }

        if (!this.isValidIP(ipAddress)) {
            throw new Error('Invalid IPv4 address format');
        }

        const ipNum = this.ipToNumber(ipAddress);
        const maskNum = this.cidrToMask(cidr);
        const maskIP = this.numberToIP(maskNum);
        const networkNum = ipNum & maskNum;
        const networkAddress = this.numberToIP(networkNum);
        const wildcardNum = ~maskNum >>> 0;
        const broadcastNum = networkNum | wildcardNum;
        const broadcastAddress = this.numberToIP(broadcastNum);
        const networkSize = Math.pow(2, 32 - cidr);
        const firstAddress = networkSize > 2 ? this.numberToIP(networkNum + 1) : networkAddress;
        const lastAddress = networkSize > 2 ? this.numberToIP(broadcastNum - 1) : broadcastAddress;
        const maskBinary = this.ipToBinary(maskIP);
        const wildcardMask = this.numberToIP(wildcardNum);
        const ipClass = this.getIPClass(ipAddress);

        return {
            ipAddress: ipAddress,
            netmask: `${networkAddress}/${cidr}`,
            networkAddress: networkAddress,
            networkMask: maskIP,
            networkMaskBinary: maskBinary,
            cidrNotation: `/${cidr}`,
            wildcardMask: wildcardMask,
            networkSize: networkSize,
            firstAddress: firstAddress,
            lastAddress: lastAddress,
            broadcastAddress: broadcastAddress,
            ipClass: ipClass
        };
    }

    isValidIP(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        
        return parts.every(part => {
            const num = parseInt(part, 10);
            return !isNaN(num) && num >= 0 && num <= 255;
        });
    }

    normalizeMAC(mac) {
        // Remove separators and convert to uppercase
        // Escape hyphen in character class or place it at the end
        const cleaned = mac.replace(/[:.\-]/g, '').toUpperCase();
        
        // Must be 12 hex characters
        if (!/^[0-9A-F]{12}$/.test(cleaned)) {
            return null;
        }
        
        // Format as XX:XX:XX:XX:XX:XX
        return cleaned.match(/.{2}/g).join(':');
    }

    ipToNumber(ip) {
        const parts = ip.split('.');
        return (parseInt(parts[0], 10) << 24) +
               (parseInt(parts[1], 10) << 16) +
               (parseInt(parts[2], 10) << 8) +
               parseInt(parts[3], 10);
    }

    numberToIP(num) {
        return [
            (num >>> 24) & 255,
            (num >>> 16) & 255,
            (num >>> 8) & 255,
            num & 255
        ].join('.');
    }

    cidrToMask(cidr) {
        return (0xFFFFFFFF << (32 - cidr)) >>> 0;
    }

    ipToBinary(ip) {
        return ip.split('.').map(octet => {
            const num = parseInt(octet, 10);
            return num.toString(2).padStart(8, '0');
        }).join('.');
    }

    getIPClass(ip) {
        const firstOctet = parseInt(ip.split('.')[0], 10);
        
        if (firstOctet >= 1 && firstOctet <= 126) return 'A';
        if (firstOctet >= 128 && firstOctet <= 191) return 'B';
        if (firstOctet >= 192 && firstOctet <= 223) return 'C';
        if (firstOctet >= 224 && firstOctet <= 239) return 'D';
        if (firstOctet >= 240 && firstOctet <= 255) return 'E';
        return 'Unknown';
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
            // Save current input values and focus
            const activeElement = document.activeElement;
            const activeId = activeElement && activeElement.id ? activeElement.id : null;
            const activeValue = activeElement && activeElement.value ? activeElement.value : null;
            const cursorPosition = activeElement && activeElement.selectionStart ? activeElement.selectionStart : null;
            
            content.innerHTML = this.render();
            
            // Restore focus and cursor position if it was an input
            if (activeId && activeValue !== null) {
                setTimeout(() => {
                    const element = document.getElementById(activeId);
                    if (element && element.tagName === 'INPUT') {
                        element.value = activeValue;
                        element.focus();
                        if (cursorPosition !== null) {
                            element.setSelectionRange(cursorPosition, cursorPosition);
                        }
                    }
                }, 0);
            }
        }
    }
    
    updateResultsOnly() {
        // Only update the results section, not the entire page
        const tabContent = document.querySelector('.network-tab-content');
        if (!tabContent) return;
        
        const toolSection = tabContent.querySelector('.tool-section');
        if (!toolSection) return;
        
        // Save which input had focus and cursor position
        const activeElement = document.activeElement;
        const activeId = activeElement && activeElement.id ? activeElement.id : null;
        const cursorPosition = activeElement && activeElement.tagName === 'INPUT' && activeElement.selectionStart !== null ? activeElement.selectionStart : null;
        
        // Get the current active tab's results HTML
        let newResultsHTML = '';
        switch (this.activeTab) {
            case 'subnet':
                newResultsHTML = this.subnetResult ? this.renderSubnetResults() : this.renderPlaceholder('Enter an IPv4 address above to calculate subnet information');
                break;
            case 'converter':
                newResultsHTML = this.converterResult ? this.renderConverterResults() : this.renderPlaceholder('Enter an IPv4 address above to see conversions');
                break;
            case 'range':
                newResultsHTML = this.rangeResult ? this.renderRangeResults() : this.renderPlaceholder('Enter start and end addresses above to calculate subnet');
                break;
            case 'mac-lookup':
                newResultsHTML = this.macLookupResult ? this.renderMACLookupResults() : this.renderPlaceholder('Enter a MAC address above to lookup vendor information');
                break;
            case 'mac-generator':
                newResultsHTML = this.renderMACGeneratorResults();
                break;
        }
        
        // Find and replace the results container
        const resultsContainer = toolSection.querySelector('.tool-results, .tool-results-placeholder, .tool-error');
        if (resultsContainer) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newResultsHTML;
            const newResultsContainer = tempDiv.firstElementChild;
            if (newResultsContainer) {
                resultsContainer.replaceWith(newResultsContainer);
            }
        } else {
            // Results container doesn't exist, append it after input section
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
        
        // Restore focus and cursor position
        if (activeId) {
            setTimeout(() => {
                const element = document.getElementById(activeId);
                if (element && element.tagName === 'INPUT') {
                    element.focus();
                    if (cursorPosition !== null) {
                        element.setSelectionRange(cursorPosition, cursorPosition);
                    }
                }
            }, 0);
        }
    }

    async mount() {
        window.subnetCalculatorInstance = this;
        
        // Calculate all default values
        this.calculateSubnet();
        this.convertIP();
        this.expandRange();
        this.generateMAC();
        
        // Load MAC lookup after a short delay to avoid immediate API call
        setTimeout(() => {
            this.lookupMAC();
        }, 300);
        
        this.updateDisplay();
    }

    unmount() {
        delete window.subnetCalculatorInstance;
    }
}
