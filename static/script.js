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
    let currentRecognitionLang = 'lt-LT'; // Изменено на литовский по умолчанию

    loadTranslations();

    // Инициализация распознавания речи
    function initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            voiceButton.style.display = 'none';
            console.log('Speech Recognition API is not supported');
            return;
        }

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognition = new SpeechRecognition();
        
        // Базовые настройки
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentRecognitionLang;

        // Обработчики событий
        recognition.onstart = () => {
            isRecording = true;
            startVoiceBtn.classList.add('recording');
            voiceText.textContent = translations.voice_listening || 'Listening...';
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
});
