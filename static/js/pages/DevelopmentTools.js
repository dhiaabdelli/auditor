export class DevelopmentToolsPage {
    constructor() {
        this.activeTab = 'crontab';
        
        // Crontab Generator
        this.crontabExpression = '40 * * * *';
        this.crontabSeconds = false;
        this.crontab24Hour = true;
        this.crontabDaysStartAt0 = true;
        this.crontabVerbose = false;
        this.crontabDescription = '';
        
        // JSON Prettify
        this.jsonInput = '{"hello": "world", "foo": "bar"}';
        this.jsonOutput = '';
        this.jsonSortKeys = false;
        this.jsonIndentSize = 3;
        
        // SQL Prettify
        this.sqlInput = 'select field1,field2,field3 from my_table where my_condition;';
        this.sqlOutput = '';
        this.sqlDialect = 'standard';
        this.sqlKeywordCase = 'uppercase';
        this.sqlIndentStyle = 'standard';
        
        // Chmod Calculator
        this.chmodOwner = { read: false, write: false, execute: false };
        this.chmodGroup = { read: false, write: false, execute: false };
        this.chmodPublic = { read: false, write: false, execute: false };
        this.chmodValue = '000';
        
        // Docker Converter
        this.dockerRunCommand = 'docker run -p 80:80 -v /var/run/docker.sock:/tmp/docker.sock:ro --restart always --log-opt max-size=1g nginx';
        this.dockerComposeOutput = '';
        
        // XML Formatter
        this.xmlInput = '<hello><world>foo</world><world>bar</world></hello>';
        this.xmlOutput = '';
        this.xmlIndentSize = 2;
        this.xmlCollapseContent = false;
    }

    render() {
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <h1 class="page-title">
                        <i class="fas fa-code"></i> Development Tools
                    </h1>
                </div>
                <div class="network-tabs">
                    <button class="network-tab ${this.activeTab === 'crontab' ? 'active' : ''}" onclick="devToolsInstance.switchTab('crontab')">
                        <i class="fas fa-clock"></i> <span>Crontab</span>
                    </button>
                    <button class="network-tab ${this.activeTab === 'json' ? 'active' : ''}" onclick="devToolsInstance.switchTab('json')">
                        <i class="fas fa-code"></i> <span>JSON</span>
                    </button>
                    <button class="network-tab ${this.activeTab === 'sql' ? 'active' : ''}" onclick="devToolsInstance.switchTab('sql')">
                        <i class="fas fa-database"></i> <span>SQL</span>
                    </button>
                    <button class="network-tab ${this.activeTab === 'chmod' ? 'active' : ''}" onclick="devToolsInstance.switchTab('chmod')">
                        <i class="fas fa-lock"></i> <span>Chmod</span>
                    </button>
                    <button class="network-tab ${this.activeTab === 'docker' ? 'active' : ''}" onclick="devToolsInstance.switchTab('docker')">
                        <i class="fab fa-docker"></i> <span>Docker</span>
                    </button>
                    <button class="network-tab ${this.activeTab === 'xml' ? 'active' : ''}" onclick="devToolsInstance.switchTab('xml')">
                        <i class="fas fa-file-code"></i> <span>XML</span>
                    </button>
                </div>
                <div class="network-tab-content">
                    ${this.renderActiveTab()}
                </div>
            </div>
        `;
    }

    renderActiveTab() {
        switch (this.activeTab) {
            case 'crontab':
                return this.renderCrontab();
            case 'json':
                return this.renderJSON();
            case 'sql':
                return this.renderSQL();
            case 'chmod':
                return this.renderChmod();
            case 'docker':
                return this.renderDocker();
            case 'xml':
                return this.renderXML();
            default:
                return this.renderCrontab();
        }
    }

    // ========== Crontab Generator ==========
    renderCrontab() {
        return `
            <div class="tool-section">
                <div class="crontab-container">
                    <div class="crontab-left">
                        <div class="crontab-input-card">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-clock"></i> Crontab Expression
                                </label>
                                <input 
                                    type="text" 
                                    id="crontab-expression" 
                                    class="form-input" 
                                    placeholder="40 * * * *"
                                    value="${this.escapeHtml(this.crontabExpression)}"
                                    oninput="devToolsInstance.onCrontabInput()"
                                />
                            </div>
                            ${this.renderCrontabResults()}
                        </div>
                        <div class="crontab-options-card">
                            <div class="crontab-options-title">Options</div>
                            <div class="crontab-options-list">
                                <label class="crontab-option-item">
                                    <input 
                                        type="checkbox" 
                                        id="crontab-seconds"
                                        ${this.crontabSeconds ? 'checked' : ''}
                                        onchange="devToolsInstance.onCrontabInput()"
                                    />
                                    <span>Use seconds (0-59)</span>
                                </label>
                                <label class="crontab-option-item">
                                    <input 
                                        type="checkbox" 
                                        id="crontab-24hour"
                                        ${this.crontab24Hour ? 'checked' : ''}
                                        onchange="devToolsInstance.onCrontabInput()"
                                    />
                                    <span>Use 24 hour time format</span>
                                </label>
                                <label class="crontab-option-item">
                                    <input 
                                        type="checkbox" 
                                        id="crontab-days0"
                                        ${this.crontabDaysStartAt0 ? 'checked' : ''}
                                        onchange="devToolsInstance.onCrontabInput()"
                                    />
                                    <span>Days start at 0</span>
                                </label>
                                <label class="crontab-option-item">
                                    <input 
                                        type="checkbox" 
                                        id="crontab-verbose"
                                        ${this.crontabVerbose ? 'checked' : ''}
                                        onchange="devToolsInstance.onCrontabInput()"
                                    />
                                    <span>Verbose</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="crontab-right">
                        ${this.renderCrontabSyntax()}
                    </div>
                </div>
            </div>
        `;
    }

    renderCrontabResults() {
        if (!this.crontabDescription) {
            return `
                <div class="crontab-description-placeholder">
                    Enter a crontab expression to validate and get description
                </div>
            `;
        }

        return `
            <div class="crontab-description">
                <div class="crontab-description-label">Human-readable Description</div>
                <div class="crontab-description-text">${this.escapeHtml(this.crontabDescription)}</div>
            </div>
        `;
    }

    renderCrontabSyntax() {
        return `
            <div class="crontab-syntax">
                <div class="crontab-syntax-section">
                    <div class="crontab-syntax-title">Cron Field Definitions</div>
                    <div class="crontab-field-diagram">
                        <div class="crontab-field-line">
                            <span class="crontab-field-label">┌────────────</span>
                            <span class="crontab-field-desc">[optional] seconds (0 - 59)</span>
                        </div>
                        <div class="crontab-field-line">
                            <span class="crontab-field-label">| ┌──────────</span>
                            <span class="crontab-field-desc">minute (0 - 59)</span>
                        </div>
                        <div class="crontab-field-line">
                            <span class="crontab-field-label">| | ┌────────</span>
                            <span class="crontab-field-desc">hour (0 - 23)</span>
                        </div>
                        <div class="crontab-field-line">
                            <span class="crontab-field-label">| | | ┌──────</span>
                            <span class="crontab-field-desc">day of month (1 - 31)</span>
                        </div>
                        <div class="crontab-field-line">
                            <span class="crontab-field-label">| | | | ┌────</span>
                            <span class="crontab-field-desc">month (1 - 12) OR jan,feb,mar,apr ...</span>
                        </div>
                        <div class="crontab-field-line">
                            <span class="crontab-field-label">| | | | | ┌──</span>
                            <span class="crontab-field-desc">day of week (0 - 6, sunday=0) OR sun,mon ...</span>
                        </div>
                        <div class="crontab-field-line">
                            <span class="crontab-field-label">| | | | | |</span>
                        </div>
                        <div class="crontab-field-line">
                            <span class="crontab-field-label">* * * * * *</span>
                            <span class="crontab-field-desc">command</span>
                        </div>
                    </div>
                </div>
                <div class="crontab-syntax-section">
                    <div class="crontab-syntax-title">Symbol Meaning Table</div>
                    <table class="crontab-symbol-table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Meaning</th>
                                <th>Example</th>
                                <th>Equivalent</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>*</code></td>
                                <td>Any value</td>
                                <td><code>* * * * *</code></td>
                                <td>Every minute</td>
                            </tr>
                            <tr>
                                <td><code>-</code></td>
                                <td>Range of values</td>
                                <td><code>1-10 * * * *</code></td>
                                <td>Minutes 1 through 10</td>
                            </tr>
                            <tr>
                                <td><code>,</code></td>
                                <td>List of values</td>
                                <td><code>1,10 * * * *</code></td>
                                <td>At minutes 1 and 10</td>
                            </tr>
                            <tr>
                                <td><code>/</code></td>
                                <td>Step values</td>
                                <td><code>*/10 * * * *</code></td>
                                <td>Every 10 minutes</td>
                            </tr>
                            <tr>
                                <td><code>@yearly</code></td>
                                <td>Once every year at midnight of 1 January</td>
                                <td><code>@yearly</code></td>
                                <td><code>0 0 1 1 *</code></td>
                            </tr>
                            <tr>
                                <td><code>@annually</code></td>
                                <td>Same as @yearly</td>
                                <td><code>@annually</code></td>
                                <td><code>0 0 1 1 *</code></td>
                            </tr>
                            <tr>
                                <td><code>@monthly</code></td>
                                <td>Once a month at midnight on the first day</td>
                                <td><code>@monthly</code></td>
                                <td><code>0 0 1 * *</code></td>
                            </tr>
                            <tr>
                                <td><code>@weekly</code></td>
                                <td>Once a week at midnight on Sunday morning</td>
                                <td><code>@weekly</code></td>
                                <td><code>0 0 * * 0</code></td>
                            </tr>
                            <tr>
                                <td><code>@daily</code></td>
                                <td>Once a day at midnight</td>
                                <td><code>@daily</code></td>
                                <td><code>0 0 * * *</code></td>
                            </tr>
                            <tr>
                                <td><code>@midnight</code></td>
                                <td>Same as @daily</td>
                                <td><code>@midnight</code></td>
                                <td><code>0 0 * * *</code></td>
                            </tr>
                            <tr>
                                <td><code>@hourly</code></td>
                                <td>Once an hour at the beginning of the hour</td>
                                <td><code>@hourly</code></td>
                                <td><code>0 * * * *</code></td>
                            </tr>
                            <tr>
                                <td><code>@reboot</code></td>
                                <td>Run at startup</td>
                                <td><code>@reboot</code></td>
                                <td>-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    onCrontabInput() {
        const expressionInput = document.getElementById('crontab-expression');
        const secondsCheckbox = document.getElementById('crontab-seconds');
        const hour24Checkbox = document.getElementById('crontab-24hour');
        const days0Checkbox = document.getElementById('crontab-days0');
        const verboseCheckbox = document.getElementById('crontab-verbose');
        
        if (!expressionInput) return;
        
        this.crontabExpression = expressionInput.value.trim();
        this.crontabSeconds = secondsCheckbox ? secondsCheckbox.checked : false;
        this.crontab24Hour = hour24Checkbox ? hour24Checkbox.checked : true;
        this.crontabDaysStartAt0 = days0Checkbox ? days0Checkbox.checked : true;
        this.crontabVerbose = verboseCheckbox ? verboseCheckbox.checked : false;
        
        this.parseCrontab();
    }

    parseCrontab() {
        if (!this.crontabExpression) {
            this.crontabDescription = '';
            this.updateResultsOnly();
            return;
        }

        try {
            this.crontabDescription = this.getCrontabDescription(this.crontabExpression);
        } catch (error) {
            this.crontabDescription = `Error: ${error.message}`;
        }
        
        this.updateResultsOnly();
    }

    getCrontabDescription(expression) {
        // Handle special strings
        const special = {
            '@yearly': '0 0 1 1 *',
            '@annually': '0 0 1 1 *',
            '@monthly': '0 0 1 * *',
            '@weekly': '0 0 * * 0',
            '@daily': '0 0 * * *',
            '@midnight': '0 0 * * *',
            '@hourly': '0 * * * *',
            '@reboot': 'reboot'
        };

        if (special[expression.toLowerCase()]) {
            if (expression.toLowerCase() === '@reboot') {
                return 'Run at startup';
            }
            expression = special[expression.toLowerCase()];
        }

        const parts = expression.trim().split(/\s+/);
        const hasSeconds = this.crontabSeconds && parts.length === 6;
        
        if (!hasSeconds && parts.length !== 5) {
            throw new Error('Invalid crontab format. Expected 5 fields (or 6 with seconds)');
        }

        const fields = hasSeconds ? {
            seconds: parts[0],
            minute: parts[1],
            hour: parts[2],
            dayOfMonth: parts[3],
            month: parts[4],
            dayOfWeek: parts[5]
        } : {
            minute: parts[0],
            hour: parts[1],
            dayOfMonth: parts[2],
            month: parts[3],
            dayOfWeek: parts[4]
        };

        const description = [];
        
        if (hasSeconds) {
            description.push(this.describeField(fields.seconds, 'second', 0, 59));
        }
        
        description.push(this.describeField(fields.minute, 'minute', 0, 59));
        description.push(this.describeField(fields.hour, 'hour', 0, 23));
        description.push(this.describeField(fields.dayOfMonth, 'day of month', 1, 31));
        description.push(this.describeMonth(fields.month));
        description.push(this.describeDayOfWeek(fields.dayOfWeek));

        return description.filter(d => d).join(', ');
    }

    describeField(value, name, min, max) {
        if (value === '*') {
            return `every ${name}`;
        }

        if (value.includes(',')) {
            const values = value.split(',').map(v => v.trim());
            return `at ${values.join(', ')} ${name}${values.length > 1 ? 's' : ''}`;
        }

        if (value.includes('-')) {
            const [start, end] = value.split('-').map(v => v.trim());
            return `from ${start} to ${end} ${name}`;
        }

        if (value.includes('/')) {
            const [range, step] = value.split('/');
            const stepNum = parseInt(step);
            if (range === '*') {
                return `every ${stepNum} ${name}${stepNum > 1 ? 's' : ''}`;
            }
            return `every ${stepNum} ${name}${stepNum > 1 ? 's' : ''} from ${range}`;
        }

        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
            if (numValue < min || numValue > max) {
                throw new Error(`Invalid ${name} value: ${numValue} (must be between ${min} and ${max})`);
            }
            return `at ${numValue} ${name}`;
        }

        return `at ${value} ${name}`;
    }

    describeMonth(value) {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthFullNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        if (value === '*') {
            return 'every month';
        }

        if (value.includes(',')) {
            const values = value.split(',').map(v => v.trim());
            const monthList = values.map(v => {
                const lower = v.toLowerCase();
                const index = monthNames.indexOf(lower);
                if (index !== -1) return monthFullNames[index];
                const num = parseInt(v);
                if (!isNaN(num) && num >= 1 && num <= 12) {
                    return monthFullNames[num - 1];
                }
                return v;
            });
            return `only in ${monthList.join(', ')}`;
        }

        if (value.includes('-')) {
            const [start, end] = value.split('-').map(v => v.trim());
            const startNum = parseInt(start);
            const endNum = parseInt(end);
            if (!isNaN(startNum) && !isNaN(endNum)) {
                return `from ${monthFullNames[startNum - 1]} to ${monthFullNames[endNum - 1]}`;
            }
            return `from ${start} to ${end}`;
        }

        if (value.includes('/')) {
            const [range, step] = value.split('/');
            const stepNum = parseInt(step);
            if (range === '*') {
                return `every ${stepNum} month${stepNum > 1 ? 's' : ''}`;
            }
            return `every ${stepNum} month${stepNum > 1 ? 's' : ''} from ${range}`;
        }

        const lowerValue = value.toLowerCase();
        const index = monthNames.indexOf(lowerValue);
        if (index !== -1) {
            return `only in ${monthFullNames[index]}`;
        }

        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 1 && numValue <= 12) {
            return `only in ${monthFullNames[numValue - 1]}`;
        }

        return `at ${value} month`;
    }

    describeDayOfWeek(value) {
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const startIndex = this.crontabDaysStartAt0 ? 0 : 1;
        
        if (value === '*') {
            return 'every day of week';
        }

        if (value.includes(',')) {
            const values = value.split(',').map(v => v.trim());
            const dayList = values.map(v => {
                const lower = v.toLowerCase();
                const index = dayNames.indexOf(lower);
                if (index !== -1) return dayFullNames[index];
                const num = parseInt(v);
                if (!isNaN(num)) {
                    const adjustedNum = startIndex === 0 ? num : (num === 7 ? 0 : num);
                    if (adjustedNum >= 0 && adjustedNum <= 6) {
                        return dayFullNames[adjustedNum];
                    }
                }
                return v;
            });
            return `only on ${dayList.join(', ')}`;
        }

        if (value.includes('-')) {
            const [start, end] = value.split('-').map(v => v.trim());
            const startNum = parseInt(start);
            const endNum = parseInt(end);
            if (!isNaN(startNum) && !isNaN(endNum)) {
                const startAdjusted = startIndex === 0 ? startNum : (startNum === 7 ? 0 : startNum);
                const endAdjusted = startIndex === 0 ? endNum : (endNum === 7 ? 0 : endNum);
                if (startAdjusted >= 0 && startAdjusted <= 6 && endAdjusted >= 0 && endAdjusted <= 6) {
                    return `from ${dayFullNames[startAdjusted]} to ${dayFullNames[endAdjusted]}`;
                }
            }
            return `from ${start} to ${end}`;
        }

        if (value.includes('/')) {
            const [range, step] = value.split('/');
            const stepNum = parseInt(step);
            if (range === '*') {
                return `every ${stepNum} day${stepNum > 1 ? 's' : ''} of week`;
            }
            return `every ${stepNum} day${stepNum > 1 ? 's' : ''} of week from ${range}`;
        }

        const lowerValue = value.toLowerCase();
        const index = dayNames.indexOf(lowerValue);
        if (index !== -1) {
            return `only on ${dayFullNames[index]}`;
        }

        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
            const adjustedNum = startIndex === 0 ? numValue : (numValue === 7 ? 0 : numValue);
            if (adjustedNum >= 0 && adjustedNum <= 6) {
                return `only on ${dayFullNames[adjustedNum]}`;
            }
            throw new Error(`Invalid day of week value: ${numValue} (must be between ${startIndex} and ${startIndex === 0 ? 6 : 7})`);
        }

        return `at ${value} day of week`;
    }

    // ========== JSON Prettify ==========
    renderJSON() {
        return `
            <div class="tool-section">
                <div class="formatter-container">
                    <div class="formatter-left">
                        <div class="formatter-input-card">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-code"></i> Your raw JSON
                                </label>
                                <textarea 
                                    id="json-input" 
                                    class="form-input code-textarea" 
                                    rows="15"
                                    placeholder='{"hello": "world", "foo": "bar"}'
                                    oninput="devToolsInstance.onJSONInput()"
                                >${this.escapeHtml(this.jsonInput)}</textarea>
                            </div>
                            <div class="formatter-options">
                                <label class="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        id="json-sort-keys"
                                        ${this.jsonSortKeys ? 'checked' : ''}
                                        onchange="devToolsInstance.onJSONInput()"
                                    />
                                    <span>Sort keys</span>
                                </label>
                                <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span>Indent size:</span>
                                    <input 
                                        type="number" 
                                        id="json-indent-size"
                                        class="form-input" 
                                        style="width: 60px;"
                                        min="1"
                                        max="10"
                                        value="${this.jsonIndentSize}"
                                        oninput="devToolsInstance.onJSONInput()"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="formatter-right">
                        ${this.renderJSONResults()}
                    </div>
                </div>
            </div>
        `;
    }

    renderJSONResults() {
        if (!this.jsonOutput) {
            return `
                <div class="formatter-output-card">
                    <div class="formatter-output-placeholder">
                        <i class="fas fa-info-circle"></i>
                        <p>Enter JSON to prettify and format</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="formatter-output-card">
                <div class="formatter-output-header">
                    <span class="formatter-output-title">Prettified version of your JSON</span>
                    <button class="btn btn-sm btn-secondary" onclick="devToolsInstance.copyText('${this.escapeHtml(this.jsonOutput).replace(/'/g, "\\'")}', this)">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                <pre class="code-output">${this.escapeHtml(this.jsonOutput)}</pre>
            </div>
        `;
    }

    onJSONInput() {
        const input = document.getElementById('json-input');
        const sortKeysCheckbox = document.getElementById('json-sort-keys');
        const indentSizeInput = document.getElementById('json-indent-size');
        
        if (!input) return;
        
        this.jsonInput = input.value;
        this.jsonSortKeys = sortKeysCheckbox ? sortKeysCheckbox.checked : false;
        this.jsonIndentSize = indentSizeInput ? parseInt(indentSizeInput.value) || 3 : 3;
        
        this.prettifyJSON();
    }

    prettifyJSON() {
        if (!this.jsonInput.trim()) {
            this.jsonOutput = '';
            this.updateResultsOnly();
            return;
        }

        try {
            const obj = JSON.parse(this.jsonInput);
            this.jsonOutput = JSON.stringify(obj, this.jsonSortKeys ? Object.keys(obj).sort() : null, this.jsonIndentSize);
        } catch (error) {
            this.jsonOutput = `Error: ${error.message}`;
        }
        
        this.updateResultsOnly();
    }

    // ========== SQL Prettify ==========
    renderSQL() {
        return `
            <div class="tool-section">
                <div class="formatter-container">
                    <div class="formatter-left">
                        <div class="formatter-input-card">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-database"></i> Your SQL query
                                </label>
                                <textarea 
                                    id="sql-input" 
                                    class="form-input code-textarea" 
                                    rows="15"
                                    placeholder="select field1,field2,field3 from my_table where my_condition;"
                                    oninput="devToolsInstance.onSQLInput()"
                                >${this.escapeHtml(this.sqlInput)}</textarea>
                            </div>
                            <div class="formatter-options-grid">
                                <div class="form-group">
                                    <label class="form-label">Dialect</label>
                                    <select id="sql-dialect" class="form-input" onchange="devToolsInstance.onSQLInput()">
                                        <option value="standard" ${this.sqlDialect === 'standard' ? 'selected' : ''}>Standard SQL</option>
                                        <option value="mysql" ${this.sqlDialect === 'mysql' ? 'selected' : ''}>MySQL</option>
                                        <option value="postgresql" ${this.sqlDialect === 'postgresql' ? 'selected' : ''}>PostgreSQL</option>
                                        <option value="mssql" ${this.sqlDialect === 'mssql' ? 'selected' : ''}>MS SQL</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Keyword case</label>
                                    <select id="sql-keyword-case" class="form-input" onchange="devToolsInstance.onSQLInput()">
                                        <option value="uppercase" ${this.sqlKeywordCase === 'uppercase' ? 'selected' : ''}>UPPERCASE</option>
                                        <option value="lowercase" ${this.sqlKeywordCase === 'lowercase' ? 'selected' : ''}>lowercase</option>
                                        <option value="capitalize" ${this.sqlKeywordCase === 'capitalize' ? 'selected' : ''}>Capitalize</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Indent style</label>
                                    <select id="sql-indent-style" class="form-input" onchange="devToolsInstance.onSQLInput()">
                                        <option value="standard" ${this.sqlIndentStyle === 'standard' ? 'selected' : ''}>Standard</option>
                                        <option value="tab" ${this.sqlIndentStyle === 'tab' ? 'selected' : ''}>Tab</option>
                                        <option value="2spaces" ${this.sqlIndentStyle === '2spaces' ? 'selected' : ''}>2 Spaces</option>
                                        <option value="4spaces" ${this.sqlIndentStyle === '4spaces' ? 'selected' : ''}>4 Spaces</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="formatter-right">
                        ${this.renderSQLResults()}
                    </div>
                </div>
            </div>
        `;
    }

    renderSQLResults() {
        if (!this.sqlOutput) {
            return `
                <div class="formatter-output-card">
                    <div class="formatter-output-placeholder">
                        <i class="fas fa-info-circle"></i>
                        <p>Enter SQL query to prettify and format</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="formatter-output-card">
                <div class="formatter-output-header">
                    <span class="formatter-output-title">Prettify version of your query</span>
                    <button class="btn btn-sm btn-secondary" onclick="devToolsInstance.copyText('${this.escapeHtml(this.sqlOutput).replace(/'/g, "\\'")}', this)">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                <pre class="code-output">${this.escapeHtml(this.sqlOutput)}</pre>
            </div>
        `;
    }

    onSQLInput() {
        const input = document.getElementById('sql-input');
        const dialectSelect = document.getElementById('sql-dialect');
        const keywordCaseSelect = document.getElementById('sql-keyword-case');
        const indentStyleSelect = document.getElementById('sql-indent-style');
        
        if (!input) return;
        
        this.sqlInput = input.value;
        this.sqlDialect = dialectSelect ? dialectSelect.value : 'standard';
        this.sqlKeywordCase = keywordCaseSelect ? keywordCaseSelect.value : 'uppercase';
        this.sqlIndentStyle = indentStyleSelect ? indentStyleSelect.value : 'standard';
        
        this.prettifySQL();
    }

    prettifySQL() {
        if (!this.sqlInput.trim()) {
            this.sqlOutput = '';
            this.updateResultsOnly();
            return;
        }

        try {
            this.sqlOutput = this.formatSQL(this.sqlInput);
        } catch (error) {
            this.sqlOutput = `Error: ${error.message}`;
        }
        
        this.updateResultsOnly();
    }

    formatSQL(sql) {
        // Simple SQL formatter
        const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'GROUP', 'BY', 'ORDER', 'HAVING', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'];
        
        let formatted = sql.trim();
        
        // Convert keywords based on case setting
        if (this.sqlKeywordCase === 'uppercase') {
            keywords.forEach(kw => {
                const regex = new RegExp(`\\b${kw}\\b`, 'gi');
                formatted = formatted.replace(regex, kw);
            });
        } else if (this.sqlKeywordCase === 'lowercase') {
            keywords.forEach(kw => {
                const regex = new RegExp(`\\b${kw}\\b`, 'gi');
                formatted = formatted.replace(regex, kw.toLowerCase());
            });
        } else if (this.sqlKeywordCase === 'capitalize') {
            keywords.forEach(kw => {
                const regex = new RegExp(`\\b${kw}\\b`, 'gi');
                formatted = formatted.replace(regex, kw.charAt(0) + kw.slice(1).toLowerCase());
            });
        }
        
        // Determine indent
        const indent = this.sqlIndentStyle === 'tab' ? '\t' : 
                      this.sqlIndentStyle === '2spaces' ? '  ' :
                      this.sqlIndentStyle === '4spaces' ? '    ' : '  ';
        
        // Basic formatting
        formatted = formatted.replace(/\s+/g, ' ');
        formatted = formatted.replace(/\s*,\s*/g, ', ');
        formatted = formatted.replace(/\s*\(\s*/g, ' (');
        formatted = formatted.replace(/\s*\)\s*/g, ') ');
        
        // Add line breaks before major keywords
        keywords.forEach(kw => {
            const regex = new RegExp(`\\s+${kw}\\s+`, 'gi');
            formatted = formatted.replace(regex, `\n${kw} `);
        });
        
        // Indent lines
        const lines = formatted.split('\n');
        let indentLevel = 0;
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            
            if (trimmed.match(/^(FROM|WHERE|JOIN|GROUP|ORDER|HAVING)/i)) {
                indentLevel = 1;
            }
            
            const indented = indent.repeat(indentLevel) + trimmed;
            
            if (trimmed.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE)/i)) {
                indentLevel = 0;
            }
            
            return indented;
        });
        
        return formattedLines.filter(l => l).join('\n');
    }

    // ========== Chmod Calculator ==========
    renderChmod() {
        return `
            <div class="tool-section">
                <div class="chmod-container">
                    <div class="chmod-left">
                        <div class="chmod-calculator">
                            <div class="chmod-section">
                                <div class="chmod-title">Owner (u)</div>
                                <div class="chmod-permissions">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="chmod-u-read" ${this.chmodOwner.read ? 'checked' : ''} onchange="devToolsInstance.onChmodChange()" />
                                        <span>Read (4)</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="chmod-u-write" ${this.chmodOwner.write ? 'checked' : ''} onchange="devToolsInstance.onChmodChange()" />
                                        <span>Write (2)</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="chmod-u-execute" ${this.chmodOwner.execute ? 'checked' : ''} onchange="devToolsInstance.onChmodChange()" />
                                        <span>Execute (1)</span>
                                    </label>
                                </div>
                            </div>
                            <div class="chmod-section">
                                <div class="chmod-title">Group (g)</div>
                                <div class="chmod-permissions">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="chmod-g-read" ${this.chmodGroup.read ? 'checked' : ''} onchange="devToolsInstance.onChmodChange()" />
                                        <span>Read (4)</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="chmod-g-write" ${this.chmodGroup.write ? 'checked' : ''} onchange="devToolsInstance.onChmodChange()" />
                                        <span>Write (2)</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="chmod-g-execute" ${this.chmodGroup.execute ? 'checked' : ''} onchange="devToolsInstance.onChmodChange()" />
                                        <span>Execute (1)</span>
                                    </label>
                                </div>
                            </div>
                            <div class="chmod-section">
                                <div class="chmod-title">Public (o)</div>
                                <div class="chmod-permissions">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="chmod-o-read" ${this.chmodPublic.read ? 'checked' : ''} onchange="devToolsInstance.onChmodChange()" />
                                        <span>Read (4)</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="chmod-o-write" ${this.chmodPublic.write ? 'checked' : ''} onchange="devToolsInstance.onChmodChange()" />
                                        <span>Write (2)</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="chmod-o-execute" ${this.chmodPublic.execute ? 'checked' : ''} onchange="devToolsInstance.onChmodChange()" />
                                        <span>Execute (1)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="chmod-right">
                        ${this.renderChmodResults()}
                    </div>
                </div>
            </div>
        `;
    }

    renderChmodResults() {
        const binary = this.getChmodBinary();
        const command = `chmod ${this.chmodValue} path`;

        return `
            <div class="chmod-results-card">
                <div class="chmod-result-section">
                    <div class="chmod-result-label">Binary Representation</div>
                    <div class="chmod-result-value">${this.chmodValue}</div>
                    <div class="chmod-result-binary">${binary}</div>
                </div>
                <div class="chmod-result-section">
                    <div class="chmod-result-label">Command</div>
                    <div class="chmod-result-command">
                        <code>${command}</code>
                        <button class="btn btn-sm btn-secondary" onclick="devToolsInstance.copyText('${command}', this)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    onChmodChange() {
        const uRead = document.getElementById('chmod-u-read');
        const uWrite = document.getElementById('chmod-u-write');
        const uExecute = document.getElementById('chmod-u-execute');
        const gRead = document.getElementById('chmod-g-read');
        const gWrite = document.getElementById('chmod-g-write');
        const gExecute = document.getElementById('chmod-g-execute');
        const oRead = document.getElementById('chmod-o-read');
        const oWrite = document.getElementById('chmod-o-write');
        const oExecute = document.getElementById('chmod-o-execute');

        this.chmodOwner = {
            read: uRead ? uRead.checked : false,
            write: uWrite ? uWrite.checked : false,
            execute: uExecute ? uExecute.checked : false
        };

        this.chmodGroup = {
            read: gRead ? gRead.checked : false,
            write: gWrite ? gWrite.checked : false,
            execute: gExecute ? gExecute.checked : false
        };

        this.chmodPublic = {
            read: oRead ? oRead.checked : false,
            write: oWrite ? oWrite.checked : false,
            execute: oExecute ? oExecute.checked : false
        };

        this.calculateChmod();
    }

    calculateChmod() {
        const u = (this.chmodOwner.read ? 4 : 0) + (this.chmodOwner.write ? 2 : 0) + (this.chmodOwner.execute ? 1 : 0);
        const g = (this.chmodGroup.read ? 4 : 0) + (this.chmodGroup.write ? 2 : 0) + (this.chmodGroup.execute ? 1 : 0);
        const o = (this.chmodPublic.read ? 4 : 0) + (this.chmodPublic.write ? 2 : 0) + (this.chmodPublic.execute ? 1 : 0);
        
        this.chmodValue = `${u}${g}${o}`;
        this.updateResultsOnly();
    }

    getChmodBinary() {
        const u = (this.chmodOwner.read ? 'r' : '-') + (this.chmodOwner.write ? 'w' : '-') + (this.chmodOwner.execute ? 'x' : '-');
        const g = (this.chmodGroup.read ? 'r' : '-') + (this.chmodGroup.write ? 'w' : '-') + (this.chmodGroup.execute ? 'x' : '-');
        const o = (this.chmodPublic.read ? 'r' : '-') + (this.chmodPublic.write ? 'w' : '-') + (this.chmodPublic.execute ? 'x' : '-');
        return `${u}${g}${o}`;
    }

    // ========== Docker Converter ==========
    renderDocker() {
        return `
            <div class="tool-section">
                <div class="formatter-container">
                    <div class="formatter-left">
                        <div class="formatter-input-card">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fab fa-docker"></i> Your docker run command:
                                </label>
                                <textarea 
                                    id="docker-run-input" 
                                    class="form-input code-textarea" 
                                    rows="15"
                                    placeholder="docker run -p 80:80 -v /var/run/docker.sock:/tmp/docker.sock:ro --restart always --log-opt max-size=1g nginx"
                                    oninput="devToolsInstance.onDockerInput()"
                                >${this.escapeHtml(this.dockerRunCommand)}</textarea>
                            </div>
                        </div>
                    </div>
                    <div class="formatter-right">
                        ${this.renderDockerResults()}
                    </div>
                </div>
            </div>
        `;
    }

    renderDockerResults() {
        if (!this.dockerComposeOutput) {
            return `
                <div class="formatter-output-card">
                    <div class="formatter-output-placeholder">
                        <i class="fas fa-info-circle"></i>
                        <p>Enter a docker run command to convert to docker-compose format</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="formatter-output-card">
                <div class="formatter-output-header">
                    <span class="formatter-output-title">Docker Compose YAML</span>
                    <button class="btn btn-sm btn-secondary" onclick="devToolsInstance.downloadDockerCompose()">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
                <pre class="code-output">${this.escapeHtml(this.dockerComposeOutput)}</pre>
            </div>
        `;
    }

    onDockerInput() {
        const input = document.getElementById('docker-run-input');
        if (!input) return;
        
        this.dockerRunCommand = input.value;
        this.convertDockerRun();
    }

    convertDockerRun() {
        if (!this.dockerRunCommand.trim()) {
            this.dockerComposeOutput = '';
            this.updateResultsOnly();
            return;
        }

        try {
            this.dockerComposeOutput = this.parseDockerRun(this.dockerRunCommand);
        } catch (error) {
            this.dockerComposeOutput = `Error: ${error.message}`;
        }
        
        this.updateResultsOnly();
    }

    parseDockerRun(command) {
        const parts = command.trim().split(/\s+/);
        if (parts[0] !== 'docker' || parts[1] !== 'run') {
            throw new Error('Invalid docker run command');
        }

        const compose = {
            version: '3.9',
            services: {}
        };

        let image = '';
        let serviceName = 'app';
        const ports = [];
        const volumes = [];
        const environment = [];
        let restart = '';
        const logging = {};

        let i = 2;
        while (i < parts.length) {
            const part = parts[i];
            
            if (part === '-p' || part === '--publish') {
                ports.push(parts[++i]);
            } else if (part === '-v' || part === '--volume') {
                volumes.push(parts[++i]);
            } else if (part === '-e' || part === '--env') {
                environment.push(parts[++i]);
            } else if (part === '--restart') {
                restart = parts[++i];
            } else if (part === '--log-opt') {
                const logOpt = parts[++i];
                if (logOpt.includes('max-size=')) {
                    logging.options = { 'max-size': logOpt.split('=')[1] };
                }
            } else if (part === '--name') {
                serviceName = parts[++i];
            } else if (!part.startsWith('-')) {
                image = part;
                break;
            }
            i++;
        }

        if (!image) {
            throw new Error('No image specified');
        }

        compose.services[serviceName] = {
            image: image
        };

        if (ports.length > 0) {
            compose.services[serviceName].ports = ports;
        }

        if (volumes.length > 0) {
            compose.services[serviceName].volumes = volumes;
        }

        if (environment.length > 0) {
            compose.services[serviceName].environment = environment;
        }

        if (restart) {
            compose.services[serviceName].restart = restart;
        }

        if (Object.keys(logging).length > 0) {
            compose.services[serviceName].logging = logging;
        }

        // Convert to YAML-like format
        let yaml = 'version: \'3.9\'\n\nservices:\n';
        yaml += `    ${serviceName}:\n`;
        yaml += `        image: ${image}\n`;
        
        if (Object.keys(logging).length > 0) {
            yaml += '        logging:\n';
            yaml += '            options:\n';
            Object.entries(logging.options).forEach(([key, value]) => {
                yaml += `                ${key}: ${value}\n`;
            });
        }
        
        if (restart) {
            yaml += `        restart: ${restart}\n`;
        }
        
        if (volumes.length > 0) {
            yaml += '        volumes:\n';
            volumes.forEach(vol => {
                yaml += `            - '${vol}'\n`;
            });
        }
        
        if (ports.length > 0) {
            yaml += '        ports:\n';
            ports.forEach(port => {
                yaml += `            - '${port}'\n`;
            });
        }

        return yaml.trim();
    }

    downloadDockerCompose() {
        const blob = new Blob([this.dockerComposeOutput], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'docker-compose.yml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========== XML Formatter ==========
    renderXML() {
        return `
            <div class="tool-section">
                <div class="formatter-container">
                    <div class="formatter-left">
                        <div class="formatter-input-card">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-file-code"></i> Your XML
                                </label>
                                <textarea 
                                    id="xml-input" 
                                    class="form-input code-textarea" 
                                    rows="15"
                                    placeholder="<hello><world>foo</world><world>bar</world></hello>"
                                    oninput="devToolsInstance.onXMLInput()"
                                >${this.escapeHtml(this.xmlInput)}</textarea>
                            </div>
                            <div class="formatter-options">
                                <label class="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        id="xml-collapse"
                                        ${this.xmlCollapseContent ? 'checked' : ''}
                                        onchange="devToolsInstance.onXMLInput()"
                                    />
                                    <span>Collapse content</span>
                                </label>
                                <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span>Indent size:</span>
                                    <input 
                                        type="number" 
                                        id="xml-indent-size"
                                        class="form-input" 
                                        style="width: 60px;"
                                        min="1"
                                        max="10"
                                        value="${this.xmlIndentSize}"
                                        oninput="devToolsInstance.onXMLInput()"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="formatter-right">
                        ${this.renderXMLResults()}
                    </div>
                </div>
            </div>
        `;
    }

    renderXMLResults() {
        if (!this.xmlOutput) {
            return `
                <div class="formatter-output-card">
                    <div class="formatter-output-placeholder">
                        <i class="fas fa-info-circle"></i>
                        <p>Enter XML to format and prettify</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="formatter-output-card">
                <div class="formatter-output-header">
                    <span class="formatter-output-title">Formatted XML from your XML</span>
                    <button class="btn btn-sm btn-secondary" onclick="devToolsInstance.copyText('${this.escapeHtml(this.xmlOutput).replace(/'/g, "\\'")}', this)">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                <pre class="code-output">${this.escapeHtml(this.xmlOutput)}</pre>
            </div>
        `;
    }

    onXMLInput() {
        const input = document.getElementById('xml-input');
        const collapseCheckbox = document.getElementById('xml-collapse');
        const indentSizeInput = document.getElementById('xml-indent-size');
        
        if (!input) return;
        
        this.xmlInput = input.value;
        this.xmlCollapseContent = collapseCheckbox ? collapseCheckbox.checked : false;
        this.xmlIndentSize = indentSizeInput ? parseInt(indentSizeInput.value) || 2 : 2;
        
        this.formatXML();
    }

    formatXML() {
        if (!this.xmlInput.trim()) {
            this.xmlOutput = '';
            this.updateResultsOnly();
            return;
        }

        try {
            this.xmlOutput = this.prettifyXML(this.xmlInput, this.xmlIndentSize, this.xmlCollapseContent);
        } catch (error) {
            this.xmlOutput = `Error: ${error.message}`;
        }
        
        this.updateResultsOnly();
    }

    prettifyXML(xml, indentSize, collapse) {
        const indent = ' '.repeat(indentSize);
        let formatted = '';
        let indentLevel = 0;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, 'text/xml');
        
        if (xmlDoc.documentElement.nodeName === 'parsererror') {
            throw new Error('Invalid XML');
        }

        const formatNode = (node, level) => {
            if (node.nodeType === 1) { // Element node
                const indentStr = indent.repeat(level);
                let tag = `<${node.tagName}`;
                
                // Add attributes
                if (node.attributes.length > 0) {
                    for (let i = 0; i < node.attributes.length; i++) {
                        const attr = node.attributes[i];
                        tag += ` ${attr.name}="${attr.value}"`;
                    }
                }
                
                if (node.childNodes.length === 0) {
                    tag += '/>';
                    formatted += indentStr + tag + '\n';
                } else {
                    tag += '>';
                    formatted += indentStr + tag;
                    
                    const hasTextOnly = node.childNodes.length === 1 && node.childNodes[0].nodeType === 3;
                    
                    if (hasTextOnly && collapse) {
                        formatted += node.textContent.trim() + `</${node.tagName}>\n`;
                    } else {
                        formatted += '\n';
                        for (let i = 0; i < node.childNodes.length; i++) {
                            formatNode(node.childNodes[i], level + 1);
                        }
                        formatted += indentStr + `</${node.tagName}>\n`;
                    }
                }
            } else if (node.nodeType === 3) { // Text node
                const text = node.textContent.trim();
                if (text && !collapse) {
                    formatted += indent.repeat(level) + text + '\n';
                }
            }
        };

        formatNode(xmlDoc.documentElement, 0);
        return formatted.trim();
    }

    // ========== Common Functions ==========
    switchTab(tab) {
        this.activeTab = tab;
        this.updateDisplay();
    }

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

    copyText(text, buttonElement) {
        if (!text || text === '-') return;
        
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
        
        let newResultsHTML = '';
        switch (this.activeTab) {
            case 'crontab':
                newResultsHTML = this.renderCrontabResults();
                // Update crontab description inside the input card
                const crontabInputCard = toolSection.querySelector('.crontab-input-card');
                if (crontabInputCard && newResultsHTML) {
                    const existingDesc = crontabInputCard.querySelector('.crontab-description, .crontab-description-placeholder');
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newResultsHTML;
                    const newDesc = tempDiv.firstElementChild;
                    if (newDesc) {
                        if (existingDesc) {
                            existingDesc.replaceWith(newDesc);
                        } else {
                            const inputGroup = crontabInputCard.querySelector('.form-group');
                            if (inputGroup) {
                                inputGroup.insertAdjacentElement('afterend', newDesc);
                            }
                        }
                    }
                }
                return;
            case 'json':
                newResultsHTML = this.renderJSONResults();
                // Update JSON output in right panel
                const jsonRight = toolSection.querySelector('.formatter-right');
                if (jsonRight && newResultsHTML) {
                    jsonRight.innerHTML = newResultsHTML;
                }
                return;
            case 'sql':
                newResultsHTML = this.renderSQLResults();
                // Update SQL output in right panel
                const sqlRight = toolSection.querySelector('.formatter-right');
                if (sqlRight && newResultsHTML) {
                    sqlRight.innerHTML = newResultsHTML;
                }
                return;
            case 'chmod':
                newResultsHTML = this.renderChmodResults();
                // Update chmod results in right panel
                const chmodRight = toolSection.querySelector('.chmod-right');
                if (chmodRight && newResultsHTML) {
                    chmodRight.innerHTML = newResultsHTML;
                }
                return;
            case 'docker':
                newResultsHTML = this.renderDockerResults();
                // Update Docker output in right panel
                const dockerRight = toolSection.querySelector('.formatter-right');
                if (dockerRight && newResultsHTML) {
                    dockerRight.innerHTML = newResultsHTML;
                }
                return;
            case 'xml':
                newResultsHTML = this.renderXMLResults();
                // Update XML output in right panel
                const xmlRight = toolSection.querySelector('.formatter-right');
                if (xmlRight && newResultsHTML) {
                    xmlRight.innerHTML = newResultsHTML;
                }
                return;
        }
    }

    async mount() {
        window.devToolsInstance = this;
        
        // Render first
        this.updateDisplay();
        
        // Then initialize default values after DOM is ready
        setTimeout(() => {
            this.parseCrontab();
            this.prettifyJSON();
            this.prettifySQL();
            this.calculateChmod();
            this.convertDockerRun();
            this.formatXML();
        }, 100);
    }

    unmount() {
        delete window.devToolsInstance;
    }
}

