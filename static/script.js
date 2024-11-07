// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const voiceButton = document.getElementById('voice-button');
    const chatMessages = document.getElementById('chat-messages');
    const voiceModal = document.getElementById('voice-modal');
    const closeModal = document.querySelector('.close');
    const startVoiceBtn = document.getElementById('start-voice');
    const voiceText = document.getElementById('voice-text');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Show/hide loading indicator
    const showLoading = () => loadingIndicator.style.display = 'flex';
    const hideLoading = () => loadingIndicator.style.display = 'none';

    // Add message to chat
    const addMessage = (text, isUser = false) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // Send message to server
    const sendMessage = async (text, isVoice = false) => {
        try {
            showLoading();
            const endpoint = isVoice ? '/process_voice' : '/chat';
            const body = isVoice ? { voice_input: text } : { message: text };
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            if (isVoice) {
                addMessage(text, true);
                addMessage(data.processed_text, false);
                voiceModal.style.display = 'none';
            } else {
                addMessage(data.reply, false);
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('Произошла ошибка. Попробуйте еще раз.', false);
        } finally {
            hideLoading();
        }
    };

    // Handle text input
    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            addMessage(message, true);
            sendMessage(message);
            messageInput.value = '';
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });

    // Voice input handling
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'ru-RU';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            voiceText.textContent = text;
            sendMessage(text, true);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            voiceText.textContent = 'Ошибка распознавания речи. Попробуйте еще раз.';
        };

        recognition.onend = () => {
            startVoiceBtn.disabled = false;
            voiceButton.classList.remove('recording');
        };

        // Voice modal controls
        voiceButton.addEventListener('click', () => {
            voiceModal.style.display = 'block';
            voiceText.textContent = '';
        });

        closeModal.addEventListener('click', () => {
            voiceModal.style.display = 'none';
        });

        startVoiceBtn.addEventListener('click', () => {
            try {
                startVoiceBtn.disabled = true;
                voiceButton.classList.add('recording');
                recognition.start();
            } catch (error) {
                console.error('Speech recognition error:', error);
                startVoiceBtn.disabled = false;
                voiceButton.classList.remove('recording');
            }
        });

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target === voiceModal) {
                voiceModal.style.display = 'none';
            }
        });

        // Handle Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && voiceModal.style.display === 'block') {
                voiceModal.style.display = 'none';
            }
        });
    } else {
        // Hide voice button if speech recognition is not supported
        voiceButton.style.display = 'none';
        console.log('Speech Recognition API is not supported in this browser');
    }

    // Добавление приветственного сообщения при загрузке
    setTimeout(() => {
        addMessage('Привет! Я ваш виртуальный помощник по изучению искусственного интеллекта. Как я могу помочь вам сегодня?', false);
    }, 500);
});
