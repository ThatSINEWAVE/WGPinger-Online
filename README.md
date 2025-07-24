<div align="center">

# [WGPinger-Online](https://thatsinewave.github.io/WGPinger-Online)

![WGPinger-Online](https://raw.githubusercontent.com/ThatSINEWAVE/WGPinger-Online/refs/heads/main/.github/SCREENSHOTS/WGPinger-Online.png)

Web-based ping monitoring tool for Wargaming servers, providing real-time latency checks with modern UI/UX. The online counterpart to the [WGPinger Discord Bot](https://github.com/ThatSINEWAVE/WGPinger-Bot).

</div>

## Features

- **Real-time Ping Testing**
  - Individual server checks
  - Bulk ping all servers
  - 3-attempt average calculation
- **Smart Filtering**
  - Region-based filtering
  - Search by server name/location
- **Visual Feedback**
  - Color-coded ping results (Good <100ms 🟢, Medium <200ms 🟡, Bad ≥200ms 🔴)
  - Animated status indicators
- **Data Management**
  - Save results as JSON
  - Persistent server list from `servers.json`
- **Responsive Design**
  - Works on desktop/mobile
  - Dark mode optimized

<div align="center">

## ☕ [Support my work on Ko-Fi](https://ko-fi.com/thatsinewave)

</div>

## How It Works ⚙️

1. **TCP Connection Testing**
   - Uses `fetch()` for HTTP/HTTPS servers
   - WebSocket attempts for game servers
   - Measures connection establishment time
2. **Smart Parsing**
   - Automatic port detection
   - Hostname extraction
3. **Performance**
   - Async/await operations
   - Request timeouts (5s)
   - Connection pooling simulation

## Usage 🖱️

1. Access the live site: [https://thatsinewave.github.io/WGPinger-Online](https://thatsinewave.github.io/WGPinger-Online)
2. Use controls:
   - 🎚️ Region filter dropdown
   - 🔍 Search box
   - 🟢 "Check Ping" buttons
   - 🚀 "Ping All Servers" button
   - 💾 "Save Results" button

<div align="center">

## [Join my discord server]()

</div>

## Configuration

To modify servers list:
1. Edit `servers.json`:
```json
{
  "list": [
    {
      "name": "Server Name",
      "place": "Region: Location",
      "address": "host:port",
      "color": "#HEXCODE"
    }
  ]
}
```
2. Maintain color consistency per region
3. Host on GitHub Pages for automatic deployment

<div align="center">

## [Join my discord server](https://thatsinewave.github.io/Discord-Redirect/)

</div>

## Development

```bash
git clone https://github.com/ThatSINEWAVE/WGPinger-Online.git
cd WGPinger-Online
# Edit files:
# - index.html      # Main structure
# - script.js       # Core functionality
# - styles.css      # Visual design
# - servers.json    # Server database
```

## Limitations

- Browser-based ping measurement (not ICMP)
- CORS restrictions may affect some servers
- Accuracy affected by network conditions

## Related Projects

- [WGPinger-Bot](https://github.com/ThatSINEWAVE/WGPinger-Bot) - Discord bot version

## Contributing

Contributions are welcome! If you want to contribute, feel free to fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
