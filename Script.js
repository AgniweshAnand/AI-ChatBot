const input = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatDisplay = document.getElementById('chat-display');
const searchContainer = document.querySelector('.search-container'); //Get the search container element
let isFirstMessage = true; //track the first message


// const baseHeight = -10;
input.addEventListener('input', () => {
    input.style.height = baseHeight + 'px';
    const newHeight = input.scrollHeight;
    if(newHeight > baseHeight){
        input.style.height = Math.min(newHeight, 200) + 'px';
    }
});

function appendMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.textContent = text;
    messageElement.className = `${sender}-message`;
    chatDisplay.appendChild(messageElement);
}

async function sendMessage() {
    const message = input.value.trim();
    if (message === '') return;

    if (isFirstMessage) { //Check if this is the first message
        searchContainer.classList.add('chat-active');
        isFirstMessage = false;
    }

    appendMessage(message, 'user');
    input.value = '';
    input.style.height = 'auto';
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
        
        appendMessage(botResponseText, 'bot');
    } catch (error) {
        console.error('Error fetching data:', error);
        appendMessage("Sorry, I couldn't get a response. Please try again.", 'bot');
    }

    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.ShiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener('click', sendMessage);