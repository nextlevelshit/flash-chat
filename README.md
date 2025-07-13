# Flash Chat

A privacy-focused, serverless chat application that stores messages locally in your browser and enables sharing via URL. Built with vanilla JavaScript and designed for speed, simplicity, and maximum privacy.

## Features

### Core Functionality
- **Local Storage**: All messages are stored in your browser's localStorage. No server required.
- **URL Sharing**: Generate shareable links that contain your entire conversation history.
- **Dual Interface**: Switch between Signal-style message bubbles and IRC-style linear chat.
- **Theme Support**: Toggle between dark and light themes.
- **Real-time Statistics**: Track sent/received messages and sync status.

### Privacy & Security
- **No Server Dependencies**: Works completely offline after initial page load.
- **Client-side Only**: Messages never leave your device unless explicitly shared.
- **No Registration**: Automatic anonymous user ID generation.
- **Data Control**: Full control over your data with destroy functionality.

## Installation

### Option 1: Development Server
```bash
npm install
npm run dev
```

### Option 2: Build for Production
```bash
npm install
npm run build
```

### Option 3: Direct Usage
Simply open `index.html` in any modern web browser after building.

## Usage

### Getting Started
1. Type your message in the input field and press Enter or click Send
2. Share conversations by clicking the Share button or using the auto-generated link in the status bar
3. Switch between Signal and IRC interface modes using the mode toggle button
4. Clear all data permanently using the Destroy button
5. Toggle between dark and light themes using the theme button

### Sharing Conversations
1. **Automatic Sharing**: Each message automatically generates a shareable URL
2. **Manual Sharing**: Click the "Share" button to copy the current conversation URL
3. **Status Bar Link**: Click the link in the status bar to copy it to clipboard

### Interface Modes
- **Signal Mode**: Modern bubble-style interface with user-specific coloring
- **IRC Mode**: Traditional linear chat with timestamps and usernames

### Data Management
- **Help**: Click the Help button to view usage instructions
- **Destroy**: Click the Destroy button to permanently delete all messages and data
- **Theme Toggle**: Switch between dark and light themes

## Technical Architecture

### File Structure
```
flash-chat/
├── src/
│   ├── index.pug          # Main template
│   └── style.css          # Styling
├── package.json           # Dependencies and build scripts
├── .pugrc.js             # Pug configuration
└── README.md             # This file
```

### Dependencies
- **Parcel**: Build tool and development server
- **Pug**: Template engine for clean HTML generation
- **Vanilla JavaScript**: No framework dependencies for maximum performance

### Data Storage
Messages are stored in localStorage with the following structure:
```javascript
{
  "msg_[timestamp]": {
    "text": "Message content",
    "timestamp": 1234567890,
    "userId": "user_abc123"
  }
}
```

User preferences are stored separately:
```javascript
{
  "flash_prefs": {
    "theme": "dark",
    "mode": "signal"
  },
  "flash_user_id": "user_abc123",
  "flash_seen_welcome": "true"
}
```

## URL Sharing Protocol

Conversations are shared via base64-encoded JSON in the URL query parameter:
```
https://example.com/flash-chat?data=[base64-encoded-messages]
```

The encoded data contains an array of message objects that are automatically imported into localStorage when the URL is accessed.

## Browser Compatibility

Flash Chat works in all modern browsers that support:
- localStorage API
- ES6 JavaScript features
- CSS Grid and Flexbox
- Clipboard API (for sharing functionality)

Tested browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Privacy Considerations

### Data Storage
- Messages are stored exclusively in browser localStorage
- No cookies or tracking mechanisms
- No external API calls after initial page load

### Sharing Security
- Shared URLs contain conversation history in plain text
- Consider the security implications before sharing URLs
- URLs can be very long for extensive conversations

### Data Persistence
- Data persists until explicitly deleted or browser storage is cleared
- No automatic expiration or cleanup
- Users have full control over data lifecycle

## Development

### Building from Source
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Customization
The application can be easily customized by modifying:
- `style.css`: Visual appearance and themes
- `index.pug`: HTML structure and welcome screen content
- Embedded JavaScript: Functionality and behavior

## License

WTFPL - Do What The F*ck You Want To Public License

## Contributing

This project welcomes contributions. Key areas for improvement:
- Additional theme options
- Message encryption for shared URLs
- Export/import functionality
- Mobile responsiveness enhancements
- Accessibility improvements

## Changelog

### Version 1.0.0
- Initial release
- Basic messaging functionality
- URL sharing
- Dual interface modes
- Theme support
- Welcome screen
- Data destruction capability