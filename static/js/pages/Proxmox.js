export class ProxmoxPage {
    constructor() {
        this.clusters = [];
    }

    async render() {
        return `
            <div class="page-container">
                <div class="page-header">
                    <h1 class="page-title">📦 Proxmox Manager</h1>
                    <p class="page-subtitle">Manage Proxmox VE clusters, nodes, and virtual machines</p>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Proxmox Clusters</h2>
                        <button class="btn btn-primary" onclick="proxmoxInstance.addCluster()">
                            <i class="fas fa-plus"></i> Add Cluster
                        </button>
                    </div>
                    <div class="card-body">
                        <div id="clusters-list" class="clusters-list">
                            <div class="empty-state">
                                <i class="fas fa-box" style="font-size: 3rem; color: var(--gray-light); margin-bottom: 1rem;"></i>
                                <p>No Proxmox clusters configured</p>
                                <p style="color: var(--gray); font-size: 0.9rem;">Click "Add Cluster" to get started</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.proxmoxInstance = this;
        await this.loadClusters();
    }

    async loadClusters() {
        // TODO: Implement API call to load Proxmox clusters
        this.clusters = [];
        this.renderClusters();
    }

    renderClusters() {
        const clustersList = document.getElementById('clusters-list');
        if (this.clusters.length === 0) {
            clustersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box" style="font-size: 3rem; color: var(--gray-light); margin-bottom: 1rem;"></i>
                    <p>No Proxmox clusters configured</p>
                    <p style="color: var(--gray); font-size: 0.9rem;">Click "Add Cluster" to get started</p>
                </div>
            `;
        }
    }

    addCluster() {
        // Add Cluster functionality - Coming soon!
        console.log('Add Cluster functionality - Coming soon!');
    }
}

window.proxmoxInstance = null;

