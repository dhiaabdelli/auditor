export class SpeedtestPage {
    constructor() {
        this.isRunning = false;
        this.results = [];
        this.currentTest = null;
        this.ws = null;
        this.stats = null;
        this.latestResult = null;
        this.chartPeriod = '24h';
        this.charts = {};
        this.currentPage = 1;
        this.pageSize = 15;
        this.totalResults = 0;
        this.selectedServerId = 0; // 0 = auto-select best server
        this.servers = [];
        this.isLoading = true;
        this.currentPhase = 'idle'; // 'ping', 'download', 'upload', 'complete', 'idle'
        this.lastUpdateTime = 0;
        this.updateThrottle = 100; // Update UI at most every 100ms for smoother updates
        this.currentMessage = ''; // Current progress message
        this.smoothedValues = {
            downloadSpeed: null,
            uploadSpeed: null,
            ping: null,
            jitter: null
        };
    }

    async render() {
        return `
            <div class="speedtest-dashboard">
                <div class="speedtest-header-section" id="speedtestHeaderSection">
${this.isRunning && this.currentTest ? `
                    <div class="speedtest-header">
                        ${this.renderHeaderStats()}
                    </div>
                    ` : ''}

                    <div class="speedtest-controls">
                        ${!this.isRunning ? `
                            <button id="selectServerBtn" class="btn btn-secondary btn-sm" title="Select Server">
                                <i class="fas fa-server"></i> ${this.selectedServerId === 0 ? 'Auto' : 'Server'}
                            </button>
                        ` : ''}
                        <button id="startSpeedtestBtn" class="btn btn-primary" ${this.isRunning ? 'disabled' : ''}>
                            <i class="fas fa-play"></i> Start Test
                        </button>
                        <button id="stopSpeedtestBtn" class="btn btn-danger" ${!this.isRunning ? 'style="display:none;"' : ''}>
                            <i class="fas fa-stop"></i> Stop
                        </button>
                    </div>
                </div>

                ${this.isRunning ? this.renderTestProgress() : ''}

                <!-- Latest Result Stats / Live Test Results -->
                <div class="speedtest-latest-stats" id="latestStats">
                    ${this.isLoading ? this.renderSkeletonLatestStats() : this.renderLatestStats()}
                </div>

                <!-- Overall Statistics -->
                <div class="speedtest-overall-stats" id="overallStats">
                    ${this.isLoading ? this.renderSkeletonOverallStats() : this.renderOverallStats()}
                </div>

                <!-- Chart Period Filter -->
                <div class="speedtest-chart-filters">
                    <div class="chart-filters-spacer"></div>
                    <div class="chart-filters-buttons">
                        <button class="chart-filter-btn ${this.chartPeriod === '24h' ? 'active' : ''}" data-period="24h">24h</button>
                        <button class="chart-filter-btn ${this.chartPeriod === 'week' ? 'active' : ''}" data-period="week">Week</button>
                        <button class="chart-filter-btn ${this.chartPeriod === 'month' ? 'active' : ''}" data-period="month">Month</button>
                    </div>
                </div>

                <!-- Charts Grid -->
                <div class="speedtest-charts-grid">
                    ${this.isLoading ? this.renderSkeletonCharts() : `
                    <div class="speedtest-chart-wrapper">
                        <div class="chart-header">
                            <h3><i class="fas fa-clock"></i> Ping (ms)</h3>
                        </div>
                        <div class="speedtest-chart-card">
                            <div class="chart-container">
                                <canvas id="pingChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="speedtest-chart-wrapper">
                        <div class="chart-header">
                            <h3><i class="fas fa-download"></i> Download (Mbps)</h3>
                        </div>
                        <div class="speedtest-chart-card">
                            <div class="chart-container">
                                <canvas id="downloadChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="speedtest-chart-wrapper">
                        <div class="chart-header">
                            <h3><i class="fas fa-upload"></i> Upload (Mbps)</h3>
                        </div>
                        <div class="speedtest-chart-card">
                            <div class="chart-container">
                                <canvas id="uploadChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="speedtest-chart-wrapper">
                        <div class="chart-header">
                            <h3><i class="fas fa-wave-square"></i> Jitter (ms)</h3>
                        </div>
                        <div class="speedtest-chart-card">
                            <div class="chart-container">
                                <canvas id="jitterChart"></canvas>
                            </div>
                        </div>
                    </div>
                    `}
                </div>

                <!-- Test History -->
                <div class="speedtest-history-section">
                    <div class="speedtest-history-header">
                        <h3><i class="fas fa-history"></i> Test History</h3>
                        <div class="speedtest-history-controls">
                            <button id="viewAllHistoryBtn" class="btn btn-sm btn-secondary" title="View All" style="display: ${this.totalResults > 0 ? 'inline-flex' : 'none'};">
                                <i class="fas fa-external-link-alt"></i> View All (${this.totalResults || 0})
                            </button>
                            <button id="refreshHistoryBtn" class="speedtest-refresh-btn" title="Refresh">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="speedtest-history-list" id="historyList">
                        ${this.isLoading ? this.renderSkeletonHistory() : this.renderHistory()}
                    </div>
                </div>
            </div>
        `;
    }

    renderTestProgress() {
        return `
            <div class="speedtest-progress" style="display: block;">
                <div class="speedtest-progress-bar">
                    <div class="speedtest-progress-fill" id="progressFill"></div>
                </div>
                <div class="speedtest-progress-text" id="progressText">Initializing test...</div>
            </div>
        `;
    }

    renderPhaseIndicator() {
        const phaseIcons = {
            'ping': 'fa-clock',
            'download': 'fa-download',
            'upload': 'fa-upload',
            'complete': 'fa-check-circle',
            'idle': 'fa-spinner fa-spin'
        };

        const phaseLabels = {
            'ping': 'Testing Ping & Jitter',
            'download': 'Testing Download Speed',
            'upload': 'Testing Upload Speed',
            'complete': 'Test Complete',
            'idle': 'Initializing Test'
        };

        const icon = phaseIcons[this.currentPhase] || 'fa-spinner fa-spin';
        const label = phaseLabels[this.currentPhase] || 'Running Test';

        return `
            <div class="speedtest-phase-indicator" id="phaseIndicator" data-phase="${this.currentPhase}">
                <div class="phase-indicator-content">
                    <i class="fas ${icon}"></i>
                    <span class="phase-indicator-label">${label}</span>
                </div>
            </div>
        `;
    }

    renderHeaderStats() {
        if (!this.currentTest) return '';

        // Use smoothed values for display to prevent rapid changes
        const downloadValue = this.smoothedValues.downloadSpeed !== null ?
            this.smoothedValues.downloadSpeed.toFixed(2) :
            (this.currentTest.downloadSpeed !== null && this.currentTest.downloadSpeed !== undefined ?
                this.currentTest.downloadSpeed.toFixed(2) : '--');

        const uploadValue = this.smoothedValues.uploadSpeed !== null ?
            this.smoothedValues.uploadSpeed.toFixed(2) :
            (this.currentTest.uploadSpeed !== null && this.currentTest.uploadSpeed !== undefined ?
                this.currentTest.uploadSpeed.toFixed(2) : '--');

        const pingValue = this.smoothedValues.ping !== null ?
            this.smoothedValues.ping.toFixed(2) :
            (this.currentTest.ping !== null && this.currentTest.ping !== undefined ?
                this.currentTest.ping.toFixed(2) : '--');

        // Show active phase indicator
        const downloadActive = this.currentPhase === 'download' ? 'active' : '';
        const uploadActive = this.currentPhase === 'upload' ? 'active' : '';
        const pingActive = this.currentPhase === 'ping' ? 'active' : '';

        return `
            <div class="speedtest-header-stats">
                <div class="speedtest-header-stat ${pingActive}" data-phase="ping">
                    <i class="fas fa-clock"></i>
                    <span class="speedtest-header-stat-value">${pingValue}</span>
                    <span class="speedtest-header-stat-unit">ms</span>
                </div>
                <div class="speedtest-header-stat ${downloadActive}" data-phase="download">
                    <i class="fas fa-download"></i>
                    <span class="speedtest-header-stat-value">${downloadValue}</span>
                    <span class="speedtest-header-stat-unit">Mbps</span>
                </div>
                <div class="speedtest-header-stat ${uploadActive}" data-phase="upload">
                    <i class="fas fa-upload"></i>
                    <span class="speedtest-header-stat-value">${uploadValue}</span>
                    <span class="speedtest-header-stat-unit">Mbps</span>
                </div>
            </div>
        `;
    }

    renderLiveTestResults() {
        if (!this.currentTest) {
            return `
                <div class="speedtest-empty-stats">
                    <i class="fas fa-tachometer-alt fa-3x"></i>
                    <p>Initializing test...</p>
                </div>
            `;
        }

        return `
            <div class="latest-stats-grid">
                <div class="stat-card stat-download">
                    <div class="stat-icon"><i class="fas fa-download"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Download</div>
                        <div class="stat-value-wrapper">
                            <span class="stat-value">${this.currentTest.downloadSpeed !== null && this.currentTest.downloadSpeed !== undefined ? this.currentTest.downloadSpeed.toFixed(2) : '--'}</span>
                            <span class="stat-unit">Mbps</span>
                        </div>
                    </div>
                </div>

                <div class="stat-card stat-upload">
                    <div class="stat-icon"><i class="fas fa-upload"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Upload</div>
                        <div class="stat-value-wrapper">
                            <span class="stat-value">${this.currentTest.uploadSpeed !== null && this.currentTest.uploadSpeed !== undefined ? this.currentTest.uploadSpeed.toFixed(2) : '--'}</span>
                            <span class="stat-unit">Mbps</span>
                        </div>
                    </div>
                </div>

                <div class="stat-card stat-ping">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Ping</div>
                        <div class="stat-value-wrapper">
                            <span class="stat-value">${this.currentTest.ping !== null && this.currentTest.ping !== undefined ? this.currentTest.ping.toFixed(2) : '--'}</span>
                            <span class="stat-unit">ms</span>
                        </div>
                    </div>
                </div>

                <div class="stat-card stat-jitter">
                    <div class="stat-icon"><i class="fas fa-wave-square"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Jitter</div>
                        <div class="stat-value-wrapper">
                            <span class="stat-value">${this.currentTest.jitter !== null && this.currentTest.jitter !== undefined ? this.currentTest.jitter.toFixed(2) : '--'}</span>
                            <span class="stat-unit">ms</span>
                        </div>
                    </div>
                </div>
            </div>
            ${this.currentTest.serverName ? `
                <div class="latest-result-info">
                    <div><strong>Server:</strong> ${this.currentTest.serverName}</div>
                    ${this.currentTest.serverLocation ? `<div><strong>Location:</strong> ${this.currentTest.serverLocation}</div>` : ''}
                </div>
            ` : ''}
        `;
    }

    renderLatestStats() {
        if (!this.latestResult) {
            return `
                <div class="speedtest-empty-stats">
                    <i class="fas fa-tachometer-alt fa-3x"></i>
                    <p>No test results yet. Start a speedtest to see statistics.</p>
                </div>
            `;
        }

        return `
            <div class="latest-stats-grid">
                <div class="stat-card stat-download">
                    <div class="stat-icon"><i class="fas fa-download"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Download</div>
                        <div class="stat-value-wrapper">
                            <span class="stat-value">${this.latestResult.downloadSpeed ? this.latestResult.downloadSpeed.toFixed(2) : '--'}</span>
                            <span class="stat-unit">Mbps</span>
                        </div>
                    </div>
                </div>

                <div class="stat-card stat-upload">
                    <div class="stat-icon"><i class="fas fa-upload"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Upload</div>
                        <div class="stat-value-wrapper">
                            <span class="stat-value">${this.latestResult.uploadSpeed ? this.latestResult.uploadSpeed.toFixed(2) : '--'}</span>
                            <span class="stat-unit">Mbps</span>
                        </div>
                    </div>
                </div>

                <div class="stat-card stat-ping">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Ping</div>
                        <div class="stat-value-wrapper">
                            <span class="stat-value">${this.latestResult.ping ? this.latestResult.ping.toFixed(2) : '--'}</span>
                            <span class="stat-unit">ms</span>
                        </div>
                    </div>
                </div>

                <div class="stat-card stat-jitter">
                    <div class="stat-icon"><i class="fas fa-wave-square"></i></div>
                    <div class="stat-content">
                        <div class="stat-label">Jitter</div>
                        <div class="stat-value-wrapper">
                            <span class="stat-value">${this.latestResult.jitter ? this.latestResult.jitter.toFixed(2) : '--'}</span>
                            <span class="stat-unit">ms</span>
                        </div>
                    </div>
                </div>
            </div>
            ${this.latestResult.serverName ? `
                <div class="latest-result-info">
                    <div><strong>Server:</strong> ${this.latestResult.serverName}</div>
                    ${this.latestResult.serverLocation ? `<div><strong>Location:</strong> ${this.latestResult.serverLocation}</div>` : ''}
                    <div><strong>Time:</strong> ${new Date(this.latestResult.timestamp).toLocaleString()}</div>
                </div>
            ` : ''}
        `;
    }

    renderOverallStats() {
        if (!this.stats) {
            return '';
        }

        return `
            <div class="overall-stats-grid">
                <div class="overall-stat-card">
                    <div class="overall-stat-label">Ping Average</div>
                    <div class="overall-stat-value">${this.stats.ping.avg ? this.stats.ping.avg.toFixed(2) : '--'}</div>
                    <div class="overall-stat-range">Min: ${this.stats.ping.min ? this.stats.ping.min.toFixed(2) : '--'} | Max: ${this.stats.ping.max ? this.stats.ping.max.toFixed(2) : '--'}</div>
                </div>

                <div class="overall-stat-card">
                    <div class="overall-stat-label">Download Average</div>
                    <div class="overall-stat-value">${this.stats.download.avg ? this.stats.download.avg.toFixed(2) : '--'}</div>
                    <div class="overall-stat-range">Min: ${this.stats.download.min ? this.stats.download.min.toFixed(2) : '--'} | Max: ${this.stats.download.max ? this.stats.download.max.toFixed(2) : '--'}</div>
                </div>

                <div class="overall-stat-card">
                    <div class="overall-stat-label">Upload Average</div>
                    <div class="overall-stat-value">${this.stats.upload.avg ? this.stats.upload.avg.toFixed(2) : '--'}</div>
                    <div class="overall-stat-range">Min: ${this.stats.upload.min ? this.stats.upload.min.toFixed(2) : '--'} | Max: ${this.stats.upload.max ? this.stats.upload.max.toFixed(2) : '--'}</div>
                </div>

                <div class="overall-stat-card">
                    <div class="overall-stat-label">Jitter Average</div>
                    <div class="overall-stat-value">${this.stats.jitter.avg ? this.stats.jitter.avg.toFixed(2) : '--'}</div>
                    <div class="overall-stat-range">Min: ${this.stats.jitter.min ? this.stats.jitter.min.toFixed(2) : '--'} | Max: ${this.stats.jitter.max ? this.stats.jitter.max.toFixed(2) : '--'}</div>
                </div>

                <div class="overall-stat-card">
                    <div class="overall-stat-label">Total Tests</div>
                    <div class="overall-stat-value">${this.stats.totalResults || 0}</div>
                </div>
            </div>
        `;
    }

    renderSkeletonLatestStats() {
        return `
            <div class="latest-stats-grid">
                ${[1, 2, 3, 4].map(() => `
                    <div class="speedtest-skeleton-card">
                        <div class="speedtest-skeleton speedtest-skeleton-icon"></div>
                        <div class="stat-content" style="flex: 1;">
                            <div class="speedtest-skeleton speedtest-skeleton-text"></div>
                            <div class="speedtest-skeleton speedtest-skeleton-value"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderSkeletonOverallStats() {
        return `
            <div class="overall-stats-grid">
                ${[1, 2, 3, 4, 5].map(() => `
                    <div class="speedtest-skeleton-overall-stat">
                        <div class="speedtest-skeleton speedtest-skeleton-overall-label"></div>
                        <div class="speedtest-skeleton speedtest-skeleton-overall-value"></div>
                        <div class="speedtest-skeleton speedtest-skeleton-overall-range"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderSkeletonCharts() {
        return [1, 2, 3, 4].map(() => `
            <div class="speedtest-chart-wrapper">
                <div class="chart-header">
                    <h3><div class="speedtest-skeleton speedtest-skeleton-text" style="width: 120px; height: 1rem;"></div></h3>
                </div>
                <div class="speedtest-chart-card">
                    <div class="chart-container">
                        <div class="speedtest-skeleton speedtest-skeleton-chart"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderSkeletonHistory() {
        return `
            <div class="speedtest-history-table-wrapper">
                <table class="speedtest-history-table">
                    <thead>
                        <tr>
                            ${['Date & Time', 'Download', 'Upload', 'Ping', 'Jitter', 'Public IP', 'ISP', 'Server', 'Actions'].map(() => `
                                <th><div class="speedtest-skeleton speedtest-skeleton-text" style="width: 80px; height: 0.7rem;"></div></th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${[1, 2, 3, 4, 5].map(() => `
                            <tr>
                                ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => `
                                    <td>
                                        <div class="speedtest-skeleton speedtest-skeleton-table-cell"></div>
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderHistory() {
        if (this.results.length === 0) {
            return `
                <div class="speedtest-history-empty">
                    <i class="fas fa-inbox"></i>
                    <p style="margin-top: 1rem; font-size: 1rem;">No test history yet</p>
                    <p style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.7;">Run your first speedtest to see results here</p>
                </div>
            `;
        }

        return this.renderHistoryTable(this.results);
    }

    renderHistoryTable(results) {
        return `
            <div class="speedtest-history-table-wrapper">
                <table class="speedtest-history-table">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Download</th>
                            <th>Upload</th>
                            <th>Ping</th>
                            <th>Jitter</th>
                            <th>Public IP</th>
                            <th>ISP</th>
                            <th>Server</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(result => {
            const date = new Date(result.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            return `
                            <tr>
                                <td>
                                    <div class="speedtest-table-date">
                                        <span class="speedtest-table-date-text">${formattedDate}</span>
                                        <span class="speedtest-table-time-text">${formattedTime}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="speedtest-table-value speedtest-table-download">
                                        <i class="fas fa-download"></i>
                                        ${result.downloadSpeed.toFixed(2)} Mbps
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-value speedtest-table-upload">
                                        <i class="fas fa-upload"></i>
                                        ${result.uploadSpeed.toFixed(2)} Mbps
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-value speedtest-table-ping">
                                        <i class="fas fa-clock"></i>
                                        ${result.ping.toFixed(2)} ms
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-value speedtest-table-jitter">
                                        <i class="fas fa-wave-square"></i>
                                        ${result.jitter.toFixed(2)} ms
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-ip">
                                        <i class="fas fa-network-wired"></i>
                                        ${result.ip || 'N/A'}
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-isp">
                                        <i class="fas fa-building"></i>
                                        ${result.isp || 'N/A'}
                                    </span>
                                </td>
                                <td>
                                    ${result.serverName ? `
                                        <span class="speedtest-table-server">
                                            <span class="speedtest-table-server-name">
                                                <i class="fas fa-server"></i>
                                                ${result.serverName}
                                            </span>
                                            ${result.serverLocation ? `<span class="speedtest-table-server-location">${result.serverLocation}</span>` : ''}
                                        </span>
                                    ` : '<span class="speedtest-table-na">N/A</span>'}
                                </td>
                                <td>
                                    <button class="speedtest-table-action-btn" onclick="window.speedtestPageInstance.deleteResult(${result.id})" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async mount() {
        window.speedtestPageInstance = this;
        this.isLoading = true;

        // Load data in parallel
        await Promise.all([
            this.loadServers(),
            this.loadLatestResult(),
            this.loadStats(),
            this.loadHistory()
        ]);

        this.attachEventListeners();
        await this.loadCharts();

        // Check for running speedtest tasks and reconnect if needed
        this.checkForRunningTasks();

        // Hide loading skeletons
        this.isLoading = false;
        this.updateLatestStats();
        this.updateOverallStats();
        this.updateHistoryUI();

        // Re-render charts without skeleton
        const chartsGrid = document.querySelector('.speedtest-charts-grid');
        if (chartsGrid) {
            chartsGrid.innerHTML = `
                <div class="speedtest-chart-wrapper">
                    <div class="chart-header">
                        <h3><i class="fas fa-clock"></i> Ping (ms)</h3>
                    </div>
                    <div class="speedtest-chart-card">
                        <div class="chart-container">
                            <canvas id="pingChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="speedtest-chart-wrapper">
                    <div class="chart-header">
                        <h3><i class="fas fa-download"></i> Download (Mbps)</h3>
                    </div>
                    <div class="speedtest-chart-card">
                        <div class="chart-container">
                            <canvas id="downloadChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="speedtest-chart-wrapper">
                    <div class="chart-header">
                        <h3><i class="fas fa-upload"></i> Upload (Mbps)</h3>
                    </div>
                    <div class="speedtest-chart-card">
                        <div class="chart-container">
                            <canvas id="uploadChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="speedtest-chart-wrapper">
                    <div class="chart-header">
                        <h3><i class="fas fa-wave-square"></i> Jitter (ms)</h3>
                    </div>
                    <div class="speedtest-chart-card">
                        <div class="chart-container">
                            <canvas id="jitterChart"></canvas>
                        </div>
                    </div>
                </div>
            `;
            await this.loadCharts();
        }
    }

    async checkForRunningTasks() {
        // Check if there are any running speedtest tasks
        try {
            const response = await fetch('/api/tasks?active=true', {
                headers: {
                    'Authorization': `Bearer ${window.api?.apiKey || ''}`
                }
            });

            if (response.ok) {
                const tasks = await response.json();
                // Response is an array of tasks, not wrapped in {success, tasks}
                if (Array.isArray(tasks)) {
                    const speedtestTasks = tasks.filter(
                        task => task.metadata && task.metadata.type === 'speedtest' &&
                            (task.status === 'running' || task.status === 'pending')
                    );

                    if (speedtestTasks.length > 0) {
                        const task = speedtestTasks[0];
                        // The task will continue in background and update via WebSocket
                        // Data will be available once the test completes
                        // Refresh data periodically while task is running
                        const checkInterval = setInterval(async () => {
                            try {
                                const checkResponse = await fetch('/api/tasks?active=true', {
                                    headers: {
                                        'Authorization': `Bearer ${window.api?.apiKey || ''}`
                                    }
                                });
                                if (checkResponse.ok) {
                                    const checkTasks = await checkResponse.json();
                                    if (Array.isArray(checkTasks)) {
                                        const stillRunning = checkTasks.find(
                                            t => t.id === task.id &&
                                                (t.status === 'running' || t.status === 'pending')
                                        );
                                        if (!stillRunning) {
                                            // Task completed, reload all data
                                            clearInterval(checkInterval);
                                            await this.loadLatestResult();
                                            await this.loadStats();
                                            await this.loadHistory();
                                            await this.loadCharts();
                                        }
                                    }
                                }
                            } catch (err) {
                                // Silent error handling
                            }
                        }, 2000); // Check every 2 seconds
                    }
                }
            }
        } catch (error) {
            // Silent error handling
        }
    }

    async loadServers() {
        try {
            const response = await fetch('/api/speedtest/servers', {
                headers: {
                    'Authorization': `Bearer ${window.api?.apiKey || ''}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.servers) {
                    this.servers = data.servers;
                }
            }
        } catch (error) {
            // Silent error handling
        }
    }

    attachEventListeners() {
        const startBtn = document.getElementById('startSpeedtestBtn');
        const stopBtn = document.getElementById('stopSpeedtestBtn');
        const refreshBtn = document.getElementById('refreshHistoryBtn');
        const filterBtns = document.querySelectorAll('.chart-filter-btn');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startSpeedtest());
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopSpeedtest());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadHistory());
        }

        const selectServerBtn = document.getElementById('selectServerBtn');
        if (selectServerBtn) {
            selectServerBtn.addEventListener('click', () => this.openServerSelectionModal());
        }

        const viewAllBtn = document.getElementById('viewAllHistoryBtn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => this.openHistoryModal());
        }

        // Attach chart filter listeners
        if (filterBtns.length > 0) {
            this.attachChartFilterListeners(filterBtns);
        } else {
            // Retry after a short delay if buttons aren't ready yet
            setTimeout(() => {
                const retryBtns = document.querySelectorAll('.chart-filter-btn');
                if (retryBtns.length > 0) {
                    this.attachChartFilterListeners(retryBtns);
                }
            }, 100);
        }
    }

    attachChartFilterListeners(filterBtns) {
        filterBtns.forEach(btn => {
            // Remove existing listeners to avoid duplicates
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const period = newBtn.dataset.period;
                if (!period) return;

                this.chartPeriod = period;

                // Update active state
                const allBtns = document.querySelectorAll('.chart-filter-btn');
                allBtns.forEach(b => b.classList.remove('active'));
                newBtn.classList.add('active');

                // Show loading state
                newBtn.style.opacity = '0.7';
                newBtn.style.cursor = 'wait';
                newBtn.disabled = true;

                try {
                    await this.loadCharts();
                } catch (error) {
                    // Silent error handling
                } finally {
                    // Remove loading state
                    newBtn.style.opacity = '';
                    newBtn.style.cursor = '';
                    newBtn.disabled = false;
                }
            });
        });
    }

    async startSpeedtest() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.currentPhase = 'idle';
        this.currentMessage = 'Initializing test...';
        this.currentTest = {
            downloadSpeed: null,
            uploadSpeed: null,
            ping: null,
            jitter: null,
            serverName: null,
            serverLocation: null
        };

        // Reset smoothed values
        this.smoothedValues = {
            downloadSpeed: null,
            uploadSpeed: null,
            ping: null,
            jitter: null
        };
        this.lastUpdateTime = 0;

        this.updateUI();
        // Show live values in header during test
        this.updateHeaderStats();

        try {
            // Connect to WebSocket for real-time updates
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const token = window.api?.apiKey || '';
            const wsUrl = `${protocol}//${window.location.host}/api/speedtest/ws?serverId=${this.selectedServerId}&token=${encodeURIComponent(token)}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                // WebSocket connected
            };

            this.ws.onmessage = async (event) => {
                const update = JSON.parse(event.data);
                await this.handleSpeedtestUpdate(update);
            };

            this.ws.onerror = (error) => {
                this.isRunning = false;
                this.updateUI();
                alert('Failed to start speedtest. Please try again.');
            };

            this.ws.onclose = async () => {
                if (this.isRunning) {
                    this.isRunning = false;
                    this.updateUI();
                    await this.loadLatestResult();
                    await this.loadStats();
                    await this.loadHistory();
                    await this.loadCharts();
                }
            };
        } catch (error) {
            this.isRunning = false;
            // Hide progress bar
            const progressContainer = document.querySelector('.speedtest-progress');
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
            this.updateUI();
            alert('Failed to start speedtest. Please try again.');
        }
    }

    async handleSpeedtestUpdate(update) {
        if (update.type === 'error') {
            alert(update.message || 'Speedtest error occurred');
            this.isRunning = false;
            this.currentPhase = 'idle';
            this.updateUI();
            return;
        }

        // Update current phase based on update type
        if (update.type === 'ping') {
            this.currentPhase = 'ping';
        } else if (update.type === 'download') {
            this.currentPhase = 'download';
        } else if (update.type === 'upload') {
            this.currentPhase = 'upload';
        } else if (update.type === 'complete') {
            this.currentPhase = 'complete';
        }

        // Update current test with latest values (store raw values)
        if (update.ping !== undefined && update.ping > 0) {
            this.currentTest.ping = update.ping;
            // Smooth ping value (immediate for ping as it's usually stable)
            this.smoothedValues.ping = update.ping;
        }
        if (update.jitter !== undefined && update.jitter > 0) {
            this.currentTest.jitter = update.jitter;
            this.smoothedValues.jitter = update.jitter;
        }
        if (update.downloadSpeed !== undefined && update.downloadSpeed > 0) {
            // Store raw value
            this.currentTest.downloadSpeed = update.downloadSpeed;

            // Always update smoothed values immediately for real-time feel
            if (this.smoothedValues.downloadSpeed === null) {
                this.smoothedValues.downloadSpeed = update.downloadSpeed;
            } else {
                // Exponential moving average for smoother updates
                const smoothingFactor = 0.3; // 0.3 = 30% new, 70% old
                this.smoothedValues.downloadSpeed =
                    (smoothingFactor * update.downloadSpeed) +
                    ((1 - smoothingFactor) * this.smoothedValues.downloadSpeed);
            }
        }
        if (update.uploadSpeed !== undefined && update.uploadSpeed > 0) {
            // Store raw value
            this.currentTest.uploadSpeed = update.uploadSpeed;

            // Always update smoothed values immediately for real-time feel
            if (this.smoothedValues.uploadSpeed === null) {
                this.smoothedValues.uploadSpeed = update.uploadSpeed;
            } else {
                // Exponential moving average for smoother updates
                const smoothingFactor = 0.3; // 0.3 = 30% new, 70% old
                this.smoothedValues.uploadSpeed =
                    (smoothingFactor * update.uploadSpeed) +
                    ((1 - smoothingFactor) * this.smoothedValues.uploadSpeed);
            }
        }
        if (update.serverName) {
            this.currentTest.serverName = update.serverName;
        }
        if (update.serverLocation) {
            this.currentTest.serverLocation = update.serverLocation;
        }

        // Update progress and message
        if (update.progress !== undefined) {
            const message = update.message || this.getPhaseMessage();
            this.currentMessage = message;
            this.updateProgress(update.progress, message);
        } else if (update.message) {
            // Update message even if progress is not provided
            this.currentMessage = update.message;
        }

        // Always update header stats immediately for live values (no throttling)
        this.updateHeaderStats();

        // Throttle full UI updates to prevent too frequent re-renders
        const now = Date.now();
        if (now - this.lastUpdateTime >= this.updateThrottle) {
            this.lastUpdateTime = now;
            this.updateUI();
        }

        // If test is complete, close WebSocket and reload data
        if (update.type === 'complete') {
            this.isRunning = false;
            this.currentPhase = 'complete';
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            // Use final values (no smoothing)
            this.smoothedValues.downloadSpeed = this.currentTest.downloadSpeed;
            this.smoothedValues.uploadSpeed = this.currentTest.uploadSpeed;
            this.smoothedValues.ping = this.currentTest.ping;
            this.smoothedValues.jitter = this.currentTest.jitter;

            // Update UI immediately
            this.updateUI();
            this.updateHeaderStats();

            // Remove progress bar from DOM
            const progressContainer = document.querySelector('.speedtest-progress');
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }

            // Reload all data and update stats with final values
            await this.loadLatestResult();
            await this.loadStats();
            await this.loadHistory();
            await this.loadCharts();
            // Update stats section with final values after test completes
            this.updateLatestStats();
        }
    }

    getPhaseMessage() {
        const messages = {
            'ping': 'Testing ping and jitter...',
            'download': 'Testing download speed...',
            'upload': 'Testing upload speed...',
            'complete': 'Test completed',
            'idle': 'Initializing test...'
        };
        return messages[this.currentPhase] || 'Running test...';
    }


    updateProgress(percent, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }

        if (progressText) {
            progressText.textContent = text;
        }
    }

    stopSpeedtest() {
        this.isRunning = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        // Hide progress bar
        const progressContainer = document.querySelector('.speedtest-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        this.updateUI();
    }

    async loadLatestResult() {
        try {
            const response = await fetch('/api/speedtest/latest', {
                headers: {
                    'Authorization': `Bearer ${window.api?.apiKey || ''}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.result) {
                    this.latestResult = data.result;
                    this.updateLatestStats();
                }
            }
        } catch (error) {
            // Silent error handling
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/speedtest/stats', {
                headers: {
                    'Authorization': `Bearer ${window.api?.apiKey || ''}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) {
                    this.stats = data.stats;
                    this.updateOverallStats();
                }
            }
        } catch (error) {
            // Silent error handling
        }
    }

    async loadCharts() {
        const metrics = ['ping', 'download', 'upload', 'jitter'];

        for (const metric of metrics) {
            try {
                const response = await fetch(`/api/speedtest/chart?metric=${metric}&period=${this.chartPeriod}`, {
                    headers: {
                        'Authorization': `Bearer ${window.api?.apiKey || ''}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        // Check if there's actual data
                        const hasData = data.data.labels && data.data.labels.length > 0 &&
                            data.data.datasets && data.data.datasets.length > 0 &&
                            data.data.datasets.some(ds => ds.data && ds.data.length > 0);

                        if (hasData) {
                            this.renderChart(metric, data.data);
                        } else {
                            this.renderEmptyChart(metric);
                        }
                    } else {
                        this.renderEmptyChart(metric);
                    }
                } else {
                    this.renderEmptyChart(metric);
                }
            } catch (error) {
                this.renderEmptyChart(metric);
            }
        }
    }

    renderEmptyChart(metric) {
        const canvasId = `${metric}Chart`;
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts[metric]) {
            this.charts[metric].destroy();
            this.charts[metric] = null;
        }

        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;

        if (!container) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set canvas size
        canvas.width = container.clientWidth || 400;
        canvas.height = container.clientHeight || 200;

        // Draw "No data" message
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
    }

    renderChart(metric, chartData) {
        const canvasId = `${metric}Chart`;
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts[metric]) {
            this.charts[metric].destroy();
            this.charts[metric] = null;
        }

        const ctx = canvas.getContext('2d');

        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            return;
        }

        // Ensure canvas has proper dimensions - Chart.js will handle sizing with responsive: true
        const container = canvas.parentElement;
        if (container) {
            // Ensure container has proper dimensions
            if (container.clientWidth === 0) {
                // Wait for layout to be calculated
                setTimeout(() => this.renderChart(metric, chartData), 100);
                return;
            }
        }

        try {
            this.charts[metric] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels || [],
                    datasets: (chartData.datasets || []).map(ds => ({
                        label: ds.label,
                        data: ds.data || [],
                        borderColor: ds.borderColor,
                        backgroundColor: ds.backgroundColor,
                        pointRadius: ds.pointRadius || 3,
                        fill: ds.fill !== undefined ? ds.fill : true,
                        tension: ds.tension || 0.4,
                        cubicInterpolationMode: 'monotone'
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 0 // Disable animation for faster rendering
                    },
                    layout: {
                        padding: {
                            top: 5,
                            bottom: 5,
                            left: 5,
                            right: 5
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                font: {
                                    size: 11
                                },
                                padding: 8,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            enabled: true,
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 8,
                            titleFont: {
                                size: 12
                            },
                            bodyFont: {
                                size: 11
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                font: {
                                    size: 10
                                },
                                maxRotation: 45,
                                minRotation: 0,
                                padding: 5
                            },
                            grid: {
                                display: true,
                                color: 'rgba(255, 255, 255, 0.05)'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grace: 2,
                            ticks: {
                                font: {
                                    size: 10
                                },
                                padding: 5
                            },
                            grid: {
                                display: true,
                                color: 'rgba(255, 255, 255, 0.05)'
                            }
                        }
                    }
                }
            });

            // Force resize after creation
            setTimeout(() => {
                if (this.charts[metric]) {
                    this.charts[metric].resize();
                }
            }, 50);
        } catch (error) {
            // Silent error handling
        }
    }

    async loadHistory() {
        try {
            const offset = (this.currentPage - 1) * this.pageSize;
            const response = await fetch(`/api/speedtest/results?limit=${this.pageSize}&offset=${offset}`, {
                headers: {
                    'Authorization': `Bearer ${window.api?.apiKey || ''}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.results = data.results || [];
                    this.totalResults = data.total || 0;
                    this.updateHistoryUI();
                    this.updatePagination();
                }
            }
        } catch (error) {
            // Silent error handling
        }
    }

    updatePagination() {
        // Update "View All" button visibility and count - show if there are any results
        let viewAllBtn = document.getElementById('viewAllHistoryBtn');
        if (!viewAllBtn) {
            // Button doesn't exist, create it dynamically
            const controlsEl = document.querySelector('.speedtest-history-controls');
            if (controlsEl) {
                viewAllBtn = document.createElement('button');
                viewAllBtn.id = 'viewAllHistoryBtn';
                viewAllBtn.className = 'btn btn-sm btn-secondary';
                viewAllBtn.title = 'View All';
                viewAllBtn.addEventListener('click', () => this.openHistoryModal());
                const refreshBtn = document.getElementById('refreshHistoryBtn');
                if (refreshBtn) {
                    refreshBtn.insertAdjacentElement('beforebegin', viewAllBtn);
                } else {
                    controlsEl.appendChild(viewAllBtn);
                }
            }
        }

        if (viewAllBtn) {
            // Update button text with count
            viewAllBtn.innerHTML = `<i class="fas fa-external-link-alt"></i> View All (${this.totalResults || 0})`;

            if (this.totalResults > 0) {
                viewAllBtn.style.display = 'inline-flex';
            } else {
                viewAllBtn.style.display = 'none';
            }
        }
    }

    async openHistoryModal() {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'speedtest-history-modal';
        modal.innerHTML = `
            <div class="speedtest-history-modal-overlay"></div>
            <div class="speedtest-history-modal-content">
                <div class="speedtest-history-modal-header">
                    <h3><i class="fas fa-history"></i> Test History</h3>
                    <div class="speedtest-history-modal-controls">
                        <div class="speedtest-pagination" id="modalHistoryPagination"></div>
                        <button class="speedtest-history-modal-close" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="speedtest-history-modal-body" id="modalHistoryBody">
                    <div class="speedtest-loading">Loading...</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Load all history for modal
        let modalPage = 1;
        const modalPageSize = 15;

        const loadModalHistory = async () => {
            try {
                const offset = (modalPage - 1) * modalPageSize;
                const response = await fetch(`/api/speedtest/results?limit=${modalPageSize}&offset=${offset}`, {
                    headers: {
                        'Authorization': `Bearer ${window.api?.apiKey || ''}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        const results = data.results || [];
                        const total = data.total || 0;

                        // Render table
                        const bodyEl = document.getElementById('modalHistoryBody');
                        if (bodyEl) {
                            if (results.length === 0) {
                                bodyEl.innerHTML = '<div class="speedtest-history-empty"><i class="fas fa-inbox"></i><p>No test history</p></div>';
                            } else {
                                bodyEl.innerHTML = this.renderHistoryTable(results);
                            }
                        }

                        // Update pagination
                        updateModalPagination(modalPage, total, modalPageSize);
                    }
                }
            } catch (error) {
                // Silent error handling
            }
        };

        // Update modal pagination
        const updateModalPagination = (page, total, pageSize) => {
            const paginationEl = document.getElementById('modalHistoryPagination');
            if (!paginationEl) return;

            const totalPages = Math.ceil(total / pageSize);

            if (totalPages <= 1) {
                paginationEl.innerHTML = '';
                return;
            }

            let html = '';

            // Previous button
            html += `<button class="pagination-btn" ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>`;

            // Page numbers
            const maxVisible = 5;
            let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);

            if (endPage - startPage < maxVisible - 1) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }

            if (startPage > 1) {
                html += `<button class="pagination-btn" data-page="1">1</button>`;
                if (startPage > 2) {
                    html += `<span class="pagination-ellipsis">...</span>`;
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                html += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span class="pagination-ellipsis">...</span>`;
                }
                html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
            }

            // Next button
            html += `<button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} data-page="${page + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>`;

            paginationEl.innerHTML = html;

            // Attach event listeners
            paginationEl.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', () => {
                    const newPage = parseInt(btn.dataset.page);
                    if (newPage && newPage !== modalPage) {
                        modalPage = newPage;
                        loadModalHistory();
                    }
                });
            });
        };

        // Close modal handlers
        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('.speedtest-history-modal-close').addEventListener('click', closeModal);
        modal.querySelector('.speedtest-history-modal-overlay').addEventListener('click', closeModal);

        // Load initial data
        await loadModalHistory();
    }

    renderHistoryTable(results) {
        if (results.length === 0) {
            return '<div class="speedtest-history-empty"><i class="fas fa-inbox"></i><p>No test history</p></div>';
        }

        return `
            <div class="speedtest-history-table-wrapper">
                <table class="speedtest-history-table">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Download</th>
                            <th>Upload</th>
                            <th>Ping</th>
                            <th>Jitter</th>
                            <th>Public IP</th>
                            <th>ISP</th>
                            <th>Server</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(result => {
            const date = new Date(result.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            return `
                            <tr>
                                <td>
                                    <div class="speedtest-table-date">
                                        <span class="speedtest-table-date-text">${formattedDate}</span>
                                        <span class="speedtest-table-time-text">${formattedTime}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="speedtest-table-value speedtest-table-download">
                                        <i class="fas fa-download"></i>
                                        ${result.downloadSpeed.toFixed(2)} Mbps
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-value speedtest-table-upload">
                                        <i class="fas fa-upload"></i>
                                        ${result.uploadSpeed.toFixed(2)} Mbps
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-value speedtest-table-ping">
                                        <i class="fas fa-clock"></i>
                                        ${result.ping.toFixed(2)} ms
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-value speedtest-table-jitter">
                                        <i class="fas fa-wave-square"></i>
                                        ${result.jitter.toFixed(2)} ms
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-ip">
                                        <i class="fas fa-network-wired"></i>
                                        ${result.ip || '--'}
                                    </span>
                                </td>
                                <td>
                                    <span class="speedtest-table-isp">
                                        <i class="fas fa-building"></i>
                                        ${result.isp || '--'}
                                    </span>
                                </td>
                                <td>
                                    <div class="speedtest-table-server">
                                        <span class="speedtest-table-server-name">
                                            <i class="fas fa-server"></i>
                                            ${result.serverName || '--'}
                                        </span>
                                        ${result.serverLocation ? `<span class="speedtest-table-server-location">${result.serverLocation}</span>` : ''}
                                    </div>
                                </td>
                                <td>
                                    <button class="speedtest-table-action-btn" onclick="window.speedtestPageInstance.deleteResult(${result.id})" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async deleteResult(id) {
        if (!confirm('Are you sure you want to delete this test result?')) {
            return;
        }

        try {
            const response = await fetch('/api/speedtest/results', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.api?.apiKey || ''}`
                },
                body: JSON.stringify({ id })
            });

            if (response.ok) {
                await this.loadHistory();
                await this.loadStats();
                await this.loadCharts();
            } else {
                alert('Failed to delete result');
            }
        } catch (error) {
            alert('Failed to delete result');
        }
    }

    updateUI() {
        const startBtn = document.getElementById('startSpeedtestBtn');
        const stopBtn = document.getElementById('stopSpeedtestBtn');
        const selectServerBtn = document.getElementById('selectServerBtn');
        const progressContainer = document.querySelector('.speedtest-progress');

        if (startBtn) {
            startBtn.disabled = this.isRunning;
            if (this.isRunning) {
                startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
            } else {
                startBtn.innerHTML = '<i class="fas fa-play"></i> Start Test';
            }
        }

        if (stopBtn) {
            stopBtn.style.display = this.isRunning ? 'block' : 'none';
        }

        // Hide/show select server button
        if (selectServerBtn) {
            selectServerBtn.style.display = this.isRunning ? 'none' : 'inline-flex';
        }

        // Show/hide progress bar
        if (progressContainer) {
            progressContainer.style.display = this.isRunning ? 'block' : 'none';
        }

    }

    updateLatestStats() {
        const latestStats = document.getElementById('latestStats');
        if (latestStats) {
            // Always show latest result - don't show live values during test (they're in header)
            latestStats.innerHTML = this.renderLatestStats();
        }
    }

    updateHeaderStats() {
        const headerSection = document.getElementById('speedtestHeaderSection');
        if (!headerSection) return;

        if (this.isRunning && this.currentTest) {
            let header = headerSection.querySelector('.speedtest-header');

            // If header doesn't exist but we are running, create it
            if (!header) {
                headerSection.insertAdjacentHTML('afterbegin', `
                    <div class="speedtest-header">
                        ${this.renderHeaderStats()}
                    </div>
                `);
                return; // Created with initial stats, no need to update individual fields yet
            }

            const existingStats = header.querySelector('.speedtest-header-stats');
            if (existingStats) {
                // Update existing stats with live smoothed values (for real-time feel)
                const stats = existingStats.querySelectorAll('.speedtest-header-stat');
                if (stats.length >= 3) {
                    // Update active states based on current phase
                    stats.forEach(stat => {
                        const phase = stat.dataset.phase;
                        if (phase === this.currentPhase) {
                            stat.classList.add('active');
                        } else {
                            stat.classList.remove('active');
                        }
                    });

                    // Update ping (first stat)
                    const pingValue = stats[0].querySelector('.speedtest-header-stat-value');
                    if (pingValue) {
                        const ping = this.smoothedValues.ping !== null ?
                            this.smoothedValues.ping :
                            (this.currentTest.ping !== null && this.currentTest.ping !== undefined ?
                                this.currentTest.ping : null);
                        pingValue.textContent = ping !== null ? ping.toFixed(2) : '--';
                    }

                    // Update download (second stat)
                    const downloadValue = stats[1].querySelector('.speedtest-header-stat-value');
                    if (downloadValue) {
                        const download = this.smoothedValues.downloadSpeed !== null ?
                            this.smoothedValues.downloadSpeed :
                            (this.currentTest.downloadSpeed !== null && this.currentTest.downloadSpeed !== undefined ?
                                this.currentTest.downloadSpeed : null);
                        downloadValue.textContent = download !== null ? download.toFixed(2) : '--';
                    }

                    // Update upload (third stat)
                    const uploadValue = stats[2].querySelector('.speedtest-header-stat-value');
                    if (uploadValue) {
                        const upload = this.smoothedValues.uploadSpeed !== null ?
                            this.smoothedValues.uploadSpeed :
                            (this.currentTest.uploadSpeed !== null && this.currentTest.uploadSpeed !== undefined ?
                                this.currentTest.uploadSpeed : null);
                        uploadValue.textContent = upload !== null ? upload.toFixed(2) : '--';
                    }
                }
            } else {
                // Stats container missing inside header, re-render content
                header.innerHTML = this.renderHeaderStats();
            }
        } else if (!this.isRunning) {
            // Remove header entirely when not running
            const header = headerSection.querySelector('.speedtest-header');
            if (header) {
                header.remove();
            }
        }
    }


    updateOverallStats() {
        const overallStats = document.getElementById('overallStats');
        if (overallStats) {
            overallStats.innerHTML = this.renderOverallStats();
        }
    }

    updateHistoryUI() {
        const historyList = document.getElementById('historyList');
        if (historyList) {
            historyList.innerHTML = this.renderHistory();
        }
    }

    async openServerSelectionModal() {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'speedtest-server-modal';
        modal.innerHTML = `
            <div class="speedtest-server-modal-overlay"></div>
            <div class="speedtest-server-modal-content">
                <div class="speedtest-server-modal-header">
                    <h3><i class="fas fa-server"></i> Select Server</h3>
                    <button class="speedtest-server-modal-close" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="speedtest-server-modal-body" id="serverModalBody">
                    <div class="speedtest-loading">Loading servers...</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Load servers if not already loaded
        if (this.servers.length === 0) {
            await this.loadServers();
        }

        // Render server list
        const bodyEl = document.getElementById('serverModalBody');
        if (bodyEl) {
            if (this.servers.length === 0) {
                bodyEl.innerHTML = '<div class="speedtest-history-empty"><i class="fas fa-exclamation-triangle"></i><p>No servers available</p></div>';
            } else {
                let html = '<div class="speedtest-server-list">';

                // Server list (backend already includes Auto option with id=0)
                this.servers.forEach(server => {
                    const isSelected = this.selectedServerId === server.id;
                    const isAuto = server.id === 0;
                    const serverSponsor = server.sponsor || '';
                    const serverLocation = server.location || server.city || '';
                    const serverCountry = server.country || '';
                    const locationText = serverLocation && serverCountry ? `${serverLocation}, ${serverCountry}` : (serverLocation || serverCountry || '');
                    html += `
                        <div class="speedtest-server-item ${isSelected ? 'selected' : ''}" data-server-id="${server.id}">
                            <div class="server-item-content">
                                <div class="server-item-name">
                                    <i class="fas ${isAuto ? 'fa-magic' : 'fa-server'}"></i>
                                    <span>${isAuto ? 'Auto (Best Server)' : (serverSponsor || server.name || 'Unknown')}</span>
                                </div>
                                ${!isAuto && locationText ? `<div class="server-item-location">${locationText}</div>` : (isAuto ? `<div class="server-item-location">${server.location || 'Automatically select the best server'}</div>` : '')}
                            </div>
                            ${isSelected ? '<i class="fas fa-check"></i>' : ''}
                        </div>
                    `;
                });

                html += '</div>';
                bodyEl.innerHTML = html;

                // Attach click handlers
                bodyEl.querySelectorAll('.speedtest-server-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const serverId = parseInt(item.dataset.serverId);
                        this.selectedServerId = serverId;

                        // Update UI
                        bodyEl.querySelectorAll('.speedtest-server-item').forEach(i => i.classList.remove('selected'));
                        item.classList.add('selected');

                        // Update checkmarks
                        bodyEl.querySelectorAll('.speedtest-server-item i.fa-check').forEach(i => i.remove());
                        item.appendChild(document.createElement('i')).className = 'fas fa-check';

                        // Update button text
                        const selectBtn = document.getElementById('selectServerBtn');
                        if (selectBtn) {
                            if (serverId === 0) {
                                selectBtn.innerHTML = '<i class="fas fa-server"></i> Auto';
                            } else {
                                const server = this.servers.find(s => s.id === serverId);
                                const serverName = server?.sponsor || server?.name || 'Server';
                                // Truncate long server names
                                const displayName = serverName.length > 15 ? serverName.substring(0, 15) + '...' : serverName;
                                selectBtn.innerHTML = `<i class="fas fa-server"></i> ${displayName}`;
                            }
                        }

                        // Close modal after selection
                        closeModal();
                    });
                });
            }
        }

        // Close modal handlers
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };

        modal.querySelector('.speedtest-server-modal-close').addEventListener('click', closeModal);
        modal.querySelector('.speedtest-server-modal-overlay').addEventListener('click', closeModal);
    }
}