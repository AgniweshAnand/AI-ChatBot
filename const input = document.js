const input = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatDisplay = document.getElementById('chat-display');

// Function to send message
function sendMessage() {
    const message = input.value.trim();
    if (message !== '') {
        // Create a new message element
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.className = 'user-message'; // Style class

        // Add the message to the chat display
        chatDisplay.appendChild(messageElement);

        // Clear input after sending
        input.value = '';

        // Scroll to the bottom
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }
}

// Send on Enter key
input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

// Send on button click
sendButton.addEventListener('click', sendMessage);
