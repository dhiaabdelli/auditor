
import { NetworkInterfacesPage } from './NetworkInterfaces.js';
import { NetworkOverviewPage } from './NetworkOverview.js';

export class OverviewPage {
    constructor() {
        this.currentView = 'network-overview'; // Default view
        this.networkOverviewInstance = null;
        this.networkInterfacesInstance = null;

        // Determine current view from URL
        const currentPage = window.appInstance?.currentPage || 'controller';
        if (currentPage === 'network-overview') {
            this.currentView = 'network-overview';
        } else if (currentPage === 'network-interfaces') {
            // Use dedicated network-interfaces page
            this.currentView = 'network-interfaces';
        } else {
            // Default to network-overview when accessing 'controller'
            this.currentView = 'network-overview';
        }
    }

    async render() {
        // Render the appropriate sub-app based on current view
        if (this.currentView === 'network-overview') {
            this.networkOverviewInstance = new NetworkOverviewPage();
            return await this.networkOverviewInstance.render();
        } else if (this.currentView === 'network-interfaces') {
            this.networkInterfacesInstance = new NetworkInterfacesPage();
            return await this.networkInterfacesInstance.render();
        } else {
            // Default to Network Overview
            this.networkOverviewInstance = new NetworkOverviewPage();
            return await this.networkOverviewInstance.render();
        }
    }

    async mount() {
        // Mount the appropriate sub-app
        if (this.currentView === 'network-overview' && this.networkOverviewInstance) {
            window.networkOverviewInstance = this.networkOverviewInstance;
            if (this.networkOverviewInstance.mount) {
                await this.networkOverviewInstance.mount();
            }
        } else if (this.currentView === 'network-interfaces' && this.networkInterfacesInstance) {
            window.networkInterfacesInstance = this.networkInterfacesInstance;
            if (this.networkInterfacesInstance.mount) {
                await this.networkInterfacesInstance.mount();
            }
        }
    }

    async cleanup() {
        // Cleanup any active sub-views
        if (this.networkOverviewInstance) {
            if (this.networkOverviewInstance.unmount) {
                await this.networkOverviewInstance.unmount();
            }
            this.networkOverviewInstance = null;
        }



        if (this.networkInterfacesInstance) {
            if (this.networkInterfacesInstance.unmount) {
                await this.networkInterfacesInstance.unmount();
            }
            this.networkInterfacesInstance = null;
        }
    }

    async unmount() {
        await this.cleanup();
    }
}
