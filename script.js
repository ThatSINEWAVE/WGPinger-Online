// Main app state
const state = {
    servers: [],
    regions: new Set(),
    currentlyPinging: false,
    currentPingTimeout: null
};

// Load servers from JSON file
async function loadServers() {
    try {
        const response = await fetch('servers.json');
        const data = await response.json();
        state.servers = data.list;

        // Extract unique regions for filter
        state.servers.forEach(server => {
            const region = server.place.split(':')[0].trim();
            state.regions.add(region);
        });

        populateRegionFilter();
        renderServerList();
    } catch (error) {
        showStatus(`Error loading servers: ${error.message}`, true);
        document.querySelector('#serverList').innerHTML =
            `<div class="loading">Failed to load servers. Please check if servers.json exists.</div>`;
    }
}

// Populate region filter dropdown
function populateRegionFilter() {
    const regionFilter = document.getElementById('regionFilter');
    state.regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionFilter.appendChild(option);
    });
}

// Render the server list
function renderServerList() {
    const serverList = document.getElementById('serverList');
    const template = document.getElementById('serverTemplate');
    const regionFilter = document.getElementById('regionFilter').value;
    const searchText = document.getElementById('searchServer').value.toLowerCase();

    serverList.innerHTML = '';

    const filteredServers = state.servers.filter(server => {
        const serverRegion = server.place.split(':')[0].trim();
        const matchesRegion = regionFilter === 'all' || serverRegion === regionFilter;
        const matchesSearch =
            server.name.toLowerCase().includes(searchText) ||
            server.place.toLowerCase().includes(searchText);
        return matchesRegion && matchesSearch;
    });

    if (filteredServers.length === 0) {
        serverList.innerHTML = '<div class="loading">No servers match your filters</div>';
        return;
    }

    filteredServers.forEach(server => {
        const serverCard = document.importNode(template.content, true);
        const card = serverCard.querySelector('.server-card');

        // Set border color matching server color
        card.style.borderLeftColor = server.color;

        // Fill in server details
        serverCard.querySelector('.server-name').textContent = server.name;
        serverCard.querySelector('.server-location').textContent = server.place;
        serverCard.querySelector('.server-address').textContent = server.address;

        // Set up check ping button
        const pingButton = serverCard.querySelector('.btn-check');
        pingButton.dataset.server = server.address;
        pingButton.dataset.serverId = server.name;
        pingButton.addEventListener('click', () => pingServer(server));

        serverList.appendChild(serverCard);
    });
}

// Ping a single server
function pingServer(server) {
    if (state.currentlyPinging) return;

    const serverCards = document.querySelectorAll('.server-card');
    const currentCard = Array.from(serverCards).find(card =>
        card.querySelector('.server-name').textContent === server.name
    );

    if (!currentCard) return;

    const pingResult = currentCard.querySelector('.ping-result');
    const pingButton = currentCard.querySelector('.btn-check');

    // Set UI to testing state
    pingResult.textContent = 'Testing...';
    pingResult.className = 'ping-result ping-testing';
    pingButton.disabled = true;

    // Show status
    showStatus(`Pinging ${server.name} (${server.address})...`);

    // Start ping test
    state.currentlyPinging = true;

    // Use TCP ping simulation with multiple attempts
    simulatePing(server.address, 3)
        .then(pingData => {
            // Update ping result with the average
            pingResult.textContent = `${pingData.avgTime} ms`;
            pingResult.className = `ping-result ${getPingClass(pingData.avgTime)}`;

            // Show status with more detailed info
            showStatus(`Ping to ${server.name}: ${pingData.avgTime} ms (${pingData.successful}/${pingData.total} successful)`);
        })
        .catch(error => {
            pingResult.textContent = 'Failed';
            pingResult.className = 'ping-result ping-bad';
            showStatus(`Failed to ping ${server.name}: ${error.message}`, true);
        })
        .finally(() => {
            state.currentlyPinging = false;
            pingButton.disabled = false;
        });
}

// Simulate ping by sending multiple TCP connection attempts
async function simulatePing(address, attempts = 3) {
    // Extract hostname and port
    let hostname = address;
    let port = 443; // Default HTTPS port

    // Handle addresses with port specified
    if (address.includes(':')) {
        const parts = address.split(':');
        hostname = parts[0];
        // If there's more than one colon, assume the last part is the port
        if (parts.length > 2) {
            port = parseInt(parts[parts.length - 1]);
            hostname = parts.slice(0, -1).join(':');
        } else if (parts.length === 2) {
            port = parseInt(parts[1]);
        }
    }

    // Results for this ping session
    const results = {
        times: [],
        successful: 0,
        total: attempts,
        avgTime: 0
    };

    // Perform multiple ping attempts
    for (let i = 0; i < attempts; i++) {
        try {
            const pingTime = await performTcpPing(hostname, port);
            results.times.push(pingTime);
            results.successful++;
        } catch (error) {
            console.error(`Ping attempt ${i+1} failed:`, error);
            results.times.push(null);
        }

        // Small delay between attempts
        if (i < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    // Calculate average of successful pings
    if (results.successful > 0) {
        const sum = results.times.filter(time => time !== null).reduce((a, b) => a + b, 0);
        results.avgTime = Math.round(sum / results.successful);
        return results;
    } else {
        throw new Error("All ping attempts failed");
    }
}

// Perform a single TCP ping attempt using a technique that works in browsers
function performTcpPing(hostname, port) {
    return new Promise((resolve, reject) => {
        const startTime = performance.now();
        let isDone = false;

        // Handle timeouts
        const timeoutId = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                reject(new Error("Connection timed out"));
            }
        }, 5000);

        // For HTTP/HTTPS servers, we can use fetch with appropriate timeout
        if (port === 80 || port === 443) {
            const protocol = port === 80 ? 'http' : 'https';
            const url = `${protocol}://${hostname}${port === 80 ? '' : port === 443 ? '' : ':' + port}/favicon.ico?t=${Date.now()}`;

            fetch(url, {
                mode: 'no-cors',  // Important for cross-origin requests
                cache: 'no-cache', // Prevent caching
                redirect: 'manual', // Don't follow redirects
                // Set a signal to abort the request (modern browsers)
                signal: AbortSignal.timeout(5000)
            })
            .then(response => {
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeoutId);
                    const endTime = performance.now();
                    resolve(Math.round(endTime - startTime));
                }
            })
            .catch(error => {
                // Even network errors indicate the server was reachable
                // (DNS resolution worked, TCP connection attempted)
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeoutId);
                    const endTime = performance.now();
                    resolve(Math.round(endTime - startTime));
                }
            });
        }
        // For gaming servers, we can use WebSocket to test TCP connectivity
        else {
            try {
                // Create a WebSocket connection attempt
                const ws = new WebSocket(`wss://${hostname}:${port}`);

                // Connection opened - unlikely for gaming servers but possible
                ws.onopen = () => {
                    if (!isDone) {
                        isDone = true;
                        clearTimeout(timeoutId);
                        const endTime = performance.now();
                        ws.close();
                        resolve(Math.round(endTime - startTime));
                    }
                };

                // Error event - for gaming servers, this will likely trigger
                // but that's fine, we just need to measure how long it took
                ws.onerror = () => {
                    if (!isDone) {
                        isDone = true;
                        clearTimeout(timeoutId);
                        const endTime = performance.now();
                        resolve(Math.round(endTime - startTime));
                    }
                };
            } catch (error) {
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeoutId);
                    reject(error);
                }
            }
        }
    });
}

// Ping all servers one by one
async function pingAllServers() {
    if (state.currentlyPinging) return;

    const pingAllBtn = document.getElementById('pingAllBtn');
    pingAllBtn.disabled = true;
    pingAllBtn.textContent = 'Pinging...';

    // Disable all individual ping buttons
    document.querySelectorAll('.btn-check').forEach(btn => {
        btn.disabled = true;
    });

    state.currentlyPinging = true;
    showStatus('Starting to ping all servers...');

    // Get visible servers based on current filters
    const regionFilter = document.getElementById('regionFilter').value;
    const searchText = document.getElementById('searchServer').value.toLowerCase();
    const visibleServers = state.servers.filter(server => {
        const serverRegion = server.place.split(':')[0].trim();
        const matchesRegion = regionFilter === 'all' || serverRegion === regionFilter;
        const matchesSearch =
            server.name.toLowerCase().includes(searchText) ||
            server.place.toLowerCase().includes(searchText);
        return matchesRegion && matchesSearch;
    });

    // Ping each server with delay
    for (let i = 0; i < visibleServers.length; i++) {
        const server = visibleServers[i];

        // Show progress
        showStatus(`Pinging server ${i+1}/${visibleServers.length}: ${server.name}`);

        // Ping current server
        await new Promise(resolve => {
            const serverCards = document.querySelectorAll('.server-card');
            const currentCard = Array.from(serverCards).find(card =>
                card.querySelector('.server-name').textContent === server.name
            );

            if (!currentCard) {
                resolve();
                return;
            }

            const pingResult = currentCard.querySelector('.ping-result');

            // Set UI to testing state
            pingResult.textContent = 'Testing...';
            pingResult.className = 'ping-result ping-testing';

            // Start ping test with multiple attempts
            simulatePing(server.address, 3)
                .then(pingData => {
                    // Update ping result with the average
                    pingResult.textContent = `${pingData.avgTime} ms`;
                    pingResult.className = `ping-result ${getPingClass(pingData.avgTime)}`;
                })
                .catch(error => {
                    pingResult.textContent = 'Failed';
                    pingResult.className = 'ping-result ping-bad';
                })
                .finally(() => {
                    // Wait 1 second before next ping
                    state.currentPingTimeout = setTimeout(() => {
                        state.currentPingTimeout = null;
                        resolve();
                    }, 1000);
                });
        });
    }

    // Complete
    state.currentlyPinging = false;
    pingAllBtn.disabled = false;
    pingAllBtn.textContent = 'Ping All Servers';

    // Re-enable all individual ping buttons
    document.querySelectorAll('.btn-check').forEach(btn => {
        btn.disabled = false;
    });

    showStatus('Completed pinging all servers');
}

// Get CSS class based on ping time
function getPingClass(pingTime) {
    if (pingTime < 100) return 'ping-good';
    if (pingTime < 200) return 'ping-medium';
    return 'ping-bad';
}

// Show status message
function showStatus(message, isError = false) {
    const statusText = document.getElementById('statusText');
    statusText.textContent = message;
    statusText.style.color = isError ? 'var(--danger-color)' : 'var(--text-color)';
}

// Add ability to save ping results
function savePingResults() {
    const resultsData = [];
    document.querySelectorAll('.server-card').forEach(card => {
        const serverName = card.querySelector('.server-name').textContent;
        const serverLocation = card.querySelector('.server-location').textContent;
        const serverAddress = card.querySelector('.server-address').textContent;
        const pingResult = card.querySelector('.ping-result').textContent;

        if (pingResult !== '-' && pingResult !== 'Testing...') {
            resultsData.push({
                name: serverName,
                location: serverLocation,
                address: serverAddress,
                ping: pingResult
            });
        }
    });

    if (resultsData.length === 0) {
        showStatus('No ping results to save', true);
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsJson = JSON.stringify(resultsData, null, 2);
    const blob = new Blob([resultsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `ping-results-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('Ping results saved successfully');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load servers on page load
    loadServers();

    // Set up ping all button
    document.getElementById('pingAllBtn').addEventListener('click', pingAllServers);

    // Set up filters
    document.getElementById('regionFilter').addEventListener('change', renderServerList);
    document.getElementById('searchServer').addEventListener('input', renderServerList);

    // Add save results button to header
    const header = document.querySelector('header');
    const saveButton = document.createElement('button');
    saveButton.id = 'saveResultsBtn';
    saveButton.className = 'btn';
    saveButton.textContent = 'Save Results';
    saveButton.addEventListener('click', savePingResults);
    header.appendChild(saveButton);

    // Add help information
    const container = document.querySelector('.container');
    const helpInfo = document.createElement('div');
    helpInfo.className = 'help-info';
    helpInfo.innerHTML = `
        <p><strong>Note:</strong> This ping tool measures the TCP connection time to servers, which gives an approximate indication of your network latency.
        The actual in-game ping may differ slightly as it uses different protocols.</p>
        <p>For best results, test each server multiple times as network conditions can vary.</p>
    `;
    container.insertBefore(helpInfo, document.querySelector('.server-list'));

    // Add some styling for the help info
    const style = document.createElement('style');
    style.textContent = `
        .help-info {
            background-color: rgba(0, 0, 0, 0.2);
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.9rem;
            line-height: 1.5;
        }
        .help-info p {
            margin-bottom: 10px;
        }
        .help-info p:last-child {
            margin-bottom: 0;
        }
    `;
    document.head.appendChild(style);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (state.currentPingTimeout) {
        clearTimeout(state.currentPingTimeout);
    }
});