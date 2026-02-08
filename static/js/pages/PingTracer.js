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
            enrichment: true,
            mtuDiscovery: false,
            probingMode: 'icmp',
            logFailures: false,
            logSuccesses: false,
            preferIPv4: true,
            serverNames: true,
            packetLoss: true,
            lastPing: true,
            average: true,
            jitter: true,
            minMax: false,
            badThreshold: 100,
            worseThreshold: 200
        };
        this.graphData = {};
        this.maxGraphPoints = 100;
        this.mtu = null;
    }

    async render() {
        return `
            <div class="page-container-full">
                <div class="ping-tracer-full-container">
                    <!-- Top Header Configuration -->
                    <div class="ping-tracer-header">
                        <div class="header-left">
                            <div class="header-app-brand">
                                <i class="fas fa-satellite-dish"></i>
                                <span>Ping Tracer</span>
                            </div>
                            <div class="header-controls">
                                <div class="header-control-item">
                                    <label for="host">Target Host</label>
                                    <input type="text" id="host" class="header-input" placeholder="e.g. google.com" value="${this.config.host}">
                                </div>
                                <div class="header-control-item">
                                    <label for="rate">Rate</label>
                                    <input type="number" id="rate" class="header-input header-num-input" min="1" max="10" value="${this.config.rate}" title="Pings per second">
                                </div>
                                <div class="header-control-item">
                                    <label for="probing-mode">Protocol</label>
                                    <select id="probing-mode" class="header-input header-select">
                                        <option value="icmp" ${this.config.probingMode === 'icmp' ? 'selected' : ''}>ICMP</option>
                                        <option value="udp" ${this.config.probingMode === 'udp' ? 'selected' : ''}>UDP</option>
                                        <option value="tcp" ${this.config.probingMode === 'tcp' ? 'selected' : ''}>TCP</option>
                                    </select>
                                </div>
                                <div class="header-divider"></div>
                                <div class="header-toggles">
                                    <label class="header-checkbox" title="Map full network path">
                                        <input type="checkbox" id="trace-route" ${this.config.traceRoute ? 'checked' : ''}>
                                        <span>Traceroute</span>
                                    </label>
                                    <label class="header-checkbox" title="Enrich with ASN and Geolocation">
                                        <input type="checkbox" id="enrichment" ${this.config.enrichment ? 'checked' : ''}>
                                        <span>ASN/Geo</span>
                                    </label>
                                    <label class="header-checkbox" title="Auto-detect Path MTU">
                                        <input type="checkbox" id="mtu-discovery" ${this.config.mtuDiscovery ? 'checked' : ''}>
                                        <span>MTU</span>
                                    </label>
                                    <label class="header-checkbox" title="Perform reverse DNS lookups">
                                        <input type="checkbox" id="reverse-dns" ${this.config.reverseDNS ? 'checked' : ''}>
                                        <span>rDNS</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="header-right">
                            <span id="mtu-display" class="mtu-badge" style="display:none"></span>
                            <button type="button" class="btn btn-sm btn-primary" id="start-btn" onclick="pingTracerInstance.start()">
                                <i class="fas fa-play"></i> Start Trace
                            </button>
                            <button type="button" class="btn btn-sm btn-danger" id="stop-btn" onclick="pingTracerInstance.stop()" style="display: none;">
                                <i class="fas fa-stop"></i> Stop
                            </button>
                        </div>

                    </div>

                    <div class="ping-tracer-results-area">
                        <div class="ping-tracer-results">
                            <div id="results-meta-container" style="display: none;">
                                <div class="results-header">
                                    <div class="stats-table-header">
                                        <div class="header-main-info">Path Discovery</div>
                                        <div class="header-stats-group">
                                            <span class="stat-col">Sent</span>
                                            <span class="stat-col">Loss%</span>
                                            <span class="stat-col">Last</span>
                                            <span class="stat-col">Avg</span>
                                            <span class="stat-col">Min</span>
                                            <span class="stat-col">Max</span>
                                            <span class="stat-col">StdDev</span>
                                            <span class="stat-col">Jitter</span>
                                        </div>
                                        <div class="header-visual">Latency Trend</div>
                                    </div>
                                </div>
                            </div>


                            <div class="graphs-container">
                                <div class="graphs-empty" id="graphs-empty">
                                    <div class="empty-icon-wrapper">
                                        <i class="fas fa-network-wired"></i>
                                    </div>
                                    <h3>Network Path Monitor</h3>
                                    <p>Start a diagnostic trace to visualize path statistics, hop latency distribution, and route stability.</p>
                                </div>
                                <div id="hops-list"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }


    start() {
        if (this.isRunning) return;

        this.config.host = document.getElementById('host').value.trim();
        this.config.rate = parseInt(document.getElementById('rate').value) || 1;
        this.config.traceRoute = document.getElementById('trace-route').checked;
        this.config.enrichment = document.getElementById('enrichment').checked;
        this.config.mtuDiscovery = document.getElementById('mtu-discovery').checked;
        this.config.reverseDNS = document.getElementById('reverse-dns').checked;
        this.config.probingMode = document.getElementById('probing-mode').value;

        if (!this.config.host) {
            alert('Please enter a target host');
            return;
        }

        this.isRunning = true;
        this.hops = [];
        this.graphData = {};
        this.mtu = null;

        document.getElementById('start-btn').style.display = 'none';
        document.getElementById('stop-btn').style.display = 'inline-block';
        document.getElementById('graphs-empty').style.display = 'none';
        document.getElementById('hops-list').innerHTML = '';
        document.getElementById('results-meta-container').style.display = 'block';
        document.getElementById('mtu-display').style.display = 'none';



        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}/api/network/ping-tracer`);

        this.ws.onopen = () => {
            this.ws.send(JSON.stringify(this.config));
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'hop_found') {
                    this.hops.push(data.hop);
                    this.initializeGraphForHop(data.hop);
                } else if (data.type === 'ping') {
                    this.updateHop(data.hop);
                } else if (data.type === 'mtu_found') {
                    this.mtu = data.mtu;
                    const mtuEl = document.getElementById('mtu-display');
                    if (mtuEl) {
                        mtuEl.textContent = `MTU: ${data.mtu}`;
                        mtuEl.style.display = 'inline-block';
                    }
                } else if (data.type === 'stopped') {
                    this.stop();
                }
            } catch (e) {
                console.error(e);
            }
        };

        this.ws.onclose = () => this.stop();
    }

    stop() {
        this.isRunning = false;

        // Close modal if open
        if (window.modalInstance && window.modalInstance.isOpen) {
            window.modalInstance.close();
        }
        this.activeDetailHop = null;

        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'stop' }));
            }
            this.ws.close();
            this.ws = null;
        }

        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';

        // Set to empty state
        const emptyEl = document.getElementById('graphs-empty');
        if (emptyEl) emptyEl.style.display = 'flex';

        const hopsEl = document.getElementById('hops-list');
        if (hopsEl) hopsEl.innerHTML = '';

        const resMeta = document.getElementById('results-meta-container');
        if (resMeta) resMeta.style.display = 'none';

        const hostEl = document.getElementById('display-host');

        if (hostEl) hostEl.textContent = '';

        const mtuEl = document.getElementById('mtu-display');
        if (mtuEl) mtuEl.style.display = 'none';
    }



    initializeGraphForHop(hop) {
        const container = document.getElementById('hops-list');
        if (!container || document.getElementById(`hop-${hop.hopNumber}`)) return;


        const hopDiv = document.createElement('div');
        hopDiv.className = 'hop-row-v2 clickable';
        hopDiv.id = `hop-${hop.hopNumber}`;
        hopDiv.onclick = () => this.showHopDetails(hop.hopNumber);

        hopDiv.innerHTML = `
            <div class="hop-main-info">
                <span class="hop-num-v2">${hop.hopNumber}</span>
                <div class="hop-address-box">
                    <div class="hop-ip-v2">${hop.ip}</div>
                    <div class="hop-host-v2">${hop.hostname || ''}</div>
                    <div class="hop-meta-v2">
                        ${hop.asn ? `<span class="hop-asn-v2">ASN ${hop.asn}</span>` : ''}
                        ${hop.geo ? `<span class="hop-geo-v2">${hop.geo}</span>` : ''}
                        ${hop.ix ? `<span class="hop-ix-v2">${hop.ix}</span>` : ''}
                        ${hop.flapping ? `<span class="hop-flap-v2">FLAP</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="hop-stats-v2">
                <span class="stat-val" data-label="Sent" id="sent-${hop.hopNumber}">${hop.sent || 0}</span>
                <span class="stat-val" data-label="Loss" id="loss-${hop.hopNumber}">${hop.packetLoss.toFixed(1)}%</span>
                <span class="stat-val highlight" data-label="Last" id="last-${hop.hopNumber}">${hop.lastPing >= 0 ? hop.lastPing : '--'}</span>
                <span class="stat-val" data-label="Avg" id="avg-${hop.hopNumber}">${hop.average.toFixed(1)}</span>
                <span class="stat-val" data-label="Min" id="min-${hop.hopNumber}">${hop.min}</span>
                <span class="stat-val" data-label="Max" id="max-${hop.hopNumber}">${hop.max}</span>
                <span class="stat-val" data-label="Std" id="std-${hop.hopNumber}">${hop.stdDev.toFixed(1)}</span>
                <span class="stat-val" data-label="Jit" id="jit-${hop.hopNumber}">${hop.jitter.toFixed(1)}</span>
            </div>
            <div class="hop-visual">
                <canvas id="canvas-${hop.hopNumber}" width="300" height="24"></canvas>
            </div>
        `;
        container.appendChild(hopDiv);

        this.graphData[hop.hopNumber] = {
            canvas: document.getElementById(`canvas-${hop.hopNumber}`),
            ctx: document.getElementById(`canvas-${hop.hopNumber}`).getContext('2d'),
            data: []
        };
    }

    updateHop(hop) {
        const hn = hop.hopNumber;
        const updates = {
            [`sent-${hn}`]: hop.sent,
            [`loss-${hn}`]: `${hop.packetLoss.toFixed(1)}%`,
            [`last-${hn}`]: hop.lastPing >= 0 ? hop.lastPing : '--',
            [`avg-${hn}`]: hop.average.toFixed(1),
            [`min-${hn}`]: hop.min,
            [`max-${hn}`]: hop.max,
            [`std-${hn}`]: hop.stdDev.toFixed(1),
            [`jit-${hn}`]: hop.jitter.toFixed(1)
        };

        for (const [id, val] of Object.entries(updates)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        }

        const lossEl = document.getElementById(`loss-${hn}`);
        if (lossEl) lossEl.style.color = hop.packetLoss > 10 ? '#ef4444' : '#10b981';

        const gd = this.graphData[hn];
        if (gd) {
            gd.data.push(hop.lastPing);
            if (gd.data.length > 50) gd.data.shift();
            this.drawGraph(gd);

            // If details modal is open for this hop, update it
            if (this.activeDetailHop === hn) {
                this.updateHopDetails(hop);
            }
        }
    }

    showHopDetails(hopNumber) {
        const hop = this.hops.find(h => h.hopNumber === hopNumber);
        if (!hop || !window.modalInstance) return;

        this.activeDetailHop = hopNumber;

        const content = `
            <div class="hop-detail-modal compact-wide">
                <div class="hop-detail-meta top-row">
                    <div class="meta-item"><span>Hostname:</span> ${hop.hostname || 'Unknown'}</div>
                    <div class="meta-item"><span>ASN:</span> ${hop.asn || 'N/A'}</div>
                    <div class="meta-item"><span>Geo:</span> ${hop.geo || 'N/A'}</div>
                </div>

                <div class="hop-detail-visual small-wide">
                    <canvas id="detail-canvas-${hop.hopNumber}" width="800" height="25"></canvas>
                </div>

                <div class="hop-detail-main-grid">
                    <!-- Column 1: Core Flow -->
                    <div class="detail-column">
                        <div class="detail-section">
                            <h5>Transmission</h5>
                            <div class="detail-row"><span>Sent:</span> <span id="dt-sent">${hop.sent}</span></div>
                            <div class="detail-row"><span>Recv:</span> <span id="dt-recv">${hop.successful}</span></div>
                            <div class="detail-row"><span>Loss:</span> <span id="dt-loss">${hop.packetLoss.toFixed(1)}%</span></div>
                        </div>
                        <div class="detail-section">
                            <h5>Routing Symmetry</h5>
                            <div class="detail-row"><span>Forward:</span> <span id="dt-fwd">${hop.forwardHops}</span></div>
                            <div class="detail-row"><span>Return:</span> <span id="dt-ret">${hop.returnHops}</span></div>
                            <div class="detail-row"><span>Symm:</span> <span id="dt-sym-ok" class="text-success">${hop.symmetric}</span> / <span id="dt-sym-err" class="text-danger">${hop.asymmetric}</span></div>
                        </div>
                    </div>

                    <!-- Column 2: Latency & TTL -->
                    <div class="detail-column">
                        <div class="detail-section">
                            <h5>Latency Stats</h5>
                            <div class="detail-row"><span>Min/Avg/Max:</span> <span><span id="dt-min">${hop.min}</span>/<span id="dt-avg">${hop.average.toFixed(1)}</span>/<span id="dt-max">${hop.max}</span></span></div>

                            <div class="detail-row"><span>Last:</span> <span id="dt-last" class="text-primary">${hop.lastPing}ms</span></div>
                            <div class="detail-row"><span>StdDev:</span> <span id="dt-std">${hop.stdDev.toFixed(2)}ms</span></div>
                        </div>
                        <div class="detail-section">
                            <h5>TTL Behavior</h5>
                            <div class="detail-row"><span>Sent/Quoted:</span> <span><span id="dt-ttl-sent">${hop.sentTTL}</span> / <span id="dt-ttl-last">${hop.lastQuoted}</span></span></div>
                            <div class="detail-row"><span>Result:</span> <span><span id="dt-ttl-ok" class="text-success">${hop.ttlNormal}</span> / <span id="dt-ttl-err" class="text-danger">${hop.ttlAnomalous}</span></span></div>
                        </div>
                    </div>

                    <!-- Column 3: Distribution -->
                    <div class="detail-column">
                        <div class="detail-section">
                            <h5>Percentiles <small>(ms)</small></h5>
                            <div class="detail-row"><span>p50 / p95 / p99:</span> <span><span id="dt-p50">${hop.p50}</span> / <span id="dt-p95">${hop.p95}</span> / <span id="dt-p99">${hop.p99}</span></span></div>
                        </div>
                        <div class="detail-section">
                            <h5>Jitter Analysis</h5>
                            <div class="detail-row"><span>Avg Jitter:</span> <span id="dt-jit-avg">${hop.jitterAvg?.toFixed(2) || '0.00'}ms</span></div>
                            <div class="detail-row"><span>Max Jitter:</span> <span id="dt-jit-max">${hop.jitterMax?.toFixed(2) || '0.00'}ms</span></div>
                            <div class="detail-row"><span>Current:</span> <span id="dt-jit-cur">${hop.jitter.toFixed(2)}ms</span></div>
                        </div>
                    </div>
                </div>

                <div class="hop-detail-footer-mini">
                    <i class="fas fa-info-circle"></i> Live diagnostics for hop ${hop.hopNumber}.
                </div>
            </div>
        `;

        window.modalInstance.open(`Hop ${hop.hopNumber}: ${hop.ip}`, content, [], true);



        // Render detailed graph after modal is shown
        setTimeout(() => {
            const canvas = document.getElementById(`detail-canvas-${hop.hopNumber}`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const gd = this.graphData[hopNumber];
                if (gd) {
                    this.drawDetailedGraph(ctx, canvas, gd.data);
                }
            }
        }, 100);
    }

    updateHopDetails(hop) {
        const mapping = {
            'dt-sent': hop.sent,
            'dt-recv': hop.successful,
            'dt-loss': `${hop.packetLoss.toFixed(1)}%`,
            'dt-min': `${hop.min}ms`,
            'dt-avg': `${hop.average.toFixed(1)}ms`,
            'dt-max': `${hop.max}ms`,
            'dt-last': `${hop.lastPing}ms`,
            'dt-std': `${hop.stdDev.toFixed(2)}ms`,
            'dt-p50': `${hop.p50}ms`,
            'dt-p95': `${hop.p95}ms`,
            'dt-p99': `${hop.p99}ms`,
            'dt-jit-avg': `${hop.jitterAvg?.toFixed(2) || '0.00'}ms`,
            'dt-jit-max': `${hop.jitterMax?.toFixed(2) || '0.00'}ms`,
            'dt-jit-cur': `${hop.jitter.toFixed(2)}ms`,
            // Symmetry & TTL
            'dt-fwd': hop.forwardHops,
            'dt-ret': hop.returnHops,
            'dt-diff': (hop.forwardHops - hop.returnHops).toFixed(1),
            'dt-sym-smp': hop.symSamples,
            'dt-sym-ok': hop.symmetric,
            'dt-sym-err': hop.asymmetric,
            'dt-ttl-sent': hop.sentTTL,
            'dt-ttl-last': hop.lastQuoted,
            'dt-ttl-smp': hop.ttlSamples,
            'dt-ttl-ok': hop.ttlNormal,
            'dt-ttl-err': hop.ttlAnomalous
        };


        for (const [id, val] of Object.entries(mapping)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        }

        const canvas = document.getElementById(`detail-canvas-${hop.hopNumber}`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const gd = this.graphData[hop.hopNumber];
            if (gd) {
                this.drawDetailedGraph(ctx, canvas, gd.data);
            }
        }
    }

    drawDetailedGraph(ctx, canvas, data) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        if (data.length < 2) return;

        const max = Math.max(...data.filter(v => v >= 0), 50) * 1.5;
        const barWidth = w / 50;

        data.forEach((val, i) => {
            const x = i * barWidth;
            if (val < 0) {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(x, 0, barWidth - 1, h);
            } else {
                const barHeight = (val / max) * h;
                ctx.fillStyle = '#34d399';
                ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
            }
        });
    }


    drawGraph(gd) {
        const { ctx, canvas, data } = gd;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        if (data.length < 2) return;

        const max = Math.max(...data.filter(v => v >= 0), 100) * 1.2;
        const step = w / (this.maxGraphPoints - 1);
        const startX = w - (data.length * step);

        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;

        data.forEach((val, i) => {
            const x = startX + (i * step);
            if (val < 0) {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(x - 1, 0, 2, h);
            } else {
                const y = h - (val / max) * h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
    }

    async mount() {
        window.pingTracerInstance = this;
    }

    cleanup() {
        this.stop();
    }

    toggleConfigSidebar() {
        // Obsolete with new header design
    }

    closeConfigSidebar() {
        // Obsolete with new header design
    }
}
