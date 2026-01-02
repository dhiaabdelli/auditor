export class PingTracerPage {
    constructor() {
        this.isRunning = false;
        this.ws = null;
        this.hops = [];
        this.config = {
            host: 'www.google.com',
            rate: 1,
            traceRoute: true,
            reverseDNS: true,
            logFailures: false,
            logSuccesses: false,
            preferIPv4: true,
            serverNames: false,
            packetLoss: true,
            lastPing: true,
            average: true,
            jitter: false,
            minMax: false,
            badThreshold: 100,
            worseThreshold: 200
        };
        this.graphData = {}; // Store graph data for each hop
        this.maxGraphPoints = 100;
    }

    async render() {
        return `
            <div class="page-container-full">
                <div class="ping-tracer-full-container">
                    <div class="ping-tracer-split">
                        <!-- Left Side: Configuration -->
                        <div class="ping-tracer-form">
                            <div class="ping-tracer-form-header">
                                <h3><i class="fas fa-cog"></i> Configuration</h3>
                            </div>
                            <div class="ping-tracer-form-content">
                                <div class="form-group">
                                    <label for="host">Host</label>
                                    <input 
                                        type="text" 
                                        id="host" 
                                        class="form-input" 
                                        placeholder="www.google.com"
                                        value="${this.config.host}"
                                    >
                                </div>

                                <div class="form-group">
                                    <label for="rate">Rate (pings/sec per host)</label>
                                    <input 
                                        type="number" 
                                        id="rate" 
                                        class="form-input" 
                                        min="1" 
                                        max="10" 
                                        value="${this.config.rate}"
                                    >
                                </div>

                                <div class="form-group">
                                    <h4>General Options</h4>
                                    <label>
                                        <input type="checkbox" id="trace-route" ${this.config.traceRoute ? 'checked' : ''}>
                                        Trace Route
                                    </label>
                                    <label>
                                        <input type="checkbox" id="reverse-dns" ${this.config.reverseDNS ? 'checked' : ''}>
                                        Reverse DNS Lookup
                                    </label>
                                    <label>
                                        <input type="checkbox" id="log-failures" ${this.config.logFailures ? 'checked' : ''}>
                                        Log Failures
                                    </label>
                                    <label>
                                        <input type="checkbox" id="log-successes" ${this.config.logSuccesses ? 'checked' : ''}>
                                        Log Successes
                                    </label>
                                    <label>
                                        <input type="checkbox" id="prefer-ipv4" ${this.config.preferIPv4 ? 'checked' : ''}>
                                        Prefer IPv4
                                    </label>
                                </div>

                                <div class="form-group">
                                    <h4>Graph Options</h4>
                                    <label>
                                        <input type="checkbox" id="server-names" ${this.config.serverNames ? 'checked' : ''}>
                                        Server Names
                                    </label>
                                    <label>
                                        <input type="checkbox" id="packet-loss" ${this.config.packetLoss ? 'checked' : ''}>
                                        Packet Loss %
                                    </label>
                                    <label>
                                        <input type="checkbox" id="last-ping" ${this.config.lastPing ? 'checked' : ''}>
                                        Last Ping
                                    </label>
                                    <label>
                                        <input type="checkbox" id="average" ${this.config.average ? 'checked' : ''}>
                                        Average
                                    </label>
                                    <label>
                                        <input type="checkbox" id="jitter" ${this.config.jitter ? 'checked' : ''}>
                                        Jitter
                                    </label>
                                    <label>
                                        <input type="checkbox" id="min-max" ${this.config.minMax ? 'checked' : ''}>
                                        Min / Max
                                    </label>
                                </div>

                                <div class="form-group">
                                    <h4>Thresholds</h4>
                                    <label for="bad-threshold">Bad threshold (ms)</label>
                                    <input 
                                        type="number" 
                                        id="bad-threshold" 
                                        class="form-input" 
                                        min="1" 
                                        value="${this.config.badThreshold}"
                                    >
                                    <label for="worse-threshold">Worse threshold (ms)</label>
                                    <input 
                                        type="number" 
                                        id="worse-threshold" 
                                        class="form-input" 
                                        min="1" 
                                        value="${this.config.worseThreshold}"
                                    >
                                </div>

                                <div class="form-spacer"></div>
                                
                                <div class="form-actions-bottom">
                                    <button 
                                        type="button" 
                                        class="btn btn-primary" 
                                        id="start-btn"
                                        onclick="pingTracerInstance.start()"
                                    >
                                        <i class="fas fa-play"></i> Start
                                    </button>
                                    <button 
                                        type="button" 
                                        class="btn btn-secondary" 
                                        id="stop-btn"
                                        onclick="pingTracerInstance.stop()"
                                        style="display: none;"
                                    >
                                        <i class="fas fa-stop"></i> Stop
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Right Side: Graphs and Results -->
                        <div class="ping-tracer-results">
                            <div class="results-header" id="results-header">
                                <div class="results-header-left">
                                    <h3>Ping Tracer</h3>
                                    <div id="discovery-status" class="discovery-status" style="display: none;">
                                        <div class="discovery-spinner"></div>
                                        <span>Discovering network path...</span>
                                        <div class="discovery-progress-bar">
                                            <div class="discovery-progress-value"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="results-stats" id="results-stats">
                                    <span>Total Successful: <strong id="total-successful">0</strong></span>
                                    <span>Total Failed: <strong id="total-failed">0</strong></span>
                                </div>
                            </div>

                            <div class="graphs-container" id="graphs-container">
                                <div class="graphs-empty" id="graphs-empty">
                                    <div class="empty-icon-wrapper">
                                        <i class="fas fa-chart-line"></i>
                                    </div>
                                    <h3>No Data Yet</h3>
                                    <p>Configure settings and click "Start" to begin monitoring.</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    start() {
        if (this.isRunning) {
            return;
        }

        // Get configuration from form
        this.config.host = document.getElementById('host').value.trim();
        this.config.rate = parseInt(document.getElementById('rate').value) || 1;
        this.config.traceRoute = document.getElementById('trace-route').checked;
        this.config.reverseDNS = document.getElementById('reverse-dns').checked;
        this.config.logFailures = document.getElementById('log-failures').checked;
        this.config.logSuccesses = document.getElementById('log-successes').checked;
        this.config.preferIPv4 = document.getElementById('prefer-ipv4').checked;
        this.config.serverNames = document.getElementById('server-names').checked;
        this.config.packetLoss = document.getElementById('packet-loss').checked;
        this.config.lastPing = document.getElementById('last-ping').checked;
        this.config.average = document.getElementById('average').checked;
        this.config.jitter = document.getElementById('jitter').checked;
        this.config.minMax = document.getElementById('min-max').checked;
        this.config.badThreshold = parseInt(document.getElementById('bad-threshold').value) || 100;
        this.config.worseThreshold = parseInt(document.getElementById('worse-threshold').value) || 200;

        if (!this.config.host) {
            alert('Please enter a host');
            return;
        }

        // Stop any existing scan first
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'stop' }));
            this.ws.close();
            this.ws = null;
        }

        this.isRunning = true;
        this.hops = [];
        this.graphData = {};

        // Reset counters in DOM immediately
        const totalSuccessfulEl = document.getElementById('total-successful');
        const totalFailedEl = document.getElementById('total-failed');
        if (totalSuccessfulEl) totalSuccessfulEl.textContent = '0';
        if (totalFailedEl) totalFailedEl.textContent = '0';

        // Update UI
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const graphsEmpty = document.getElementById('graphs-empty');
        const graphsContainer = document.getElementById('graphs-container');
        const resultsHeader = document.getElementById('results-header');
        const discoveryStatus = document.getElementById('discovery-status');

        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';
        if (graphsEmpty) graphsEmpty.style.display = 'none';
        if (graphsContainer) graphsContainer.innerHTML = '';
        if (resultsHeader) resultsHeader.style.display = 'flex';
        
        // Show discovery status if traceroute is enabled
        if (this.config.traceRoute && discoveryStatus) {
            discoveryStatus.style.display = 'flex';
        } else if (discoveryStatus) {
            discoveryStatus.style.display = 'none';
        }


        // Build WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/network/ping-tracer`;
        
        // Create WebSocket connection
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            // Send configuration
            this.ws.send(JSON.stringify(this.config));
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'hops') {
                    this.hops = data.hops || [];
                    this.initializeGraphs();
                } else if (data.type === 'hop_found') {
                    // Add new hop as it is discovered
                    if (!this.hops) this.hops = [];
                    // Avoid duplicates if reconnecting or weird state
                    const exists = this.hops.find(h => h.hopNumber === data.hop.hopNumber);
                    if (!exists) {
                        this.hops.push(data.hop);
                        this.initializeGraphForHop(data.hop);
                    }
                } else if (data.type === 'ping') {
                    this.updateHop(data.hop);
                } else if (data.type === 'discovery_complete') {
                    const discoveryStatus = document.getElementById('discovery-status');
                    if (discoveryStatus) discoveryStatus.style.display = 'none';
                } else if (data.type === 'stopped') {
                    this.stop();
                } else if (data.type === 'error') {
                    alert(`Error: ${data.error}`);
                    this.stop();
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e, 'Data:', event.data);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('WebSocket connection error. Please check your connection.');
            this.stop();
        };
        
        this.ws.onclose = () => {
            if (this.isRunning) {
                console.log('WebSocket closed');
                this.stop();
            }
        };
    }

    stop() {
        this.isRunning = false;
        
        // Send stop message to server BEFORE closing
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.send(JSON.stringify({ type: 'stop' }));
                } catch (e) {
                    console.error('Error sending stop message:', e);
                }
            }
            
            // Close WebSocket connection immediately
            try {
                this.ws.close();
            } catch (e) {
                console.error('Error closing WebSocket:', e);
            }
            this.ws = null;
        }

        // Clear data
        this.hops = [];
        this.graphData = {};

        // Reset counters
        const totalSuccessfulEl = document.getElementById('total-successful');
        const totalFailedEl = document.getElementById('total-failed');
        if (totalSuccessfulEl) totalSuccessfulEl.textContent = '0';
        if (totalFailedEl) totalFailedEl.textContent = '0';

        const startBtnEl = document.getElementById('start-btn');
        const stopBtnEl = document.getElementById('stop-btn');
        const discoveryStatus = document.getElementById('discovery-status');
        const graphsContainer = document.getElementById('graphs-container');
        const graphsEmpty = document.getElementById('graphs-empty');

        if (startBtnEl) startBtnEl.style.display = 'inline-block';
        if (stopBtnEl) stopBtnEl.style.display = 'none';
        if (discoveryStatus) discoveryStatus.style.display = 'none';
        if (graphsContainer) graphsContainer.innerHTML = '';
        if (graphsEmpty) graphsEmpty.style.display = 'block';
    }

    cleanup() {
        // Force stop and close WebSocket when leaving the page
        console.log('[PingTracer] Cleaning up - stopping scan and closing WebSocket');
        this.isRunning = false;
        
        // Immediately close WebSocket without waiting
        if (this.ws) {
            // Send stop message if possible
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                try {
                    this.ws.send(JSON.stringify({ type: 'stop' }));
                } catch (e) {
                    // Ignore errors - we're closing anyway
                }
            }
            
            // Force close the connection
            try {
                this.ws.close(1000, 'Page navigation');
            } catch (e) {
                // Ignore errors
            }
            this.ws = null;
        }
        
        // Clear all data
        this.hops = [];
        this.graphData = {};
    }

    initializeGraphs() {
        const container = document.getElementById('graphs-container');
        if (!container) return;
        container.innerHTML = '';

        if (!this.hops || this.hops.length === 0) return;

        this.hops.forEach(hop => {
            this.initializeGraphForHop(hop);
        });
    }

    initializeGraphForHop(hop) {
        const container = document.getElementById('graphs-container');
        if (!container) return;

        if (!hop.isActive) return;

        // Check if graph already exists
        if (document.getElementById(`hop-graph-${hop.hopNumber}`)) {
            return;
        }

        const graphDiv = document.createElement('div');
        graphDiv.className = 'hop-graph';
        graphDiv.id = `hop-graph-${hop.hopNumber}`;
        
        // Build label with hostname only if serverNames is enabled
        let label = `${hop.hopNumber}. ${hop.ip}`;
        if (this.config.serverNames && hop.hostname && hop.hostname.trim() !== '') {
            label = `${hop.hopNumber}. ${hop.hostname} (${hop.ip})`;
        }

        // Build stats text
        let statsText = '';
        if (this.config.packetLoss) {
            // Ensure packetLoss is a number and calculate if needed
            let packetLoss = hop.packetLoss;
            if (typeof packetLoss !== 'number' || isNaN(packetLoss)) {
                const total = (hop.successful || 0) + (hop.failed || 0);
                packetLoss = total > 0 ? ((hop.failed || 0) / total) * 100 : 0;
            }
            statsText += `${packetLoss.toFixed(2)}%`;
        }
        if (this.config.lastPing) {
            // For latency 0, we can display it as "<1ms" or just "0ms" or "1ms"
            // If it's -1, it's a timeout.
            if (hop.lastPing > 0) {
                statsText += statsText ? ` [${hop.lastPing}ms` : `[${hop.lastPing}ms`;
            } else if (hop.lastPing === 0) {
                // Should consider 0 as valid response (e.g. local or very fast)
                // Display as <1ms for better clarity
                statsText += statsText ? ` [<1ms` : `[<1ms`;
            } else {
                statsText += statsText ? ` [timeout` : `[timeout`;
            }
        }
        if (this.config.average && hop.average > 0) {
            statsText += statsText ? `, avg:${hop.average.toFixed(0)}ms` : `[avg:${hop.average.toFixed(0)}ms`;
        }
        if (statsText && !statsText.endsWith(']')) {
            statsText += ']';
        }

        graphDiv.innerHTML = `
            <div class="hop-label">${statsText} ${label}</div>
            <canvas class="graph-canvas" id="canvas-${hop.hopNumber}" width="800" height="50"></canvas>
        `;

        container.appendChild(graphDiv);

        // Initialize graph data
        this.graphData[hop.hopNumber] = {
            canvas: document.getElementById(`canvas-${hop.hopNumber}`),
            ctx: document.getElementById(`canvas-${hop.hopNumber}`).getContext('2d'),
            data: []
        };
    }

    updateHop(hop) {
        if (!this.hops) return;
        
        // Update hop data
        const hopIndex = this.hops.findIndex(h => h.hopNumber === hop.hopNumber);
        if (hopIndex >= 0) {
            // Preserve hostname if it exists and new one is empty
            if (this.hops[hopIndex].hostname && (!hop.hostname || hop.hostname.trim() === '')) {
                hop.hostname = this.hops[hopIndex].hostname;
            }
            this.hops[hopIndex] = hop;
            
            // Update the label in the graph
            this.updateHopLabel(hop);
        }

        // Update graph
        if (this.graphData[hop.hopNumber]) {
            this.drawGraph(hop.hopNumber, hop);
        }

        // Update statistics
        this.updateStatistics();
    }

    updateHopLabel(hop) {
        const graphDiv = document.getElementById(`hop-graph-${hop.hopNumber}`);
        if (!graphDiv) return;

        // Build label with hostname only if serverNames is enabled
        let label = `${hop.hopNumber}. ${hop.ip}`;
        if (this.config.serverNames && hop.hostname && hop.hostname.trim() !== '') {
            label = `${hop.hopNumber}. ${hop.hostname} (${hop.ip})`;
        }

        // Build stats text
        let statsText = '';
        if (this.config.packetLoss) {
            // Ensure packetLoss is a number and calculate if needed
            let packetLoss = hop.packetLoss;
            if (typeof packetLoss !== 'number' || isNaN(packetLoss)) {
                const total = (hop.successful || 0) + (hop.failed || 0);
                packetLoss = total > 0 ? ((hop.failed || 0) / total) * 100 : 0;
            }
            statsText += `${packetLoss.toFixed(2)}%`;
        }
        if (this.config.lastPing) {
            // For latency 0, we can display it as "<1ms" or just "0ms" or "1ms"
            // If it's -1, it's a timeout.
            if (hop.lastPing > 0) {
                statsText += statsText ? ` [${hop.lastPing}ms` : `[${hop.lastPing}ms`;
            } else if (hop.lastPing === 0) {
                // Should consider 0 as valid response (e.g. local or very fast)
                // Display as <1ms for better clarity
                statsText += statsText ? ` [<1ms` : `[<1ms`;
            } else {
                statsText += statsText ? ` [timeout` : `[timeout`;
            }
        }
        if (this.config.average && hop.average > 0) {
            statsText += statsText ? `, avg:${hop.average.toFixed(0)}ms` : `[avg:${hop.average.toFixed(0)}ms`;
        }
        if (statsText && !statsText.endsWith(']')) {
            statsText += ']';
        }

        // Update label
        const labelEl = graphDiv.querySelector('.hop-label');
        if (labelEl) {
            labelEl.textContent = `${statsText} ${label}`;
        }
    }

    drawGraph(hopNumber, hop) {
        const graph = this.graphData[hopNumber];
        if (!graph) return;

        const canvas = graph.canvas;
        const ctx = graph.ctx;
        const width = canvas.width;
        const height = canvas.height;

        // Add new data point
        graph.data.push({
            latency: hop.lastPing,
            timestamp: Date.now()
        });

        // Keep only last maxGraphPoints
        if (graph.data.length > this.maxGraphPoints) {
            graph.data = graph.data.slice(-this.maxGraphPoints);
        }

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Set background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        if (graph.data.length < 2) {
            return;
        }

        // Find min and max latency for scaling
        let minLatency = Infinity;
        let maxLatency = -Infinity;
        graph.data.forEach(point => {
            if (point.latency >= 0) { // Include 0
                if (point.latency < minLatency) minLatency = point.latency;
                if (point.latency > maxLatency) maxLatency = point.latency;
            }
        });

        // Add padding
        if (minLatency === Infinity) minLatency = 0;
        if (maxLatency === -Infinity) maxLatency = 100;
        const range = maxLatency - minLatency || 100;
        minLatency = Math.max(0, minLatency - range * 0.1);
        maxLatency = maxLatency + range * 0.1;

        // Draw threshold lines
        if (this.config.badThreshold > 0) {
            const badY = height - ((this.config.badThreshold - minLatency) / (maxLatency - minLatency)) * height;
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, badY);
            ctx.lineTo(width, badY);
            ctx.stroke();
        }

        if (this.config.worseThreshold > 0) {
            const worseY = height - ((this.config.worseThreshold - minLatency) / (maxLatency - minLatency)) * height;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, worseY);
            ctx.lineTo(width, worseY);
            ctx.stroke();
        }

        ctx.setLineDash([]);

        // Draw graph line
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();

        let hasData = false;
        graph.data.forEach((point, index) => {
            const x = (index / (graph.data.length - 1)) * width;
            
            if (point.latency >= 0) { // Include 0 as valid point
                const y = height - ((point.latency - minLatency) / (maxLatency - minLatency)) * height;
                
                if (!hasData) {
                    ctx.moveTo(x, y);
                    hasData = true;
                } else {
                    ctx.lineTo(x, y);
                }
            } else {
                // Failed ping - draw red marker
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(x - 1, 0, 2, height);
            }
        });

        if (hasData) {
            ctx.stroke();
        }

        // Draw filled area
        if (hasData) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.beginPath();
            ctx.moveTo(0, height);
            graph.data.forEach((point, index) => {
                if (point.latency >= 0) { // Include 0
                    const x = (index / (graph.data.length - 1)) * width;
                    const y = height - ((point.latency - minLatency) / (maxLatency - minLatency)) * height;
                    ctx.lineTo(x, y);
                }
            });
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
        }

        // Draw Min/Max lines if enabled (after graph so they're visible)
        if (this.config.minMax && hop.min > 0 && hop.max > 0) {
            // Draw Min line
            const minY = height - ((hop.min - minLatency) / (maxLatency - minLatency)) * height;
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, minY);
            ctx.lineTo(width, minY);
            ctx.stroke();

            // Draw Max line
            const maxY = height - ((hop.max - minLatency) / (maxLatency - minLatency)) * height;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, maxY);
            ctx.lineTo(width, maxY);
            ctx.stroke();

            ctx.setLineDash([]);
        }
    }

    updateStatistics() {
        let totalSuccessful = 0;
        let totalFailed = 0;

        this.hops.forEach(hop => {
            totalSuccessful += hop.successful || 0;
            totalFailed += hop.failed || 0;
        });

        const totalSuccessfulEl = document.getElementById('total-successful');
        const totalFailedEl = document.getElementById('total-failed');
        if (totalSuccessfulEl) totalSuccessfulEl.textContent = totalSuccessful;
        if (totalFailedEl) totalFailedEl.textContent = totalFailed;
    }

}
