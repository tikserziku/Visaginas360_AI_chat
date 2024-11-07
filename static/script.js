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
    const brandName = document.querySelector('.brand-name');
    const aboutLink = document.querySelector('[href="#about"]');
    const settingsLink = document.querySelector('[href="#settings"]');
    const helpLink = document.querySelector('[href="#help"]');
    const languageButtons = document.querySelectorAll('.lang-btn');

    let recognition = null;
    let isRecording = false;
    let translations = {};
    let currentLanguage = {
        code: 'lt',      // для переводов интерфейса
        speech: 'lt-LT'  // для распознавания речи
    };

    function updateInterfaceLanguage() {
        messageInput.placeholder = translations.placeholder;
        sendButton.textContent = translations.send;
        voiceText.textContent = translations.voice_modal_text;
        if (loadingIndicator.querySelector('span')) {
            loadingIndicator.querySelector('span').textContent = translations.loading;
        }

        if (brandName) brandName.textContent = translations.brand_name;
        if (aboutLink) aboutLink.textContent = translations.about;
        if (settingsLink) settingsLink.textContent = translations.settings;
        if (helpLink) helpLink.textContent = translations.help;

        // Очищаем чат и добавляем приветственное сообщение только при первой загрузке
        if (chatMessages.children.length === 0) {
            addMessage(translations.welcome_message, false);
        }
    }

    async function loadTranslations(lang = 'lt') {
        const url = `/static/locales/translations${lang !== 'ru' ? '_' + lang : ''}.json`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch translations: ${response.status} ${response.statusText}`);
            }
            translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
            translations = {
                "placeholder": "Type your message...",
                "send": "Send",
                "voice_modal_text": "Click to speak",
                "voice_listening": "Listening...",
                "voice_error": "Error. Please try again.",
                "loading": "Processing...",
                "welcome_message": "Hello! I am your virtual assistant for learning about artificial intelligence. How can I help you today?",
                "error_message": "An error occurred. Please try again.",
                "about": "About",
                "settings": "Settings",
                "help": "Help",
                "brand_name": "VISAGINAS360 AI"
            };
        } finally {
            updateInterfaceLanguage();
            document.documentElement.lang = lang;
        }
    }

    function updateLanguage(langCode) {
        currentLanguage.code = langCode;
        
        // Обновляем язык распознавания речи
        switch(langCode) {
            case 'lt':
                currentLanguage.speech = 'lt-LT';
                break;
            case 'ru':
                currentLanguage.speech = 'ru-RU';
                break;
            case 'en':
                currentLanguage.speech = 'en-US';
                break;
        }

        // Обновляем активную кнопку
        languageButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === langCode);
        });

        // Обновляем язык распознавания если оно инициализировано
        if (recognition) {
            recognition.lang = currentLanguage.speech;
        }

        // Загружаем переводы для нового языка
        loadTranslations(langCode);
    }

    // Обработчики кнопок языка
    languageButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            updateLanguage(btn.dataset.lang);
        });
    });

    function initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            voiceButton.style.display = 'none';
            console.log('Speech Recognition API is not supported');
            return false;
        }

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLanguage.speech;

        recognition.onstart = () => {
            isRecording = true;
            startVoiceBtn.classList.add('recording');
            voiceText.textContent = translations.voice_listening;
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
            voiceText.textContent = translations.voice_error;
            isRecording = false;
            startVoiceBtn.classList.remove('recording');
        };

        recognition.onend = () => {
            isRecording = false;
            startVoiceBtn.classList.remove('recording');
            voiceText.textContent = translations.voice_modal_text;
        };

        return true;
    }

    function formatMessage(text) {
        if (!text) return '';
        text = text.replace(/^- /gm, '• ');
        text = text.replace(/^\d+\. /gm, (match) => `\n${match}`);
        return text.split('\n').filter(line => line.trim()).join('\n');
    }

    function addMessage(text, isUser = false) {
        if (!text) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

        const formattedText = isUser ? text : formatMessage(text);
        
        formattedText.split('\n').forEach(line => {
            if (line.trim()) {
                const p = document.createElement('p');
                p.innerHTML = line;
                messageDiv.appendChild(p);
            }
        });

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage(text) {
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
            addMessage(translations.error_message, false);
        } finally {
            hideLoading();
        }
    }

    function showLoading() {
        loadingIndicator.style.display = 'flex';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    function showVoiceModal() {
        voiceModal.classList.add('active');
        voiceText.textContent = translations.voice_modal_text;
    }

    function hideVoiceModal() {
        voiceModal.classList.remove('active');
        if (isRecording && recognition) {
            recognition.stop();
        }
    }

    // Event Listeners
    voiceButton.addEventListener('click', () => {
        showVoiceModal();
        if (!recognition) {
            initSpeechRecognition();
        }
    });

    closeModal.addEventListener('click', hideVoiceModal);

    startVoiceBtn.addEventListener('click', () => {
        if (!recognition && !initSpeechRecognition()) {
            return;
        }
        
        if (!isRecording) {
            recognition.lang = currentLanguage.speech;
            recognition.start();
        } else {
            recognition.stop();
        }
    });

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

    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu?.classList.toggle('show');
    });

    // Global event listeners
    document.addEventListener('click', (e) => {
        if (dropdownMenu && !dropdownMenu.contains(e.target) && !menuButton.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
        if (e.target === voiceModal) {
            hideVoiceModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideVoiceModal();
            if (dropdownMenu) {
                dropdownMenu.classList.remove('show');
            }
        }
    });

    // Initialize
    updateLanguage('lt');
});
