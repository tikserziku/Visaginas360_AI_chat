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

    let recognition = null;
    let isRecording = false;
    let translations = {};
    let currentRecognitionLang = 'lt-LT';

    // ЗАМЕНИТЕ ЭТУ ФУНКЦИЮ
    async function loadTranslations() {
        // Определяем язык браузера
        const browserLang = navigator.language.toLowerCase();
        let lang = 'en';
        
        // Определяем какой файл переводов загружать
        if (browserLang.startsWith('lt')) {
            lang = 'lt';
        } else if (browserLang.startsWith('ru')) {
            lang = 'ru';
        }
        
        const url = `/static/locales/translations${lang !== 'ru' ? '_' + lang : ''}.json`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch translations: ${response.status} ${response.statusText}`);
            }
            translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
            translations = {  // Default English translations if loading fails
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
                "brand_name": "VISAGINAS360 AI",
                "lang": "en-US"
            };
        } finally {
            updateInterfaceLanguage();
            document.documentElement.lang = lang;
            if (translations.lang) {
                currentRecognitionLang = translations.lang;
            }
        }
    }

    function updateInterfaceLanguage() {
        messageInput.placeholder = translations.placeholder;
        sendButton.textContent = translations.send;
        voiceText.textContent = translations.voice_modal_text;
        loadingIndicator.querySelector('span').textContent = translations.loading;

        brandName.textContent = translations.brand_name;
        if (aboutLink) aboutLink.textContent = translations.about;
        if (settingsLink) settingsLink.textContent = translations.settings;
        if (helpLink) helpLink.textContent = translations.help;

        chatMessages.innerHTML = '';
        addMessage(translations.welcome_message, false);
    }

    // Инициализация распознавания речи
    function initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            voiceButton.style.display = 'none';
            console.log('Speech Recognition API is not supported');
            return;
        }

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentRecognitionLang;

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
    }

    // Функция запуска/остановки распознавания
    function toggleRecognition() {
        if (!recognition) {
            initSpeechRecognition();
        }

        if (!isRecording) {
            recognition.lang = currentRecognitionLang;
            recognition.start();
        } else {
            recognition.stop();
        }
    }

    // Обработчики событий для голосового ввода
    voiceButton.addEventListener('click', showVoiceModal);
    closeModal.addEventListener('click', hideVoiceModal);
    startVoiceBtn.addEventListener('click', toggleRecognition);

    // Добавляем кнопку переключения языка
    const languageButton = document.createElement('button');
    languageButton.className = 'input-button language-button';
    languageButton.textContent = '🌐';
    languageButton.addEventListener('click', () => {
        // Циклическое переключение между языками
        const languages = ['lt-LT', 'ru-RU', 'en-US'];
        const currentIndex = languages.indexOf(currentRecognitionLang);
        const nextIndex = (currentIndex + 1) % languages.length;
        currentRecognitionLang = languages[nextIndex];
        
        // Обновляем язык для текущего распознавания
        if (recognition) {
            recognition.lang = currentRecognitionLang;
        }
        
        // Показываем текущий язык
        const languageNames = {
            'lt-LT': 'LT',
            'ru-RU': 'RU',
            'en-US': 'EN'
        };
        languageButton.setAttribute('title', `Current: ${languageNames[currentRecognitionLang]}`);
    });

    // Добавляем кнопку языка перед кнопкой микрофона
    voiceButton.parentNode.insertBefore(languageButton, voiceButton);
    // Вызываем loadTranslations при загрузке
    loadTranslations();
});
