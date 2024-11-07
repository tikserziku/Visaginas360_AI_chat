'use strict';

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
    const menuButton = document.getElementById('menuButton');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const brandName = document.querySelector('.brand-name'); // Brand name element
    const aboutLink = document.querySelector('[href="#about"]'); // About link
    const settingsLink = document.querySelector('[href="#settings"]'); // Settings link
    const helpLink = document.querySelector('[href="#help"]'); // Help link


    let recognition = null;
    let isRecording = false;
    let translations = {};

    loadTranslations(); // Call loadTranslations to initiate localization

    async function loadTranslations() {
    const lang = navigator.language.startsWith('ru') ? 'ru' : 'en';
    const url = `/static/locales/translations${lang === 'en' ? '_en' : ''}.json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch translations: ${response.status} ${response.statusText}`);
        }
        translations = await response.json();
    } catch (error) {
        console.error('Error loading translations:', error);
            translations = {  // Default Russian translations
                "placeholder": "Введите ваше сообщение...",
                "send": "📤",
                "voice_modal_text": "Click to speak",
                "voice_listening": "Listening...",
                "voice_error": "Error. Please try again.",
                "loading": "Обработка...",
                "welcome_message": "Привет! Я ваш виртуальный помощник по изучению искусственного интеллекта. Как я могу помочь вам сегодня?",
                "error_message": "Произошла ошибка. Пожалуйста, попробуйте еще раз.",
                "about": "О проекте",
                "settings": "Настройки",
                "help": "Помощь",
                "brand_name": "VISAGINAS360 AI"

            };
    } finally {
        // Update the interface and HTML lang attribute regardless of success or failure
        updateInterfaceLanguage();
        document.documentElement.lang = lang; // Set the HTML lang attribute
    }
}


    function updateInterfaceLanguage() {
        messageInput.placeholder = translations.placeholder;
        sendButton.textContent = translations.send;
        voiceText.textContent = translations.voice_modal_text;
        loadingIndicator.querySelector('span').textContent = translations.loading;

        brandName.textContent = translations.brand_name;
        aboutLink.textContent = translations.about;
        settingsLink.textContent = translations.settings;
        helpLink.textContent = translations.help;


        // Clear previous welcome message and add the translated one.
        chatMessages.innerHTML = ''; // added to clear any existing messages
        addMessage(translations.welcome_message, false);


    }



    // Message Handling Functions
    const formatMessage = (text) => {
        if (!text) return '';
        
        // Заменяем маркеры списка
        text = text.replace(/^- /gm, '• ');
        text = text.replace(/^\d+\. /gm, (match) => `\n${match}`);
        
        // Форматируем абзацы
        return text.split('\n').filter(line => line.trim()).join('\n');
    };

    const addMessage = (text, isUser = false) => {
        if (!text) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

        // Форматируем текст только для ответов бота
        const formattedText = isUser ? text : formatMessage(text);
        
        // Создаём параграфы
        formattedText.split('\n').forEach(line => {
            if (line.trim()) {
                const p = document.createElement('p');
                p.textContent = line;
                messageDiv.appendChild(p);
            }
        });

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // API Communication
    const sendMessage = async (text) => {
        if (!text.trim()) return;
        
        try {
            showLoading();
            
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            if (data.reply) {
                addMessage(data.reply, false);
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('Произошла ошибка. Пожалуйста, попробуйте еще раз.', false);
        } finally {
            hideLoading();
        }
    };

    // Loading Indicator
    const showLoading = () => loadingIndicator.style.display = 'flex';
    const hideLoading = () => loadingIndicator.style.display = 'none';

    // Voice Modal Controls
    const showVoiceModal = () => {
        voiceModal.classList.add('active');
        voiceText.textContent = 'Click to speak';
    };

    const hideVoiceModal = () => {
        voiceModal.classList.remove('active');
        if (isRecording && recognition) {
            recognition.stop();
        }
    };

    // В функции где инициализируется распознавание речи, обновите настройки:

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognition = new SpeechRecognition();
        
        // Добавляем поддержку нескольких языков
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Определяем язык браузера
        const browserLang = navigator.language.toLowerCase();
        
        // Устанавливаем соответствующий язык распознавания
        if (browserLang.startsWith('lt')) {
            recognition.lang = 'lt-LT';
        } else if (browserLang.startsWith('ru')) {
            recognition.lang = 'ru-RU';
        } else {
            recognition.lang = 'lt-LT, ru-RU, en-US';  // Поддержка множества языков
        }
    
        recognition.onstart = () => {
            isRecording = true;
            startVoiceBtn.classList.add('recording');
            voiceText.textContent = 'Listening...';
        };
    
        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            if (text.trim()) {
                addMessage(text, true);
                hideVoiceModal();
                sendMessage(text);
            }
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
    }

        // Voice Button Event Listeners
        voiceButton.addEventListener('click', showVoiceModal);
        closeModal.addEventListener('click', hideVoiceModal);
        startVoiceBtn.addEventListener('click', () => {
            if (!isRecording) {
                recognition.start();
            } else {
                recognition.stop();
            }
        });
    } else {
        voiceButton.style.display = 'none';
        console.log('Speech Recognition API is not supported');
    }

    // Menu Controls
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

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

    // Global Event Listeners
    document.addEventListener('click', (e) => {
        // Закрываем меню при клике вне его
        if (!dropdownMenu.contains(e.target) && !menuButton.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
        // Закрываем модальное окно при клике вне его
        if (e.target === voiceModal) {
            hideVoiceModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideVoiceModal();
            dropdownMenu.classList.remove('show');
        }
    });

    
    
    // Welcome Message
    setTimeout(() => {
        addMessage('Привет! Я ваш виртуальный помощник по изучению искусственного интеллекта. Как я могу помочь вам сегодня?', false);
    }, 500);
});
