// DOM Element References
const input = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatDisplay = document.getElementById('chat-display');
const pageWrapper = document.getElementById('page-wrapper');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const newChatBtn = document.getElementById('new-chat-btn');
const heroCenter = document.getElementById('hero-center');
const rotatingHeadline = document.getElementById('rotatingHeadline');
const chatHistoryContainer = document.getElementById('chat-history');

// Feature Selector Elements
const featureMenuBtn = document.getElementById('featureMenuBtn');
const featurePopup = document.getElementById('featurePopup');
const activeFeatureBadge = document.getElementById('activeFeatureBadge');
const badgeIcon = document.getElementById('badgeIcon');
const badgeText = document.getElementById('badgeText');
const removeBadgeBtn = document.getElementById('removeBadgeBtn');

// Active Session State
let currentSessionId = null;
let selectedFeature = null;

// Rotating Headline Queries with Green-Highlighted Stock Tokens
const rotatingStatements = [
    'What do you wanna know today?',
    'What is the price of <span class="stock-highlight">Apple</span>?',
    'Show me the 24h chart for <span class="stock-highlight">Tesla</span>',
    'Compare <span class="stock-highlight">NVDA</span> with <span class="stock-highlight">AMD</span>',
    'Analyse quarterly earnings of <span class="stock-highlight">Microsoft</span>',
    'What is the trading volume of <span class="stock-highlight">Snap</span>?',
    'Get valuation multiples for <span class="stock-highlight">Amazon</span>',
    'Check dividend yield of <span class="stock-highlight">Coca-Cola</span>',
    'Is <span class="stock-highlight">Meta</span> in an uptrend today?',
    'View financial summary for <span class="stock-highlight">Google</span>'
];

let headlineIndex = 0;
let headlineInterval = null;

function startHeadlineRotation() {
    if (!rotatingHeadline) return;
    stopHeadlineRotation();
    
    headlineInterval = setInterval(() => {
        rotatingHeadline.classList.add('slide-out');
        setTimeout(() => {
            headlineIndex = (headlineIndex + 1) % rotatingStatements.length;
            rotatingHeadline.innerHTML = rotatingStatements[headlineIndex];
            rotatingHeadline.classList.remove('slide-out');
            rotatingHeadline.classList.add('slide-in');
            void rotatingHeadline.offsetWidth;
            rotatingHeadline.classList.remove('slide-in');
        }, 600);
    }, 4000);
}

function stopHeadlineRotation() {
    if (headlineInterval) {
        clearInterval(headlineInterval);
        headlineInterval = null;
    }
}

startHeadlineRotation();

// Auto-adjust textarea height
input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
});

// Sidebar Toggle Handlers
if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    });

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        });
    }
}

// Badge & Feature Handlers
function applyFeatureBadge(actionName, iconName) {
    selectedFeature = actionName;
    badgeText.textContent = actionName;
    badgeIcon.textContent = iconName;
    activeFeatureBadge.classList.remove('hidden');
    input.focus();
}

if (removeBadgeBtn) {
    removeBadgeBtn.addEventListener('click', () => {
        selectedFeature = null;
        activeFeatureBadge.classList.add('hidden');
    });
}

document.querySelectorAll('.hero-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        applyFeatureBadge(btn.dataset.action, btn.dataset.icon);
    });
});

if (featureMenuBtn && featurePopup) {
    featureMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        featurePopup.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!featurePopup.contains(e.target) && e.target !== featureMenuBtn) {
            featurePopup.classList.add('hidden');
        }
    });

    document.querySelectorAll('.popup-item').forEach(item => {
        item.addEventListener('click', () => {
            applyFeatureBadge(item.dataset.action, item.dataset.icon);
            featurePopup.classList.add('hidden');
        });
    });
}

// New Chat Button Handler
if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        startNewChat();
        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.remove('mobile-open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }
    });
}

function startNewChat() {
    currentSessionId = null;
    chatDisplay.innerHTML = '';
    if (heroCenter) {
        chatDisplay.appendChild(heroCenter);
        headlineIndex = 0;
        rotatingHeadline.innerHTML = rotatingStatements[0];
        startHeadlineRotation();
    }
    input.value = '';
    input.style.height = 'auto';
    selectedFeature = null;
    if (activeFeatureBadge) activeFeatureBadge.classList.add('hidden');
    updateActiveSidebarItem(null);
}

function scrollToBottom() {
    if (pageWrapper) {
        pageWrapper.scrollTop = pageWrapper.scrollHeight;
    }
}

function escapeHtml(string) {
    return String(string).replace(/[&<>"'`=\/]/g, s => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    }[s]));
}

function appendUserMessage(text, feature) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    const featurePrefix = feature ? `[${escapeHtml(feature)}] ` : '';
    messageElement.innerHTML = `
        <div class="user-text">${featurePrefix}${escapeHtml(text)}</div>
    `;
    chatDisplay.appendChild(messageElement);
}

function appendBotMessage(markdownText) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot-message';
    const parsedHtml = window.marked ? marked.parse(markdownText) : escapeHtml(markdownText);
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="bot-text">${parsedHtml}</div>
        </div>
    `;
    chatDisplay.appendChild(messageElement);
}

function appendThinkingMessage() {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot-message';
    messageElement.innerHTML = `
        <div class="message-content">
            <div id="loading-animation" class="loading-animation">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <span id="bot-status-text" class="bot-status-text">Processing ticker metrics...</span>
            <div id="bot-response-text" class="bot-text hidden"></div>
        </div>
    `;
    chatDisplay.appendChild(messageElement);
    return messageElement.querySelector('#bot-response-text');
}

// Send Message Flow
async function sendMessage() {
    const message = input.value.trim();
    if (message === '' && !selectedFeature) return;

    if (heroCenter && heroCenter.parentNode) {
        stopHeadlineRotation();
        heroCenter.remove();
    }

    const currentFeature = selectedFeature;
    appendUserMessage(message, currentFeature);

    input.value = '';
    input.style.height = 'auto';
    scrollToBottom();

    const botResponseElement = appendThinkingMessage();
    const messageCard = botResponseElement.closest('.message-content');
    const loadingAnimationElement = messageCard.querySelector('#loading-animation');
    const statusTextElement = messageCard.querySelector('#bot-status-text');

    scrollToBottom();

    try {
        const response = await fetch('http://127.0.0.1:5000/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: message,
                action_mode: currentFeature,
                session_id: currentSessionId
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Capture session ID returned by backend & refresh sidebar if new
        const isNewSession = !currentSessionId && data.session_id;
        currentSessionId = data.session_id;

        if (loadingAnimationElement) loadingAnimationElement.style.display = 'none';
        if (statusTextElement) statusTextElement.style.display = 'none';

        if (window.marked) {
            botResponseElement.innerHTML = marked.parse(data.response);
        } else {
            botResponseElement.textContent = data.response;
        }
        botResponseElement.classList.remove('hidden');

        if (isNewSession) {
            loadSidebarSessions();
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        if (loadingAnimationElement) loadingAnimationElement.style.display = 'none';
        if (statusTextElement) statusTextElement.style.display = 'none';
        botResponseElement.innerHTML = `<p style="color: #ef4444;">⚠️ <strong>Error:</strong> Unable to connect to StocksAI service.</p>`;
        botResponseElement.classList.remove('hidden');
    }

    scrollToBottom();
}

input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener('click', sendMessage);

// ==========================================
// MongoDB Sidebar History Operations
// ==========================================

async function loadSidebarSessions() {
    if (!chatHistoryContainer) return;
    try {
        const res = await fetch('http://127.0.0.1:5000/api/chats');
        if (!res.ok) return;
        const data = await res.json();
        renderSidebarSessions(data.sessions || []);
    } catch (err) {
        console.error('Failed to load chat history:', err);
    }
}

function renderSidebarSessions(sessions) {
    chatHistoryContainer.innerHTML = '';

    if (sessions.length === 0) {
        chatHistoryContainer.innerHTML = `<div class="empty-history-text">No chats yet</div>`;
        return;
    }

    sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'chat-item';
        item.dataset.id = session._id;
        if (session._id === currentSessionId) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="chat-item-content">
                <span class="chat-item-title">${escapeHtml(session.title)}</span>
            </div>
            <button class="chat-delete-btn" title="Delete chat" data-id="${session._id}">
                <span class="material-icons">delete_outline</span>
            </button>
        `;

        // Click to switch conversation
        item.addEventListener('click', (e) => {
            if (e.target.closest('.chat-delete-btn')) return;
            switchSession(session._id);
        });

        // Delete button handler
        const deleteBtn = item.querySelector('.chat-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSession(session._id);
        });

        chatHistoryContainer.appendChild(item);
    });
}

async function switchSession(sessionId) {
    if (currentSessionId === sessionId) return;

    try {
        const res = await fetch(`http://127.0.0.1:5000/api/chats/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        const session = data.session;

        currentSessionId = session._id;
        updateActiveSidebarItem(sessionId);

        // Clear view and display past messages
        chatDisplay.innerHTML = '';
        if (heroCenter && heroCenter.parentNode) {
            heroCenter.remove();
        }

        (session.messages || []).forEach(msg => {
            if (msg.sender === 'user') {
                appendUserMessage(msg.text, msg.feature);
            } else {
                appendBotMessage(msg.text);
            }
        });

        scrollToBottom();

        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.remove('mobile-open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }

    } catch (err) {
        console.error('Failed switching session:', err);
    }
}

async function deleteSession(sessionId) {
    try {
        const res = await fetch(`http://127.0.0.1:5000/api/chats/${sessionId}`, {
            method: 'DELETE'
        });
        if (!res.ok) return;

        if (currentSessionId === sessionId) {
            startNewChat();
        }
        loadSidebarSessions();
    } catch (err) {
        console.error('Failed deleting session:', err);
    }
}

function updateActiveSidebarItem(activeId) {
    document.querySelectorAll('.chat-item').forEach(el => {
        if (el.dataset.id === activeId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

// Initial sidebar fetch on page load
loadSidebarSessions();