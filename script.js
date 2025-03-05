class ServerMonitor {
    constructor() {
        this.serverGrid = document.getElementById('server-grid');
        this.currentServerEl = document.getElementById('current-server');
        this.lastCheckedEl = document.getElementById('last-checked');
        this.servers = [];
        this.isPinging = false;

        this.init();
    }

    async init() {
        await this.loadServers();
        this.createServerCards();
        this.startPingCycle();
    }

    async loadServers() {
        try {
            const response = await fetch('servers.json');
            const data = await response.json();
            this.servers = data.list.map(server => ({
                ...server,
                status: 'unknown',
                ping: null,
                element: null
            }));
        } catch (error) {
            console.error('Error loading servers:', error);
        }
    }

    createServerCards() {
        this.serverGrid.innerHTML = '';
        this.servers.forEach(server => {
            const card = document.createElement('div');
            card.className = `server-card ${server.status}`;
            card.innerHTML = `
                <div class="server-info">
                    <div class="server-name">${server.name}</div>
                    <div class="server-location">${server.place}</div>
                </div>
                <div class="ping-time">
                    ${server.ping ?? '-'}ms
                    <span class="status-text">${server.status}</span>
                </div>
            `;
            server.element = card;
            this.serverGrid.appendChild(card);
        });
    }

    async startPingCycle() {
        while (true) {
            this.isPinging = true;
            for (const server of this.servers) {
                this.currentServerEl.textContent = `Pinging ${server.name} (${server.address})`;
                this.currentServerEl.classList.add('pinging');

                try {
                    const startTime = performance.now();
                    await this.pingServer(server.address);
                    const pingTime = Math.round(performance.now() - startTime);

                    server.status = 'online';
                    server.ping = pingTime;
                } catch (error) {
                    server.status = 'offline';
                    server.ping = null;
                }

                this.updateServerCard(server);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.isPinging = false;
            this.currentServerEl.classList.remove('pinging');
            this.currentServerEl.textContent = 'Waiting for next cycle...';
            this.lastCheckedEl.textContent = new Date().toLocaleTimeString();

            await new Promise(resolve => setTimeout(resolve, 60000));
        }
    }

    async pingServer(address) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const url = this.createPingUrl(address);
            await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return true;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    createPingUrl(address) {
        if (address.startsWith('http')) return address;
        if (address.includes('://')) return address;
        return `https://${address.replace(/(:\d+)/, '')}`;
    }

    updateServerCard(server) {
        const card = server.element;
        card.className = `server-card ${server.status}`;
        card.querySelector('.ping-time').innerHTML = `
            ${server.ping ? server.ping + 'ms' : '-'}
            <span class="status-text">${server.status}</span>
        `;
    }
}

// Initialize the monitor when the page loads
window.addEventListener('load', () => new ServerMonitor());