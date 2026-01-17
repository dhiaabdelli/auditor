export class HealthMonitorPage {
    constructor() {
        this.healthData = null;
        this.systemMetrics = null;
        this.refreshInterval = null;
        this.autoRefresh = true;
        this.refreshIntervalMs = 5000; // 5 seconds
    }

    t(key) {
        const translations = {
            healthMonitor: 'Health Monitor',
            overallStatus: 'Overall Status',
            services: 'Services',
            systemInfo: 'System Information',
            uptime: 'Uptime',
            refresh: 'Refresh',
            autoRefresh: 'Auto Refresh',
            healthy: 'Healthy',
            degraded: 'Degraded',
            unhealthy: 'Unhealthy',
            lastCheck: 'Last Check',
            responseTime: 'Response Time',
            details: 'Details',
            noDetails: 'No additional details available',
            database: 'Database',
            automationService: 'Automation Service',
            workflowExecution: 'Workflow Execution Manager',
            schedulerService: 'Scheduler Service',
            websocketServices: 'WebSocket Services',
            running: 'Running',
            stopped: 'Stopped',
            connected: 'Connected',
            disconnected: 'Disconnected',
            milliseconds: 'ms',
            seconds: 's',
            minutes: 'm',
            hours: 'h',
            days: 'd'
        };
        return translations[key] || key;
    }

    async render() {
        await this.loadHealthData();
        this.startAutoRefresh();

        return `
            <div class="health-monitor-page">
                <div class="health-header">
                    <div class="health-title">
                        <h1>
                            <i class="fas fa-heartbeat"></i>
                            ${this.t('healthMonitor')}
                        </h1>
                        <p class="health-subtitle">Monitor the health and status of all application services</p>
                    </div>
                    <div class="health-actions">
                        <label class="health-toggle">
                            <input type="checkbox" ${this.autoRefresh ? 'checked' : ''} onchange="healthMonitorInstance.toggleAutoRefresh(event)">
                            <span>${this.t('autoRefresh')}</span>
                        </label>
                        <button class="btn btn-primary" onclick="healthMonitorInstance.refreshHealth()">
                            <i class="fas fa-sync-alt"></i>
                            ${this.t('refresh')}
                        </button>
                    </div>
                </div>

                ${this.renderOverallStatus()}
                ${this.renderSystemMetrics()}
                ${this.renderServices()}
                ${this.renderTasks()}
                ${this.renderSystemInfo()}
            </div>
        `;
    }

    renderOverallStatus() {
        if (!this.healthData) return '';

        const statusConfig = {
            healthy: { color: '#10b981', icon: 'fa-check-circle', label: this.t('healthy') },
            degraded: { color: '#f59e0b', icon: 'fa-exclamation-triangle', label: this.t('degraded') },
            unhealthy: { color: '#ef4444', icon: 'fa-times-circle', label: this.t('unhealthy') }
        };

        const config = statusConfig[this.healthData.overall] || statusConfig.healthy;
        const uptime = this.formatUptime(this.healthData.uptime);

        return `
            <div class="health-overall-card">
                <div class="health-overall-status" style="border-left: 4px solid ${config.color}">
                    <div class="health-status-icon" style="color: ${config.color}">
                        <i class="fas ${config.icon}"></i>
                    </div>
                    <div class="health-status-info">
                        <h2>${config.label}</h2>
                        <p class="health-status-label">${this.t('overallStatus')}</p>
                    </div>
                    <div class="health-uptime">
                        <div class="health-uptime-value">${uptime}</div>
                        <div class="health-uptime-label">${this.t('uptime')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSystemMetrics() {
        if (!this.systemMetrics) return '';

        return `
            <div class="health-metrics-section">
                <h2>
                    <i class="fas fa-chart-area"></i>
                    System Metrics
                </h2>
                <div class="health-metrics-grid">
                    ${this.renderCPUMetrics()}
                    ${this.renderMemoryMetrics()}
                    ${this.renderDiskMetrics()}
                    ${this.renderNetworkLatency()}
                </div>
                ${this.renderSystemServices()}
            </div>
        `;
    }

    renderCPUMetrics() {
        if (!this.systemMetrics || !this.systemMetrics.cpu) return '';

        const cpu = this.systemMetrics.cpu;
        const usageColor = cpu.usage > 80 ? '#ef4444' : cpu.usage > 60 ? '#f59e0b' : '#10b981';

        return `
            <div class="health-metric-card">
                <div class="health-metric-header">
                    <div class="health-metric-icon" style="background: ${usageColor}20; color: ${usageColor}">
                        <i class="fas fa-microchip"></i>
                    </div>
                    <div class="health-metric-title">
                        <h3>CPU Usage</h3>
                        <p>${cpu.cores} Core${cpu.cores > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="health-metric-value" style="color: ${usageColor}">
                    ${cpu.usage.toFixed(1)}%
                </div>
                <div class="health-metric-progress">
                    <div class="health-metric-progress-bar" style="width: ${cpu.usage}%; background: ${usageColor}"></div>
                </div>
                <div class="health-metric-details">
                    ${cpu.temperature > 0 ? `<div><i class="fas fa-thermometer-half"></i> ${cpu.temperature.toFixed(1)}°C</div>` : ''}
                    ${cpu.loadAvg1 > 0 ? `<div><i class="fas fa-chart-line"></i> Load: ${cpu.loadAvg1.toFixed(2)}, ${cpu.loadAvg5.toFixed(2)}, ${cpu.loadAvg15.toFixed(2)}</div>` : ''}
                </div>
            </div>
        `;
    }

    renderMemoryMetrics() {
        if (!this.systemMetrics || !this.systemMetrics.memory) return '';

        const mem = this.systemMetrics.memory;
        const usageColor = mem.usedPercent > 80 ? '#ef4444' : mem.usedPercent > 60 ? '#f59e0b' : '#10b981';

        return `
            <div class="health-metric-card">
                <div class="health-metric-header">
                    <div class="health-metric-icon" style="background: ${usageColor}20; color: ${usageColor}">
                        <i class="fas fa-memory"></i>
                    </div>
                    <div class="health-metric-title">
                        <h3>Memory Usage</h3>
                        <p>${this.formatBytes(mem.total)} Total</p>
                    </div>
                </div>
                <div class="health-metric-value" style="color: ${usageColor}">
                    ${mem.usedPercent.toFixed(1)}%
                </div>
                <div class="health-metric-progress">
                    <div class="health-metric-progress-bar" style="width: ${mem.usedPercent}%; background: ${usageColor}"></div>
                </div>
                <div class="health-metric-details">
                    <div><i class="fas fa-arrow-up"></i> Used: ${this.formatBytes(mem.used)}</div>
                    <div><i class="fas fa-arrow-down"></i> Free: ${this.formatBytes(mem.free)}</div>
                    ${mem.swapTotal > 0 ? `<div><i class="fas fa-exchange-alt"></i> Swap: ${this.formatBytes(mem.swapUsed)} / ${this.formatBytes(mem.swapTotal)}</div>` : ''}
                </div>
            </div>
        `;
    }

    renderDiskMetrics() {
        if (!this.systemMetrics || !this.systemMetrics.disk || this.systemMetrics.disk.length === 0) return '';

        // Show primary disk (usually first one)
        const disk = this.systemMetrics.disk[0];
        const usageColor = disk.usedPercent > 80 ? '#ef4444' : disk.usedPercent > 60 ? '#f59e0b' : '#10b981';

        return `
            <div class="health-metric-card">
                <div class="health-metric-header">
                    <div class="health-metric-icon" style="background: ${usageColor}20; color: ${usageColor}">
                        <i class="fas fa-hdd"></i>
                    </div>
                    <div class="health-metric-title">
                        <h3>Disk Usage</h3>
                        <p>${disk.mountPoint}</p>
                    </div>
                </div>
                <div class="health-metric-value" style="color: ${usageColor}">
                    ${disk.usedPercent.toFixed(1)}%
                </div>
                <div class="health-metric-progress">
                    <div class="health-metric-progress-bar" style="width: ${disk.usedPercent}%; background: ${usageColor}"></div>
                </div>
                <div class="health-metric-details">
                    <div><i class="fas fa-database"></i> Total: ${this.formatBytes(disk.total)}</div>
                    <div><i class="fas fa-arrow-up"></i> Used: ${this.formatBytes(disk.used)}</div>
                    <div><i class="fas fa-arrow-down"></i> Free: ${this.formatBytes(disk.free)}</div>
                </div>
            </div>
        `;
    }

    renderNetworkLatency() {
        if (!this.systemMetrics || !this.systemMetrics.network) return '';

        const network = this.systemMetrics.network;
        const latencies = network.latency || {};
        const avgLatency = Object.values(latencies).filter(l => l > 0).reduce((a, b) => a + b, 0) / Object.values(latencies).filter(l => l > 0).length || 0;
        const latencyColor = avgLatency > 100 ? '#ef4444' : avgLatency > 50 ? '#f59e0b' : '#10b981';

        return `
            <div class="health-metric-card">
                <div class="health-metric-header">
                    <div class="health-metric-icon" style="background: ${latencyColor}20; color: ${latencyColor}">
                        <i class="fas fa-network-wired"></i>
                    </div>
                    <div class="health-metric-title">
                        <h3>Network Latency</h3>
                        <p>Ping Response</p>
                    </div>
                </div>
                <div class="health-metric-value" style="color: ${latencyColor}">
                    ${avgLatency > 0 ? avgLatency.toFixed(0) + ' ms' : 'N/A'}
                </div>
                <div class="health-metric-details">
                    ${Object.entries(latencies).map(([host, latency]) => `
                        <div><i class="fas fa-globe"></i> ${host}: ${latency > 0 ? latency + ' ms' : 'Timeout'}</div>
                    `).join('')}
                    ${network.rxBytes > 0 ? `<div><i class="fas fa-download"></i> RX: ${this.formatBytes(network.rxBytes)}</div>` : ''}
                    ${network.txBytes > 0 ? `<div><i class="fas fa-upload"></i> TX: ${this.formatBytes(network.txBytes)}</div>` : ''}
                </div>
            </div>
        `;
    }

    renderSystemServices() {
        if (!this.systemMetrics || !this.systemMetrics.services || this.systemMetrics.services.length === 0) return '';

        return `
            <div class="health-services-list">
                <h3><i class="fas fa-cogs"></i> System Services</h3>
                <div class="health-services-grid-compact">
                    ${this.systemMetrics.services.map(service => `
                        <div class="health-service-compact ${service.status}">
                            <div class="service-status-icon">
                                <i class="fas ${service.status === 'running' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            </div>
                            <div class="service-info">
                                <h4>${service.name}</h4>
                                <p class="service-status">${service.status}</p>
                            </div>
                            ${service.enabled ? '<span class="service-badge">Auto-start</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderServices() {
        if (!this.healthData || !this.healthData.services) return '';

        return `
            <div class="health-services-section">
                <h2>
                    <i class="fas fa-server"></i>
                    ${this.t('services')}
                </h2>
                <div class="health-services-grid">
                    ${this.healthData.services.map(service => this.renderServiceCard(service)).join('')}
                </div>
            </div>
        `;
    }

    renderServiceCard(service) {
        const statusConfig = {
            healthy: { color: '#10b981', bg: '#d1fae5', icon: 'fa-check-circle' },
            degraded: { color: '#f59e0b', bg: '#fef3c7', icon: 'fa-exclamation-triangle' },
            unhealthy: { color: '#ef4444', bg: '#fee2e2', icon: 'fa-times-circle' }
        };

        const config = statusConfig[service.status] || statusConfig.healthy;
        const lastCheck = new Date(service.lastCheck).toLocaleString();
        const responseTime = service.responseTime ? `${service.responseTime} ${this.t('milliseconds')}` : 'N/A';

        return `
            <div class="health-service-card">
                <div class="health-service-header">
                    <div class="health-service-title">
                        <div class="health-service-status-indicator" style="background: ${config.bg}; color: ${config.color}">
                            <i class="fas ${config.icon}"></i>
                        </div>
                        <div>
                            <h3>${service.name}</h3>
                            <p class="health-service-message">${service.message}</p>
                        </div>
                    </div>
                    <div class="health-service-badge" style="background: ${config.bg}; color: ${config.color}">
                        ${service.status}
                    </div>
                </div>
                <div class="health-service-metrics">
                    <div class="health-metric">
                        <span class="health-metric-label">${this.t('responseTime')}:</span>
                        <span class="health-metric-value">${responseTime}</span>
                    </div>
                    <div class="health-metric">
                        <span class="health-metric-label">${this.t('lastCheck')}:</span>
                        <span class="health-metric-value">${lastCheck}</span>
                    </div>
                </div>
                ${service.details && Object.keys(service.details).length > 0 ? `
                    <div class="health-service-details">
                        <h4>${this.t('details')}</h4>
                        <div class="health-details-grid">
                            ${Object.entries(service.details).map(([key, value]) => `
                                <div class="health-detail-item">
                                    <span class="health-detail-key">${this.formatKey(key)}:</span>
                                    <span class="health-detail-value">${this.formatValue(value)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderTasks() {
        // Find Task Manager service
        const taskService = this.healthData?.services?.find(s => s.name === 'Task Manager');
        if (!taskService) return '';

        const activeTasks = taskService.details?.activeTasks || 0;
        const totalTasks = taskService.details?.totalTasks || 0;

        return `
            <div class="health-tasks-section">
                <h2>
                    <i class="fas fa-tasks"></i>
                    ${this.t('tasks')}
                </h2>
                <div class="health-tasks-stats">
                    <div class="health-task-stat-card">
                        <div class="health-task-stat-value">${totalTasks}</div>
                        <div class="health-task-stat-label">${this.t('totalTasks')}</div>
                    </div>
                    <div class="health-task-stat-card">
                        <div class="health-task-stat-value" style="color: #3b82f6;">${activeTasks}</div>
                        <div class="health-task-stat-label">${this.t('activeTasks')}</div>
                    </div>
                    <div class="health-task-stat-card">
                        <div class="health-task-stat-value" style="color: #10b981;">${taskService.details?.completedTasks || 0}</div>
                        <div class="health-task-stat-label">${this.t('completedTasks')}</div>
                    </div>
                    <div class="health-task-stat-card">
                        <div class="health-task-stat-value" style="color: #ef4444;">${taskService.details?.failedTasks || 0}</div>
                        <div class="health-task-stat-label">${this.t('failedTasks')}</div>
                    </div>
                </div>
                <div class="health-active-tasks" id="health-active-tasks">
                    ${this.renderActiveTasksList()}
                </div>
            </div>
        `;
    }

    renderActiveTasksList() {
        // Fetch active tasks from API
        return `
            <div class="health-tasks-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading active tasks...</span>
            </div>
        `;
    }

    async loadActiveTasks() {
        try {
            // secure fetch will automatically add authentication
            const response = await fetch('/api/tasks?active=true');

            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }

            const tasks = await response.json();
            const container = document.getElementById('health-active-tasks');
            if (!container) return;

            if (tasks.length === 0) {
                container.innerHTML = `
                    <div class="health-tasks-empty">
                        <i class="fas fa-check-circle"></i>
                        <p>${this.t('noActiveTasks')}</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="health-tasks-list">
                    ${tasks.map(task => `
                        <div class="health-task-item ${task.status}">
                            <div class="health-task-header">
                                <div class="health-task-icon">
                                    <i class="fas fa-${task.status === 'completed' ? 'check-circle' : task.status === 'failed' ? 'exclamation-circle' : task.status === 'cancelled' ? 'ban' : 'spinner fa-spin'}"></i>
                                </div>
                                <div class="health-task-info">
                                    <div class="health-task-name">${this.escapeHtml(task.name)}</div>
                                    <div class="health-task-message">${this.escapeHtml(task.message || '')}</div>
                                </div>
                                <div class="health-task-status">
                                    <span class="health-task-status-badge ${task.status}">${task.status}</span>
                                </div>
                            </div>
                            ${task.status === 'running' || task.status === 'pending' ? `
                                <div class="health-task-progress">
                                    <div class="health-task-progress-bar">
                                        <div class="health-task-progress-fill" style="width: ${task.progress || 0}%"></div>
                                    </div>
                                    <span class="health-task-progress-text">${task.progress || 0}%</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading active tasks:', error);
            const container = document.getElementById('health-active-tasks');
            if (container) {
                container.innerHTML = `
                    <div class="health-tasks-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load tasks</p>
                    </div>
                `;
            }
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderSystemInfo() {
        if (!this.healthData || !this.healthData.systemInfo) return '';

        return `
            <div class="health-system-section">
                <h2>
                    <i class="fas fa-info-circle"></i>
                    ${this.t('systemInfo')}
                </h2>
                <div class="health-system-grid">
                    ${Object.entries(this.healthData.systemInfo).map(([key, value]) => `
                        <div class="health-system-item">
                            <span class="health-system-key">${this.formatKey(key)}:</span>
                            <span class="health-system-value">${this.formatSystemValue(key, value)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    formatKey(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    formatValue(value) {
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                return value.length > 0 ? `${value.length} items` : 'Empty';
            }
            return JSON.stringify(value, null, 2);
        }
        if (typeof value === 'number' && value > 1000000) {
            return (value / 1000000).toFixed(2) + ' MB';
        }
        return String(value);
    }

    formatSystemValue(key, value) {
        if (key === 'memoryAlloc' || key === 'memoryTotalAlloc' || key === 'memorySys') {
            return this.formatBytes(value);
        }
        if (key === 'goVersion') {
            return value;
        }
        return this.formatValue(value);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (days > 0) {
            return `${days}${this.t('days')} ${hours}${this.t('hours')} ${minutes}${this.t('minutes')}`;
        } else if (hours > 0) {
            return `${hours}${this.t('hours')} ${minutes}${this.t('minutes')} ${secs}${this.t('seconds')}`;
        } else if (minutes > 0) {
            return `${minutes}${this.t('minutes')} ${secs}${this.t('seconds')}`;
        }
        return `${secs}${this.t('seconds')}`;
    }

    async loadHealthData() {
        try {
            const response = await fetch('/api/health');
            if (!response.ok) {
                throw new Error('Failed to fetch health data');
            }
            this.healthData = await response.json();
            
            // Load system metrics
            await this.loadSystemMetrics();
            
            // Load active tasks after health data is loaded
            await this.loadActiveTasks();
        } catch (error) {
            console.error('Error loading health data:', error);
            this.healthData = {
                overall: 'unhealthy',
                services: [],
                systemInfo: {},
                uptime: 0
            };
        }
    }

    async loadSystemMetrics() {
        try {
            const response = await fetch('/api/system/metrics');
            if (!response.ok) {
                throw new Error('Failed to fetch system metrics');
            }
            this.systemMetrics = await response.json();
        } catch (error) {
            console.error('Error loading system metrics:', error);
            this.systemMetrics = null;
        }
    }

    async refreshHealth() {
        // Check if we're still on the health monitor page
        const pageContent = document.getElementById('page-content');
        if (!pageContent) {
            return; // Page content doesn't exist, stop refreshing
        }
        
        // Check if the current page is still health-monitor
        const healthMonitorPage = pageContent.querySelector('.health-monitor-page');
        if (!healthMonitorPage) {
            // We're no longer on the health monitor page, stop auto-refresh
            this.stopAutoRefresh();
            return;
        }
        
        await this.loadHealthData();
        
        // Double-check we're still on health monitor page before updating
        const stillOnPage = document.getElementById('page-content')?.querySelector('.health-monitor-page');
        if (!stillOnPage) {
            this.stopAutoRefresh();
            return;
        }
        
        // Stop auto refresh temporarily to avoid conflicts
        const wasAutoRefreshing = this.autoRefresh;
        this.stopAutoRefresh();
        
        // Re-render the entire page content
        const newHTML = await this.render();
        pageContent.innerHTML = newHTML;
        
        // Ensure global instance is set for inline event handlers
        window.healthMonitorInstance = this;
        
        // Load active tasks after render
        await this.loadActiveTasks();
        
        // Restart auto refresh if it was enabled
        if (wasAutoRefreshing) {
            this.startAutoRefresh();
        }
    }

    toggleAutoRefresh(event) {
        this.autoRefresh = event.target.checked;
        if (this.autoRefresh) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        if (this.autoRefresh) {
            this.refreshInterval = setInterval(() => {
                this.refreshHealth();
            }, this.refreshIntervalMs);
        }
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    cleanup() {
        this.stopAutoRefresh();
    }

    destroy() {
        this.stopAutoRefresh();
    }
}

