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
    
    // Welcome Messages
    const welcomeMessages = {
        'ru': 'Добро пожаловать в VISAGINAS360 AI!\nЯ помогу вам изучить искусственный интеллект.',
        'lt': 'Sveiki atvykę į VISAGINAS360 AI!\nAš padėsiu jums mokytis dirbtinio intelekto.',
        'en': 'Welcome to VISAGINAS360 AI!\nI will help you learn artificial intelligence.'
    };

    // Menu Button Logic
    const menuButton = document.getElementById('menuButton');
    const dropdownMenu = document.getElementById('dropdownMenu');

    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !menuButton.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Utility Functions
    const showLoading = () => loadingIndicator.style.display = 'flex';
    const hideLoading = () => loadingIndicator.style.display = 'none';

    function detectLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        
        if (urlLang && welcomeMessages[urlLang]) {
            return urlLang;
        }
        
        const browserLang = navigator.language.split('-')[0];
        if (welcomeMessages[browserLang]) {
            return browserLang;
        }
        
        return 'en';
    }

    function showWelcomeModal() {
        const lang = detectLanguage();
        const welcomeModal = document.getElementById('welcome-modal');
        const welcomeText = document.getElementById('welcome-text');
        
        welcomeText.textContent = welcomeMessages[lang];
        welcomeModal.style.display = 'block';
        
        document.getElementById('start-button').addEventListener('click', () => {
            welcomeModal.style.display = 'none';
            localStorage.setItem('welcomeShown', 'true');
        });
    }

    // Message Functions
    const addMessage = (text, isUser = false) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

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

    // Text Input Handlers
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
            sendMessage(text, true);
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
        voiceButton.addEventListener('click', () => {
            voiceModal.style.display = 'flex';
            voiceText.textContent = 'Click to speak';
        });

        closeModal.addEventListener('click', () => {
            voiceModal.style.display = 'none';
            if (isRecording) {
                recognition.stop();
            }
        });

        startVoiceBtn.addEventListener('click', () => {
            if (!isRecording) {
                recognition.start();
            } else {
                recognition.stop();
            }
        });

        // Modal Close Events
        window.addEventListener('click', (e) => {
            if (e.target === voiceModal) {
                voiceModal.style.display = 'none';
                if (isRecording) {
                    recognition.stop();
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (voiceModal.style.display === 'flex') {
                    voiceModal.style.display = 'none';
                    if (isRecording) {
                        recognition.stop();
                    }
                }
                dropdownMenu.classList.remove('show');
            }
        });
    } else {
        voiceButton.style.display = 'none';
        console.log('Speech Recognition API is not supported');
    }

    // Initial Setup
    if (!localStorage.getItem('welcomeShown')) {
        window.addEventListener('load', showWelcomeModal);
    }

    // Welcome Message
    setTimeout(() => {
        addMessage('Привет! Я ваш виртуальный помощник по изучению искусственного интеллекта. Как я могу помочь вам сегодня?', false);
    }, 500);
});
