// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const voiceButton = document.getElementById('voice-button');
    const chatMessages = document.getElementById('chat-messages');
    const voiceModal = document.getElementById('voice-modal');
    const closeModal = document.querySelector('.close');
    const startVoiceBtn = document.getElementById('start-voice');
    const voiceText = document.getElementById('voice-text');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Utility Functions
    const showLoading = () => loadingIndicator.style.display = 'flex';
    const hideLoading = () => loadingIndicator.style.display = 'none';

    // Функции для показа/скрытия модального окна
    const showVoiceModal = () => {
    voiceModal.classList.add('active');
    voiceText.textContent = 'Click to speak';
};

const hideVoiceModal = () => {
    voiceModal.classList.remove('active');
    if (isRecording) {
        recognition.stop();
    }
};

// В обработчике результатов распознавания
recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    
    // Добавляем вопрос пользователя в чат
    addMessage(text, true);
    
    // Скрываем модальное окно
    hideVoiceModal();
    
    // Отправляем запрос и получаем ответ
    sendMessage(text).then(() => {
        // После получения ответа модальное окно уже скрыто
        hideLoading();
    });
};

// Обновите отображение текста распознавания
recognition.onstart = () => {
    isRecording = true;
    startVoiceBtn.classList.add('recording');
    voiceText.textContent = 'Listening...';
};

    // Message Functions
    const addMessage = (text, isUser = false) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const sendMessage = async (text) => {
        try {
            showLoading();
            
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            addMessage(data.reply, false);
            
            // Скрываем модальное окно после получения ответа
            hideVoiceModal();
        } catch (error) {
            console.error('Error:', error);
            addMessage('Произошла ошибка. Попробуйте еще раз.', false);
        } finally {
            hideLoading();
        }
    };

    // Voice Recognition Setup
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognition = new SpeechRecognition();
        let isRecording = false;
        
        recognition.lang = 'ru-RU';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isRecording = true;
            startVoiceBtn.classList.add('recording');
            voiceText.textContent = 'Listening...';
        };

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            voiceText.textContent = text;
            // Скрываем модальное окно
            hideVoiceModal();
            // Добавляем сообщение в чат и отправляем на сервер
            addMessage(text, true);
            sendMessage(text);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            voiceText.textContent = 'Error. Please try again.';
            isRecording = false;
            startVoiceBtn.classList.remove('recording');
        };

        recognition.onend = () => {
            isRecording = false;
            startVoiceBtn.classList.remove('recording');
            voiceText.textContent = 'Click to speak';
        };

        // Voice Modal Controls
        voiceButton.addEventListener('click', showVoiceModal);
        closeModal.addEventListener('click', hideVoiceModal);

        startVoiceBtn.addEventListener('click', () => {
            if (!isRecording) {
                recognition.start();
            } else {
                recognition.stop();
            }
        });

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target === voiceModal) {
                hideVoiceModal();
            }
        });
    } else {
        voiceButton.style.display = 'none';
    }

    // Text input handlers
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

    // Add welcome message
    setTimeout(() => {
        addMessage('Привет! Я ваш виртуальный помощник по изучению искусственного интеллекта. Как я могу помочь вам сегодня?', false);
    }, 500);
});
