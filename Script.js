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

// Feature Selector Elements
const featureMenuBtn = document.getElementById('featureMenuBtn');
const featurePopup = document.getElementById('featurePopup');
const activeFeatureBadge = document.getElementById('activeFeatureBadge');
const badgeIcon = document.getElementById('badgeIcon');
const badgeText = document.getElementById('badgeText');
const removeBadgeBtn = document.getElementById('removeBadgeBtn');

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

// Dynamic Text Carousel: 4-second cycle with 600ms transition duration
function startHeadlineRotation() {
    if (!rotatingHeadline) return;
    
    stopHeadlineRotation(); // Prevent duplicate timers
    
    headlineInterval = setInterval(() => {
        rotatingHeadline.classList.add('slide-out');
        
        setTimeout(() => {
            headlineIndex = (headlineIndex + 1) % rotatingStatements.length;
            rotatingHeadline.innerHTML = rotatingStatements[headlineIndex];
            
            rotatingHeadline.classList.remove('slide-out');
            rotatingHeadline.classList.add('slide-in');
            
            // Force browser reflow to register state change cleanly
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

// Start rotating headline on initial load
startHeadlineRotation();

// Auto-adjust textarea height up to a max limit
input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
});

// Expand/Collapse Sidebar Logic
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

// Set active analysis mode badge inside prompt input
function applyFeatureBadge(actionName, iconName) {
    selectedFeature = actionName;
    badgeText.textContent = actionName;
    badgeIcon.textContent = iconName;
    activeFeatureBadge.classList.remove('hidden');
    input.focus();
}

// Clear active badge
if (removeBadgeBtn) {
    removeBadgeBtn.addEventListener('click', () => {
        selectedFeature = null;
        activeFeatureBadge.classList.add('hidden');
    });
}

// Attach listener to Centered Hero Suggestion Buttons
document.querySelectorAll('.hero-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const icon = btn.dataset.icon;
        applyFeatureBadge(action, icon);
    });
});

// Plus (+) Menu Toggle and Item Selection
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
        
        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.remove('mobile-open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }
    });
}

// Scroll to bottom helper for viewport container
function scrollToBottom() {
    if (pageWrapper) {
        pageWrapper.scrollTop = pageWrapper.scrollHeight;
    }
}

// Append Bot Thinking / Loading Component
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

// Append User Message Component
function appendUserMessage(text, feature) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    const featurePrefix = feature ? `[${escapeHtml(feature)}] ` : '';
    messageElement.innerHTML = `
        <div class="user-text">${featurePrefix}${escapeHtml(text)}</div>
    `;
    chatDisplay.appendChild(messageElement);
}

// Input Sanitization
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

// Message Send Handler
async function sendMessage() {
    const message = input.value.trim();
    if (message === '' && !selectedFeature) return;

    // Remove hero headline & action cards when user sends first prompt
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: message,
                action_mode: currentFeature 
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        const botResponseMarkdown = data.response;

        // Hide loader components
        if (loadingAnimationElement) loadingAnimationElement.style.display = 'none';
        if (statusTextElement) statusTextElement.style.display = 'none';

        // Parse and render formatted Markdown using marked.js
        if (window.marked) {
            botResponseElement.innerHTML = marked.parse(botResponseMarkdown);
        } else {
            botResponseElement.textContent = botResponseMarkdown;
        }

        botResponseElement.classList.remove('hidden');

    } catch (error) {
        console.error('Error fetching data:', error);
        if (loadingAnimationElement) loadingAnimationElement.style.display = 'none';
        if (statusTextElement) statusTextElement.style.display = 'none';
        botResponseElement.innerHTML = `<p style="color: #ef4444;">⚠️ <strong>Error:</strong> Unable to connect to StocksAI service. Please check your backend.</p>`;
        botResponseElement.classList.remove('hidden');
    }

    scrollToBottom();
}

// Keyboard Enter Key Listener
input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

// Send Button Click Listener
sendButton.addEventListener('click', sendMessage);