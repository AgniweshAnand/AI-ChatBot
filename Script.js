const input = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatDisplay = document.getElementById('chat-display');
const searchContainer = document.querySelector('.search-container');
let isFirstMessage = true;

// const baseHeight = input.scrollHeight;

input.addEventListener('input', () => {
    input.style.height = baseHeight + 'px';
    const newHeight = input.scrollHeight;
    if(newHeight > baseHeight){
        input.style.height = Math.min(newHeight, 200) + 'px';
    }
});

// New function to create and append the bot's thinking message
function appendThinkingMessage() {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot-message';
    messageElement.innerHTML = `
        <div class="avatar avatar-bot"></div>
        <div class="message-content">
            <div id="loading-animation" class="loading-animation">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <span id="bot-status-text" class="bot-status-text">Fetching data...</span>
            <div id="bot-response-text" class="bot-text hidden"></div>
        </div>
    `;
    chatDisplay.appendChild(messageElement);
    return messageElement.querySelector('#bot-response-text');
}

// New function to create and append the user's message
function appendUserMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="user-text">${text}</div>
        </div>
        <div class="avatar avatar-user"></div>
    `;
    chatDisplay.appendChild(messageElement);
}

async function sendMessage() {
    const message = input.value.trim();
    if (message === '') return;

    if (isFirstMessage) {
        searchContainer.classList.add('chat-active');
        isFirstMessage = false;
    }

    // Append the user's message to the chat display
    appendUserMessage(message);

    input.value = '';
    input.style.height = 'auto';
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

    // Append the bot's thinking message and get a reference to the response text element
    const botResponseElement = appendThinkingMessage();
    const loadingAnimationElement = botResponseElement.parentNode.querySelector('#loading-animation');
    const statusTextElement = botResponseElement.parentNode.querySelector('#bot-status-text');

    chatDisplay.scrollTop = chatDisplay.scrollHeight;

    try {
        const response = await fetch('http://127.0.0.1:5000/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        const botResponseText = data.response;
        
        // Hide the loading animation and status text
        loadingAnimationElement.style.display = 'none';
        statusTextElement.style.display = 'none';

        // Display the final bot response
        botResponseElement.textContent = botResponseText;
        botResponseElement.classList.remove('hidden');

    } catch (error) {
        console.error('Error fetching data:', error);
        
        loadingAnimationElement.style.display = 'none';
        statusTextElement.style.display = 'none';
        botResponseElement.textContent = "Sorry, I couldn't get a response. Please try again.";
        botResponseElement.classList.remove('hidden');
    }

    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener('click', sendMessage);