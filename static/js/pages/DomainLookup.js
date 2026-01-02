export class DomainLookupPage {
    constructor() {
        this.domain = '';
        this.domainInfo = null;
        this.loading = false;
        this.error = null;
        this.history = []; // Store search history
        this.graphData = null;
        this.graphResizeObserver = null;
        this.graphAnimationFrame = null;
        // Canvas zoom and pan
        this.canvasZoom = 1;
        this.canvasPanX = 0;
        this.canvasPanY = 0;
        this.isDragging = false;
        this.lastPanPoint = { x: 0, y: 0 };
    }

    async render() {
        return `
            <div class="page-container-full">
                <div class="domain-lookup-container">
                    <!-- Search Section -->
                    <div class="domain-lookup-search">
                        <div class="search-form">
                            <div class="search-input-group">
                                <input 
                                    type="text" 
                                    id="domain-input" 
                                    class="domain-input" 
                                    placeholder="Enter domain name (e.g., example.com)"
                                    value="${this.domain}"
                                    onkeypress="if(event.key === 'Enter') domainLookupInstance.searchDomain()"
                                />
                                <button 
                                    class="btn btn-primary" 
                                    id="search-btn"
                                    onclick="domainLookupInstance.searchDomain()"
                                    ${this.loading ? 'disabled' : ''}
                                >
                                    ${this.loading ? '<i class="fas fa-spinner fa-spin"></i> Searching...' : '<i class="fas fa-search"></i> Search'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Results Section -->
                    ${this.error ? `
                        <div class="domain-lookup-error">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>${this.error}</span>
                        </div>
                    ` : ''}

                    ${this.domainInfo ? this.renderDomainInfo() : this.renderEmptyState()}
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="domain-lookup-empty">
                <div class="empty-icon-wrapper">
                    <i class="fas fa-globe"></i>
                </div>
                <h3>No Domain Selected</h3>
                <p>Enter a domain name above to view its RDAP information, registration details, and history.</p>
            </div>
        `;
    }

    renderDomainInfo() {
        if (!this.domainInfo) {
            console.log('[DomainLookup] No domain info to render');
            return '';
        }

        console.log('[DomainLookup] Rendering domain info:', this.domainInfo);
        const domain = this.domainInfo;
        
        // Handle both camelCase (from JSON) and PascalCase (from Go struct tags)
        const ldhName = domain.ldhName || domain.LDHName || '';
        const tld = ldhName ? ldhName.split('.').pop() : '';
        const tldType = this.getTLDType(tld);

        // Extract entities (handle both cases)
        const entities = domain.entities || domain.Entities || [];
        const registrar = this.findEntityByRole(entities, "registrar");
        const registrant = this.findEntityByRole(entities, "registrant");
        const admin = this.findEntityByRole(entities, "administrative");
        const tech = this.findEntityByRole(entities, "technical");

        // Extract events (handle both cases)
        const events = domain.events || domain.Events || [];
        const registrationEvent = this.findEventByAction(events, "registration");
        const expirationEvent = this.findEventByAction(events, "expiration");
        const lastChangedEvent = this.findEventByAction(events, "last changed");
        const lastUpdateEvent = this.findEventByAction(events, "last update of rdap database");
        
        // Extract nameservers
        const nameservers = domain.nameservers || domain.Nameservers || [];

        // Extract status (handle both cases)
        const status = domain.status || domain.Status || [];
        const isRegistryLocked = this.hasStatus(status, "server delete prohibited") || 
                                this.hasStatus(status, "server transfer prohibited") ||
                                this.hasStatus(status, "server update prohibited");
        const isRegistrarLocked = this.hasStatus(status, "client delete prohibited") || 
                                  this.hasStatus(status, "client transfer prohibited") ||
                                  this.hasStatus(status, "client update prohibited");
        const secureDNS = domain.secureDNS || domain.SecureDNS;
        const hasDNSSEC = secureDNS && (secureDNS.delegationSigned || secureDNS.DelegationSigned);

        // Extract EPP status codes
        const eppStatuses = status;

        return `
            <div class="domain-lookup-results">
                <!-- Domain Header -->
                <div class="domain-header">
                    <div class="domain-header-top">
                        <div class="domain-title">
                            <h1>${ldhName || this.domain}</h1>
                            ${(domain.handle || domain.Handle) ? `<span class="domain-handle">${domain.handle || domain.Handle}</span>` : ''}
                        </div>
                        <div class="domain-tld">
                            <span class="tld-badge ${tldType}">${tld.toUpperCase()} (${tldType})</span>
                        </div>
                    </div>
                    ${this.renderDomainLifecycleTimeline(eppStatuses)}
                </div>

                <div class="domain-content-split">
                    <!-- Left Panel: Status and Details -->
                    <div class="domain-left-panel">
                        <!-- Registration Status -->
                        <div class="domain-section registration-status-section">
                            <div class="status-locks-horizontal">
                                <div class="lock-item-horizontal ${isRegistryLocked ? 'active' : ''}">
                                    <i class="fas fa-shield-alt"></i>
                                    <span>Registry Lock</span>
                                </div>
                                <div class="lock-item-horizontal ${isRegistrarLocked ? 'active' : ''}">
                                    <i class="fas fa-building"></i>
                                    <span>Registrar Lock</span>
                                </div>
                                <div class="lock-item-horizontal ${hasDNSSEC ? 'active' : ''}">
                                    <i class="fas fa-search"></i>
                                    <span>DNSSEC</span>
                                </div>
                            </div>
                        </div>

                        <!-- EPP Status Codes -->
                        ${eppStatuses.length > 0 ? `
                            <div class="domain-section">
                                <h3><i class="fas fa-lock"></i> EPP Status Codes</h3>
                                <div class="epp-status-list">
                                    ${eppStatuses.map(status => {
                                        // Format status text (replace underscores with spaces, capitalize)
                                        const formattedStatus = status
                                            .toLowerCase()
                                            .replace(/_/g, ' ')
                                            .split(' ')
                                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                            .join(' ');
                                        return `<span class="epp-status-badge">${formattedStatus}</span>`;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Timeline -->
                        <div class="domain-section">
                            <h3><i class="fas fa-clock"></i> Timeline</h3>
                            <div class="timeline-list-wrapper">
                                <div class="timeline-list">
                                ${expirationEvent ? `
                                    <div class="timeline-item timeline-item-0">
                                        <span class="timeline-label">Estimated removal:</span>
                                        <div class="timeline-icon-wrapper timeline-icon-yellow">
                                            <i class="fas fa-bolt timeline-item-icon"></i>
                                        </div>
                                        <span class="timeline-value">${this.formatDate(this.estimateRemovalDate(expirationEvent.eventDate || expirationEvent.EventDate))}</span>
                                    </div>
                                ` : ''}
                                ${expirationEvent ? `
                                    <div class="timeline-item timeline-item-1">
                                        <span class="timeline-label">Expiration:</span>
                                        <div class="timeline-icon-wrapper timeline-icon-red">
                                            <i class="fas fa-clock timeline-item-icon"></i>
                                        </div>
                                        <span class="timeline-value">${this.formatDate(expirationEvent.eventDate || expirationEvent.EventDate)}</span>
                                    </div>
                                ` : ''}
                                ${lastChangedEvent || lastUpdateEvent ? `
                                    <div class="timeline-item timeline-item-2">
                                        <span class="timeline-label">Changed:</span>
                                        <div class="timeline-icon-wrapper timeline-icon-blue">
                                            <i class="fas fa-sync timeline-item-icon"></i>
                                        </div>
                                        <span class="timeline-value">${this.formatDate((lastChangedEvent || lastUpdateEvent).eventDate || (lastChangedEvent || lastUpdateEvent).EventDate)}</span>
                                    </div>
                                ` : ''}
                                ${registrationEvent ? `
                                    <div class="timeline-item timeline-item-3">
                                        <span class="timeline-label">Registration:</span>
                                        <div class="timeline-icon-wrapper timeline-icon-green">
                                            <i class="fas fa-paperclip timeline-item-icon"></i>
                                        </div>
                                        <span class="timeline-value">${this.formatDate(registrationEvent.eventDate || registrationEvent.EventDate)}</span>
                                    </div>
                                ` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Entities -->
                        <div class="domain-section">
                            <h3><i class="fas fa-users"></i> Entities</h3>
                            <div class="entities-list">
                                ${(() => {
                                    const allEntities = entities || [];
                                    let html = '';
                                    allEntities.forEach((entity, index) => {
                                        const entityRoles = entity.roles || entity.Roles || [];
                                        const entityName = this.getEntityName(entity);
                                        const entityHandle = entity.handle || entity.Handle || '';
                                        const publicIds = entity.publicIds || entity.PublicIDs || [];
                                        const nestedEntities = entity.entities || entity.Entities || [];
                                        
                                        // Get primary role for icon color
                                        const primaryRole = entityRoles[0] || 'unknown';
                                        
                                        // Get entity ID (handle or first public ID)
                                        let entityId = entityHandle;
                                        if (!entityId && publicIds.length > 0) {
                                            const firstId = publicIds[0];
                                            entityId = `${firstId.identifier || firstId.Identifier}-${firstId.type || firstId.Type}`;
                                        }
                                        
                                        // Determine icon based on role
                                        let entityIcon = 'fa-user';
                                        let entityIconClass = 'entity-icon-default';
                                        if (primaryRole === 'registrant') {
                                            entityIcon = 'fa-paperclip';
                                            entityIconClass = 'entity-icon-green';
                                        } else if (primaryRole === 'administrative') {
                                            entityIcon = 'fa-user-circle';
                                            entityIconClass = 'entity-icon-blue';
                                        } else if (primaryRole === 'registrar' || primaryRole === 'sponsor') {
                                            entityIcon = 'fa-building';
                                            entityIconClass = 'entity-icon-purple';
                                        } else if (primaryRole === 'technical') {
                                            entityIcon = 'fa-wrench';
                                            entityIconClass = 'entity-icon-orange';
                                        }
                                        
                                        html += `
                                            <div class="entity-item-new">
                                                <div class="entity-icon-wrapper ${entityIconClass}">
                                                    <i class="fas ${entityIcon}"></i>
                                                </div>
                                                <div class="entity-content">
                                                    ${entityId ? `<div class="entity-id-display">${entityId}</div>` : ''}
                                                    <div class="entity-names">
                                                        <div class="entity-name-item">
                                                            <i class="fas fa-user entity-person-icon"></i>
                                                            <span>${entityName}</span>
                                                        </div>
                                                        ${nestedEntities.map(nested => {
                                                            const nestedName = this.getEntityName(nested);
                                                            return `
                                                                <div class="entity-name-item">
                                                                    <i class="fas fa-user entity-person-icon"></i>
                                                                    <span>${nestedName}</span>
                                                                </div>
                                                            `;
                                                        }).join('')}
                                                    </div>
                                                </div>
                                                <div class="entity-roles-right">
                                                    ${entityRoles.map(role => `
                                                        <span class="entity-role-badge-new ${role}">${role}</span>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        `;
                                    });
                                    return html || '<div class="no-entities">No entities found</div>';
                                })()}
                            </div>
                        </div>
                    </div>

                    <!-- Right Panel: Network Graph -->
                    <div class="domain-right-panel">
                        <div class="domain-section network-graph-section">
                            <div class="network-graph-container" id="network-graph">
                                ${this.renderNetworkGraph(domain)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderNetworkGraph(domain) {
        const entities = domain.entities || domain.Entities || [];
        const registrar = this.findEntityByRole(entities, "registrar");
        const registrarName = registrar ? this.getEntityName(registrar) : "Unknown Registrar";
        const registrant = this.findEntityByRole(entities, "registrant");
        const registrantName = registrant ? this.getEntityName(registrant) : null;
        const administrative = this.findEntityByRole(entities, "administrative");
        const administrativeName = administrative ? this.getEntityName(administrative) : null;
        const technical = this.findEntityByRole(entities, "technical");
        const technicalName = technical ? this.getEntityName(technical) : null;
        const ldhName = domain.ldhName || domain.LDHName || '';
        const tld = ldhName ? ldhName.split('.').pop().toUpperCase() : '';
        const nameservers = domain.nameservers || domain.Nameservers || [];
        
        const nsCount = Math.min(nameservers.length, 8);
        const visibleNS = nameservers.slice(0, nsCount);
        const graphId = `graph-${ldhName.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
        
        // Store graph data for canvas rendering
        this.graphData = {
            registrar: registrar ? { name: registrarName } : null,
            registrant: registrantName ? { name: registrantName } : null,
            administrative: administrativeName ? { name: administrativeName } : null,
            technical: technicalName ? { name: technicalName } : null,
            domain: { name: ldhName || this.domain },
            tld: tld,
            nameservers: visibleNS.map(ns => ({
                name: ns.ldhName || ns.LDHName || (ns.ipAddresses && ns.ipAddresses.v4 && ns.ipAddresses.v4[0]) || (ns.IPAddresses && ns.IPAddresses.V4 && ns.IPAddresses.V4[0]) || 'Unknown'
            })),
            totalNS: nameservers.length,
            visibleNSCount: nsCount
        };
        
        return `
            <div class="network-graph-compact" id="${graphId}">
                ${nsCount < nameservers.length ? `<div class="graph-nameserver-count">Showing ${nsCount} of ${nameservers.length} nameservers</div>` : ''}
                <canvas id="network-graph-canvas-${graphId}" class="network-graph-canvas"></canvas>
            </div>
        `;
    }
    
    drawNetworkGraph() {
        if (!this.graphData) return;
        
        const canvasId = document.querySelector('.network-graph-canvas')?.id;
        if (!canvasId) return;
        
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const container = canvas.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Apply transformations (pan and zoom)
        ctx.save();
        ctx.translate(this.canvasPanX, this.canvasPanY);
        ctx.scale(this.canvasZoom, this.canvasZoom);
        
        // Define node positions with increased spacing
        const padding = 40;
        const topY = padding + 50;
        const centerY = height / 2;
        const bottomY = height - padding - 50;
        
        const nodes = {};
        
        // Top row: Registrar, Registrant & Registry (increased spacing)
        const topSpacing = Math.max(200, width * 0.35);
        const topItemCount = 2 + (this.graphData.registrar ? 1 : 0) + (this.graphData.registrant ? 1 : 0);
        const topItemWidth = topSpacing * 2 / Math.max(1, topItemCount - 1);
        let topIndex = 0;
        
        if (this.graphData.registrar) {
            nodes.registrar = { 
                x: width / 2 - topSpacing + (topIndex * topItemWidth), 
                y: topY, 
                label: this.graphData.registrar.name || 'Unknown Registrar', 
                color: '#9333ea', 
                icon: 'building' 
            };
            topIndex++;
        }
        
        if (this.graphData.registrant) {
            nodes.registrant = { 
                x: width / 2 - topSpacing + (topIndex * topItemWidth), 
                y: topY, 
                label: this.graphData.registrant.name || 'Unknown Registrant', 
                color: '#22c55e', 
                icon: 'paperclip' 
            };
            topIndex++;
        }
        
        const registryLabel = this.graphData.tld ? `Registry (.${this.graphData.tld})` : 'Registry';
        nodes.registry = { 
            x: width / 2 - topSpacing + (topIndex * topItemWidth), 
            y: topY, 
            label: registryLabel, 
            color: '#eab308', 
            icon: 'globe' 
        };
        
        // Center: Domain
        nodes.domain = { 
            x: width / 2, 
            y: centerY, 
            label: this.graphData.domain.name || this.domain, 
            color: '#3b82f6', 
            icon: 'link' 
        };
        
        // Left side: Administrative (only if present)
        const leftX = Math.max(padding + 100, width * 0.12);
        
        if (this.graphData.administrative) {
            nodes.administrative = { 
                x: leftX, 
                y: centerY, 
                label: this.graphData.administrative.name || 'Unknown Administrative', 
                color: '#0ea5e9', 
                icon: 'user-circle' 
            };
        }
        
        // Right side: Technical (more spacing from center)
        if (this.graphData.technical) {
            nodes.technical = { 
                x: Math.min(width - padding - 100, width * 0.88), 
                y: centerY, 
                label: this.graphData.technical.name || 'Unknown Technical', 
                color: '#f97316', 
                icon: 'wrench' 
            };
        }
        
        // Bottom: Nameservers (increased spacing)
        const nsCount = this.graphData.nameservers.length;
        if (nsCount > 0) {
            const nsArea = width - 2 * padding;
            // Increased minimum spacing between nameservers
            const minSpacing = 220;
            const maxSpacing = nsArea / Math.max(nsCount - 1, 1);
            const nsSpacing = Math.max(minSpacing, Math.min(maxSpacing, 300));
            const totalWidth = (nsCount - 1) * nsSpacing;
            const startX = (width - totalWidth) / 2;
            
            this.graphData.nameservers.forEach((ns, index) => {
                nodes[`nameserver-${index}`] = {
                    x: startX + index * nsSpacing,
                    y: bottomY,
                    label: ns.name || 'Unknown',
                    color: '#64748b',
                    icon: 'server'
                };
            });
        }
        
        // Draw connections
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Registrar to Domain
        if (nodes.registrar && nodes.domain) {
            this.drawConnection(ctx, nodes.registrar, nodes.domain, '#9333ea', 2.5, false, 'Registrar');
        }
        
        // Registry to Domain
        if (nodes.registry && nodes.domain) {
            this.drawConnection(ctx, nodes.registry, nodes.domain, '#eab308', 2.5, false, 'Registry');
        }
        
        // Registrant to Domain
        if (nodes.registrant && nodes.domain) {
            this.drawConnection(ctx, nodes.registrant, nodes.domain, '#22c55e', 2.5, true, 'Registrant');
        }
        
        // Administrative to Domain
        if (nodes.administrative && nodes.domain) {
            this.drawConnection(ctx, nodes.administrative, nodes.domain, '#0ea5e9', 2.5, false, 'Admin');
        }
        
        // Technical to Domain
        if (nodes.technical && nodes.domain) {
            this.drawConnection(ctx, nodes.technical, nodes.domain, '#f97316', 2.5, false, 'Technical');
        }
        
        // Domain to Nameservers
        if (nodes.domain) {
            for (let i = 0; i < nsCount; i++) {
                const nsKey = `nameserver-${i}`;
                if (nodes[nsKey]) {
                    const label = nsCount > 1 ? `NS${i + 1}` : 'DNS';
                    this.drawConnection(ctx, nodes.domain, nodes[nsKey], '#64748b', 2, false, label);
                }
            }
        }
        
        // Draw nodes
        Object.values(nodes).forEach(node => {
            this.drawNode(ctx, node);
        });
        
        // Restore transformations
        ctx.restore();
    }
    
    setupCanvasInteractions() {
        const canvas = document.querySelector('.network-graph-canvas');
        if (!canvas) return;
        
        // Remove existing listeners if any
        if (this.canvasWheelHandler) {
            canvas.removeEventListener('wheel', this.canvasWheelHandler);
        }
        if (this.canvasMouseDownHandler) {
            canvas.removeEventListener('mousedown', this.canvasMouseDownHandler);
        }
        if (this.canvasMouseMoveHandler) {
            document.removeEventListener('mousemove', this.canvasMouseMoveHandler);
        }
        if (this.canvasMouseUpHandler) {
            document.removeEventListener('mouseup', this.canvasMouseUpHandler);
        }
        
        // Zoom with mouse wheel
        this.canvasWheelHandler = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calculate zoom factor
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.5, Math.min(3, this.canvasZoom * zoomFactor));
            
            // Zoom towards mouse position
            const zoomChange = newZoom / this.canvasZoom;
            this.canvasPanX = x - (x - this.canvasPanX) * zoomChange;
            this.canvasPanY = y - (y - this.canvasPanY) * zoomChange;
            this.canvasZoom = newZoom;
            
            this.drawNetworkGraph();
        };
        
        // Pan with mouse drag
        this.canvasMouseDownHandler = (e) => {
            if (e.button === 0) { // Left mouse button
                this.isDragging = true;
                const rect = canvas.getBoundingClientRect();
                this.lastPanPoint = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                canvas.style.cursor = 'grabbing';
            }
        };
        
        this.canvasMouseMoveHandler = (e) => {
            if (this.isDragging) {
                const rect = canvas.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                
                this.canvasPanX += currentX - this.lastPanPoint.x;
                this.canvasPanY += currentY - this.lastPanPoint.y;
                
                this.lastPanPoint = {
                    x: currentX,
                    y: currentY
                };
                
                this.drawNetworkGraph();
            }
        };
        
        this.canvasMouseUpHandler = () => {
            if (this.isDragging) {
                this.isDragging = false;
                const canvas = document.querySelector('.network-graph-canvas');
                if (canvas) {
                    canvas.style.cursor = 'grab';
                }
            }
        };
        
        // Add event listeners
        canvas.addEventListener('wheel', this.canvasWheelHandler, { passive: false });
        canvas.addEventListener('mousedown', this.canvasMouseDownHandler);
        document.addEventListener('mousemove', this.canvasMouseMoveHandler);
        document.addEventListener('mouseup', this.canvasMouseUpHandler);
        
        // Set initial cursor
        canvas.style.cursor = 'grab';
    }
    
    drawConnection(ctx, from, to, color, width, animated = false, label = '') {
        ctx.save();
        
        // Calculate better curve control points
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Determine curve direction based on connection type
        let controlX, controlY;
        if (Math.abs(dy) > Math.abs(dx)) {
            // Vertical connection - curve horizontally
            controlX = (from.x + to.x) / 2;
            controlY = (from.y + to.y) / 2;
            // Add curve offset based on direction
            if (from.y < to.y) {
                controlY -= Math.min(distance * 0.3, 50);
            } else {
                controlY += Math.min(distance * 0.3, 50);
            }
        } else {
            // Horizontal connection - curve vertically
            controlX = (from.x + to.x) / 2;
            controlY = (from.y + to.y) / 2;
            // Add curve offset
            if (from.x < to.x) {
                controlX -= Math.min(distance * 0.2, 40);
            } else {
                controlX += Math.min(distance * 0.2, 40);
            }
        }
        
        // Draw connection line with gradient
        const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, color);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = width;
        ctx.globalAlpha = 0.7;
        
        if (animated) {
            // Dashed line for registrant (reversed animation)
            ctx.setLineDash([8, 4]);
            ctx.lineDashOffset = -((Date.now() / 15) % 12);
        } else {
            ctx.setLineDash([]);
        }
        
        // Draw main line
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
        ctx.stroke();
        
        // Add glow effect for animated lines
        if (animated) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Draw label at the center of the line
        if (label) {
            // Calculate the midpoint on the actual curve (not just control point)
            // Use quadratic curve formula: t = 0.5 for midpoint
            const t = 0.5;
            const labelX = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * controlX + t * t * to.x;
            const labelY = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * controlY + t * t * to.y;
            
            // Draw label background (no border)
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textMetrics = ctx.measureText(label);
            const labelWidth = textMetrics.width + 14;
            const labelHeight = 20;
            
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.globalAlpha = 1;
            
            // Rounded rectangle for label (no stroke) - centered on the line
            this.roundRect(ctx, labelX - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 4);
            ctx.fill();
            
            // Draw label text
            ctx.fillStyle = color;
            ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(label, labelX, labelY);
        }
        
        ctx.restore();
    }
    
    drawNode(ctx, node) {
        const { x, y, label, color, icon } = node;
        
        // Draw node background
        ctx.save();
        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        
        // Calculate width based on actual text width (no icon)
        const textMetrics = ctx.measureText(label);
        const nodeWidth = Math.max(160, textMetrics.width + 40);
        const nodeHeight = 48;
        const radius = 8;
        
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        
        // Rounded rectangle
        ctx.beginPath();
        this.roundRect(ctx, x - nodeWidth / 2, y - nodeHeight / 2, nodeWidth, nodeHeight, radius);
        ctx.fill();
        ctx.stroke();
        
        // Draw label (no icon, centered)
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
        
        ctx.restore();
    }
    
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    drawIcon(ctx, iconType, x, y, size, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        
        switch(iconType) {
            case 'building':
                // Simple building shape
                ctx.fillRect(x - size/2, y - size/2 + 2, size, size - 4);
                ctx.fillRect(x - size/2 + 2, y - size/2, size - 4, 3);
                break;
            case 'globe':
                // Circle with lines
                ctx.beginPath();
                ctx.arc(x, y, size/2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - size/2, y);
                ctx.lineTo(x + size/2, y);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, size/2, 0, Math.PI);
                ctx.stroke();
                break;
            case 'link':
                // Chain links
                ctx.beginPath();
                ctx.arc(x - size/4, y, size/3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x + size/4, y, size/3, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'paperclip':
                // Paperclip shape
                ctx.beginPath();
                ctx.arc(x, y - size/4, size/3, Math.PI / 2, Math.PI * 1.5);
                ctx.arc(x, y + size/4, size/3, Math.PI * 1.5, Math.PI / 2);
                ctx.stroke();
                break;
            case 'user-circle':
                // Circle with person
                ctx.beginPath();
                ctx.arc(x, y - size/4, size/4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x, y + size/6, size/2, 0, Math.PI);
                ctx.fill();
                break;
            case 'wrench':
                // Wrench shape
                ctx.beginPath();
                ctx.arc(x - size/4, y, size/3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + size/4, y - size/3);
                ctx.lineTo(x + size/2, y);
                ctx.stroke();
                break;
            case 'server':
                // Server rack
                ctx.fillRect(x - size/2, y - size/2, size, size);
                ctx.strokeStyle = 'rgba(30, 41, 59, 0.9)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - size/2 + 2, y - size/2 + 2, size - 4, size/3);
                ctx.strokeRect(x - size/2 + 2, y - size/6, size - 4, size/3);
                break;
            default:
                // Default circle
                ctx.beginPath();
                ctx.arc(x, y, size/2, 0, Math.PI * 2);
                ctx.fill();
        }
        
        ctx.restore();
    }

    truncateText(text, maxLength) {
        if (!text) return 'Unknown';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    async searchDomain() {
        const input = document.getElementById('domain-input');
        if (!input) return;

        const domain = input.value.trim();
        if (!domain) {
            this.error = 'Please enter a domain name';
            await this.updateDisplay();
            return;
        }

        this.loading = true;
        this.error = null;
        this.domain = domain;
        await this.updateDisplay();

        try {
            const response = await fetch(`/api/domain/lookup?domain=${encodeURIComponent(domain)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('[DomainLookup] Received data:', data);
            this.domainInfo = data;
            this.history.push({ domain, timestamp: new Date(), data });
            
            // Keep only last 10 searches
            if (this.history.length > 10) {
                this.history.shift();
            }
        } catch (error) {
            console.error('Error fetching domain info:', error);
            this.error = error.message || 'Failed to fetch domain information';
            this.domainInfo = null;
        } finally {
            this.loading = false;
            await this.updateDisplay();
        }
    }

    async updateDisplay() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = await this.render();
            // Reset zoom and pan
            this.canvasZoom = 1;
            this.canvasPanX = 0;
            this.canvasPanY = 0;
            // Update timeline connectors and draw graph after render
            setTimeout(() => {
                this.updateTimelineConnectors();
                this.drawNetworkGraph();
                // Set up resize observer for canvas
                this.setupGraphResizeObserver();
                // Set up canvas interactions (zoom and pan)
                this.setupCanvasInteractions();
                // Set up animation loop for animated connections
                this.startGraphAnimation();
            }, 50);
        }
    }

    async mount() {
        await this.updateDisplay();
        setTimeout(() => {
            this.updateTimelineConnectors();
            this.drawNetworkGraph();
            this.setupGraphResizeObserver();
            this.setupCanvasInteractions();
            this.startGraphAnimation();
        }, 50);
    }
    
    setupGraphResizeObserver() {
        const canvas = document.querySelector('.network-graph-canvas');
        if (!canvas) return;
        
        const container = canvas.parentElement;
        if (!container) return;
        
        // Use ResizeObserver to redraw on resize
        if (this.graphResizeObserver) {
            this.graphResizeObserver.disconnect();
        }
        
        this.graphResizeObserver = new ResizeObserver(() => {
            this.drawNetworkGraph();
        });
        
        this.graphResizeObserver.observe(container);
    }
    
    startGraphAnimation() {
        if (this.graphAnimationFrame) {
            cancelAnimationFrame(this.graphAnimationFrame);
        }
        
        let lastTime = 0;
        const animate = (currentTime) => {
            // Only redraw if enough time has passed (throttle to ~30fps)
            if (currentTime - lastTime >= 33) {
                this.drawNetworkGraph();
                lastTime = currentTime;
            }
            this.graphAnimationFrame = requestAnimationFrame(animate);
        };
        
        this.graphAnimationFrame = requestAnimationFrame(animate);
    }
    
    cleanup() {
        // Stop animation
        if (this.graphAnimationFrame) {
            cancelAnimationFrame(this.graphAnimationFrame);
            this.graphAnimationFrame = null;
        }
        
        // Disconnect resize observer
        if (this.graphResizeObserver) {
            this.graphResizeObserver.disconnect();
            this.graphResizeObserver = null;
        }
        
        // Remove canvas event listeners
        const canvas = document.querySelector('.network-graph-canvas');
        if (canvas) {
            if (this.canvasWheelHandler) {
                canvas.removeEventListener('wheel', this.canvasWheelHandler);
            }
            if (this.canvasMouseDownHandler) {
                canvas.removeEventListener('mousedown', this.canvasMouseDownHandler);
            }
        }
        if (this.canvasMouseMoveHandler) {
            document.removeEventListener('mousemove', this.canvasMouseMoveHandler);
        }
        if (this.canvasMouseUpHandler) {
            document.removeEventListener('mouseup', this.canvasMouseUpHandler);
        }
        
        // Clear graph data
        this.graphData = null;
    }

    updateTimelineConnectors() {
        // Update connector positions after render
        setTimeout(() => {
            const timeline = document.querySelector('.domain-lifecycle-timeline');
            if (!timeline) return;

            const stages = timeline.querySelectorAll('.lifecycle-stage:not(:last-child)');
            stages.forEach((stage) => {
                const connector = stage.querySelector('.lifecycle-connector');
                if (!connector) return;

                const content = stage.querySelector('.lifecycle-stage-content');
                if (!content) return;

                const nextStage = stage.nextElementSibling;
                if (!nextStage) return;

                const nextIcon = nextStage.querySelector('.lifecycle-icon');
                if (!nextIcon) return;

                // Get positions relative to timeline
                const timelineRect = timeline.getBoundingClientRect();
                const contentRect = content.getBoundingClientRect();
                const nextIconRect = nextIcon.getBoundingClientRect();

                // Calculate start (end of content text) and end (center of next icon)
                // Add spacing to avoid being too close to text and icon
                const startX = contentRect.right - timelineRect.left + 8; // Gap after text
                const endX = nextIconRect.left - timelineRect.left - 12; // Gap before icon (stop before icon, not at center)

                // Set position and width
                connector.style.position = 'absolute';
                connector.style.left = `${startX}px`;
                connector.style.width = `${endX - startX}px`;
                connector.style.right = 'auto';
            });
        }, 50);
    }

    // Helper methods
    findEntityByRole(entities, role) {
        if (!entities) return null;
        for (const entity of entities) {
            const roles = entity.roles || entity.Roles || [];
            if (roles.some(r => r.toLowerCase() === role.toLowerCase())) {
                return entity;
            }
            // Check nested entities
            const nestedEntities = entity.entities || entity.Entities;
            if (nestedEntities) {
                const found = this.findEntityByRole(nestedEntities, role);
                if (found) return found;
            }
        }
        return null;
    }

    findEventByAction(events, action) {
        if (!events || !Array.isArray(events)) return null;
        const found = events.find(e => {
            const eventAction = e.eventAction || e.EventAction || '';
            return eventAction.toLowerCase().includes(action.toLowerCase());
        });
        console.log(`[DomainLookup] findEventByAction("${action}"):`, found);
        return found || null;
    }

    hasStatus(statuses, status) {
        if (!statuses || !Array.isArray(statuses)) return false;
        return statuses.some(s => {
            const statusStr = typeof s === 'string' ? s : String(s);
            return statusStr.toLowerCase().includes(status.toLowerCase());
        });
    }

    getEntityName(entity) {
        if (!entity) return 'Unknown';
        // Try to extract name from vCard (handle both cases)
        const vcardArray = entity.vcardArray || entity.VCardArray;
        if (vcardArray && Array.isArray(vcardArray)) {
            // vCard structure: ["vcard", [array of properties]]
            const vcard = vcardArray[1];
            if (Array.isArray(vcard)) {
                // Look for 'fn' (full name) first
                for (const item of vcard) {
                    if (Array.isArray(item) && item.length >= 4) {
                        if (item[0] === 'fn' && item[3]) {
                            const name = item[3];
                            if (name && name.trim() !== '') {
                                return name;
                            }
                        }
                    }
                }
                // Fallback to 'org' (organization)
                for (const item of vcard) {
                    if (Array.isArray(item) && item.length >= 4) {
                        if (item[0] === 'org' && item[3]) {
                            const org = item[3];
                            if (org && org.trim() !== '') {
                                return org;
                            }
                        }
                    }
                }
            }
        }
        // Fallback to handle
        return entity.handle || entity.Handle || 'Unknown';
    }

    getEntityCount(entity) {
        // Return a placeholder count - in real implementation, this would count related domains
        // For now, return a random number to match the design
        return '292';
    }

    getTLDType(tld) {
        const gTLDs = ['com', 'net', 'org', 'info', 'biz', 'io', 'co'];
        if (gTLDs.includes(tld.toLowerCase())) {
            return 'gTLD';
        }
        return 'ccTLD';
    }

    formatDate(date) {
        if (!date) {
            console.log('[DomainLookup] formatDate: no date provided');
            return 'N/A';
        }
        // Handle both string and Date objects
        let dateValue = date;
        if (typeof date === 'object' && date.eventDate) {
            dateValue = date.eventDate;
        } else if (typeof date === 'object' && date.EventDate) {
            dateValue = date.EventDate;
        }
        console.log('[DomainLookup] formatDate input:', date, '-> dateValue:', dateValue);
        const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
        if (isNaN(d.getTime())) {
            console.log('[DomainLookup] formatDate: invalid date', dateValue);
            return 'N/A';
        }
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    estimateRemovalDate(expirationDate) {
        if (!expirationDate) return null;
        const exp = new Date(expirationDate);
        // Typically domains are removed 75 days after expiration
        exp.setDate(exp.getDate() + 75);
        return exp;
    }

    getDomainLifecycleStageFromEPP(eppStatuses) {
        if (!eppStatuses || !Array.isArray(eppStatuses)) return 'active';
        
        // Normalize status strings to lowercase for comparison
        const statuses = eppStatuses.map(s => (typeof s === 'string' ? s.toLowerCase() : String(s).toLowerCase()));
        
        // Check for pendingDelete first (highest priority)
        if (statuses.some(s => s.includes('pendingdelete') || s.includes('pending delete'))) {
            return 'pending-delete';
        }
        
        // Check for redemptionPeriod
        if (statuses.some(s => s.includes('redemptionperiod') || s.includes('redemption period'))) {
            return 'redemption-grace';
        }
        
        // Check for autoRenewPeriod
        if (statuses.some(s => s.includes('autorenewperiod') || s.includes('auto renew period') || s.includes('autorenew'))) {
            return 'auto-renew-grace';
        }
        
        // Default to active if no specific status found
        return 'active';
    }

    renderDomainLifecycleTimeline(eppStatuses) {
        if (!eppStatuses || !Array.isArray(eppStatuses)) {
            eppStatuses = [];
        }
        
        // Normalize status strings to lowercase for comparison
        const statuses = eppStatuses.map(s => (typeof s === 'string' ? s.toLowerCase() : String(s).toLowerCase()));
        
        // Check which statuses are present
        const hasPendingDelete = statuses.some(s => s.includes('pendingdelete') || s.includes('pending delete'));
        const hasRedemptionPeriod = statuses.some(s => s.includes('redemptionperiod') || s.includes('redemption period'));
        const hasAutoRenewPeriod = statuses.some(s => s.includes('autorenewperiod') || s.includes('auto renew period') || s.includes('autorenew'));
        
        // Determine current stage
        let currentStage = 'active';
        if (hasPendingDelete) {
            currentStage = 'pending-delete';
        } else if (hasRedemptionPeriod) {
            currentStage = 'redemption-grace';
        } else if (hasAutoRenewPeriod) {
            currentStage = 'auto-renew-grace';
        }
        
        const stages = [
            {
                id: 'registration',
                label: 'Registration',
                icon: 'fa-pen-fancy',
                color: '#10b981',
                active: true
            },
            {
                id: 'active',
                label: 'Active',
                icon: 'fa-check-circle',
                color: '#3b82f6',
                active: true // Always active (default state)
            },
            {
                id: 'auto-renew-grace',
                label: 'Auto-Renew Grace Period',
                icon: 'fa-clock',
                color: '#ec4899',
                active: hasAutoRenewPeriod || hasRedemptionPeriod || hasPendingDelete
            },
            {
                id: 'redemption-grace',
                label: 'Redemption Grace Period',
                icon: 'fa-exclamation-circle',
                color: '#d946ef',
                active: hasRedemptionPeriod || hasPendingDelete
            },
            {
                id: 'pending-delete',
                label: 'Pending Delete',
                icon: 'fa-trash-alt',
                color: '#f97316',
                active: hasPendingDelete
            }
        ];
        
        return `
            <div class="domain-lifecycle-timeline">
                ${stages.map((stage, index) => {
                    const isActive = stage.active;
                    const isCurrent = stage.id === currentStage;
                    const nextStage = stages[index + 1];
                    // Always show line if there's a next stage
                    const showLine = nextStage !== undefined;
                    // Blue lines for first 2 connections when active, gray otherwise
                    let lineColor;
                    if (index < 2) {
                        // First two connections: blue if both stages are active, gray otherwise
                        lineColor = (isActive && nextStage && nextStage.active) ? '#3b82f6' : '#64748b';
                    } else {
                        // Rest: blue if both stages are active, gray otherwise
                        lineColor = (isActive && nextStage && nextStage.active) ? '#3b82f6' : '#64748b';
                    }
                    
                    return `
                        <div class="lifecycle-stage ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}" data-stage-index="${index}">
                            <div class="lifecycle-stage-content">
                                <div class="lifecycle-icon" style="color: ${stage.color};">
                                    <i class="fas ${stage.icon}"></i>
                                </div>
                                <span class="lifecycle-label">${stage.label}</span>
                            </div>
                            ${showLine ? `
                                <div class="lifecycle-connector" style="background: ${lineColor};" data-line-index="${index}"></div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
}

