export class BackupJobsPage {
    constructor() {
        this.jobs = [];
    }

    async render() {
        return `
            <div class="page-container">
                <div class="page-header">
                    <h1 class="page-title">💾 Backup Jobs</h1>
                    <p class="page-subtitle">Create, schedule, and manage backup jobs</p>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Backup Jobs</h2>
                        <button class="btn btn-primary" onclick="backupJobsInstance.createJob()">
                            <i class="fas fa-plus"></i> Create Job
                        </button>
                    </div>
                    <div class="card-body">
                        <div id="jobs-list" class="jobs-list">
                            <div class="empty-state">
                                <i class="fas fa-save" style="font-size: 3rem; color: var(--gray-light); margin-bottom: 1rem;"></i>
                                <p>No backup jobs configured</p>
                                <p style="color: var(--gray); font-size: 0.9rem;">Click "Create Job" to get started</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.backupJobsInstance = this;
        await this.loadJobs();
    }

    async loadJobs() {
        this.jobs = [];
        this.renderJobs();
    }

    renderJobs() {
        const jobsList = document.getElementById('jobs-list');
        if (this.jobs.length === 0) {
            jobsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-save" style="font-size: 3rem; color: var(--gray-light); margin-bottom: 1rem;"></i>
                    <p>No backup jobs configured</p>
                    <p style="color: var(--gray); font-size: 0.9rem;">Click "Create Job" to get started</p>
                </div>
            `;
        }
    }

    createJob() {
        // Create Backup Job functionality - Coming soon!
        console.log('Create Backup Job functionality - Coming soon!');
    }
}

window.backupJobsInstance = null;

