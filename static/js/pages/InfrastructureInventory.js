export class InfrastructureInventoryPage {
    constructor() {
        this.data = {
            clientName: '',
            clientContact: '',
            date: new Date().toISOString().split('T')[0],
            servers: [],
            networks: [],
            storage: [],
            virtualization: {
                platform: '',
                version: '',
                hosts: [],
                clusters: [],
                vms: []
            },
            dns: []
        };
        this.currentSection = 'client';
        this.showList = true;
        this.inventories = [];
        this.currentInventoryId = null;
    }

    async mount() {
        window.infrastructureInventoryInstance = this;
        await this.loadInventories();
        this.updateDisplay();
    }

    async loadInventories() {
        try {
            const response = await fetch('/api/infrastructure-inventory');
            if (response.ok) {
                this.inventories = await response.json();
            } else {
                console.error('Failed to load inventories');
                this.inventories = [];
            }
        } catch (error) {
            console.error('Error loading inventories:', error);
            this.inventories = [];
        }
    }

    unmount() {
        delete window.infrastructureInventoryInstance;
    }

    updateDisplay() {
        const container = document.getElementById('page-content');
        if (container) {
            container.innerHTML = this.render();
        }
    }

    render() {
        if (this.showList) {
            return this.renderList();
        }
        return this.renderForm();
    }

    renderList() {
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div>
                            <h1 class="page-title">📊 Infrastructure Inventory</h1>
                            <p class="page-subtitle">Manage and generate infrastructure documentation</p>
                        </div>
                        <div class="page-header-actions">
                            <button class="btn btn-primary" onclick="infrastructureInventoryInstance.showForm()">
                                <i class="fas fa-plus"></i> New Inventory
                            </button>
                        </div>
                    </div>
                </div>

                <div class="page-content">
                    <div class="inventories-list">
                        ${this.inventories.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-file-excel" style="font-size: 3rem; color: var(--gray); margin-bottom: 1rem;"></i>
                                <h3>No inventories yet</h3>
                                <p>Create your first infrastructure inventory to get started</p>
                                <button class="btn btn-primary" onclick="infrastructureInventoryInstance.showForm()">
                                    <i class="fas fa-plus"></i> Create Inventory
                                </button>
                            </div>
                        ` : `
                            <div class="inventories-grid">
                                ${this.inventories.map(inv => `
                                    <div class="inventory-card">
                                        <div class="inventory-card-header">
                                            <h3>${inv.clientName || 'Unnamed Client'}</h3>
                                            <div class="inventory-card-actions">
                                                <button class="btn btn-sm btn-primary" onclick="infrastructureInventoryInstance.loadInventory(${inv.id})" title="Edit">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-success" onclick="infrastructureInventoryInstance.generateExcelFromInventory(${inv.id})" title="Generate Excel">
                                                    <i class="fas fa-file-excel"></i>
                                                </button>
                                                <button class="btn btn-sm btn-danger" onclick="infrastructureInventoryInstance.deleteInventory(${inv.id})" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="inventory-card-body">
                                            ${inv.clientContact ? `<p><strong>Contact:</strong> ${inv.clientContact}</p>` : ''}
                                            ${inv.date ? `<p><strong>Date:</strong> ${new Date(inv.date).toLocaleDateString()}</p>` : ''}
                                            <div class="inventory-stats">
                                                <span class="stat-item"><i class="fas fa-server"></i> ${inv.data.servers?.length || 0} Servers</span>
                                                <span class="stat-item"><i class="fas fa-network-wired"></i> ${inv.data.networks?.length || 0} Networks</span>
                                                <span class="stat-item"><i class="fas fa-database"></i> ${inv.data.storage?.length || 0} Storage</span>
                                                ${inv.data.virtualization?.vms?.length > 0 ? `<span class="stat-item"><i class="fas fa-cube"></i> ${inv.data.virtualization.vms.length} VMs</span>` : ''}
                                            </div>
                                            <p class="inventory-meta">
                                                <small>Created: ${new Date(inv.createdAt).toLocaleDateString()}</small>
                                                ${inv.updatedAt !== inv.createdAt ? `<small>Updated: ${new Date(inv.updatedAt).toLocaleDateString()}</small>` : ''}
                                            </p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    renderForm() {
        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div>
                            <h1 class="page-title">📊 Infrastructure Inventory</h1>
                            <p class="page-subtitle">${this.currentInventoryId ? 'Edit' : 'Create'} infrastructure documentation</p>
                        </div>
                        <div class="page-header-actions">
                            <button class="btn btn-secondary" onclick="infrastructureInventoryInstance.showList()">
                                <i class="fas fa-arrow-left"></i> Back to List
                            </button>
                            <button class="btn btn-success" onclick="infrastructureInventoryInstance.saveInventory()">
                                <i class="fas fa-save"></i> ${this.currentInventoryId ? 'Update' : 'Save'} Inventory
                            </button>
                            <button class="btn btn-primary" onclick="infrastructureInventoryInstance.generateExcel()">
                                <i class="fas fa-file-excel"></i> Generate Excel
                            </button>
                        </div>
                    </div>
                </div>

                <div class="page-content">
                    <div class="infrastructure-form">
                        <!-- Client Information -->
                        <div class="form-section">
                            <h2 class="section-title">Client Information</h2>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Client Name *</label>
                                    <input type="text" id="client-name" class="form-input" 
                                           value="${this.data.clientName}" 
                                           onchange="infrastructureInventoryInstance.updateClientName(this.value)">
                                </div>
                                <div class="form-group">
                                    <label>Contact</label>
                                    <input type="text" id="client-contact" class="form-input" 
                                           value="${this.data.clientContact}" 
                                           onchange="infrastructureInventoryInstance.updateClientContact(this.value)">
                                </div>
                                <div class="form-group">
                                    <label>Date</label>
                                    <input type="date" id="inventory-date" class="form-input" 
                                           value="${this.data.date}" 
                                           onchange="infrastructureInventoryInstance.updateDate(this.value)">
                                </div>
                            </div>
                        </div>

                        <!-- Servers Section -->
                        <div class="form-section">
                            <div class="section-header">
                                <h2 class="section-title">Servers</h2>
                                <button class="btn btn-sm btn-primary" onclick="infrastructureInventoryInstance.addServer()">
                                    <i class="fas fa-plus"></i> Add Server
                                </button>
                            </div>
                            <div id="servers-list">
                                ${this.renderServers()}
                            </div>
                        </div>

                        <!-- Networks Section -->
                        <div class="form-section">
                            <div class="section-header">
                                <h2 class="section-title">Networks</h2>
                                <button class="btn btn-sm btn-primary" onclick="infrastructureInventoryInstance.addNetwork()">
                                    <i class="fas fa-plus"></i> Add Network
                                </button>
                            </div>
                            <div id="networks-list">
                                ${this.renderNetworks()}
                            </div>
                        </div>

                        <!-- Storage/SAN Section -->
                        <div class="form-section">
                            <div class="section-header">
                                <h2 class="section-title">Storage / SAN</h2>
                                <button class="btn btn-sm btn-primary" onclick="infrastructureInventoryInstance.addStorage()">
                                    <i class="fas fa-plus"></i> Add Storage
                                </button>
                            </div>
                            <div id="storage-list">
                                ${this.renderStorage()}
                            </div>
                        </div>

                        <!-- Virtualization Section -->
                        <div class="form-section">
                            <div class="section-header">
                                <h2 class="section-title">Virtualization</h2>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Platform</label>
                                    <select id="virtualization-platform" class="form-input" 
                                            onchange="infrastructureInventoryInstance.updateVirtualizationPlatform(this.value)">
                                        <option value="">Select Platform</option>
                                        <option value="Hyper-V" ${this.data.virtualization.platform === 'Hyper-V' ? 'selected' : ''}>Hyper-V</option>
                                        <option value="VMware vSphere" ${this.data.virtualization.platform === 'VMware vSphere' ? 'selected' : ''}>VMware vSphere</option>
                                        <option value="Citrix XenServer" ${this.data.virtualization.platform === 'Citrix XenServer' ? 'selected' : ''}>Citrix XenServer</option>
                                        <option value="KVM" ${this.data.virtualization.platform === 'KVM' ? 'selected' : ''}>KVM</option>
                                        <option value="Other" ${this.data.virtualization.platform === 'Other' ? 'selected' : ''}>Other</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Version</label>
                                    <input type="text" id="virtualization-version" class="form-input" 
                                           value="${this.data.virtualization.version}" 
                                           onchange="infrastructureInventoryInstance.updateVirtualizationVersion(this.value)">
                                </div>
                            </div>

                            <div class="subsection">
                                <div class="section-header">
                                    <h3>Virtualization Hosts</h3>
                                    <button class="btn btn-sm btn-secondary" onclick="infrastructureInventoryInstance.addVirtualizationHost()">
                                        <i class="fas fa-plus"></i> Add Host
                                    </button>
                                </div>
                                <div id="virtualization-hosts-list">
                                    ${this.renderVirtualizationHosts()}
                                </div>
                            </div>

                            <div class="subsection">
                                <div class="section-header">
                                    <h3>Clusters</h3>
                                    <button class="btn btn-sm btn-secondary" onclick="infrastructureInventoryInstance.addCluster()">
                                        <i class="fas fa-plus"></i> Add Cluster
                                    </button>
                                </div>
                                <div id="clusters-list">
                                    ${this.renderClusters()}
                                </div>
                            </div>

                            <div class="subsection">
                                <div class="section-header">
                                    <h3>Virtual Machines</h3>
                                    <button class="btn btn-sm btn-secondary" onclick="infrastructureInventoryInstance.addVM()">
                                        <i class="fas fa-plus"></i> Add VM
                                    </button>
                                </div>
                                <div id="vms-list">
                                    ${this.renderVMs()}
                                </div>
                            </div>
                        </div>

                        <!-- DNS Section -->
                        <div class="form-section">
                            <div class="section-header">
                                <h2 class="section-title">DNS Configuration</h2>
                                <button class="btn btn-sm btn-primary" onclick="infrastructureInventoryInstance.addDNS()">
                                    <i class="fas fa-plus"></i> Add DNS
                                </button>
                            </div>
                            <div id="dns-list">
                                ${this.renderDNS()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderServers() {
        if (this.data.servers.length === 0) {
            return '<p class="empty-message">No servers added yet. Click "Add Server" to get started.</p>';
        }
        const osOptions = ['', 'Windows Server 2016', 'Windows Server 2019', 'Windows Server 2022', 'Windows 10', 'Windows 11', 'Linux Ubuntu', 'Linux CentOS', 'Linux RHEL', 'Linux Debian', 'Linux SUSE', 'VMware ESXi', 'Other'];
        const cpuOptions = ['', '1 Core', '2 Cores', '4 Cores', '6 Cores', '8 Cores', '12 Cores', '16 Cores', '20 Cores', '24 Cores', '32 Cores', '48 Cores', '64 Cores', 'Other'];
        const ramOptions = ['', '2 GB', '4 GB', '8 GB', '16 GB', '32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB', 'Other'];
        
        return this.data.servers.map((server, index) => `
            <div class="item-card-advanced" data-index="${index}">
                <div class="item-card-header">
                    <h4>${server.name || `Server ${index + 1}`}</h4>
                    <button class="btn btn-sm btn-danger" onclick="infrastructureInventoryInstance.removeServer(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="form-grid-advanced">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" class="form-input" value="${server.name || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>IP Address</label>
                        <input type="text" class="form-input" placeholder="192.168.1.100" value="${server.ip || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'ip', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Subnet Mask</label>
                        <input type="text" class="form-input" placeholder="255.255.255.0" value="${server.mask || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'mask', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Gateway</label>
                        <input type="text" class="form-input" placeholder="192.168.1.1" value="${server.gateway || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'gateway', this.value)">
                    </div>
                    <div class="form-group">
                        <label>DNS Server</label>
                        <input type="text" class="form-input" placeholder="8.8.8.8" value="${server.dns || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'dns', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Role</label>
                        <input type="text" class="form-input" placeholder="Domain Controller, File Server, etc." value="${server.role || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'role', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Operating System</label>
                        <select class="form-input" onchange="infrastructureInventoryInstance.updateServer(${index}, 'os', this.value)">
                            ${osOptions.map(os => `<option value="${os}" ${server.os === os ? 'selected' : ''}>${os || 'Select OS'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>CPU</label>
                        <select class="form-input" onchange="infrastructureInventoryInstance.updateServer(${index}, 'cpu', this.value)">
                            ${cpuOptions.map(cpu => `<option value="${cpu}" ${server.cpu === cpu ? 'selected' : ''}>${cpu || 'Select CPU'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>RAM</label>
                        <select class="form-input" onchange="infrastructureInventoryInstance.updateServer(${index}, 'ram', this.value)">
                            ${ramOptions.map(ram => `<option value="${ram}" ${server.ram === ram ? 'selected' : ''}>${ram || 'Select RAM'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Storage</label>
                        <input type="text" class="form-input" placeholder="500 GB, 1 TB, etc." value="${server.storage || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'storage', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select class="form-input" onchange="infrastructureInventoryInstance.updateServer(${index}, 'status', this.value)">
                            <option value="" ${!server.status ? 'selected' : ''}>Select Status</option>
                            <option value="Online" ${server.status === 'Online' ? 'selected' : ''}>Online</option>
                            <option value="Offline" ${server.status === 'Offline' ? 'selected' : ''}>Offline</option>
                            <option value="Maintenance" ${server.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                            <option value="Unknown" ${server.status === 'Unknown' ? 'selected' : ''}>Unknown</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" class="form-input" placeholder="Data Center, Office, etc." value="${server.location || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'location', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" class="form-input" placeholder="Administrator" value="${server.username || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'username', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" class="form-input" placeholder="••••••••" value="${server.password || ''}" 
                               onchange="infrastructureInventoryInstance.updateServer(${index}, 'password', this.value)">
                    </div>
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <textarea class="form-input" rows="3" placeholder="Additional notes or comments..."
                                  onchange="infrastructureInventoryInstance.updateServer(${index}, 'notes', this.value)">${server.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderNetworks() {
        if (this.data.networks.length === 0) {
            return '<p class="empty-message">No networks added yet. Click "Add Network" to get started.</p>';
        }
        return this.data.networks.map((network, index) => `
            <div class="item-card" data-index="${index}">
                <div class="item-card-header">
                    <h4>${network.name || `Network ${index + 1}`}</h4>
                    <button class="btn btn-sm btn-danger" onclick="infrastructureInventoryInstance.removeNetwork(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" class="form-input" value="${network.name || ''}" 
                               onchange="infrastructureInventoryInstance.updateNetwork(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Subnet</label>
                        <input type="text" class="form-input" value="${network.subnet || ''}" 
                               onchange="infrastructureInventoryInstance.updateNetwork(${index}, 'subnet', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Gateway</label>
                        <input type="text" class="form-input" value="${network.gateway || ''}" 
                               onchange="infrastructureInventoryInstance.updateNetwork(${index}, 'gateway', this.value)">
                    </div>
                    <div class="form-group">
                        <label>VLAN</label>
                        <input type="text" class="form-input" value="${network.vlan || ''}" 
                               onchange="infrastructureInventoryInstance.updateNetwork(${index}, 'vlan', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Purpose</label>
                        <input type="text" class="form-input" value="${network.purpose || ''}" 
                               onchange="infrastructureInventoryInstance.updateNetwork(${index}, 'purpose', this.value)">
                    </div>
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <textarea class="form-input" rows="2" 
                                  onchange="infrastructureInventoryInstance.updateNetwork(${index}, 'notes', this.value)">${network.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderStorage() {
        if (this.data.storage.length === 0) {
            return '<p class="empty-message">No storage added yet. Click "Add Storage" to get started.</p>';
        }
        return this.data.storage.map((storage, index) => `
            <div class="item-card" data-index="${index}">
                <div class="item-card-header">
                    <h4>${storage.name || `Storage ${index + 1}`}</h4>
                    <button class="btn btn-sm btn-danger" onclick="infrastructureInventoryInstance.removeStorage(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" class="form-input" value="${storage.name || ''}" 
                               onchange="infrastructureInventoryInstance.updateStorage(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <input type="text" class="form-input" value="${storage.type || ''}" 
                               onchange="infrastructureInventoryInstance.updateStorage(${index}, 'type', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Capacity</label>
                        <input type="text" class="form-input" value="${storage.capacity || ''}" 
                               onchange="infrastructureInventoryInstance.updateStorage(${index}, 'capacity', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Used</label>
                        <input type="text" class="form-input" value="${storage.used || ''}" 
                               onchange="infrastructureInventoryInstance.updateStorage(${index}, 'used', this.value)">
                    </div>
                    <div class="form-group">
                        <label>LUN</label>
                        <input type="text" class="form-input" value="${storage.lun || ''}" 
                               onchange="infrastructureInventoryInstance.updateStorage(${index}, 'lun', this.value)">
                    </div>
                    <div class="form-group">
                        <label>WWN</label>
                        <input type="text" class="form-input" value="${storage.wwn || ''}" 
                               onchange="infrastructureInventoryInstance.updateStorage(${index}, 'wwn', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <input type="text" class="form-input" value="${storage.status || ''}" 
                               onchange="infrastructureInventoryInstance.updateStorage(${index}, 'status', this.value)">
                    </div>
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <textarea class="form-input" rows="2" 
                                  onchange="infrastructureInventoryInstance.updateStorage(${index}, 'notes', this.value)">${storage.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderVirtualizationHosts() {
        if (this.data.virtualization.hosts.length === 0) {
            return '<p class="empty-message">No hosts added yet.</p>';
        }
        return this.data.virtualization.hosts.map((host, index) => `
            <div class="item-card" data-index="${index}">
                <div class="item-card-header">
                    <h4>${host.name || `Host ${index + 1}`}</h4>
                    <button class="btn btn-sm btn-danger" onclick="infrastructureInventoryInstance.removeVirtualizationHost(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" class="form-input" value="${host.name || ''}" 
                               onchange="infrastructureInventoryInstance.updateVirtualizationHost(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>IP Address</label>
                        <input type="text" class="form-input" value="${host.ip || ''}" 
                               onchange="infrastructureInventoryInstance.updateVirtualizationHost(${index}, 'ip', this.value)">
                    </div>
                    <div class="form-group">
                        <label>CPU</label>
                        <input type="text" class="form-input" value="${host.cpu || ''}" 
                               onchange="infrastructureInventoryInstance.updateVirtualizationHost(${index}, 'cpu', this.value)">
                    </div>
                    <div class="form-group">
                        <label>RAM</label>
                        <input type="text" class="form-input" value="${host.ram || ''}" 
                               onchange="infrastructureInventoryInstance.updateVirtualizationHost(${index}, 'ram', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Storage</label>
                        <input type="text" class="form-input" value="${host.storage || ''}" 
                               onchange="infrastructureInventoryInstance.updateVirtualizationHost(${index}, 'storage', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <input type="text" class="form-input" value="${host.status || ''}" 
                               onchange="infrastructureInventoryInstance.updateVirtualizationHost(${index}, 'status', this.value)">
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderClusters() {
        if (this.data.virtualization.clusters.length === 0) {
            return '<p class="empty-message">No clusters added yet.</p>';
        }
        return this.data.virtualization.clusters.map((cluster, index) => `
            <div class="item-card" data-index="${index}">
                <div class="item-card-header">
                    <h4>${cluster.name || `Cluster ${index + 1}`}</h4>
                    <button class="btn btn-sm btn-danger" onclick="infrastructureInventoryInstance.removeCluster(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" class="form-input" value="${cluster.name || ''}" 
                               onchange="infrastructureInventoryInstance.updateCluster(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Nodes</label>
                        <input type="text" class="form-input" value="${cluster.nodes || ''}" 
                               onchange="infrastructureInventoryInstance.updateCluster(${index}, 'nodes', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Quorum</label>
                        <input type="text" class="form-input" value="${cluster.quorum || ''}" 
                               onchange="infrastructureInventoryInstance.updateCluster(${index}, 'quorum', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <input type="text" class="form-input" value="${cluster.status || ''}" 
                               onchange="infrastructureInventoryInstance.updateCluster(${index}, 'status', this.value)">
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderVMs() {
        if (this.data.virtualization.vms.length === 0) {
            return '<p class="empty-message">No VMs added yet.</p>';
        }
        return this.data.virtualization.vms.map((vm, index) => `
            <div class="item-card" data-index="${index}">
                <div class="item-card-header">
                    <h4>${vm.name || `VM ${index + 1}`}</h4>
                    <button class="btn btn-sm btn-danger" onclick="infrastructureInventoryInstance.removeVM(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" class="form-input" value="${vm.name || ''}" 
                               onchange="infrastructureInventoryInstance.updateVM(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Host</label>
                        <input type="text" class="form-input" value="${vm.host || ''}" 
                               onchange="infrastructureInventoryInstance.updateVM(${index}, 'host', this.value)">
                    </div>
                    <div class="form-group">
                        <label>CPU</label>
                        <input type="text" class="form-input" value="${vm.cpu || ''}" 
                               onchange="infrastructureInventoryInstance.updateVM(${index}, 'cpu', this.value)">
                    </div>
                    <div class="form-group">
                        <label>RAM</label>
                        <input type="text" class="form-input" value="${vm.ram || ''}" 
                               onchange="infrastructureInventoryInstance.updateVM(${index}, 'ram', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Storage</label>
                        <input type="text" class="form-input" value="${vm.storage || ''}" 
                               onchange="infrastructureInventoryInstance.updateVM(${index}, 'storage', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <input type="text" class="form-input" value="${vm.status || ''}" 
                               onchange="infrastructureInventoryInstance.updateVM(${index}, 'status', this.value)">
                    </div>
                    <div class="form-group">
                        <label>OS</label>
                        <input type="text" class="form-input" value="${vm.os || ''}" 
                               onchange="infrastructureInventoryInstance.updateVM(${index}, 'os', this.value)">
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderDNS() {
        if (this.data.dns.length === 0) {
            return '<p class="empty-message">No DNS entries added yet. Click "Add DNS" to get started.</p>';
        }
        return this.data.dns.map((dns, index) => `
            <div class="item-card" data-index="${index}">
                <div class="item-card-header">
                    <h4>${dns.domain || `DNS ${index + 1}`}</h4>
                    <button class="btn btn-sm btn-danger" onclick="infrastructureInventoryInstance.removeDNS(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Domain</label>
                        <input type="text" class="form-input" value="${dns.domain || ''}" 
                               onchange="infrastructureInventoryInstance.updateDNS(${index}, 'domain', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Primary DNS</label>
                        <input type="text" class="form-input" value="${dns.primaryDNS || ''}" 
                               onchange="infrastructureInventoryInstance.updateDNS(${index}, 'primaryDNS', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Secondary DNS</label>
                        <input type="text" class="form-input" value="${dns.secondaryDNS || ''}" 
                               onchange="infrastructureInventoryInstance.updateDNS(${index}, 'secondaryDNS', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Purpose</label>
                        <input type="text" class="form-input" value="${dns.purpose || ''}" 
                               onchange="infrastructureInventoryInstance.updateDNS(${index}, 'purpose', this.value)">
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Update methods
    updateClientName(value) { this.data.clientName = value; }
    updateClientContact(value) { this.data.clientContact = value; }
    updateDate(value) { this.data.date = value; }
    updateVirtualizationPlatform(value) { this.data.virtualization.platform = value; }
    updateVirtualizationVersion(value) { this.data.virtualization.version = value; }

    // Server methods
    addServer() {
        this.data.servers.push({ name: '', ip: '', mask: '', gateway: '', dns: '', role: '', os: '', cpu: '', ram: '', storage: '', status: '', location: '', username: '', password: '', notes: '' });
        this.updateDisplay();
    }
    removeServer(index) {
        this.data.servers.splice(index, 1);
        this.updateDisplay();
    }
    updateServer(index, field, value) {
        if (this.data.servers[index]) {
            this.data.servers[index][field] = value;
        }
    }

    // Network methods
    addNetwork() {
        this.data.networks.push({ name: '', subnet: '', gateway: '', vlan: '', purpose: '', notes: '' });
        this.updateDisplay();
    }
    removeNetwork(index) {
        this.data.networks.splice(index, 1);
        this.updateDisplay();
    }
    updateNetwork(index, field, value) {
        if (this.data.networks[index]) {
            this.data.networks[index][field] = value;
        }
    }

    // Storage methods
    addStorage() {
        this.data.storage.push({ name: '', type: '', capacity: '', used: '', lun: '', wwn: '', status: '', notes: '' });
        this.updateDisplay();
    }
    removeStorage(index) {
        this.data.storage.splice(index, 1);
        this.updateDisplay();
    }
    updateStorage(index, field, value) {
        if (this.data.storage[index]) {
            this.data.storage[index][field] = value;
        }
    }

    // Virtualization methods
    addVirtualizationHost() {
        this.data.virtualization.hosts.push({ name: '', ip: '', cpu: '', ram: '', storage: '', status: '' });
        this.updateDisplay();
    }
    removeVirtualizationHost(index) {
        this.data.virtualization.hosts.splice(index, 1);
        this.updateDisplay();
    }
    updateVirtualizationHost(index, field, value) {
        if (this.data.virtualization.hosts[index]) {
            this.data.virtualization.hosts[index][field] = value;
        }
    }

    addCluster() {
        this.data.virtualization.clusters.push({ name: '', nodes: '', quorum: '', status: '' });
        this.updateDisplay();
    }
    removeCluster(index) {
        this.data.virtualization.clusters.splice(index, 1);
        this.updateDisplay();
    }
    updateCluster(index, field, value) {
        if (this.data.virtualization.clusters[index]) {
            this.data.virtualization.clusters[index][field] = value;
        }
    }

    addVM() {
        this.data.virtualization.vms.push({ name: '', host: '', cpu: '', ram: '', storage: '', status: '', os: '' });
        this.updateDisplay();
    }
    removeVM(index) {
        this.data.virtualization.vms.splice(index, 1);
        this.updateDisplay();
    }
    updateVM(index, field, value) {
        if (this.data.virtualization.vms[index]) {
            this.data.virtualization.vms[index][field] = value;
        }
    }

    // DNS methods
    addDNS() {
        this.data.dns.push({ domain: '', primaryDNS: '', secondaryDNS: '', purpose: '' });
        this.updateDisplay();
    }
    removeDNS(index) {
        this.data.dns.splice(index, 1);
        this.updateDisplay();
    }
    updateDNS(index, field, value) {
        if (this.data.dns[index]) {
            this.data.dns[index][field] = value;
        }
    }

    // Navigation methods
    showList() {
        this.showList = true;
        this.currentInventoryId = null;
        this.loadInventories().then(() => this.updateDisplay());
    }

    showForm() {
        this.showList = false;
        this.currentInventoryId = null;
        // Reset data for new inventory
        this.data = {
            clientName: '',
            clientContact: '',
            date: new Date().toISOString().split('T')[0],
            servers: [],
            networks: [],
            storage: [],
            virtualization: {
                platform: '',
                version: '',
                hosts: [],
                clusters: [],
                vms: []
            },
            dns: []
        };
        this.updateDisplay();
    }

    // Save/Load methods
    async saveInventory() {
        if (!this.data.clientName) {
            alert('Please enter a client name');
            return;
        }

        try {
            const url = '/api/infrastructure-inventory';
            const method = this.currentInventoryId ? 'PUT' : 'POST';
            
            const payload = this.currentInventoryId ? {
                id: this.currentInventoryId,
                data: this.data
            } : this.data;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save inventory: ${errorText}`);
            }

            const saved = await response.json();
            alert(`Inventory ${this.currentInventoryId ? 'updated' : 'saved'} successfully!`);
            this.currentInventoryId = saved.id;
            await this.loadInventories();
        } catch (error) {
            console.error('Error saving inventory:', error);
            alert(`Error saving inventory: ${error.message}`);
        }
    }

    async loadInventory(id) {
        try {
            const response = await fetch(`/api/infrastructure-inventory?id=${id}`);
            if (!response.ok) {
                throw new Error('Failed to load inventory');
            }

            const inventory = await response.json();
            this.currentInventoryId = inventory.id;
            this.data = inventory.data;
            this.showList = false;
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading inventory:', error);
            alert(`Error loading inventory: ${error.message}`);
        }
    }

    async deleteInventory(id) {
        if (!confirm('Are you sure you want to delete this inventory? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/infrastructure-inventory?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete inventory: ${errorText}`);
            }

            alert('Inventory deleted successfully!');
            await this.loadInventories();
            this.updateDisplay();
        } catch (error) {
            console.error('Error deleting inventory:', error);
            alert(`Error deleting inventory: ${error.message}`);
        }
    }

    async generateExcelFromInventory(id) {
        try {
            const response = await fetch(`/api/infrastructure-inventory?id=${id}`);
            if (!response.ok) {
                throw new Error('Failed to load inventory');
            }

            const inventory = await response.json();
            await this.generateExcelWithData(inventory.data);
        } catch (error) {
            console.error('Error generating Excel from inventory:', error);
            alert(`Error generating Excel: ${error.message}`);
        }
    }

    // Generate Excel
    async generateExcel() {
        if (!this.data.clientName) {
            alert('Please enter a client name');
            return;
        }

        await this.generateExcelWithData(this.data);
    }

    async generateExcelWithData(data) {
        try {
            const response = await fetch('/api/infrastructure-inventory/generate-excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate Excel: ${errorText}`);
            }

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'Infrastructure_Inventory.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename=(.+)/);
                if (filenameMatch) {
                    filename = filenameMatch[1].replace(/"/g, '');
                }
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            alert('Excel file generated successfully!');
        } catch (error) {
            console.error('Error generating Excel:', error);
            alert(`Error generating Excel file: ${error.message}`);
        }
    }
}

