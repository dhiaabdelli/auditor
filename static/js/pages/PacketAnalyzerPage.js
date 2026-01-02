export class PacketAnalyzerPage {
    constructor() {
        this.sessions = [];
        this.activeSessionId = null;
        this.interfaces = [];
        this.showCaptureModal = false;
        this.maxPackets = 1000000; // Store up to 1M packets in memory
        this.virtualScrollRowHeight = 32; // Approximate row height in pixels
        this.virtualScrollBuffer = 100; // Extra rows to render above/below viewport (increased for fast scrolling)
        this.lastScrollTop = 0;
        this.isAtBottom = true;
        this.scrollRafPending = false; // Track if scroll RAF is pending
        this.lastRenderedStart = null; // Track last rendered range for optimization
        this.lastRenderedEnd = null;
        
        // Column configuration
        this.availableColumns = [
            { id: 'number', name: '#', enabled: true, width: '60px' },
            { id: 'time', name: 'Time', enabled: true, width: '140px' },
            { id: 'source', name: 'Source', enabled: true, width: '150px' },
            { id: 'srcPort', name: 'Src Port', enabled: false, width: '90px' },
            { id: 'destination', name: 'Destination', enabled: true, width: '150px' },
            { id: 'dstPort', name: 'Dst Port', enabled: false, width: '90px' },
            { id: 'protocol', name: 'Protocol', enabled: true, width: '100px' },
            { id: 'ttl', name: 'TTL', enabled: false, width: '60px' },
            { id: 'seqNum', name: 'Seq #', enabled: false, width: '110px' },
            { id: 'ackNum', name: 'Ack #', enabled: false, width: '110px' },
            { id: 'tcpSegLen', name: 'TCP Seg Len', enabled: false, width: '100px' },
            { id: 'length', name: 'Length', enabled: true, width: '80px' },
            { id: 'info', name: 'Info', enabled: true, width: 'auto' }
        ];
        
        // Load column preferences from localStorage
        const savedColumns = localStorage.getItem('packetAnalyzerColumns');
        if (savedColumns) {
            try {
                const parsed = JSON.parse(savedColumns);
                this.availableColumns = this.availableColumns.map(col => {
                    const saved = parsed.find(s => s.id === col.id);
                    return saved ? { ...col, enabled: saved.enabled } : col;
                });
            } catch (e) {
                console.error('Error loading column preferences:', e);
            }
        }
    }

    async render() {
        window.packetAnalyzerInstance = this;
        const session = this.sessions[0]; // Single session design
        
        console.log('PacketAnalyzer render - session exists:', !!session, 'sessions array:', this.sessions);
        
        return `
            <div class="page-container-full">
                <div class="packet-analyzer-full-container">
                    ${session ? this.renderPacketDisplay(session) : this.renderWelcome()}
                </div>
            </div>
        `;
    }

    renderWelcome() {
        console.log('Rendering welcome screen, interfaces:', this.interfaces);
        return `
            <div class="packet-display-container">
                <!-- Header -->
                <div class="packet-header">
                    <div class="packet-header-left">
                        <h3><i class="fas fa-microscope"></i> Packet Analyzer</h3>
                        <div class="packet-header-controls">
                            <select id="interfaceSelect" class="interface-select">
                                <option value="">Select Network Interface...</option>
                                ${this.interfaces.length === 0 ? '<option value="" disabled>Loading interfaces...</option>' : ''}
                                ${this.interfaces.map(iface => {
                                    // Prioritize description (actual adapter name) over friendlyName
                                    const displayName = iface.description || iface.friendlyName || iface.name;
                                    const mac = iface.macAddress ? ` [${iface.macAddress}]` : '';
                                    // Filter for IPv4 addresses only (not IPv6)
                                    const ipv4 = iface.addresses && iface.addresses.find(addr => addr.includes('.') && !addr.includes(':'));
                                    const ip = ipv4 ? ` - ${ipv4}` : '';
                                    return `<option value="${this.escapeHTML(iface.name)}" title="${this.escapeHTML(iface.name)}">${this.escapeHTML(displayName)}${this.escapeHTML(mac)}${this.escapeHTML(ip)}</option>`;
                                }).join('')}
                            </select>
                            <div class="filter-input-wrapper">
                                <input 
                                    type="text" 
                                    id="bpfFilter" 
                                    class="filter-input"
                                    list="bpfSuggestions"
                                    placeholder="BPF Filter (optional): tcp port 80"
                                    title="Enter a BPF filter or select from suggestions"
                                >
                                <datalist id="bpfSuggestions">
                                    <option value="tcp">TCP packets only</option>
                                    <option value="udp">UDP packets only</option>
                                    <option value="icmp">ICMP packets only</option>
                                    <option value="arp">ARP packets only</option>
                                    <option value="tcp port 80">HTTP (port 80)</option>
                                    <option value="tcp port 443">HTTPS (port 443)</option>
                                    <option value="tcp port 22">SSH (port 22)</option>
                                    <option value="tcp port 3389">RDP (port 3389)</option>
                                    <option value="udp port 53">DNS (port 53)</option>
                                    <option value="udp port 67 or udp port 68">DHCP</option>
                                    <option value="tcp port 21 or tcp port 20">FTP</option>
                                    <option value="tcp port 3306">MySQL (port 3306)</option>
                                    <option value="tcp port 1433">SQL Server (port 1433)</option>
                                    <option value="port 80 or port 443">HTTP or HTTPS</option>
                                    <option value="not arp">Exclude ARP</option>
                                    <option value="not broadcast and not multicast">Unicast only</option>
                                    <option value="tcp[tcpflags] & (tcp-syn) != 0">SYN packets only</option>
                                    <option value="host 192.168.1.1">Specific host</option>
                                    <option value="net 192.168.1.0/24">Subnet filter</option>
                                    <option value="src host 192.168.1.1">From specific host</option>
                                    <option value="dst host 192.168.1.1">To specific host</option>
                                    <option value="greater 1000">Packets > 1000 bytes</option>
                                    <option value="less 128">Packets < 128 bytes</option>
                                </datalist>
                                <button class="btn-filter-help" onclick="window.packetAnalyzerShowFilterHelp()" title="Filter Examples & Help">
                                    <i class="fas fa-question-circle"></i>
                                </button>
                            </div>
                            <label class="promiscuous-label">
                                <input type="checkbox" id="promiscuousMode" checked>
                                Promiscuous
                            </label>
                        </div>
                    </div>
                    <div class="packet-header-right">
                        <button class="btn btn-secondary" onclick="window.packetAnalyzerStartCapture()">
                            <i class="fas fa-play"></i> Start Capture
                        </button>
                    </div>
                </div>

                <!-- Welcome Message -->
                <div class="packet-welcome">
                    <i class="fas fa-microscope fa-3x"></i>
                    <h2>Ready to Capture</h2>
                    <p>Select a network interface above and click "Start Capture"</p>
                    <small style="margin-top: 10px; opacity: 0.7;">Note: Requires Administrator/root privileges</small>
                </div>
            </div>
        `;
    }


    renderPacketDisplay(session) {
        const filteredPackets = this.getFilteredPackets(session);
        
        return `
            <div class="packet-display-container">
                <!-- Header -->
                <div class="packet-header">
                    <div class="packet-header-left">
                        <h3><i class="fas fa-network-wired"></i> ${this.escapeHTML(session.interfaceDisplay || session.interface)}</h3>
                        <div class="packet-header-controls">
                            ${session.filter ? `
                                <span class="filter-display"><i class="fas fa-filter"></i> ${this.escapeHTML(session.filter)}</span>
                            ` : '<span class="filter-display">No filter</span>'}
                            <span class="packet-status-badge ${session.capturing ? 'capturing' : 'stopped'}">
                                <i class="fas fa-circle"></i> ${session.capturing ? 'Capturing' : 'Stopped'}
                            </span>
                        </div>
                    </div>
                    <div class="packet-header-right">
                        <button class="btn btn-sm btn-secondary" onclick="window.packetAnalyzerClearPackets()" ${session.capturing ? 'disabled' : ''} title="Clear Packets">
                            <i class="fas fa-trash"></i> Clear
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.packetAnalyzerExportPackets()" ${session.packets.length === 0 ? 'disabled' : ''} title="Export">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn btn-sm ${session.capturing ? 'btn-danger' : 'btn-success'}" onclick="window.packetAnalyzerToggleCapture()">
                            <i class="fas fa-${session.capturing ? 'stop' : 'play'}"></i> ${session.capturing ? 'Stop' : 'Resume'}
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.packetAnalyzerCloseSession()" title="Close Session">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="packet-toolbar">
                    <input 
                        type="text" 
                        id="packetSearch" 
                        class="packet-search-input"
                        placeholder="Search packets (source, destination, protocol, info)..."
                        value="${session.filterText || ''}"
                        oninput="window.packetAnalyzerFilterPackets(this.value)"
                    >
                    <div class="packet-toolbar-stats">
                        <span class="packet-stat">Packets: <strong id="packetCount">${session.packets.length}</strong></span>
                        <span class="packet-stat">Filtered: <strong id="displayedCount">${filteredPackets.length}</strong></span>
                        <label class="packet-checkbox">
                            <input type="checkbox" id="autoScrollCheck" ${session.autoScroll !== false ? 'checked' : ''} onchange="window.packetAnalyzerToggleAutoScroll(this.checked)">
                            Auto-scroll
                        </label>
                        <button class="btn-icon btn-column-config" onclick="window.packetAnalyzerShowColumnConfig()" title="Configure Columns" style="z-index: 10; position: relative;">
                            <i class="fas fa-columns"></i>
                        </button>
                    </div>
                </div>

                <!-- Packet List & Details -->
                <div class="packet-content-area">
                    <div class="packet-list-panel" id="packetListPanel" onscroll="window.packetAnalyzerHandleScroll()" onwheel="window.packetAnalyzerHandleWheel(event)">
                         <div class="packet-virtual-scroll">
                            <table class="packet-table">
                                <thead>
                                    <tr id="packetTableHeader">
                                        ${this.renderTableHeader()}
                                    </tr>
                                </thead>
                                <tbody id="packetTableBody">
                                    ${filteredPackets.length === 0 ? `
                                        <tr class="packet-empty">
                                            <td colspan="${this.availableColumns.filter(c => c.enabled).length}">
                                                <div class="packet-empty-state">
                                                    ${session.packets.length === 0 ? 
                                                        '<i class="fas fa-inbox fa-2x"></i><p>No packets captured yet</p>' :
                                                        '<i class="fas fa-filter fa-2x"></i><p>No packets match the filter</p>'
                                                    }
                                                </div>
                                            </td>
                                        </tr>
                                    ` : '<!-- Virtual scroll rows will be inserted here -->'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="packet-details-sidebar">
                        <div class="packet-details-header">
                            <h4><i class="fas fa-info-circle"></i> Packet Details</h4>
                            ${session.selectedPacketIndex !== null ? `
                                <button class="btn-icon" onclick="window.packetAnalyzerSelectPacket(null)" title="Clear Selection">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="packet-details-scroll">
                            ${session.selectedPacketIndex !== null && session.packets[session.selectedPacketIndex] ? 
                                this.renderPacketDetails(session.packets[session.selectedPacketIndex]) :
                                `<div class="no-selection">
                                    <i class="fas fa-mouse-pointer fa-2x"></i>
                                    <p>Select a packet to view details</p>
                                </div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTableHeader() {
        return this.availableColumns
            .filter(col => col.enabled)
            .map(col => `<th style="width: ${col.width}">${col.name}</th>`)
            .join('');
    }

    getColumnValue(packet, columnId, time = null) {
        const displayTime = time || (packet.timestamp ? (packet.timestamp.includes(' ') ? packet.timestamp.split(' ')[1] : packet.timestamp) : '');
        const protocol = (packet.protocol || 'UNKNOWN').toLowerCase();
        
        const values = {
            number: packet.number,
            time: displayTime,
            source: this.escapeHTML(packet.source || 'N/A'),
            srcPort: packet.srcPort || '-',
            destination: this.escapeHTML(packet.destination || 'N/A'),
            dstPort: packet.dstPort || '-',
            protocol: `<span class="protocol-badge protocol-${protocol}">${packet.protocol || 'UNKNOWN'}</span>`,
            ttl: packet.ttl || '-',
            seqNum: packet.seqNum !== undefined ? packet.seqNum : '-',
            ackNum: packet.ackNum !== undefined ? packet.ackNum : '-',
            tcpSegLen: packet.tcpSegLen !== undefined ? packet.tcpSegLen : '-',
            length: packet.length || 0,
            info: this.escapeHTML(packet.info || '')
        };
        return values[columnId] || '';
    }

    renderPacketDetails(packet) {
        let layersHtml = '';
        if (packet.layers) {
            for (const [layerName, layerData] of Object.entries(packet.layers)) {
                layersHtml += this.renderLayerDetails(layerName, layerData);
            }
        }

        return `
            <div class="packet-details-content">
                <h3>Packet #${packet.number}</h3>
                
                <div class="packet-detail-section">
                    <h4><i class="fas fa-info-circle"></i> Frame</h4>
                    <table class="packet-detail-table">
                        <tr><td>Arrival Time</td><td>${packet.timestamp}</td></tr>
                        <tr><td>Frame Length</td><td>${packet.length} bytes</td></tr>
                        <tr><td>Protocols</td><td>${packet.protocol}</td></tr>
                        <tr><td>Info</td><td>${this.escapeHTML(packet.info)}</td></tr>
                    </table>
                </div>

                ${layersHtml}

                ${packet.raw ? `
                    <div class="packet-detail-section">
                        <h4><i class="fas fa-file-code"></i> Raw Data (Hex Dump)</h4>
                        <pre class="packet-hex-dump">${packet.raw}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderLayerDetails(layerName, layerData) {
        const icons = {
            ethernet: 'fa-ethernet',
            wifi: 'fa-wifi',
            '802.11': 'fa-wifi',
            ipv4: 'fa-network-wired',
            ipv6: 'fa-network-wired',
            tcp: 'fa-exchange-alt',
            udp: 'fa-exchange-alt',
            icmp: 'fa-exclamation-triangle',
            dns: 'fa-server',
            http: 'fa-globe',
            tls: 'fa-lock',
            dhcp: 'fa-dharmachakra',
            arp: 'fa-link'
        };

        const icon = icons[layerName.toLowerCase()] || 'fa-layer-group';
        let html = `<div class="packet-layer">
            <h4><i class="fas ${icon}"></i> ${layerName.toUpperCase()}</h4>
            <table class="packet-detail-table">`;

        // Special rendering for different protocols
        switch(layerName.toLowerCase()) {
            case 'ethernet':
                html += `
                    <tr><td>Destination MAC</td><td>${layerData.destinationMAC}${layerData.destinationVendor && layerData.destinationVendor !== 'Unknown' ? ` <span class="mac-vendor">(${layerData.destinationVendor})</span>` : ''}</td></tr>
                    <tr><td class="indent">Type</td><td><span class="eth-type">${layerData.destinationType || 'Unicast'}</span></td></tr>
                    <tr><td>Source MAC</td><td>${layerData.sourceMAC}${layerData.sourceVendor && layerData.sourceVendor !== 'Unknown' ? ` <span class="mac-vendor">(${layerData.sourceVendor})</span>` : ''}</td></tr>
                    <tr><td>EtherType</td><td>${layerData.etherType} <span class="eth-hex">${layerData.etherTypeHex}</span></td></tr>
                    <tr><td>Frame Length</td><td>${layerData.frameLength} bytes</td></tr>
                `;
                
                if (layerData.vlanTagged) {
                    html += `<tr><td>VLAN</td><td><span class="vlan-tag">802.1Q Tagged</span></td></tr>`;
                }
                break;

            case 'ipv4':
                html += `
                    <tr><td>Version</td><td>${layerData.version}</td></tr>
                    <tr><td>Header Length</td><td>${layerData.ihl || layerData.headerLength / 4} (${layerData.headerLength || layerData.ihl * 4} bytes)</td></tr>
                    <tr><td>Differentiated Services</td><td>${layerData.tosHex || '0x00'}</td></tr>
                    <tr><td class="indent">DSCP</td><td>${layerData.dscp || 0}</td></tr>
                    <tr><td class="indent">ECN</td><td>${layerData.ecn || 0}</td></tr>
                    <tr><td>Total Length</td><td>${layerData.totalLength || layerData.length} bytes</td></tr>
                    <tr><td>Identification</td><td>${layerData.idHex || '0x0000'} (${layerData.identification || layerData.id})</td></tr>
                `;
                
                if (layerData.flags) {
                    const flags = layerData.flags;
                    html += `<tr><td>Flags</td><td>${layerData.flagsRaw !== undefined ? `0x${layerData.flagsRaw.toString(16)}` : ''} `;
                    if (flags.reserved) html += `<span class="ip-flag">Reserved</span> `;
                    if (flags.dontFragment) html += `<span class="ip-flag">DF</span> `;
                    if (flags.moreFragments) html += `<span class="ip-flag">MF</span>`;
                    html += `</td></tr>`;
                }
                
                html += `
                    <tr><td>Fragment Offset</td><td>${layerData.fragmentOffset !== undefined ? layerData.fragmentOffset : (layerData.fragOffset !== undefined ? layerData.fragOffset : 0)}</td></tr>
                    <tr><td>Time to Live</td><td>${layerData.ttl || 0}</td></tr>
                    <tr><td>Protocol</td><td>${layerData.protocol || 'Unknown'} (${layerData.protocolNumber !== undefined ? layerData.protocolNumber : ''})</td></tr>
                    <tr><td>Header Checksum</td><td>${layerData.checksumHex || '0x0000'}</td></tr>
                    <tr><td>Source Address</td><td>${layerData.sourceIP || 'N/A'}</td></tr>
                    <tr><td>Destination Address</td><td>${layerData.destinationIP || 'N/A'}</td></tr>
                `;
                
                if (layerData.payloadLength !== undefined) {
                    html += `<tr><td>Payload Length</td><td>${layerData.payloadLength} bytes</td></tr>`;
                }
                
                if (layerData.options && Array.isArray(layerData.options)) {
                    html += `<tr><td colspan="2"><strong>IP Options (${layerData.optionsCount})</strong></td></tr>`;
                    layerData.options.forEach((opt, i) => {
                        html += `<tr><td class="indent">Option ${i + 1}</td><td>Type: ${opt.type}, Length: ${opt.length}</td></tr>`;
                    });
                }
                break;

            case 'ipv6':
                html += `
                    <tr><td>Version</td><td>${layerData.version}</td></tr>
                    <tr><td>Traffic Class</td><td>${layerData.trafficClassHex || '0x00'}</td></tr>
                    <tr><td class="indent">DSCP</td><td>${layerData.dscp || 0}</td></tr>
                    <tr><td class="indent">ECN</td><td>${layerData.ecn || 0}</td></tr>
                    <tr><td>Flow Label</td><td>${layerData.flowLabelHex || '0x00000'}</td></tr>
                    <tr><td>Payload Length</td><td>${layerData.payloadLength || layerData.length} bytes</td></tr>
                    <tr><td>Next Header</td><td>${layerData.nextHeader} (${layerData.nextHeaderNumber || ''})</td></tr>
                    <tr><td>Hop Limit</td><td>${layerData.hopLimit}</td></tr>
                    <tr><td>Source Address</td><td>${layerData.sourceIP}</td></tr>
                    <tr><td>Destination Address</td><td>${layerData.destinationIP}</td></tr>
                `;
                if (layerData.totalLength) {
                    html += `<tr><td>Total Length</td><td>${layerData.totalLength} bytes (40 byte header + ${layerData.payloadLength} byte payload)</td></tr>`;
                }
                break;

            case 'tcp':
                html += `
                    <tr><td>Source Port</td><td>${layerData.srcPort}${layerData.application && layerData.application !== 'Unknown' ? ` <span class="port-app">(${layerData.application})</span>` : ''}</td></tr>
                    <tr><td>Destination Port</td><td>${layerData.dstPort}${layerData.application && layerData.application !== 'Unknown' ? ` <span class="port-app">(${layerData.application})</span>` : ''}</td></tr>
                `;
                
                if (layerData.connectionState) {
                    html += `<tr><td>Connection State</td><td><span class="tcp-state">${layerData.connectionState}</span></td></tr>`;
                }
                
                html += `
                    <tr><td>Sequence Number</td><td>${layerData.sequenceNumber !== undefined ? layerData.sequenceNumber : (layerData.seq !== undefined ? layerData.seq : 0)}</td></tr>
                `;
                
                if (layerData.nextSequenceNumber !== undefined) {
                    html += `<tr><td class="indent">Next Sequence</td><td>${layerData.nextSequenceNumber}</td></tr>`;
                }
                
                html += `
                    <tr><td>Acknowledgment Number</td><td>${layerData.ackNumber !== undefined ? layerData.ackNumber : (layerData.ack !== undefined ? layerData.ack : 0)}</td></tr>
                    <tr><td>Header Length</td><td>${layerData.headerLength || (layerData.dataOffset * 4)} bytes (${layerData.dataOffset} words)</td></tr>
                    <tr><td>Flags</td><td><span class="tcp-flags">${layerData.flags}</span></td></tr>
                `;
                
                if (layerData.flagsDetailed) {
                    html += `<tr><td class="indent">Detailed Flags</td><td>`;
                    for (const [flag, value] of Object.entries(layerData.flagsDetailed)) {
                        if (value) {
                            html += `<span class="tcp-flag-detail">${flag}</span> `;
                        }
                    }
                    html += `</td></tr>`;
                }
                
                // Find window scale option to calculate scaled window
                let windowScale = null;
                let windowMultiplier = 1;
                if (layerData.options && layerData.options.length > 0) {
                    const scaleOption = layerData.options.find(opt => opt.kind && opt.kind.includes('WindowScale'));
                    if (scaleOption && scaleOption.shift !== undefined) {
                        windowScale = scaleOption.shift;
                        windowMultiplier = scaleOption.multiplier || (1 << windowScale);
                    }
                }
                
                const rawWindow = layerData.windowSize || layerData.window || 0;
                const scaledWindow = rawWindow * windowMultiplier;
                
                html += `
                    <tr><td>Window Size</td><td>${rawWindow} bytes`;
                
                if (windowScale !== null) {
                    html += ` <span class="window-scaled">(scaled: ${scaledWindow.toLocaleString()} bytes)</span>`;
                }
                
                html += `</td></tr>`;
                
                if (windowScale !== null) {
                    html += `<tr><td class="indent">Window Scale</td><td>Shift: ${windowScale}, Multiplier: ${windowMultiplier.toLocaleString()}</td></tr>`;
                }
                
                html += `
                    <tr><td>Checksum</td><td>0x${layerData.checksum ? layerData.checksum.toString(16).padStart(4, '0') : '0000'}</td></tr>
                    <tr><td>Urgent Pointer</td><td>${layerData.urgentPointer !== undefined ? layerData.urgentPointer : (layerData.urgent !== undefined ? layerData.urgent : 0)}</td></tr>
                `;
                
                if (layerData.segmentLength !== undefined) {
                    html += `<tr><td>Segment Length</td><td>${layerData.segmentLength} bytes</td></tr>`;
                }
                
                html += `<tr><td>Payload Length</td><td>${layerData.payloadLength} bytes</td></tr>`;
                
                if (layerData.options && layerData.options.length > 0) {
                    html += `<tr><td colspan="2"><strong>TCP Options (${layerData.optionsCount || layerData.options.length})</strong></td></tr>`;
                    layerData.options.forEach((opt, i) => {
                        let optDetails = `<span class="tcp-option">${opt.kind || opt.type}</span>`;
                        
                        // Show detailed values for specific options
                        if (opt.mss !== undefined) {
                            optDetails += ` <span class="tcp-opt-value">MSS: ${opt.mss} bytes</span>`;
                        } else if (opt.shift !== undefined) {
                            optDetails += ` <span class="tcp-opt-value">Shift: ${opt.shift}, Multiplier: ${opt.multiplier || (1 << opt.shift)}</span>`;
                        } else if (opt.tsval !== undefined) {
                            optDetails += ` <span class="tcp-opt-value">TSval: ${opt.tsval}, TSecr: ${opt.tsecr || 0}</span>`;
                        } else if (opt.value) {
                            optDetails += ` ${opt.value}`;
                        }
                        
                        html += `<tr><td class="indent">Option ${i + 1}</td><td>${optDetails}</td></tr>`;
                    });
                }
                break;

            case 'udp':
                html += `
                    <tr><td>Source Port</td><td>${layerData.sourcePort || layerData.srcPort}${layerData.application && layerData.application !== 'Unknown' ? ` <span class="port-app">(${layerData.application})</span>` : ''}</td></tr>
                    <tr><td>Destination Port</td><td>${layerData.destinationPort || layerData.dstPort}${layerData.application && layerData.application !== 'Unknown' ? ` <span class="port-app">(${layerData.application})</span>` : ''}</td></tr>
                    <tr><td>Length</td><td>${layerData.length} bytes</td></tr>
                    <tr><td>Checksum</td><td>${layerData.checksumHex || '0x0000'}</td></tr>
                `;
                if (layerData.dataLength !== undefined) {
                    html += `<tr><td>Data Length</td><td>${layerData.dataLength} bytes (${layerData.length} - ${layerData.headerLength} header)</td></tr>`;
                }
                if (layerData.stream) {
                    html += `<tr><td>Stream</td><td>${layerData.stream.srcPort} → ${layerData.stream.dstPort}</td></tr>`;
                }
                break;

            case 'dns':
                // Show URLs prominently at the top if available
                if (layerData.urls && layerData.urls.length > 0) {
                    html += `<tr><td colspan="2" style="background: rgba(59, 130, 246, 0.1); padding: 8px;">
                        <strong><i class="fas fa-link"></i> URLs:</strong><br>`;
                    layerData.urls.forEach(url => {
                        html += `<a href="${url}" target="_blank" class="dns-url">${this.escapeHTML(url)}</a><br>`;
                    });
                    html += `</td></tr>`;
                }
                
                html += `
                    <tr><td>Transaction ID</td><td>${layerData.idHex || '0x0000'}</td></tr>
                    <tr><td>Flags</td><td>${layerData.flags || '0x0000'}</td></tr>
                    <tr><td class="indent">Response</td><td>${layerData.queryResponse ? 'Message is a response' : 'Message is a query'}</td></tr>
                    <tr><td class="indent">Opcode</td><td>${layerData.opcodeName || 'Standard Query'} (${layerData.opcode})</td></tr>
                    <tr><td class="indent">Authoritative</td><td>${layerData.authoritativeAnswer ? 'Yes' : 'No'}</td></tr>
                    <tr><td class="indent">Truncated</td><td>${layerData.truncated ? 'Yes' : 'No'}</td></tr>
                    <tr><td class="indent">Recursion Desired</td><td>${layerData.recursionDesired ? 'Yes' : 'No'}</td></tr>
                    <tr><td class="indent">Recursion Available</td><td>${layerData.recursionAvailable ? 'Yes' : 'No'}</td></tr>
                    <tr><td class="indent">Authenticated Data</td><td>${layerData.authenticatedData ? 'Yes' : 'No'}</td></tr>
                    <tr><td class="indent">Checking Disabled</td><td>${layerData.checkingDisabled ? 'Yes' : 'No'}</td></tr>
                    <tr><td>Response Code</td><td>${layerData.rcodeName || 'No Error'} (${layerData.responseCode || layerData.rcode})</td></tr>
                    <tr><td>Questions</td><td>${layerData.questionCount || 0}</td></tr>
                    <tr><td>Answer RRs</td><td>${layerData.answerCount || 0}</td></tr>
                    <tr><td>Authority RRs</td><td>${layerData.authorityCount || 0}</td></tr>
                    <tr><td>Additional RRs</td><td>${layerData.additionalCount || 0}</td></tr>
                `;
                
                if (layerData.questions && layerData.questions.length > 0) {
                    html += `<tr><td colspan="2"><strong>Queries</strong></td></tr>`;
                    layerData.questions.forEach((q, i) => {
                        html += `<tr><td class="indent">${q.name}</td><td>Type: ${q.type}, Class: ${q.class}</td></tr>`;
                    });
                }
                
                if (layerData.answers && layerData.answers.length > 0) {
                    html += `<tr><td colspan="2"><strong>Answers</strong></td></tr>`;
                    layerData.answers.forEach((a, i) => {
                        html += `<tr><td class="indent">${a.name}</td><td>${a.ip || a.type} (TTL: ${a.ttl}s, Class: ${a.class})</td></tr>`;
                    });
                }
                break;

            case 'http':
                html += `
                    <tr><td>Type</td><td>${layerData.type === 'request' ? 'Request' : 'Response'}</td></tr>
                `;
                
                if (layerData.method) {
                    html += `<tr><td>Method</td><td><span class="http-method">${layerData.method}</span></td></tr>`;
                }
                if (layerData.uri) {
                    html += `<tr><td>URI</td><td>${this.escapeHTML(layerData.uri)}</td></tr>`;
                }
                if (layerData.version) {
                    html += `<tr><td>Version</td><td>${layerData.version}</td></tr>`;
                }
                if (layerData.status) {
                    html += `<tr><td>Status</td><td><span class="http-status">${layerData.status}</span></td></tr>`;
                }
                
                if (layerData.headers && Object.keys(layerData.headers).length > 0) {
                    html += `<tr><td colspan="2"><strong>Headers</strong></td></tr>`;
                    for (const [key, value] of Object.entries(layerData.headers)) {
                        html += `<tr><td class="indent">${this.escapeHTML(key)}</td><td>${this.escapeHTML(value)}</td></tr>`;
                    }
                }
                break;

            case 'tls':
                // Show URL prominently at the top if SNI is available
                if (layerData.url) {
                    html += `<tr><td colspan="2" style="background: rgba(167, 139, 250, 0.1); padding: 8px;">
                        <strong><i class="fas fa-lock"></i> Server Name (SNI):</strong><br>
                        <a href="${layerData.url}" target="_blank" class="tls-url">${this.escapeHTML(layerData.url)}</a>
                    </td></tr>`;
                }
                
                html += `
                    <tr><td>Version</td><td><span class="tls-version">${layerData.version}</span></td></tr>
                    <tr><td>Content Type</td><td>${layerData.contentType}</td></tr>
                    <tr><td>Length</td><td>${layerData.length} bytes</td></tr>
                `;
                if (layerData.handshakeType) {
                    html += `<tr><td>Handshake Type</td><td><span class="tls-handshake">${layerData.handshakeType}</span></td></tr>`;
                }
                if (layerData.serverName) {
                    html += `<tr><td>Server Name</td><td><span class="tls-servername">${this.escapeHTML(layerData.serverName)}</span></td></tr>`;
                }
                break;

            case 'dhcp':
                html += `
                    <tr><td>Message Type</td><td><span class="dhcp-type">${layerData.messageType || 'N/A'}</span></td></tr>
                    <tr><td>Operation</td><td>${layerData.operation}</td></tr>
                    <tr><td>Hardware Type</td><td>${layerData.hardwareType}</td></tr>
                    <tr><td>Transaction ID</td><td>0x${layerData.transactionID ? layerData.transactionID.toString(16).padStart(8, '0') : '00000000'}</td></tr>
                    <tr><td>Client IP Address</td><td>${layerData.clientIP}</td></tr>
                    <tr><td>Your (Client) IP Address</td><td>${layerData.yourIP}</td></tr>
                    <tr><td>Next Server IP Address</td><td>${layerData.serverIP}</td></tr>
                    <tr><td>Client MAC Address</td><td>${layerData.clientMAC}</td></tr>
                `;
                
                if (layerData.options && Object.keys(layerData.options).length > 0) {
                    html += `<tr><td colspan="2"><strong>DHCP Options</strong></td></tr>`;
                    for (const [key, value] of Object.entries(layerData.options)) {
                        html += `<tr><td class="indent">${this.formatFieldName(key)}</td><td>${value}</td></tr>`;
                    }
                }
                break;

            case 'quic':
                html += `
                    <tr><td>Header Type</td><td><span class="quic-header">${layerData.headerType}</span></td></tr>
                    <tr><td>Packet Type</td><td><span class="quic-type">${layerData.packetType}</span></td></tr>
                `;
                
                if (layerData.version !== undefined) {
                    html += `<tr><td>Version</td><td>${layerData.version} <span class="eth-hex">${layerData.versionHex}</span></td></tr>`;
                }
                
                if (layerData.destinationConnectionID) {
                    html += `
                        <tr><td>Destination Connection ID</td><td><code class="conn-id">${layerData.destinationConnectionID}</code></td></tr>
                        <tr><td class="indent">Length</td><td>${layerData.destinationConnectionIDLength} bytes</td></tr>
                    `;
                }
                
                if (layerData.sourceConnectionID) {
                    html += `
                        <tr><td>Source Connection ID</td><td><code class="conn-id">${layerData.sourceConnectionID}</code></td></tr>
                        <tr><td class="indent">Length</td><td>${layerData.sourceConnectionIDLength} bytes</td></tr>
                    `;
                }
                
                if (layerData.keyPhase !== undefined) {
                    html += `<tr><td>Key Phase</td><td>${layerData.keyPhase ? 'Phase 1' : 'Phase 0'}</td></tr>`;
                }
                
                html += `<tr><td>Payload Length</td><td>${layerData.payloadLength} bytes</td></tr>`;
                break;

            case 'wifi':
            case '802.11':
                html += `
                    <tr><td>Frame Type</td><td><span class="wifi-type">${layerData.frameType || layerData.type}</span></td></tr>
                `;
                
                if (layerData.subtype) {
                    html += `<tr><td>Subtype</td><td>${layerData.subtype}</td></tr>`;
                }
                
                html += `
                    <tr><td>Flags</td><td>${layerData.flags}</td></tr>
                    <tr><td>Duration/ID</td><td>${layerData.durationID}</td></tr>
                `;
                
                if (layerData.address1) {
                    html += `<tr><td>Address 1 (Receiver)</td><td>${layerData.address1}</td></tr>`;
                }
                if (layerData.address2) {
                    html += `<tr><td>Address 2 (Transmitter)</td><td>${layerData.address2}</td></tr>`;
                }
                if (layerData.address3) {
                    html += `<tr><td>Address 3 (BSSID/Filter)</td><td>${layerData.address3}</td></tr>`;
                }
                if (layerData.address4) {
                    html += `<tr><td>Address 4 (WDS)</td><td>${layerData.address4}</td></tr>`;
                }
                
                html += `
                    <tr><td>Fragment Number</td><td>${layerData.fragmentNumber}</td></tr>
                    <tr><td>Sequence Number</td><td>${layerData.sequenceNumber}</td></tr>
                `;
                break;

            case 'arp':
                html += `
                    <tr><td>Hardware Type</td><td>${layerData.hardwareTypeName || 'Unknown'} ${layerData.hardwareTypeHex ? `(${layerData.hardwareTypeHex})` : ''}</td></tr>
                    <tr><td>Protocol Type</td><td>${layerData.protocolTypeName || 'Unknown'} ${layerData.protocolTypeHex ? `(${layerData.protocolTypeHex})` : ''}</td></tr>
                    <tr><td>Hardware Size</td><td>${layerData.hardwareSize} bytes</td></tr>
                    <tr><td>Protocol Size</td><td>${layerData.protocolSize} bytes</td></tr>
                    <tr><td>Opcode</td><td><span class="arp-op">${layerData.operationName || (layerData.operation === 1 ? 'Request' : 'Reply')}</span> (${layerData.operation})</td></tr>
                    <tr><td>Sender MAC Address</td><td>${layerData.senderMACAddress || layerData.srcMAC}</td></tr>
                    <tr><td>Sender IP Address</td><td>${layerData.senderIP || layerData.srcIP}</td></tr>
                    <tr><td>Target MAC Address</td><td>${layerData.targetMACAddress || layerData.dstMAC}</td></tr>
                    <tr><td>Target IP Address</td><td>${layerData.targetIP || layerData.dstIP}</td></tr>
                `;
                break;

            case 'icmp':
                html += `
                    <tr><td>Type</td><td>${layerData.type}${layerData.typeName ? ` <span class="icmp-type">(${layerData.typeName})</span>` : ''}</td></tr>
                    <tr><td>Code</td><td>${layerData.code}</td></tr>
                    <tr><td>Checksum</td><td>${layerData.checksumHex || '0x0000'}</td></tr>
                    <tr><td>Identifier (BE)</td><td>${layerData.identifier || layerData.id} ${layerData.idHex ? `(${layerData.idHex})` : ''}</td></tr>
                    <tr><td>Sequence Number (BE)</td><td>${layerData.sequence || layerData.seq} ${layerData.seqHex ? `(${layerData.seqHex})` : ''}</td></tr>
                `;
                if (layerData.dataLength) {
                    html += `<tr><td>Data Length</td><td>${layerData.dataLength} bytes</td></tr>`;
                }
                if (layerData.dataPreview) {
                    html += `<tr><td>Data (first 32 bytes)</td><td><code class="conn-id">${layerData.dataPreview}</code></td></tr>`;
                }
                break;

            default:
                // Generic rendering for unknown protocols
                for (const [key, value] of Object.entries(layerData)) {
                    html += `<tr><td>${this.formatFieldName(key)}</td><td>${JSON.stringify(value)}</td></tr>`;
                }
        }

        html += `</table></div>`;
        return html;
    }

    formatFieldName(name) {
        // Convert camelCase to Title Case
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    updatePacketDetails(session) {
        const detailsScroll = document.querySelector('.packet-details-scroll');
        if (!detailsScroll) return;
        
        if (session.selectedPacketIndex !== null && session.packets[session.selectedPacketIndex]) {
            detailsScroll.innerHTML = this.renderPacketDetails(session.packets[session.selectedPacketIndex]);
        } else {
            detailsScroll.innerHTML = `
                <div class="no-selection">
                    <i class="fas fa-mouse-pointer fa-2x"></i>
                    <p>Select a packet to view details</p>
                </div>
            `;
        }
        
        // Update clear selection button visibility
        const detailsHeader = document.querySelector('.packet-details-header');
        if (detailsHeader) {
            const existingBtn = detailsHeader.querySelector('.btn-icon');
            if (session.selectedPacketIndex !== null && !existingBtn) {
                detailsHeader.innerHTML = `
                    <h4><i class="fas fa-info-circle"></i> Packet Details</h4>
                    <button class="btn-icon" onclick="window.packetAnalyzerSelectPacket(null)" title="Clear Selection">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            } else if (session.selectedPacketIndex === null && existingBtn) {
                detailsHeader.innerHTML = `<h4><i class="fas fa-info-circle"></i> Packet Details</h4>`;
            }
        }
    }

    async mount() {
        window.packetAnalyzerInstance = this;
        this.attachGlobalHandlers();
        await this.loadInterfaces();
        
        // Initialize virtual scroll after render
        setTimeout(() => {
            const session = this.sessions[0];
            if (session) {
                this.renderVirtualRows(session);
            }
        }, 100);
    }

    async loadInterfaces() {
        try {
            console.log('Loading network interfaces...');
            const response = await fetch('/api/packet-analyzer/interfaces');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Interfaces response:', data);

            if (data.success && data.interfaces && data.interfaces.length > 0) {
                this.interfaces = data.interfaces;
                console.log(`Loaded ${data.interfaces.length} network interfaces:`, this.interfaces);
                
                // Update the dropdown if it exists
                const interfaceSelect = document.getElementById('interfaceSelect');
                if (interfaceSelect) {
                    console.log('Updating interface dropdown...');
                    // Clear existing options except the first one
                    interfaceSelect.innerHTML = '<option value="">Select Network Interface...</option>';
                    
                    // Add interface options
                    this.interfaces.forEach(iface => {
                        const option = document.createElement('option');
                        option.value = iface.name;
                        option.title = iface.name; // Full name in tooltip
                        // Prioritize description (actual adapter name) over friendlyName
                        const displayName = iface.description || iface.friendlyName || iface.name;
                        const mac = iface.macAddress ? ` [${iface.macAddress}]` : '';
                        // Filter for IPv4 addresses only (not IPv6)
                        const ipv4 = iface.addresses && iface.addresses.find(addr => addr.includes('.') && !addr.includes(':'));
                        const ip = ipv4 ? ` - ${ipv4}` : '';
                        option.textContent = `${displayName}${mac}${ip}`;
                        interfaceSelect.appendChild(option);
                    });
                    console.log('Dropdown updated successfully');
                }
            } else {
                console.warn('No network interfaces found in response');
                this.showNotification('No network interfaces found. Make sure to run with administrator privileges.', 'warning');
            }
        } catch (error) {
            console.error('Error loading interfaces:', error);
            this.showNotification(`Error loading interfaces: ${error.message}. Ensure the backend is running and you have admin privileges.`, 'error');
        }
    }

    attachGlobalHandlers() {
        window.packetAnalyzerStartCapture = async () => {
            const interfaceSelect = document.getElementById('interfaceSelect');
            const filterInput = document.getElementById('bpfFilter');
            const promiscuousCheck = document.getElementById('promiscuousMode');

            if (!interfaceSelect || !interfaceSelect.value) {
                this.showNotification('Please select a network interface', 'warning');
                return;
            }

            try {
                const response = await fetch('/api/packet-analyzer/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        interface: interfaceSelect.value,
                        filter: filterInput.value,
                        promisc: promiscuousCheck.checked
                    })
                });

                const data = await response.json();
                console.log('Start capture response:', data);

                if (data.success) {
                    // Get the friendly name from the selected option
                    const selectedOption = interfaceSelect.options[interfaceSelect.selectedIndex];
                    const interfaceDisplayName = selectedOption ? selectedOption.textContent : interfaceSelect.value;
                    
                    const session = {
                        id: data.sessionId,
                        interface: interfaceSelect.value, // Device name for API calls
                        interfaceDisplay: interfaceDisplayName, // Friendly name for display
                        filter: filterInput.value,
                        capturing: true,
                        packets: [],
                        filteredPackets: [],
                        selectedPacketIndex: null,
                        filterText: '',
                        autoScroll: true,
                        ws: null
                    };

                    console.log('Created session:', session);
                    this.sessions = [session]; // Single session only
                    console.log('Sessions array after assignment:', this.sessions);
                    
                    // Render the table FIRST, then connect WebSocket
                    console.log('About to rerender with session');
                    await this.rerender();
                    console.log('Rerender complete');
                    
                    // Wait for DOM to actually update
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Verify table exists
                    const tbody = document.getElementById('packetTableBody');
                    console.log('Table body exists after rerender:', !!tbody);
                    
                    // Now connect WebSocket so packets can be added to the already-rendered table
                    this.connectWebSocket(session);
                    
                    this.showNotification('Packet capture started', 'success');
                } else {
                    console.error('Capture failed:', data.error || data.message);
                    this.showNotification('Failed to start capture: ' + (data.error || data.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('Error starting capture:', error);
                this.showNotification('Error starting capture', 'error');
            }
        };

        window.packetAnalyzerCloseSession = async () => {
            const session = this.sessions[0];
            if (session) {
                await this.stopCapture(session);
                this.sessions = [];
                await this.rerender();
            }
        };

        window.packetAnalyzerFilterPackets = (filterText) => {
            const session = this.sessions[0];
            if (session) {
                session.filterText = filterText;
                this.renderVirtualRows(session);
                this.updatePacketStats(session);
            }
        };

        window.packetAnalyzerSelectPacket = async (index) => {
            const session = this.sessions[0];
            if (session) {
                // Update selected index
                session.selectedPacketIndex = index;
                
                // Update row selection styling
                const allRows = document.querySelectorAll('.packet-row');
                allRows.forEach(row => row.classList.remove('selected'));
                
                if (index !== null) {
                    const selectedRow = document.querySelector(`.packet-row[data-packet-index="${index}"]`);
                    if (selectedRow) {
                        selectedRow.classList.add('selected');
                        selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
                
                // Update packet details sidebar only
                this.updatePacketDetails(session);
            }
        };

        window.packetAnalyzerToggleAutoScroll = (checked) => {
            const session = this.sessions[0];
            if (session) {
                session.autoScroll = checked;
            }
        };

        window.packetAnalyzerHandleScroll = () => {
            const session = this.sessions[0];
            if (!session) return;

            const panel = document.getElementById('packetListPanel');
            if (!panel) return;

            const scrollTop = panel.scrollTop;
            const clientHeight = panel.clientHeight;
            const scrollHeight = panel.scrollHeight;

            // Check if user is at bottom
            this.isAtBottom = (scrollHeight - scrollTop - clientHeight) < 50;

            // Use requestAnimationFrame for smooth rendering during fast scrolling
            if (this.scrollRafPending) {
                return; // Already scheduled
            }
            
            this.scrollRafPending = true;
            requestAnimationFrame(() => {
                this.renderVirtualRows(session, false);
                this.scrollRafPending = false;
            });
        };
        
        // Handle wheel events for immediate rendering during fast scroll
        window.packetAnalyzerHandleWheel = (e) => {
            const session = this.sessions[0];
            if (!session) return;
            
            const panel = document.getElementById('packetListPanel');
            if (!panel) return;
            
            // Render immediately on wheel scroll for better responsiveness
            this.renderVirtualRows(session, true);
        };

        window.packetAnalyzerClearPackets = async () => {
            const session = this.sessions[0];
            if (session && !session.capturing) {
                session.packets = [];
                session.selectedPacketIndex = null;
                
                // Clear the packet table
                const tbody = document.getElementById('packetTableBody');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr class="packet-empty">
                            <td colspan="7">
                                <div class="packet-empty-state">
                                    <i class="fas fa-inbox fa-2x"></i>
                                    <p>No packets captured yet</p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
                
                // Update stats
                this.updatePacketStats(session);
                
                // Clear packet details
                this.updatePacketDetails(session);
                
                this.showNotification('Packets cleared', 'info');
            }
        };

        window.packetAnalyzerExportPackets = () => {
            const session = this.sessions[0];
            if (session && session.packets.length > 0) {
                try {
                    const dataStr = JSON.stringify(session.packets, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    // Extract just the adapter name from interfaceDisplay (before MAC address)
                    const adapterName = session.interfaceDisplay ? 
                        session.interfaceDisplay.split('[')[0].trim().replace(/[^a-zA-Z0-9-_]/g, '_') : 
                        'session';
                    link.download = `packet-capture-${adapterName}-${timestamp}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    this.showNotification(`Exported ${session.packets.length} packets successfully`, 'success');
                } catch (error) {
                    console.error('Export error:', error);
                    this.showNotification('Error exporting packets: ' + error.message, 'error');
                }
            } else {
                this.showNotification('No packets to export', 'info');
            }
        };

        window.packetAnalyzerShowColumnConfig = () => {
            this.showColumnConfigModal();
        };

        window.packetAnalyzerShowFilterHelp = () => {
            this.showFilterHelpModal();
        };

        window.packetAnalyzerApplyFilter = (filter) => {
            const filterInput = document.getElementById('bpfFilter');
            if (filterInput) {
                filterInput.value = filter;
                filterInput.focus();
            }
            // Close modal
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
            }
        };

        window.packetAnalyzerToggleColumn = (columnId, enabled) => {
            const col = this.availableColumns.find(c => c.id === columnId);
            if (col) {
                col.enabled = enabled;
                // Save to localStorage
                localStorage.setItem('packetAnalyzerColumns', JSON.stringify(
                    this.availableColumns.map(c => ({ id: c.id, enabled: c.enabled }))
                ));
                // Update table
                const session = this.sessions[0];
                if (session) {
                    this.updateTableColumns(session);
                }
            }
        };

        window.packetAnalyzerResetColumns = () => {
            // Reset to defaults
            this.availableColumns = [
                { id: 'number', name: '#', enabled: true, width: '60px' },
                { id: 'time', name: 'Time', enabled: true, width: '140px' },
                { id: 'source', name: 'Source', enabled: true, width: '150px' },
                { id: 'srcPort', name: 'Src Port', enabled: false, width: '90px' },
                { id: 'destination', name: 'Destination', enabled: true, width: '150px' },
                { id: 'dstPort', name: 'Dst Port', enabled: false, width: '90px' },
                { id: 'protocol', name: 'Protocol', enabled: true, width: '100px' },
                { id: 'ttl', name: 'TTL', enabled: false, width: '60px' },
                { id: 'seqNum', name: 'Seq #', enabled: false, width: '110px' },
                { id: 'ackNum', name: 'Ack #', enabled: false, width: '110px' },
                { id: 'tcpSegLen', name: 'TCP Seg Len', enabled: false, width: '100px' },
                { id: 'length', name: 'Length', enabled: true, width: '80px' },
                { id: 'info', name: 'Info', enabled: true, width: 'auto' }
            ];
            localStorage.removeItem('packetAnalyzerColumns');
            
            // Update checkboxes
            this.availableColumns.forEach(col => {
                const checkbox = document.getElementById(`col_${col.id}`);
                if (checkbox) {
                    checkbox.checked = col.enabled;
                }
            });
            
            // Update table
            const session = this.sessions[0];
            if (session) {
                this.updateTableColumns(session);
            }
        };

        window.packetAnalyzerToggleCapture = async () => {
            const session = this.sessions[0];
            if (session) {
                if (session.capturing) {
                    console.log('Stopping capture...');
                    await this.stopCapture(session);
                    session.capturing = false;
                    
                    // Update UI
                    const statusBadge = document.querySelector('.packet-status-badge');
                    if (statusBadge) {
                        statusBadge.className = 'packet-status-badge stopped';
                        statusBadge.innerHTML = '<i class="fas fa-circle"></i> Stopped';
                    }
                    
                    const toggleBtn = document.querySelector('[onclick*="packetAnalyzerToggleCapture"]');
                    if (toggleBtn) {
                        toggleBtn.className = 'btn btn-sm btn-success';
                        toggleBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
                    }
                    
                    // Enable Clear and Export buttons
                    const clearBtn = document.querySelector('[onclick*="packetAnalyzerClearPackets"]');
                    if (clearBtn) {
                        clearBtn.disabled = false;
                    }
                    
                    const exportBtn = document.querySelector('[onclick*="packetAnalyzerExportPackets"]');
                    if (exportBtn && session.packets.length > 0) {
                        exportBtn.disabled = false;
                    }
                    
                    this.showNotification('Capture stopped', 'info');
                } else {
                    // Resume capture with same settings
                    console.log('Resuming capture...');
                    await this.resumeCapture(session);
                }
            }
        };
    }

    connectWebSocket(session) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/packet-analyzer/ws?sessionId=${session.id}`;

        session.ws = new WebSocket(wsUrl);

        session.ws.onopen = () => {
            console.log('Packet capture WebSocket connected');
        };

        session.ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle batched packets (array) or single packet (object)
                const packets = Array.isArray(data) ? data : [data];
                
                for (const packet of packets) {
                    if (packet.protocol === 'ERROR') {
                        this.showNotification(packet.info, 'error');
                        await this.stopCapture(session);
                        return;
                    }
                    
                    session.packets.push(packet);
                    
                    // Maintain max packet limit
                    if (session.packets.length > this.maxPackets) {
                        session.packets.shift();
                    }
                }
                
                // Update display once for the entire batch
                if (packets.length > 0) {
                    // For large batches, trigger virtual scroll update
                    if (packets.length > 10) {
                        this.addPacketToTable(null, session); // Trigger batch update
                    } else {
                        // For small batches, add individually
                        packets.forEach(packet => {
                            if (packet.protocol !== 'ERROR') {
                                this.addPacketToTable(packet, session);
                            }
                        });
                    }
                    this.updatePacketStats(session);
                }
            } catch (error) {
                console.error('Error parsing packet:', error);
            }
        };

        session.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showNotification('WebSocket connection error', 'error');
        };

        session.ws.onclose = () => {
            console.log('Packet capture WebSocket closed');
            if (session.capturing) {
                session.capturing = false;
                this.rerender();
            }
        };
    }

    async stopCapture(session) {
        if (!session.id) {
            // Even without session ID, close WebSocket if it exists
            if (session.ws) {
                try {
                    session.ws.close(1000, 'Stopping capture');
                } catch (e) {
                    // Ignore errors
                }
                session.ws = null;
            }
            session.capturing = false;
            return;
        }

        // Close WebSocket immediately (don't wait for backend response)
        if (session.ws) {
            try {
                session.ws.close(1000, 'Stopping capture');
            } catch (e) {
                // Ignore errors
            }
            session.ws = null;
        }

        try {
            await fetch('/api/packet-analyzer/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: session.id })
            });

            session.capturing = false;
            console.log('Packet capture stopped');
        } catch (error) {
            console.error('Error stopping capture:', error);
            // Still mark as not capturing even if backend call failed
            session.capturing = false;
        }
    }

    async resumeCapture(session) {
        try {
            console.log('Resuming capture on interface:', session.interface);
            
            // Start a new capture session with the same settings
            const response = await fetch('/api/packet-analyzer/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interface: session.interface,
                    filter: session.filter || '',
                    promiscuous: session.promiscuous !== false
                })
            });

            const data = await response.json();
            console.log('Resume capture response:', data);

            if (data.success && data.sessionId) {
                // Update session with new ID
                session.id = data.sessionId;
                session.capturing = true;
                
                // Reconnect WebSocket
                this.connectWebSocket(session);
                
                // Update UI
                const statusBadge = document.querySelector('.packet-status-badge');
                if (statusBadge) {
                    statusBadge.className = 'packet-status-badge capturing';
                    statusBadge.innerHTML = '<i class="fas fa-circle"></i> Capturing';
                }
                
                const toggleBtn = document.querySelector('[onclick*="packetAnalyzerToggleCapture"]');
                if (toggleBtn) {
                    toggleBtn.className = 'btn btn-sm btn-danger';
                    toggleBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
                }
                
                // Disable Clear button while capturing
                const clearBtn = document.querySelector('[onclick*="packetAnalyzerClearPackets"]');
                if (clearBtn) {
                    clearBtn.disabled = true;
                }
                
                this.showNotification('Capture resumed', 'success');
            } else {
                console.error('Resume failed:', data.error || data.message);
                this.showNotification(data.error || data.message || 'Failed to resume capture', 'error');
            }
        } catch (error) {
            console.error('Error resuming capture:', error);
            this.showNotification('Error resuming capture: ' + error.message, 'error');
        }
    }

    getFilteredPackets(session) {
        if (!session.filterText) {
            return session.packets;
        }

        const searchText = session.filterText.toLowerCase();
        return session.packets.filter(packet => {
            return (packet.source && packet.source.toLowerCase().includes(searchText)) ||
                   (packet.destination && packet.destination.toLowerCase().includes(searchText)) ||
                   packet.protocol.toLowerCase().includes(searchText) ||
                   packet.info.toLowerCase().includes(searchText);
        });
    }

    async rerender() {
        const content = document.getElementById('page-content');
        console.log('Rerender - page-content element:', !!content);
        if (content) {
            const html = await this.render();
            console.log('Rerender - HTML length:', html.length);
            content.innerHTML = html;
            console.log('Rerender - innerHTML set');
            
            // Force a synchronous reflow to ensure DOM is updated
            void content.offsetHeight;
            
            // Check if table body exists now
            const tbody = document.getElementById('packetTableBody');
            console.log('Rerender - packetTableBody exists after innerHTML:', !!tbody);
            
            // Re-load interfaces into dropdown if needed
            const interfaceSelect = document.getElementById('interfaceSelect');
            if (interfaceSelect && this.interfaces.length > 0) {
                // Check if dropdown is still showing "Loading..."
                if (interfaceSelect.options.length <= 1) {
                    interfaceSelect.innerHTML = '<option value="">Select Network Interface...</option>';
                    this.interfaces.forEach(iface => {
                        const option = document.createElement('option');
                        option.value = iface.name;
                        option.title = iface.name; // Full name in tooltip
                        // Prioritize description (actual adapter name) over friendlyName
                        const displayName = iface.description || iface.friendlyName || iface.name;
                        const mac = iface.macAddress ? ` [${iface.macAddress}]` : '';
                        // Filter for IPv4 addresses only (not IPv6)
                        const ipv4 = iface.addresses && iface.addresses.find(addr => addr.includes('.') && !addr.includes(':'));
                        const ip = ipv4 ? ` - ${ipv4}` : '';
                        option.textContent = `${displayName}${mac}${ip}`;
                        interfaceSelect.appendChild(option);
                    });
                }
            }
        }
    }

    getTrafficType(packet) {
        const protocol = (packet.protocol || '').toLowerCase();
        const info = (packet.info || '').toLowerCase();
        
        // Check for malformed/invalid packets first
        if (packet.protocol === 'ERROR' || 
            (packet.layers && (packet.layers.ethernet?.checksumError || packet.layers.ip?.checksumError || packet.layers.tcp?.checksumError || packet.layers.udp?.checksumError)) ||
            (packet.layers && (packet.layers.dns?.truncated || packet.layers.udp?.truncated))) {
            return 'malformed';
        }
        
        // TLS/SSL traffic (usually over TCP, port 443)
        if (protocol === 'tls' || 
            protocol === 'ssl' ||
            (packet.layers && packet.layers.tls) ||
            (packet.srcPort === 443 || packet.dstPort === 443) ||
            info.includes('tls') || info.includes('ssl') || info.includes('handshake')) {
            // Check for TCP problems first if it's also TCP
            if (protocol === 'tcp' && (info.includes('retransmission') || 
                info.includes('duplicate ack') || 
                info.includes('out-of-order') ||
                info.includes('fast retransmission') ||
                info.includes('spurious retransmission'))) {
                return 'tcp-problem';
            }
            // TLS is normal TCP traffic (HTTPS)
            return 'tcp-normal';
        }
        
        // QUIC traffic (usually over UDP)
        if (protocol === 'quic') {
            return 'udp'; // QUIC uses UDP, so use UDP color
        }
        
        // DNS traffic (can be over UDP or TCP)
        if (protocol === 'dns' || 
            (packet.layers && packet.layers.dns) ||
            (packet.srcPort === 53 || packet.dstPort === 53) ||
            info.includes('dns') || info.includes('query') || info.includes('response')) {
            return 'udp'; // DNS typically uses UDP, so use UDP color
        }
        
        // Check for TCP problems
        if (protocol === 'tcp') {
            // Check for retransmissions, duplicate ACKs, out-of-order
            if (info.includes('retransmission') || 
                info.includes('duplicate ack') || 
                info.includes('out-of-order') ||
                info.includes('fast retransmission') ||
                info.includes('spurious retransmission')) {
                return 'tcp-problem';
            }
            
            // Check for STP/Spanning Tree (usually on specific ports or etherType)
            if (info.includes('stp') || 
                info.includes('spanning tree') ||
                (packet.layers && packet.layers.ethernet && packet.layers.ethernet.etherTypeHex === '0x8100')) {
                return 'control';
            }
            
            // Normal TCP traffic
            return 'tcp-normal';
        }
        
        // UDP traffic
        if (protocol === 'udp') {
            return 'udp';
        }
        
        // ICMP traffic
        if (protocol === 'icmp') {
            return 'icmp';
        }
        
        // ARP traffic
        if (protocol === 'arp') {
            return 'arp';
        }
        
        // Check for STP/Spanning Tree in other protocols
        if (info.includes('stp') || 
            info.includes('spanning tree') ||
            info.includes('rstp') ||
            info.includes('mstp') ||
            (packet.layers && packet.layers.ethernet && packet.layers.ethernet.etherTypeHex === '0x8100')) {
            return 'control';
        }
        
        // Default to gray for unknown/malformed
        return 'unknown';
    }

    renderVirtualRows(session, immediate = false) {
        const tbody = document.getElementById('packetTableBody');
        const panel = document.getElementById('packetListPanel');
        
        if (!tbody || !panel || !session) return;

        const filteredPackets = this.getFilteredPackets(session);
        
        // If no packets, set height to 0 and return
        if (filteredPackets.length === 0) {
            tbody.innerHTML = '';
            tbody.style.position = 'relative';
            tbody.style.height = '0px';
            return;
        }

        const scrollTop = panel.scrollTop;
        const clientHeight = panel.clientHeight;
        
        // Calculate visible range with larger buffer for fast scrolling
        const visibleStart = Math.floor(scrollTop / this.virtualScrollRowHeight);
        const visibleEnd = Math.ceil((scrollTop + clientHeight) / this.virtualScrollRowHeight);
        
        // Use larger buffer for fast scrolling (wheel events) to prevent empty rows
        const buffer = immediate ? 200 : this.virtualScrollBuffer;
        const startIndex = Math.max(0, visibleStart - buffer);
        const endIndex = Math.min(filteredPackets.length, visibleEnd + buffer);
        
        // Always re-render on immediate (wheel) scroll, or if range changed significantly
        const currentStart = this.lastRenderedStart !== null ? Math.floor(this.lastRenderedStart / this.virtualScrollRowHeight) : -1;
        const currentEnd = this.lastRenderedEnd !== null ? Math.ceil(this.lastRenderedEnd / this.virtualScrollRowHeight) : -1;
        
        // Re-render if immediate, or if we're outside the current rendered range
        const needsRerender = immediate || 
                             startIndex < currentStart || 
                             endIndex > currentEnd ||
                             this.lastRenderedStart === null;
        
        if (needsRerender) {
            // Clear existing rows
            tbody.innerHTML = '';
            
            // Render visible rows
            for (let i = startIndex; i < endIndex; i++) {
                const packet = filteredPackets[i];
                if (!packet) continue; // Safety check
                
                const packetIndex = session.packets.indexOf(packet);
                if (packetIndex === -1) continue; // Packet not found in session
                
                const protocol = (packet.protocol || 'UNKNOWN').toLowerCase();
                const time = packet.timestamp ? (packet.timestamp.includes(' ') ? packet.timestamp.split(' ')[1] : packet.timestamp) : '';
                const trafficType = this.getTrafficType(packet);
                
                const row = document.createElement('tr');
                row.className = `packet-row protocol-${protocol} traffic-${trafficType} ${packetIndex === session.selectedPacketIndex ? 'selected' : ''}`;
                row.style.transform = `translateY(${i * this.virtualScrollRowHeight}px)`;
                row.style.position = 'absolute';
                row.style.width = '100%';
                row.style.top = '0';
                row.dataset.packetIndex = packetIndex;
                row.onclick = () => window.packetAnalyzerSelectPacket(packetIndex);
                
                // Build row with enabled columns
                const cells = this.availableColumns
                    .filter(col => col.enabled)
                    .map(col => {
                        const value = this.getColumnValue(packet, col.id, time);
                        return `<td style="width: ${col.width}">${value}</td>`;
                    })
                    .join('');
                
                row.innerHTML = cells;
                
                tbody.appendChild(row);
            }
            
            // Store rendered range
            this.lastRenderedStart = startIndex * this.virtualScrollRowHeight;
            this.lastRenderedEnd = endIndex * this.virtualScrollRowHeight;
        }
        
        // Always update tbody height to maintain scroll
        tbody.style.position = 'relative';
        tbody.style.height = `${filteredPackets.length * this.virtualScrollRowHeight}px`;
    }

    addPacketToTable(packet, session) {
        // Use requestAnimationFrame with throttling for smooth UI updates without blocking
        // This avoids the issue where rapid packet arrival prevents rendering (indefinite debounce)
        // or renders too frequently making the UI unusable
        if (!this.renderPending) {
            this.renderPending = true;
            // Limit updates to ~4fps (every 250ms) to allow interaction
            setTimeout(() => {
                requestAnimationFrame(() => {
                    this.renderVirtualRows(session);
                    
                    // Auto-scroll to bottom only if at bottom and auto-scroll is enabled
                    if (this.isAtBottom && session.autoScroll !== false) {
                        const panel = document.getElementById('packetListPanel');
                        if (panel) {
                            panel.scrollTop = panel.scrollHeight;
                        }
                    }
                    this.renderPending = false;
                });
            }, 250);
        }
    }

    updatePacketStats(session) {
        const packetCount = document.getElementById('packetCount');
        const displayedCount = document.getElementById('displayedCount');
        
        if (packetCount) {
            packetCount.textContent = session.packets.length;
        }
        
        if (displayedCount) {
            const filteredPackets = this.getFilteredPackets(session);
            displayedCount.textContent = filteredPackets.length;
        }
    }

    updateTableColumns(session) {
        // Update header
        const header = document.getElementById('packetTableHeader');
        if (header) {
            header.innerHTML = this.renderTableHeader();
        }
        
        // Re-render all visible rows
        this.renderVirtualRows(session);
    }

    showFilterHelpModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2><i class="fas fa-filter"></i> BPF Filter Examples</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <h3 style="color: #3b82f6; margin-top: 0;">Common Filters</h3>
                    <div class="filter-example-grid">
                        <div class="filter-example" onclick="window.packetAnalyzerApplyFilter('tcp')">
                            <code>tcp</code>
                            <span>TCP packets only</span>
                        </div>
                        <div class="filter-example" onclick="window.packetAnalyzerApplyFilter('udp')">
                            <code>udp</code>
                            <span>UDP packets only</span>
                        </div>
                        <div class="filter-example" onclick="window.packetAnalyzerApplyFilter('tcp port 80')">
                            <code>tcp port 80</code>
                            <span>HTTP traffic</span>
                        </div>
                        <div class="filter-example" onclick="window.packetAnalyzerApplyFilter('tcp port 443')">
                            <code>tcp port 443</code>
                            <span>HTTPS traffic</span>
                        </div>
                        <div class="filter-example" onclick="window.packetAnalyzerApplyFilter('tcp port 22')">
                            <code>tcp port 22</code>
                            <span>SSH traffic</span>
                        </div>
                        <div class="filter-example" onclick="window.packetAnalyzerApplyFilter('udp port 53')">
                            <code>udp port 53</code>
                            <span>DNS queries</span>
                        </div>
                    </div>

                    <h3 style="color: #3b82f6; margin-top: 1.5rem;">By IP Address</h3>
                    <div class="filter-example-list">
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('host 192.168.1.1')">
                            <code>host 192.168.1.1</code>
                            <span>Traffic to/from IP</span>
                        </div>
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('src host 192.168.1.1')">
                            <code>src host 192.168.1.1</code>
                            <span>Traffic from IP</span>
                        </div>
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('dst host 192.168.1.1')">
                            <code>dst host 192.168.1.1</code>
                            <span>Traffic to IP</span>
                        </div>
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('net 192.168.1.0/24')">
                            <code>net 192.168.1.0/24</code>
                            <span>Entire subnet</span>
                        </div>
                    </div>

                    <h3 style="color: #3b82f6; margin-top: 1.5rem;">Complex Filters</h3>
                    <div class="filter-example-list">
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('port 80 or port 443')">
                            <code>port 80 or port 443</code>
                            <span>HTTP or HTTPS</span>
                        </div>
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('not arp')">
                            <code>not arp</code>
                            <span>Exclude ARP</span>
                        </div>
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('tcp and port 80')">
                            <code>tcp and port 80</code>
                            <span>TCP on port 80</span>
                        </div>
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('not broadcast and not multicast')">
                            <code>not broadcast and not multicast</code>
                            <span>Unicast only</span>
                        </div>
                    </div>

                    <h3 style="color: #3b82f6; margin-top: 1.5rem;">Advanced</h3>
                    <div class="filter-example-list">
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('tcp[tcpflags] & (tcp-syn) != 0')">
                            <code>tcp[tcpflags] & (tcp-syn) != 0</code>
                            <span>TCP SYN packets</span>
                        </div>
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('greater 1000')">
                            <code>greater 1000</code>
                            <span>Packets > 1000 bytes</span>
                        </div>
                        <div class="filter-example-item" onclick="window.packetAnalyzerApplyFilter('less 128')">
                            <code>less 128</code>
                            <span>Packets < 128 bytes</span>
                        </div>
                    </div>

                    <div style="margin-top: 1.5rem; padding: 1rem; background: #1e293b; border-left: 3px solid #3b82f6; border-radius: 0.375rem;">
                        <p style="margin: 0; color: #94a3b8; font-size: 0.875rem;">
                            <strong style="color: #e2e8f0;">💡 Tip:</strong> Click any example to apply it. You can combine filters using <code style="color: #60a5fa;">and</code>, <code style="color: #60a5fa;">or</code>, and <code style="color: #60a5fa;">not</code>.
                        </p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showColumnConfigModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2><i class="fas fa-columns"></i> Configure Columns</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 1rem; color: #94a3b8; font-size: 0.875rem;">
                        Select which columns to display in the packet list:
                    </p>
                    <div class="column-config-list">
                        ${this.availableColumns.map((col, idx) => `
                            <label class="column-config-item">
                                <input type="checkbox" 
                                       id="col_${col.id}" 
                                       ${col.enabled ? 'checked' : ''} 
                                       onchange="window.packetAnalyzerToggleColumn('${col.id}', this.checked)">
                                <span>${col.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.packetAnalyzerResetColumns()">
                        <i class="fas fa-undo"></i> Reset to Default
                    </button>
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        Done
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    async unmount() {
        // Stop all active captures and close WebSockets
        console.log('[PacketAnalyzer] Unmounting - stopping all captures');
        
        const stopPromises = [];
        for (const session of this.sessions) {
            if (session.capturing || session.ws) {
                // Close WebSocket immediately
                if (session.ws) {
                    try {
                        session.ws.close(1000, 'Page navigation');
                    } catch (e) {
                        // Ignore errors
                    }
                    session.ws = null;
                }
                
                // Stop capture on backend
                if (session.capturing && session.id) {
                    stopPromises.push(this.stopCapture(session));
                }
            }
        }
        
        // Wait for all captures to stop
        if (stopPromises.length > 0) {
            await Promise.all(stopPromises);
        }
        
        // Clear sessions
        this.sessions = [];
        window.packetAnalyzerInstance = null;
        
        console.log('[PacketAnalyzer] Unmount complete - all captures stopped');
    }
}
