// Crypto utilities for ephemeral key exchange
class CryptoManager {
    constructor() {
        this.keyPair = null;
        this.conversationKey = null;
        this.remotePublicKey = null;
    }

    async generateKeyPair() {
        this.keyPair = await window.crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true,
            ['deriveKey']
        );
        return this.keyPair;
    }

    async exportPublicKey() {
        if (!this.keyPair) await this.generateKeyPair();
        const exported = await window.crypto.subtle.exportKey('raw', this.keyPair.publicKey);
        return Array.from(new Uint8Array(exported));
    }

    async importPublicKey(keyData) {
        const keyBuffer = new Uint8Array(keyData);
        this.remotePublicKey = await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            false,
            []
        );
        await this.deriveSharedKey();
    }

    async deriveSharedKey() {
        if (!this.keyPair || !this.remotePublicKey) return;

        const sharedSecret = await window.crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: this.remotePublicKey
            },
            this.keyPair.privateKey,
            {
                name: 'AES-GCM',
                length: 256
            },
            false,
            ['encrypt', 'decrypt']
        );

        this.conversationKey = sharedSecret;
    }

    async encryptMessage(text) {
        if (!this.conversationKey) return { encrypted: false, data: text };

        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            this.conversationKey,
            data
        );

        return {
            encrypted: true,
            data: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv)
        };
    }

    async decryptMessage(encryptedData, iv) {
        if (!this.conversationKey) return null;

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: new Uint8Array(iv)
            },
            this.conversationKey,
            new Uint8Array(encryptedData)
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }
}

// Main application class
class FlashChat {
    constructor() {
        this.crypto = new CryptoManager();
        this.currentUserId = this.getUserId();
        this.stats = {
            sent: 0,
            received: 0,
            lastUpdate: null,
            lastSync: Date.now()
        };
        this.isFirstMessage = true;
        this.conversationId = null;
        this.init();
    }

    getUserId() {
        let userId = localStorage.getItem('flash_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 8);
            localStorage.setItem('flash_user_id', userId);
        }
        return userId;
    }

    async init() {
        await this.loadFromURL();
        this.setupEventListeners();
        this.loadPreferences();
        this.calculateStats();
        this.renderMessages();
        this.updateShareLink();
        this.checkWelcomeDialog();
        this.registerServiceWorker();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // await navigator.serviceWorker.register('./sw.js');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Mode toggle
        document.getElementById('mode-toggle').addEventListener('click', () => {
            this.toggleMode();
        });

        // Help button
        document.getElementById('help-btn').addEventListener('click', () => {
            this.showWelcomeDialog();
        });

        // Destroy button
        document.getElementById('destroy-btn').addEventListener('click', () => {
            this.destroyAllData();
        });

        // Share button
        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareConversation();
        });

        // Welcome dialog
        document.getElementById('start-chatting').addEventListener('click', () => {
            this.hideWelcomeDialog();
        });

        // Share link click to copy
        document.getElementById('current-link').addEventListener('click', () => {
            this.copyShareLink();
        });

        // Message form
        document.getElementById('message-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const dialog = document.getElementById('welcome-dialog');
                if (dialog.open) {
                    dialog.close();
                }
            }
        });
    }

    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('dark');

        if (isDark) {
            body.classList.remove('dark');
            document.getElementById('theme-toggle').textContent = '🌙';
        } else {
            body.classList.add('dark');
            document.getElementById('theme-toggle').textContent = '☀️';
        }

        this.savePreferences();
    }

    toggleMode() {
        const body = document.body;
        const isSignal = body.dataset.mode === 'signal';

        body.dataset.mode = isSignal ? 'irc' : 'signal';
        document.getElementById('mode-toggle').textContent = isSignal ? 'IRC' : 'Signal';

        this.savePreferences();
        this.renderMessages();
    }

    showWelcomeDialog() {
        document.getElementById('welcome-dialog').showModal();
    }

    hideWelcomeDialog() {
        const dialog = document.getElementById('welcome-dialog');
        const dontShowAgain = document.getElementById('dont-show-again').checked;

        if (dontShowAgain) {
            localStorage.setItem('flash_seen_welcome', 'true');
        }

        dialog.close();
    }

    checkWelcomeDialog() {
        const hasSeenWelcome = localStorage.getItem('flash_seen_welcome');
        if (!hasSeenWelcome) {
            this.showWelcomeDialog();
        }
    }

    async destroyAllData() {
        const confirmed = confirm('Are you sure you want to permanently delete all messages and data? This cannot be undone.');

        if (confirmed) {
            // Clear all data
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('msg_') || key.startsWith('flash_')) {
                    localStorage.removeItem(key);
                }
            });

            // Reset application state
            this.stats = {
                sent: 0,
                received: 0,
                lastUpdate: null,
                lastSync: Date.now()
            };
            this.crypto = new CryptoManager();
            this.isFirstMessage = true;
            this.conversationId = null;

            // Clear UI
            document.getElementById('messages').innerHTML = '';
            this.updateStatusDisplay();
            this.updateShareLink();
            this.showWelcomeDialog();
        }
    }

    async shareConversation() {
        const url = document.getElementById('current-link').textContent;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Flash Chat Conversation',
                    text: 'Join my encrypted conversation',
                    url: url
                });
            } catch (error) {
                // Fallback to clipboard
                this.copyShareLink();
            }
        } else {
            this.copyShareLink();
        }
    }

    async copyShareLink() {
        const url = document.getElementById('current-link').textContent;

        try {
            await navigator.clipboard.writeText(url);
            const linkElement = document.getElementById('current-link');
            const original = linkElement.textContent;
            linkElement.textContent = '✅ Copied!';
            setTimeout(() => linkElement.textContent = original, 2000);
        } catch (error) {
            console.warn('Could not copy to clipboard:', error);
        }
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();

        if (!text) return;

        await this.addMessage(text, this.currentUserId);
        input.value = '';
        input.focus();
    }

    async addMessage(text, userId) {
        const timestamp = Date.now();

        // Handle first message with key exchange
        if (this.isFirstMessage && userId === this.currentUserId) {
            await this.crypto.generateKeyPair();
            const publicKey = await this.crypto.exportPublicKey();
            this.conversationId = 'conv_' + Math.random().toString(36).substr(2, 8);
            this.isFirstMessage = false;

            // Store key exchange info
            localStorage.setItem('flash_conversation_id', this.conversationId);
            localStorage.setItem('flash_public_key', JSON.stringify(publicKey));
        }

        // Encrypt message if we have a shared key
        const encryptedContent = await this.crypto.encryptMessage(text);

        const message = {
            text: text,
            encrypted: encryptedContent.encrypted,
            data: encryptedContent.data,
            iv: encryptedContent.iv,
            timestamp: timestamp,
            userId: userId,
            conversationId: this.conversationId,
            readBy: [],
            deliveredTo: []
        };

        localStorage.setItem(`msg_${timestamp}`, JSON.stringify(message));
        this.renderMessage(message);

        // Update stats
        if (userId === this.currentUserId) {
            this.stats.sent++;
        } else {
            this.stats.received++;
            // Mark as read automatically for received messages
            message.readBy.push(this.currentUserId);
            localStorage.setItem(`msg_${timestamp}`, JSON.stringify(message));
        }

        this.stats.lastUpdate = timestamp;
        this.updateShareLink();
        this.updateStatusDisplay();
    }

    renderMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        const isCurrentUser = message.userId === this.currentUserId;
        const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        if (document.body.dataset.mode === 'signal') {
            messageElement.className = `flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`;

            const bubble = document.createElement('div');
            bubble.className = `max-w-xs lg:max-w-md px-4 py-2 rounded-2xl message-bubble ${
                isCurrentUser
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-md'
            } backdrop-blur-sm shadow-sm`;

            const textSpan = document.createElement('span');
            textSpan.className = 'block';
            textSpan.textContent = message.text;

            const timeSpan = document.createElement('span');
            timeSpan.className = 'text-xs opacity-75 block mt-1 text-right';
            timeSpan.textContent = time;

            // Add read receipts for current user messages
            if (isCurrentUser) {
                const statusSpan = document.createElement('span');
                statusSpan.className = 'status-indicator';
                statusSpan.innerHTML = message.readBy.length > 0 ? '✓✓' : '✓';
                statusSpan.style.color = message.readBy.length > 0 ? '#3b82f6' : '#6b7280';
                statusSpan.style.fontSize = '0.75rem';
                statusSpan.style.marginLeft = '0.25rem';
                timeSpan.appendChild(statusSpan);
            }

            bubble.appendChild(textSpan);
            bubble.appendChild(timeSpan);
            messageElement.appendChild(bubble);
        } else {
            messageElement.className = 'mb-2 font-mono text-sm';
            messageElement.innerHTML = `
                <span class="text-slate-500 dark:text-slate-400">[${time}]</span>
                <span class="font-semibold text-blue-500">&lt;${message.userId}&gt;</span>
                <span class="text-slate-800 dark:text-white">${message.text}</span>
            `;
        }

        messagesContainer.appendChild(messageElement);

        // Auto-scroll to bottom
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';

        Object.keys(localStorage)
            .filter(key => key.startsWith('msg_'))
            .sort()
            .forEach(key => {
                const message = JSON.parse(localStorage.getItem(key));
                this.renderMessage(message);
            });
    }

    async loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        const data = params.get('data');

        if (data) {
            try {
                const messages = JSON.parse(atob(data));
                let hasNewMessages = false;

                for (const msg of messages) {
                    const key = `msg_${msg.timestamp}`;
                    if (!localStorage.getItem(key)) {
                        localStorage.setItem(key, JSON.stringify(msg));
                        hasNewMessages = true;

                        // Handle key exchange for first message
                        if (msg.conversationId && !this.conversationId) {
                            this.conversationId = msg.conversationId;
                            localStorage.setItem('flash_conversation_id', msg.conversationId);

                            // Import public key if available
                            if (msg.publicKey) {
                                await this.crypto.importPublicKey(msg.publicKey);
                            }
                        }
                    }
                }

                window.history.replaceState({}, '', window.location.pathname);
            } catch (error) {
                console.error('Invalid share data:', error);
            }
        }
    }

    updateShareLink() {
        const messages = Object.keys(localStorage)
            .filter(key => key.startsWith('msg_'))
            .sort()
            .map(key => {
                const msg = JSON.parse(localStorage.getItem(key));
                return msg;
            });

        // Handle public key inclusion for first message
        if (messages.length > 0 && messages[0].userId === this.currentUserId) {
            const publicKey = localStorage.getItem('flash_public_key');
            if (publicKey) {
                messages[0].publicKey = JSON.parse(publicKey);
            }
        }

        const data = btoa(JSON.stringify(messages));
        const url = `${window.location.origin}${window.location.pathname}?data=${data}`;

        document.getElementById('current-link').textContent = url;
        this.stats.lastSync = Date.now();
    }

    updateStatusDisplay() {
        document.getElementById('sent-count').textContent = `Sent: ${this.stats.sent}`;
        document.getElementById('received-count').textContent = `Received: ${this.stats.received}`;

        const lastUpdate = this.stats.lastUpdate ?
            new Date(this.stats.lastUpdate).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) :
            'Never';
        document.getElementById('last-update').textContent = `Last: ${lastUpdate}`;
    }

    calculateStats() {
        const messages = Object.keys(localStorage)
            .filter(key => key.startsWith('msg_'))
            .map(key => JSON.parse(localStorage.getItem(key)));

        this.stats.sent = messages.filter(msg => msg.userId === this.currentUserId).length;
        this.stats.received = messages.filter(msg => msg.userId !== this.currentUserId).length;
        this.stats.lastUpdate = messages.length > 0 ? Math.max(...messages.map(msg => msg.timestamp)) : null;
    }

    loadPreferences() {
        const prefs = JSON.parse(localStorage.getItem('flash_prefs') || '{}');

        if (prefs.theme === 'light') {
            document.body.classList.remove('dark');
            document.getElementById('theme-toggle').textContent = '🌙';
        } else {
            document.body.classList.add('dark');
            document.getElementById('theme-toggle').textContent = '☀️';
        }

        document.body.dataset.mode = prefs.mode || 'signal';
        document.getElementById('mode-toggle').textContent = prefs.mode === 'irc' ? 'IRC' : 'Signal';
    }

    savePreferences() {
        const prefs = {
            theme: document.body.classList.contains('dark') ? 'dark' : 'light',
            mode: document.body.dataset.mode
        };
        localStorage.setItem('flash_prefs', JSON.stringify(prefs));
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    new FlashChat();
});