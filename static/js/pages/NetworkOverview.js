export class NetworkOverviewPage {
    constructor() {
        this.metrics = null;
        this.refreshInterval = null;
        this.animationFrame = null;
        this.particles = [];
        this.activeConnection = 'wifi'; // 'wifi' or 'ethernet'
    }

    async render() {
        return `
            <div class="page-container-full" style="padding: 0; display: flex; height: calc(100vh - 110px); overflow: hidden;">
                <!-- LEFT SIDEBAR -->
                <div style="width: 260px; min-width: 260px; background: var(--bg); border-right: 1px solid rgba(148, 163, 184, 0.1); display: flex; flex-direction: column; overflow-y: auto; z-index: 20; box-shadow: 4px 0 24px rgba(0,0,0,0.2);">
                    <div style="padding: 1.75rem 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
                        <div style="margin-bottom: 0.75rem; position: relative; display: inline-block;">
                           <img src="/images/gateway-server.png" style="width: 100px; height: auto; display: block; filter: drop-shadow(0 0 15px rgba(96, 165, 250, 0.3));">
                           <div style="position: absolute; bottom: 6px; right: 6px; width: 12px; height: 12px; background: #10b981; border-radius: 50%; border: 2.5px solid #0f172a;"></div>
                        </div>
                        
                        <!-- Integrated Metrics -->
                        <div style="text-align: left; margin-top: 0.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                                <span style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Uptime</span>
                                <span id="sidebar-uptime" style="font-size: 0.7rem; color: #e2e8f0; font-weight: 600; font-family: 'JetBrains Mono', monospace;">--</span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">CPU</span>
                                        <span id="sidebar-cpu-text" style="font-size: 0.65rem; color: #38bdf8; font-weight: 800;">--</span>
                                    </div>
                                    <div style="height: 3px; background: rgba(148, 163, 184, 0.1); border-radius: 1.5px; overflow: hidden;">
                                        <div id="sidebar-cpu-bar" style="height: 100%; width: 0%; background: #38bdf8; transition: width 0.5s;"></div>
                                    </div>
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">RAM</span>
                                        <span id="sidebar-ram-text" style="font-size: 0.65rem; color: #10b981; font-weight: 800;">--</span>
                                    </div>
                                    <div style="height: 3px; background: rgba(148, 163, 184, 0.1); border-radius: 1.5px; overflow: hidden;">
                                        <div id="sidebar-ram-bar" style="height: 100%; width: 0%; background: #10b981; transition: width 0.5s;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="padding: 0; flex: 1;">

                        <!-- Internet Section -->
                        <div style="padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 0.5rem;">
                            <div style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 0.4rem; letter-spacing: 0.05em;">Internet</div>
                            
                            <!-- ISP -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                                <span style="font-size: 0.7rem; color: #94a3b8;">ISP</span>
                                <div style="display: flex; align-items: center; gap: 0.4rem;">
                                    <i class="fas fa-globe" style="color: #38bdf8; font-size: 0.7rem;"></i>
                                    <span id="sidebar-isp" style="font-size: 0.75rem; color: #f1f5f9; font-weight: 600;">...</span>
                                </div>
                            </div>

                            <!-- Public IP -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                                <span style="font-size: 0.7rem; color: #94a3b8;">Public IP</span>
                                <div id="sidebar-wan-ip" style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #e2e8f0;">Loading...</div>
                            </div>

                            <!-- Gateway -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <span style="font-size: 0.7rem; color: #94a3b8;">Gateway</span>
                                <div id="sidebar-gateway-ip" style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #e2e8f0;">...</div>
                            </div>
                            <div style="display: flex; justify-content: space-between; gap: 0.4rem; margin-top: 0.75rem; padding-bottom: 0.25rem;" id="sidebar-ping-stats">
                                <!-- Microsoft -->
                                <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; color: #94a3b8;">
                                    <i class="fab fa-microsoft" style="color: #00a4ef;"></i> 
                                    <span id="ping-microsoft" style="font-family: 'JetBrains Mono', monospace;">--</span>
                                </div>
                                <!-- Google -->
                                <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; color: #94a3b8;">
                                    <i class="fab fa-google" style="color: #ea4335;"></i> 
                                    <span id="ping-google" style="font-family: 'JetBrains Mono', monospace;">--</span>
                                </div>
                                <!-- Cloudflare -->
                                <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; color: #94a3b8;">
                                    <i class="fas fa-cloud" style="color: #f59e0b;"></i> 
                                    <span id="ping-cloudflare" style="font-family: 'JetBrains Mono', monospace;">--</span>
                                </div>
                            </div>
                        </div>

                        <!-- Access Point Section -->
                        <div style="padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 0.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                                <div style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.5rem;">
                                    Access Point
                                </div>
                                <button onclick="window.appInstance?.navigateTo('wifi-manager')" style="background: transparent; border: none; color: #64748b; padding: 0; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#60a5fa'" onmouseout="this.style.color='#64748b'">
                                    Configure
                                </button>
                            </div>
                            
                            <!-- SSID -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <span style="font-size: 0.7rem; color: #94a3b8;">SSID</span>
                                <div style="display: flex; align-items: center; gap: 0.4rem;">
                                    <i class="fas fa-wifi" style="color: #60a5fa; font-size: 0.7rem;"></i>
                                    <span id="sidebar-ap-ssid" style="font-size: 0.75rem; color: #f1f5f9; font-weight: 600;">--</span>
                                </div>
                            </div>

                            <!-- Mode -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <span style="font-size: 0.7rem; color: #94a3b8;">Mode</span>
                                <div id="sidebar-ap-mode" style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #e2e8f0;">--</div>
                            </div>

                            <!-- Clients -->
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.7rem; color: #94a3b8;">Clients</span>
                                <div style="display: flex; align-items: center; gap: 0.4rem;">
                                    <i class="fas fa-users" style="color: #10b981; font-size: 0.65rem;"></i>
                                    <span id="sidebar-ap-clients" style="font-size: 0.75rem; color: #10b981; font-weight: 600;">0</span>
                                </div>
                            </div>
                        </div>



                    </div>
                </div>

                <!-- MAIN CONTENT -->
                <div style="flex: 1; overflow-y: auto; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; background: var(--bg);">
                    <!-- Top Row: Visualization & Status -->
                    <div style="display: flex; gap: 0.1rem; align-items: stretch; min-height: 300px;">
                        
                        <!-- Network Flow Visualization (Half Width) -->
                        <div style="flex: 1; width: 50%; min-width: 0; display: flex; flex-direction: column;">
                            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 0.75rem; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-project-diagram" style="color: #60a5fa;"></i>
                                Network Topology & Flow
                            </div>
                            <div class="network-flow-wrapper" style="flex: 1; background: linear-gradient(180deg, var(--card-bg) 0%, var(--bg) 100%); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                                <svg id="network-flow-svg" class="network-flow-svg" viewBox="0 0 1800 500" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: 300px;">
                                    <defs>
                                        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" style="stop-color:#334155;stop-opacity:0.2" />
                                            <stop offset="50%" style="stop-color:#60a5fa;stop-opacity:0.8" />
                                            <stop offset="100%" style="stop-color:#334155;stop-opacity:0.2" />
                                        </linearGradient>
                                        
                                        <filter id="techGlow">
                                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>

                                        <!-- Icon Definitions (Standard FontAwesome Paths) -->
                                        <symbol id="icon-wifi" viewBox="0 0 640 512">
                                            <path d="M634.91 154.88C457.74-8.99 182.19-8.93 5.09 154.88c-6.66 6.16-6.79 16.59-.35 22.98l56.85 56.3c6.35 6.27 16.38 6.28 22.84.14C240.37 99.51 400.01 99.62 555.57 234.3c6.46 6.14 16.49 6.13 22.84-.14l56.85-56.3c6.44-6.39 6.31-16.82-.35-22.98zM320 352c-35.35 0-64 28.65-64 64s28.65 64 64 64 64-28.65 64-64-28.65-64-64-64zm202.67-83.59c-111.88-101.52-293.4-101.8-405.34.01-6.4 5.86-6.67 15.68-.42 21.84l56.32 55.45c6.51 6.39 16.96 6.25 23.36.19 61.99-52.92 165.73-53.11 226.79.19 6.4 6.06 16.85 6.2 23.36-.19l56.32-55.45c6.25-6.16 5.98-15.98-.38-21.85z"/>
                                        </symbol>

                                        <symbol id="icon-ethernet" viewBox="0 0 640 512">
                                            <path d="M640 264v-16c0-8.84-7.16-16-16-16H344v-40h72c17.67 0 32-14.33 32-32V32c0-17.67-14.33-32-32-32H224c-17.67 0-32 14.33-32 32v120c0 17.67 14.33 32 32 32h72v40H16c-8.84 0-16 7.16-16 16v16c0 8.84 7.16 16 16 16h32v80c0 17.67 14.33 32 32 32h96c17.67 0 32-14.33 32-32v-80h64v80c0 17.67 14.33 32 32 32h96c17.67 0 32-14.33 32-32v-80h32c8.84 0 16-7.16 16-16zm-176-88V64h-96v112h96zM96 448v-32h32v32H96zm160 0v-32h32v32h-32zm160 0v-32h32v32h-32z"/>
                                        </symbol>

                                        <symbol id="icon-gateway" viewBox="0 0 512 512">
                                            <path d="M480 160H32c-17.673 0-32-14.327-32-32V64c0-17.673 14.327-32 32-32h448c17.673 0 32 14.327 32 32v64c0 17.673-14.327 32-32 32zm-48-88c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm-64 0c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm112 248H32c-17.673 0-32-14.327-32-32v-64c0-17.673 14.327-32 32-32h448c17.673 0 32 14.327 32 32v64c0 17.673-14.327 32-32 32zm-48-88c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm-64 0c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm112 248H32c-17.673 0-32-14.327-32-32v-64c0-17.673 14.327-32 32-32h448c17.673 0 32 14.327 32 32v64c0 17.673-14.327 32-32 32zm-48-88c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm-64 0c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24z"/>
                                        </symbol>

                                        <symbol id="icon-internet" viewBox="0 0 496 512">
                                            <path d="M336.5 160C322 70.7 287.8 8 248 8s-74 62.7-88.5 152h177zM152 256c0 22.2 1.2 43.5 3.3 64h185.3c2.1-20.5 3.3-41.8 3.3-64s-1.2-43.5-3.3-64H155.3c-2.1 20.5-3.3 41.8-3.3 64zm324.7-96c-28.6-67.9-86.5-120.4-158-141.6 24.4 33.8 41.2 84.7 50 141.6h108zM177.2 18.4C105.8 39.6 47.8 92.1 19.3 160h108c8.8-56.9 25.6-107.8 50-141.6zM487.4 192H372.7c2.1 21 3.3 42.4 3.3 64s-1.2 43-3.3 64h114.6c5.5-20.5 8.6-41.8 8.6-64s-3.1-43.5-8.5-64zM120 256c0-21.6 1.2-43 3.3-64H8.6C3.2 212.5 0 233.8 0 256s3.2 43.5 8.6 64h114.6c-2-21-3.2-42.4-3.2-64zm39.5 96c14.5 89.3 48.7 152 88.5 152s74-62.7 88.5-152h-177zm159.3 141.6c71.4-21.2 129.4-73.7 158-141.6h-108c-8.8 56.9-25.6 107.8-50 141.6zM19.3 352c28.6 67.9 86.5 120.4 158 141.6-24.4-33.8-41.2-84.7-50-141.6h-108z"/>
                                        </symbol>
                                    </defs>

                                    <!-- Tech Grid Background -->
                                    <path d="M 0,250 L 1800,250" stroke="#1e293b" stroke-width="1.5" />
                                    <path d="M 900,0 L 900,500" stroke="#1e293b" stroke-width="1.5" />

                                    <!-- PATHS: Gateway -> WiFi -> Internet -->
                                    <g id="wifi-flow-group" style="transition: all 0.5s ease;">
                                        <path id="gw-wifi-tunnel" d="M 120,250 C 475,250 475,100 900,100" stroke="#818cf8" stroke-width="14" fill="none" opacity="0.15" stroke-linecap="round"/>
                                        <path id="gw-wifi-path" d="M 120,250 C 475,250 475,100 900,100" stroke="#c7d2fe" stroke-width="5" fill="none" stroke-dasharray="20 80" stroke-dashoffset="1000" stroke-linecap="round" filter="url(#techGlow)" style="transition: opacity 0.5s ease;">
                                            <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="1.2s" repeatCount="indefinite"/>
                                        </path>
                                        
                                        <path id="wifi-int-tunnel" d="M 900,100 C 1325,100 1325,250 1680,250" stroke="#60a5fa" stroke-width="14" fill="none" opacity="0.15" stroke-linecap="round"/>
                                        <path id="wifi-int-path" d="M 900,100 C 1325,100 1325,250 1680,250" stroke="#bae6fd" stroke-width="5" fill="none" stroke-dasharray="20 80" stroke-dashoffset="1000" stroke-linecap="round" filter="url(#techGlow)" style="transition: opacity 0.5s ease;">
                                            <animate attributeName="stroke-dashoffset" from="500" to="0" dur="1.2s" repeatCount="indefinite"/>
                                        </path>
                                    </g>

                                    <!-- PATHS: Gateway -> Ethernet -> Internet -->
                                    <g id="eth-flow-group" style="transition: all 0.5s ease;">
                                        <path id="gw-eth-tunnel" d="M 120,250 C 475,250 475,400 900,400" stroke="#34d399" stroke-width="14" fill="none" opacity="0.15" stroke-linecap="round"/>
                                        <path id="gw-eth-path" d="M 120,250 C 475,250 475,400 900,400" stroke="#d1fae5" stroke-width="5" fill="none" stroke-dasharray="20 80" stroke-dashoffset="1000" stroke-linecap="round" filter="url(#techGlow)" style="transition: opacity 0.5s ease;">
                                            <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="1.2s" repeatCount="indefinite"/>
                                        </path>
                                        
                                        <path id="eth-int-tunnel" d="M 900,400 C 1325,400 1325,250 1680,250" stroke="#60a5fa" stroke-width="14" fill="none" opacity="0.15" stroke-linecap="round"/>
                                        <path id="eth-int-path" d="M 900,400 C 1325,400 1325,250 1680,250" stroke="#bae6fd" stroke-width="5" fill="none" stroke-dasharray="20 80" stroke-dashoffset="1000" stroke-linecap="round" filter="url(#techGlow)" style="transition: opacity 0.5s ease;">
                                            <animate attributeName="stroke-dashoffset" from="500" to="0" dur="1.2s" repeatCount="indefinite"/>
                                        </path>
                                    </g>

                                    <!-- Node 1: Gateway -->
                                    <g id="gateway-node" class="network-node" transform="translate(120, 250)" onclick="window.appInstance?.navigateTo('network-interfaces')">
                                        <title>Management Gateway - Click for Interfaces</title>
                                        <path d="M0 -70 L60 -35 L60 35 L0 70 L-60 35 L-60 -35 Z" fill="var(--card-bg)" stroke="#60a5fa" stroke-width="4" filter="url(#techGlow)"/>
                                        <path d="M0 -50 L42 -25 L42 25 L0 50 L-42 25 L-42 -25 Z" fill="var(--primary-dark)" opacity="0.3"/>
                                        <use href="#icon-gateway" x="-30" y="-30" width="60" height="60" fill="#dbeafe"/>
                                        <text x="0" y="105" text-anchor="middle" fill="#f8fafc" font-size="20" font-weight="900" letter-spacing="1.5px">GATEWAY</text>
                                        <text x="0" y="130" text-anchor="middle" fill="#60a5fa" font-size="14" font-weight="700" id="gateway-status">ACTIVE</text>
                                    </g>

                                    <!-- Node 2: WiFi -->
                                    <g id="wifi-node" class="network-node" transform="translate(900, 100)" onclick="window.networkOverviewInstance.toggleConnection('wifi')">
                                        <title>WiFi Connection - Click to Activate</title>
                                        <text x="0" y="-85" text-anchor="middle" fill="#10b981" font-size="16" font-weight="700" id="wifi-node-status">CONNECTED</text>
                                        
                                        <path d="M0 -60 L52 -30 L52 30 L0 60 L-52 30 L-52 -30 Z" fill="var(--card-bg)" stroke="#818cf8" stroke-width="3" filter="url(#techGlow)"/>
                                        <path d="M0 -44 L38 -22 L38 22 L0 44 L-38 22 L-38 -22 Z" fill="#312e81" opacity="0.3"/>
                                        <use href="#icon-wifi" x="-25" y="-25" width="50" height="50" fill="#c7d2fe"/>
                                        <text x="0" y="95" text-anchor="middle" fill="#f8fafc" font-size="20" font-weight="800" letter-spacing="1px">WIFI</text>
                                    </g>

                                    <!-- Node 3: Ethernet -->
                                    <g id="ethernet-node" class="network-node" transform="translate(900, 400)" onclick="window.networkOverviewInstance.toggleConnection('ethernet')">
                                        <title>Ethernet Connection - Click to Activate</title>
                                        <path d="M0 -60 L52 -30 L52 30 L0 60 L-52 30 L-52 -30 Z" fill="var(--card-bg)" stroke="#34d399" stroke-width="3" filter="url(#techGlow)"/>
                                        <path d="M0 -44 L38 -22 L38 22 L0 44 L-38 22 L-38 -22 Z" fill="#064e3b" opacity="0.3"/>
                                        <use href="#icon-ethernet" x="-25" y="-25" width="50" height="50" fill="#d1fae5"/>
                                        <text x="0" y="-85" text-anchor="middle" fill="#f8fafc" font-size="18" font-weight="800" letter-spacing="1px">ETH</text>
                                        <text x="0" y="-110" text-anchor="middle" fill="#34d399" font-size="16" font-weight="700" id="eth-node-status">CONNECTED</text>
                                    </g>

                                    <!-- Node 4: Internet -->
                                    <g id="internet-node" class="network-node" transform="translate(1680, 250)" onclick="window.networkOverviewInstance.runSpeedTest()">
                                        <title>Cloud Internet - Click to Test Speed</title>
                                        <path d="M0 -60 L52 -30 L52 30 L0 60 L-52 30 L-52 -30 Z" fill="var(--card-bg)" stroke="#38bdf8" stroke-width="3" filter="url(#techGlow)"/>
                                        <path d="M0 -44 L38 -22 L38 22 L0 44 L-38 22 L-38 -22 Z" fill="#0c4a6e" opacity="0.3"/>
                                        <use href="#icon-internet" x="-25" y="-25" width="50" height="50" fill="#e0f2fe"/>
                                        <text x="0" y="105" text-anchor="middle" fill="#f8fafc" font-size="20" font-weight="800" letter-spacing="1.5px">INTERNET</text>
                                    </g>
                                </svg>
                            </div>
                        </div>

                        <!-- Right Column: Network Pulse & Health -->
                        <div style="flex: 1; width: 50%; min-width: 0; display: flex; flex-direction: column;">
                            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 0.75rem; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-heartbeat" style="color: #ef4444;"></i>
                                Network Pulse & Latency
                            </div>
                            <div style="flex: 1; background: rgba(30, 41, 59, 0.2); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                                
                                <!-- Connection Health Card -->
                                <div style="background: rgba(15, 23, 42, 0.4); border-radius: 10px; padding: 0.85rem; border: 1px solid rgba(255,255,255,0.05);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <div id="health-outer-pulse" style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981;"></div>
                                            <span style="font-size: 0.75rem; color: #e2e8f0; font-weight: 700;">Connection Integrity</span>
                                        </div>
                                        <span id="health-percentage" style="font-size: 0.85rem; color: #10b981; font-weight: 800; font-family: 'JetBrains Mono', monospace;">100%</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem;">
                                        <div id="health-progress-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); transition: width 1s ease;"></div>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #64748b;">
                                        <span>Packet Loss: <span id="pulse-packet-loss" style="color: #e2e8f0;">0.0%</span></span>
                                        <span>Jitter: <span id="pulse-jitter" style="color: #e2e8f0;">2ms</span></span>
                                    </div>
                                </div>

                                <!-- Real-time Latency Sparklines (Simplified) -->
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; flex: 1;">
                                    <!-- Google Monitor -->
                                    <div style="background: rgba(15, 23, 42, 0.25); border-radius: 8px; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.03); display: flex; flex-direction: column; justify-content: center;">
                                        <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem;">
                                            <i class="fab fa-google" style="color: #ea4335; font-size: 0.7rem;"></i>
                                            <span style="font-size: 0.6rem; color: #94a3b8; font-weight: 700;">GOOGLE DNS</span>
                                        </div>
                                        <div style="display: flex; align-items: baseline; gap: 0.25rem;">
                                            <span id="pulse-ping-google" style="font-size: 1.15rem; color: #f1f5f9; font-weight: 800; font-family: 'JetBrains Mono', monospace;">--</span>
                                            <span style="font-size: 0.55rem; color: #64748b; font-weight: 600;">ms</span>
                                        </div>
                                    </div>

                                    <!-- Cloudflare Monitor -->
                                    <div style="background: rgba(15, 23, 42, 0.25); border-radius: 8px; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.03); display: flex; flex-direction: column; justify-content: center;">
                                        <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem;">
                                            <i class="fas fa-cloud" style="color: #f59e0b; font-size: 0.7rem;"></i>
                                            <span style="font-size: 0.6rem; color: #94a3b8; font-weight: 700;">CLOUDFLARE</span>
                                        </div>
                                        <div style="display: flex; align-items: baseline; gap: 0.25rem;">
                                            <span id="pulse-ping-cloudflare" style="font-size: 1.15rem; color: #f1f5f9; font-weight: 800; font-family: 'JetBrains Mono', monospace;">--</span>
                                            <span style="font-size: 0.55rem; color: #64748b; font-weight: 600;">ms</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Active Distribution -->
                                <div style="padding: 0.5rem 0; border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; flex-direction: column;">
                                        <span style="font-size: 0.55rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Active Channel</span>
                                        <span id="pulse-active-channel" style="font-size: 0.75rem; color: #38bdf8; font-weight: 700;">WLAN0 (5GHz)</span>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="font-size: 0.55rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Signal Level</span>
                                        <div style="display: flex; align-items: center; gap: 0.2rem;">
                                            <div id="pulse-sig-1" style="width: 3px; height: 4px; background: #10b981; border-radius: 1px;"></div>
                                            <div id="pulse-sig-2" style="width: 3px; height: 7px; background: #10b981; border-radius: 1px;"></div>
                                            <div id="pulse-sig-3" style="width: 3px; height: 10px; background: #10b981; border-radius: 1px;"></div>
                                            <div id="pulse-sig-4" style="width: 3px; height: 13px; background: #10b981; border-radius: 1px;"></div>
                                            <div id="pulse-sig-5" style="width: 3px; height: 16px; background: rgba(255,255,255,0.1); border-radius: 1px;"></div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <!-- Bottom Row: Performance & Traffic -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                        <!-- WiFi Metrics -->
                        <div style="background: rgba(30, 41, 59, 0.2); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; padding: 0.75rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <span style="font-size: 0.75rem; color: #818cf8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">WiFi Traffic</span>
                                <i class="fas fa-wifi" style="color: #818cf8; opacity: 0.5;"></i>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="font-size: 0.75rem; color: #94a3b8;">DOWNLOAD</span>
                                <span id="wifi-rx" style="font-size: 0.85rem; color: #f1f5f9; font-weight: 700; font-family: 'JetBrains Mono', monospace;">0.00 MB/s</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                                <span style="font-size: 0.75rem; color: #94a3b8;">UPLOAD</span>
                                <span id="wifi-tx" style="font-size: 0.85rem; color: #f1f5f9; font-weight: 700; font-family: 'JetBrains Mono', monospace;">0.00 MB/s</span>
                            </div>
                            <div style="height: 4px; background: rgba(148, 163, 184, 0.1); border-radius: 2px; overflow: hidden;">
                                <div id="wifi-progress" style="height: 100%; width: 0%; background: #818cf8; transition: width 0.5s;"></div>
                            </div>
                        </div>

                        <!-- Ethernet Metrics -->
                        <div style="background: rgba(30, 41, 59, 0.2); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; padding: 0.75rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <span style="font-size: 0.75rem; color: #34d399; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Ethernet Traffic</span>
                                <i class="fas fa-ethernet" style="color: #34d399; opacity: 0.5;"></i>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="font-size: 0.75rem; color: #94a3b8;">DOWNLOAD</span>
                                <span id="ethernet-rx" style="font-size: 0.85rem; color: #f1f5f9; font-weight: 700; font-family: 'JetBrains Mono', monospace;">0.00 MB/s</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                                <span style="font-size: 0.75rem; color: #94a3b8;">UPLOAD</span>
                                <span id="ethernet-tx" style="font-size: 0.85rem; color: #f1f5f9; font-weight: 700; font-family: 'JetBrains Mono', monospace;">0.00 MB/s</span>
                            </div>
                            <div style="height: 4px; background: rgba(148, 163, 184, 0.1); border-radius: 2px; overflow: hidden;">
                                <div id="ethernet-progress" style="height: 100%; width: 0%; background: #34d399; transition: width 0.5s;"></div>
                            </div>
                        </div>

                        <!-- Performance / Speed Test Case -->
                        <div style="background: rgba(30, 41, 59, 0.2); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; padding: 0.75rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <span style="font-size: 0.75rem; color: #38bdf8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Performance</span>
                                <button id="run-speedtest-btn" onclick="window.networkOverviewInstance.runSpeedTest()" style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(56, 189, 248, 0.2)'" onmouseout="this.style.background='rgba(56, 189, 248, 0.1)'">
                                    Run Now
                                </button>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                <div style="background: rgba(15, 23, 42, 0.3); padding: 0.75rem; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.6rem; color: #94a3b8; font-weight: 700; margin-bottom: 0.4rem;">DOWN</div>
                                    <div id="speedtest-download" style="font-size: 1rem; color: #f1f5f9; font-weight: 800; font-family: 'JetBrains Mono', monospace;">--</div>
                                    <div style="font-size: 0.55rem; color: #64748b;">Mbps</div>
                                </div>
                                <div style="background: rgba(15, 23, 42, 0.3); padding: 0.75rem; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.6rem; color: #94a3b8; font-weight: 700; margin-bottom: 0.4rem;">UP</div>
                                    <div id="speedtest-upload" style="font-size: 1rem; color: #f1f5f9; font-weight: 800; font-family: 'JetBrains Mono', monospace;">--</div>
                                    <div style="font-size: 0.55rem; color: #64748b;">Mbps</div>
                                </div>
                            </div>
                            <div style="margin-top: 0.75rem; text-align: center;">
                                <span style="font-size: 0.55rem; color: #64748b;">Last test: <span id="last-speedtest-time">Never</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.networkOverviewInstance = this;

        // Initialize default state
        this.activeConnection = 'wifi';
        this.manualOverride = true;

        // Connect WebSocket for real-time data
        this.connectMetricsWebSocket();

        // Ensure UI matches initial state
        this.updateConnectionVisualization();
    }

    async toggleConnection(type) {
        // Prevent toggling if disconnected
        if (type === 'wifi' && !this.cacheWifiConnected) return;
        if (type === 'ethernet' && !this.cacheEthConnected) return;

        this.manualOverride = true;
        this.activeConnection = type;

        this.updateConnectionVisualization();

        // Perform Backend Control (Linux Only)
        // Find interface names
        let wifiIface = 'wlan0';
        let ethIface = 'eth0';

        try {
            const netResponse = await fetch('/api/network/interfaces');
            if (netResponse.ok) {
                const netData = await netResponse.json();
                if (netData.interfaces) {
                    const wlan = netData.interfaces.find(i => i.type === 'wireless' || i.name.startsWith('wlan') || i.name.startsWith('wlp'));
                    const eth = netData.interfaces.find(i => (i.type === 'ethernet' || i.name.startsWith('eth') || i.name.startsWith('enp')) && i.name !== 'lo');
                    if (wlan) wifiIface = wlan.name;
                    if (eth) ethIface = eth.name;
                }
            }

            // Execute switch command
            const targetIface = type === 'wifi' ? wifiIface : ethIface;
            const otherIface = type === 'wifi' ? ethIface : wifiIface;

            // Enable Target
            await fetch('/api/network/interface/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interface: targetIface, state: 'up' })
            });

            // Disable Other (to ensure single connection as requested) - REMOVED per new requirement to just route

            // Set Default Route Priority instead of disabling interface
            await fetch('/api/network/route/default', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interface: targetIface })
            });

            // Refresh routing table immediately
            // this.updateRoutingTable();

        } catch (error) {
            console.warn("Network control failed (likely Windows or permission issue):", error);
        }
    }

    async loadData() {
        // Reserved for future static data loads if needed
        // this.updateRoutingTable();
    }

    connectMetricsWebSocket() {
        if (this.metricsWs) {
            this.metricsWs.close();
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.metricsWs = new WebSocket(`${protocol}//${window.location.host}/ws/system/metrics`);

        this.metricsWs.onmessage = (event) => {
            try {
                const sysData = JSON.parse(event.data);

                // Wrap interfaces in the expected structure
                const netData = sysData.interfaces ? { interfaces: sysData.interfaces } : null;
                const wifiData = sysData.wifi || null;

                // Update all UI components from message
                this.updateMetrics(wifiData, netData);
                this.updateSidebar(netData, sysData);
            } catch (e) {
                console.error("WS Error", e);
            }
        };

        this.metricsWs.onclose = () => {
            // Reconnect after 3s
            setTimeout(() => this.connectMetricsWebSocket(), 3000);
        };
    }


    updateSidebar(netData, sysData) {
        const wanIpEl = document.getElementById('sidebar-wan-ip');
        const ispEl = document.getElementById('sidebar-isp');
        const gatewayEl = document.getElementById('sidebar-gateway-ip');

        // Public IP and ISP from system metrics
        if (sysData && sysData.publicIp && sysData.publicIp.ip) {
            if (wanIpEl) wanIpEl.textContent = sysData.publicIp.ip;
            if (ispEl) ispEl.textContent = sysData.publicIp.isp || 'Unknown';
        } else {
            // Show loading state if no public IP yet
            if (wanIpEl && wanIpEl.textContent === 'Loading...') {
                // Keep showing "Loading..." until we get public IP
            } else if (netData && netData.interfaces && wanIpEl && wanIpEl.textContent === 'Loading...') {
                // If still loading after initial fetch, show fetching message
                wanIpEl.textContent = 'Fetching...';
            }

            if (ispEl && ispEl.textContent === '...') {
                ispEl.textContent = 'Fetching...';
            }
        }

        // Gateway IP (from interfaces in sysData or netData)
        const interfaces = sysData.interfaces || (netData ? netData.interfaces : null);
        if (interfaces && gatewayEl) {
            const wan = interfaces.find(i => (i.name.startsWith('eth') || i.name.startsWith('enp') || i.name.startsWith('wlan') || i.name.startsWith('wlp')) && i.ip) || interfaces.find(i => i.ip && i.name !== 'lo');
            if (wan && wan.ip && wan.ip.includes('.')) {
                const parts = wan.ip.split('.');
                parts[3] = '1';
                gatewayEl.textContent = parts.join('.');
            } else if (gatewayEl.textContent === '...' || gatewayEl.textContent === '') {
                gatewayEl.textContent = '192.168.1.1';
            }
        }

        // Ping Latency (Real)
        if (sysData && sysData.network && sysData.network.latency) {
            const lat = sysData.network.latency;
            const ms = document.getElementById('ping-microsoft');
            const goog = document.getElementById('ping-google');
            const cloud = document.getElementById('ping-cloudflare');

            const mslat = lat['204.79.197.200'];
            const glat = lat['8.8.8.8'];
            const clat = lat['1.1.1.1'];

            if (ms) ms.textContent = (mslat >= 0) ? `${mslat} ms` : '--';
            if (goog) goog.textContent = (glat >= 0) ? `${glat} ms` : '--';
            if (cloud) cloud.textContent = (clat >= 0) ? `${clat} ms` : '--';

            // Update Network Pulse Dashboard
            const pulseGoog = document.getElementById('pulse-ping-google');
            const pulseCloud = document.getElementById('pulse-ping-cloudflare');
            if (pulseGoog) pulseGoog.textContent = (glat >= 0) ? glat : '--';
            if (pulseCloud) pulseCloud.textContent = (clat >= 0) ? clat : '--';

            // Update Connection Integrity
            const healthPercentage = document.getElementById('health-percentage');
            const healthBar = document.getElementById('health-progress-bar');
            if (healthPercentage && healthBar) {
                let integrity = 100;
                if (glat > 120 || clat > 120) integrity = 92;
                if (glat > 250 || clat > 250) integrity = 75;
                if (glat < 0 || clat < 0) integrity = 40;

                healthPercentage.textContent = `${integrity}%`;
                healthBar.style.width = `${integrity}%`;
                healthBar.style.background = integrity > 90 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)';
            }
        }

        // CPU Usage
        const cpuText = document.getElementById('sidebar-cpu-text');
        const cpuBar = document.getElementById('sidebar-cpu-bar');

        if (sysData && sysData.cpu) {
            const cpuVal = Math.round(sysData.cpu.usage || 0);
            if (cpuText) cpuText.textContent = `${cpuVal}%`;
            if (cpuBar) cpuBar.style.width = `${cpuVal}%`;
        }

        // RAM Usage
        const ramText = document.getElementById('sidebar-ram-text');
        const ramBar = document.getElementById('sidebar-ram-bar');

        if (sysData && sysData.memory) {
            const ramVal = Math.round(sysData.memory.usedPercent || 0);
            if (ramText) ramText.textContent = `${ramVal}%`;
            if (ramBar) ramBar.style.width = `${ramVal}%`;
        }

        // Uptime (Real)
        if (sysData && (sysData.uptime || sysData.uptime === 0)) {
            const uptimeEl = document.getElementById('sidebar-uptime');
            if (uptimeEl) {
                const totalSeconds = sysData.uptime;
                const days = Math.floor(totalSeconds / (3600 * 24));
                const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
                const mins = Math.floor((totalSeconds % 3600) / 60);
                const secs = totalSeconds % 60;

                uptimeEl.textContent = `${days}d ${hours}h ${mins}m ${secs}s`;
            }
        }

        // Access Point (Real)
        if (sysData && sysData.wifi) {
            const wifi = sysData.wifi;
            const apSsid = document.getElementById('sidebar-ap-ssid');
            const apMode = document.getElementById('sidebar-ap-mode');
            const apClients = document.getElementById('sidebar-ap-clients');

            if (apSsid) apSsid.textContent = wifi.ssid || 'Not Configured';
            if (apMode) apMode.textContent = `${wifi.band || '--'} / Ch ${wifi.channel || '--'}`;
            if (apClients) apClients.textContent = wifi.totalClients || 0;

            // Pulse Signal Bars
            const signalStr = wifi.signal || -100;
            let bars = 0;
            if (signalStr > -55) bars = 5;
            else if (signalStr > -65) bars = 4;
            else if (signalStr > -75) bars = 3;
            else if (signalStr > -85) bars = 2;
            else if (signalStr > -95) bars = 1;

            for (let i = 1; i <= 5; i++) {
                const bar = document.getElementById(`pulse-sig-${i}`);
                if (bar) bar.style.background = i <= bars ? '#10b981' : 'rgba(255,255,255,0.1)';
            }

            const pulseActive = document.getElementById('pulse-active-channel');
            if (pulseActive) pulseActive.textContent = `${wifi.ssid || 'WLAN'} (${wifi.band || '--'})`;
        }
    }

    updateInterfaceStatus(netData) {
        const grid = document.getElementById('interface-status-grid');
        if (!grid || !netData || !netData.interfaces) return;

        // Sort: Up first, then by name
        const interfaces = netData.interfaces.sort((a, b) => {
            if (a.status === 'UP' && b.status !== 'UP') return -1;
            if (a.status !== 'UP' && b.status === 'UP') return 1;
            return a.name.localeCompare(b.name);
        });

        grid.innerHTML = interfaces.map(iface => {
            const isUp = iface.status === 'UP';
            const statusColor = isUp ? '#10b981' : '#ef4444'; // Green or Red
            const iconClass = iface.type === 'wireless' || iface.name.includes('wlan') || iface.name.includes('wifi') ? 'fa-wifi' :
                iface.type === 'ethernet' || iface.name.includes('eth') || iface.name.includes('enp') ? 'fa-ethernet' : 'fa-network-wired';

            // Assuming icons are named after interface names, but fallback to fontawesome if specific image fails (handled by onerror)
            // For now, let's just use the FontAwesome icon as the primary visual to ensure it works

            return `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.8rem 1rem;
                    background: rgba(30, 41, 59, 0.3);
                    border: 1px solid rgba(148, 163, 184, 0.05);
                    border-radius: 10px;
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(51, 65, 85, 0.4)'; this.style.transform='translateX(2px)'" onmouseout="this.style.background='rgba(30, 41, 59, 0.3)'; this.style.transform='translateX(0)'">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                         <div style="
                            width: 36px; height: 36px; 
                            border-radius: 10px; 
                            background: ${isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; 
                            display: flex; align-items: center; justify-content: center;
                            color: ${statusColor};
                            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                        ">
                            <i class="fas ${iconClass}" style="font-size: 1rem;"></i>
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 700; font-size: 0.85rem; color: #f1f5f9; letter-spacing: 0.01em;">${iface.name}</span>
                            <span style="font-size: 0.7rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace; opacity: 0.7;">${iface.ip || 'No IP Address'}</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <!-- Status Indicator -->
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <div style="
                                width: 8px; height: 8px; 
                                border-radius: 50%; 
                                background: ${statusColor};
                                box-shadow: 0 0 12px ${statusColor};
                                animation: ${isUp ? 'pulse 2s infinite' : 'none'};
                            "></div>
                            <span style="
                                font-size: 0.7rem; 
                                font-weight: 700; 
                                color: ${statusColor};
                                letter-spacing: 0.05em;
                            ">${iface.status}</span>
                        </div>
                        <!-- Action Buttons -->
                        <button onclick="window.networkOverviewInstance.toggleInterfaceState('${iface.name}', ${!isUp})" style="
                            padding: 0.35rem 0.75rem;
                            background: ${isUp ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
                            color: ${isUp ? '#ef4444' : '#10b981'};
                            border: 1px solid ${isUp ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
                            border-radius: 6px;
                            font-size: 0.65rem;
                            font-weight: 700;
                            cursor: pointer;
                            transition: all 0.2s;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                        " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-power-off" style="margin-right: 0.25rem;"></i>${isUp ? 'Disable' : 'Enable'}
                        </button>
                        <button onclick="window.networkOverviewInstance.openConfigModal('${iface.name}')" style="
                            padding: 0.35rem 0.75rem;
                            background: rgba(96, 165, 250, 0.1);
                            color: #60a5fa;
                            border: 1px solid rgba(96, 165, 250, 0.3);
                            border-radius: 6px;
                            font-size: 0.65rem;
                            font-weight: 700;
                            cursor: pointer;
                            transition: all 0.2s;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                        " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-cog" style="margin-right: 0.25rem;"></i>Config
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateMetrics(wifiData, netData) {
        let wifiTrafficRx = 0;
        let wifiTrafficTx = 0;
        let ethTrafficRx = 0;
        let ethTrafficTx = 0;

        // --- Status Update Logic ---
        let wifiConnected = false;
        let ethConnected = false;
        // Store for toggle logic
        this.cacheWifiConnected = false;
        this.cacheEthConnected = false;

        // Update WiFi metrics
        if (wifiData) {
            // Check for interface status if available from netData
            let wifiIfaceUP = false;
            if (netData && netData.interfaces) {
                const wirelessInterfaces = netData.interfaces.filter(i =>
                    (i.type === 'wireless' || i.name.startsWith('wlan') || i.name.startsWith('wlp')) && i.status === 'UP'
                );
                wifiIfaceUP = wirelessInterfaces.length > 0;
            }
            // Connected if explicit interface UP or clients connected
            wifiConnected = wifiIfaceUP || wifiData.totalClients > 0;

            const wifiRx = (wifiData.trafficRx / 1024 / 1024).toFixed(2);
            const wifiTx = (wifiData.trafficTx / 1024 / 1024).toFixed(2);
            const wifiRxEl = document.getElementById('wifi-rx');
            const wifiTxEl = document.getElementById('wifi-tx');
            const wifiSvgThr = document.getElementById('svg-wifi-throughput');

            if (wifiRxEl) wifiRxEl.textContent = `${wifiRx} MB/s`;
            if (wifiTxEl) wifiTxEl.textContent = `${wifiTx} MB/s`;
            if (wifiSvgThr) wifiSvgThr.textContent = `${(parseFloat(wifiRx) + parseFloat(wifiTx)).toFixed(2)} MB/s`;

            const wifiPercent = Math.min(100, (wifiData.totalClients / 20) * 100);
            const wifiProg = document.getElementById('wifi-progress');
            if (wifiProg) wifiProg.style.width = `${wifiPercent}% `;

            wifiTrafficRx = wifiData.trafficRx || 0;
            wifiTrafficTx = wifiData.trafficTx || 0;
        }

        // Update Ethernet metrics
        if (netData && netData.interfaces) {
            const ethernetInterfaces = netData.interfaces.filter(i =>
                i.type === 'ethernet' && i.status === 'UP'
            );
            ethConnected = ethernetInterfaces.length > 0;

            // Calculate total ethernet traffic
            ethernetInterfaces.forEach(iface => {
                ethTrafficRx += iface.rxBytes || 0;
                ethTrafficTx += iface.txBytes || 0;
            });

            const ethRx = (ethTrafficRx / 1024 / 1024).toFixed(2);
            const ethTx = (ethTrafficTx / 1024 / 1024).toFixed(2);
            const ethRxEl = document.getElementById('ethernet-rx');
            const ethTxEl = document.getElementById('ethernet-tx');
            const ethSvgThr = document.getElementById('svg-eth-throughput');

            if (ethRxEl) ethRxEl.textContent = `${ethRx} MB/s`;
            if (ethTxEl) ethTxEl.textContent = `${ethTx} MB/s`;
            if (ethSvgThr) ethSvgThr.textContent = `${(parseFloat(ethRx) + parseFloat(ethTx)).toFixed(2)} MB/s`;

            const ethPercent = Math.min(100, (ethernetInterfaces.length / 10) * 100);
            const ethProg = document.getElementById('ethernet-progress');
            if (ethProg) ethProg.style.width = `${ethPercent}% `;
        }

        // Update Status Indicators
        // (Previously handled in the removed overlay)

        // --- Update Topology Node Status ---
        const wifiNodeStatus = document.getElementById('wifi-node-status');
        if (wifiNodeStatus) {
            if (wifiConnected) {
                wifiNodeStatus.textContent = "CONNECTED";
                wifiNodeStatus.setAttribute("fill", "#10b981");
            } else {
                wifiNodeStatus.textContent = "DISCONNECTED";
                wifiNodeStatus.setAttribute("fill", "#ef4444");
            }
        }

        const ethNodeStatus = document.getElementById('eth-node-status');
        if (ethNodeStatus) {
            if (ethConnected) {
                ethNodeStatus.textContent = "CONNECTED";
                ethNodeStatus.setAttribute("fill", "#10b981");
            } else {
                ethNodeStatus.textContent = "DISCONNECTED";
                ethNodeStatus.setAttribute("fill", "#ef4444");
            }
        }

        // Store status for toggle check
        this.cacheWifiConnected = wifiConnected;
        this.cacheEthConnected = ethConnected;

        // Update topology node opacity based on connectivity
        if (wifiNodeStatus) wifiNodeStatus.style.opacity = wifiConnected ? '1' : '0.5';
        if (ethNodeStatus) ethNodeStatus.style.opacity = ethConnected ? '1' : '0.5';

        // Update visualization based on active connection (respecting override)
        this.updateConnectionVisualization();

        // Update Total Metrics
        const totalRx = ((wifiTrafficRx + ethTrafficRx) / 1024 / 1024).toFixed(2);
        const totalTx = ((wifiTrafficTx + ethTrafficTx) / 1024 / 1024).toFixed(2);

        const totalRxEl = document.getElementById('total-rx');
        const totalTxEl = document.getElementById('total-tx');
        if (totalRxEl) totalRxEl.textContent = `${totalRx} MB / s`;
        if (totalTxEl) totalTxEl.textContent = `${totalTx} MB / s`;

        // Calculate total utilization (arbitrary max 100MB/s for visual)
        const totalBytes = wifiTrafficRx + wifiTrafficTx + ethTrafficRx + ethTrafficTx;
        const totalPercent = Math.min(100, (totalBytes / (100 * 1024 * 1024)) * 100);
        const totalProg = document.getElementById('total-progress');
        if (totalProg) totalProg.style.width = `${totalPercent}% `;
    }

    updateConnectionVisualization() {
        const wifiGroup = document.getElementById('wifi-flow-group');
        const ethGroup = document.getElementById('eth-flow-group');
        const wifiNode = document.getElementById('wifi-node');
        const ethNode = document.getElementById('ethernet-node');

        // Target active packet paths
        const wifiPackets = [document.getElementById('gw-wifi-path'), document.getElementById('wifi-int-path')];
        const ethPackets = [document.getElementById('gw-eth-path'), document.getElementById('eth-int-path')];

        if (this.activeConnection === 'wifi') {
            // Activate WiFi Flow & Packets
            if (wifiGroup) {
                wifiGroup.style.opacity = '1';
                wifiGroup.style.visibility = 'visible';
            }
            wifiPackets.forEach(p => p && (p.style.opacity = '1'));
            if (wifiNode) wifiNode.style.opacity = '1';

            // Show Ethernet Tunnel but hide Packets
            if (ethGroup) {
                ethGroup.style.opacity = '0.6';
                ethGroup.style.visibility = 'visible';
            }
            ethPackets.forEach(p => p && (p.style.opacity = '0'));
            if (ethNode) ethNode.style.opacity = '0.5';

        } else {
            // Activate Ethernet Flow & Packets
            if (ethGroup) {
                ethGroup.style.opacity = '1';
                ethGroup.style.visibility = 'visible';
            }
            ethPackets.forEach(p => p && (p.style.opacity = '1'));
            if (ethNode) ethNode.style.opacity = '1';

            // Show WiFi Tunnel but hide Packets
            if (wifiGroup) {
                wifiGroup.style.opacity = '0.6';
                wifiGroup.style.visibility = 'visible';
            }
            wifiPackets.forEach(p => p && (p.style.opacity = '0'));
            if (wifiNode) wifiNode.style.opacity = '0.5';
        }
    }

    async toggleInterfaceState(ifaceName, enable) {
        try {
            const state = enable ? 'up' : 'down';
            const response = await fetch('/api/network/interface/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interface: ifaceName, state: state })
            });

            if (response.ok) {
                // Refresh interface list
                await this.loadData();
                console.log(`Interface ${ifaceName} ${state === 'up' ? 'enabled' : 'disabled'} successfully`);
            } else {
                const error = await response.text();
                alert(`Failed to ${enable ? 'enable' : 'disable'} interface: ${error}`);
            }
        } catch (error) {
            console.error('Error toggling interface state:', error);
            alert('Network control failed. This feature is only available on Linux systems.');
        }
    }

    openConfigModal(ifaceName) {
        // Create modal HTML
        const modalHTML = `
            <div id="config-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999;">
                <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 16px; padding: 2rem; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #f1f5f9;">Configure ${ifaceName}</h2>
                        <button onclick="document.getElementById('config-modal').remove()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='rgba(148, 163, 184, 0.1)'" onmouseout="this.style.background='transparent'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form id="interface-config-form" style="display: flex; flex-direction: column; gap: 1rem;">
                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">IP Address</label>
                            <input type="text" id="config-ip" placeholder="192.168.1.100" style="width: 100%; padding: 0.75rem; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: #f1f5f9; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Subnet Mask</label>
                            <input type="text" id="config-mask" placeholder="255.255.255.0" style="width: 100%; padding: 0.75rem; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: #f1f5f9; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Gateway</label>
                            <input type="text" id="config-gateway" placeholder="192.168.1.1" style="width: 100%; padding: 0.75rem; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: #f1f5f9; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">DNS Servers (comma-separated)</label>
                            <input type="text" id="config-dns" placeholder="8.8.8.8, 1.1.1.1" style="width: 100%; padding: 0.75rem; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: #f1f5f9; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace;">
                        </div>
                        
                        <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                            <button type="button" onclick="window.networkOverviewInstance.saveInterfaceConfig('${ifaceName}')" style="flex: 1; padding: 0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)'">
                                <i class="fas fa-save" style="margin-right: 0.5rem;"></i>Apply Configuration
                            </button>
                            <button type="button" onclick="document.getElementById('config-modal').remove()" style="flex: 0.3; padding: 0.75rem; background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(148, 163, 184, 0.2)'" onmouseout="this.style.background='rgba(148, 163, 184, 0.1)'">
                                Cancel
                            </button>
                        </div>
                    </form>
                    
                    <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; display: flex; gap: 0.75rem; align-items: start;">
                        <i class="fas fa-exclamation-triangle" style="color: #fbbf24; font-size: 1rem; margin-top: 0.1rem;"></i>
                        <div style="font-size: 0.75rem; color: #fbbf24; line-height: 1.5;">
                            <strong>Note:</strong> Changing network configuration may temporarily disconnect your connection. This feature is only available on Linux systems with appropriate permissions.
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async saveInterfaceConfig(ifaceName) {
        const ip = document.getElementById('config-ip').value;
        const mask = document.getElementById('config-mask').value;
        const gateway = document.getElementById('config-gateway').value;
        const dns = document.getElementById('config-dns').value;

        if (!ip || !mask) {
            alert('IP Address and Subnet Mask are required');
            return;
        }

        try {
            const response = await fetch('/api/network/interface/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interface: ifaceName,
                    ip: ip,
                    netmask: mask,
                    gateway: gateway,
                    dns: dns.split(',').map(d => d.trim()).filter(d => d)
                })
            });

            if (response.ok) {
                alert(`Configuration applied to ${ifaceName} successfully`);
                document.getElementById('config-modal').remove();
                await this.loadData();
            } else {
                const error = await response.text();
                alert(`Failed to apply configuration: ${error}`);
            }
        } catch (error) {
            console.error('Error saving interface config:', error);
            alert('Failed to save configuration. This feature is only available on Linux systems.');
        }
    }

    async runSpeedTest() {
        const btn = document.getElementById('run-speedtest-btn');
        const downloadEl = document.getElementById('speedtest-download');
        const uploadEl = document.getElementById('speedtest-upload');
        const timeEl = document.getElementById('last-speedtest-time');

        if (!btn) return;

        // Disable button and show running state
        btn.disabled = true;
        btn.textContent = 'Running...';
        btn.style.opacity = '0.6';
        downloadEl.textContent = 'Testing...';
        uploadEl.textContent = 'Testing...';

        try {
            const response = await fetch('/api/network/speedtest', {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                downloadEl.textContent = result.download ? result.download.toFixed(2) : '--';
                uploadEl.textContent = result.upload ? result.upload.toFixed(2) : '--';
                timeEl.textContent = new Date().toLocaleString();
            } else {
                downloadEl.textContent = 'Error';
                uploadEl.textContent = 'Error';
            }
        } catch (error) {
            console.error('Speed test failed:', error);
            downloadEl.textContent = 'Error';
            uploadEl.textContent = 'Error';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Run Now';
            btn.style.opacity = '1';
        }
    }

    unmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.metricsWs) {
            this.metricsWs.close();
        }

        this.particles = [];
    }
}
