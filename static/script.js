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
    let currentRecognitionLang = 'ru-RU';

    loadTranslations();

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
                "brand_name": "VISAGINAS360 AI",
                "lang": "ru-RU" // Default recognition language
            };
        } finally {
            updateInterfaceLanguage();
            document.documentElement.lang = lang;
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

        chatMessages.innerHTML = '';
        addMessage(translations.welcome_message, false);

        currentRecognitionLang = translations.lang; // Update recognition language
    }

    // ... (formatMessage, addMessage, sendMessage, showLoading, hideLoading)

    function startVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            voiceButton.style.display = 'none';
            console.log('Speech Recognition API is not supported');
            return;
        }

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;

        if (recognition === null) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;

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
                voiceText.textContent = translations.voice_error || 'Error. Please try again.';
                isRecording = false;
                startVoiceBtn.classList.remove('recording');
            };

            recognition.onend = () => {
                isRecording = false;
                startVoiceBtn.classList.remove('recording');
                voiceText.textContent = translations.voice_modal_text || 'Click to speak';
            };
        }

        recognition.lang = currentRecognitionLang;
        recognition.start();
    }

    // Voice Button Event Listeners
    // ... (no changes in voice button event listeners)

    // ... (rest of the code - Menu Controls, Text Input Handlers, Global Event Listeners - no changes)
});
