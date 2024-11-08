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

    // State variables
    let recognition = null;
    let isRecording = false;
    let translations = {};
    let currentLanguage = {
        code: 'lt',
        speech: 'lt-LT'
    };

    // Core interface functions
    function showVoiceModal() {
        voiceModal.classList.add('active');
        voiceModal.removeAttribute('hidden');
        voiceText.textContent = translations.voice_modal_text;
        startVoiceBtn.setAttribute('aria-pressed', 'false');
        document.body.style.overflow = 'hidden';
    }

    function hideVoiceModal() {
        voiceModal.classList.remove('active');
        voiceModal.setAttribute('hidden', '');
        if (isRecording && recognition) {
            recognition.stop();
            startVoiceBtn.setAttribute('aria-pressed', 'false');
        }
        document.body.style.overflow = '';
    }

    function showLoading() {
        loadingIndicator.style.display = 'flex';
        loadingIndicator.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
        loadingIndicator.setAttribute('hidden', '');
        document.body.style.overflow = '';
    }

    // Message handling functions
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

    // Language and translations handling
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

        if (chatMessages.children.length === 0) {
            addMessage(translations.welcome_message, false);
        }
    }

function updateLanguage(langCode) {
    if (!langCode) return;
    
    currentLanguage.code = langCode;
    
    // Update the language button text
    const langButton = document.getElementById('lang-toggle');
    if (langButton) {
        langButton.querySelector('span').textContent = langCode.toUpperCase();
    }
    
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
        default:
            currentLanguage.speech = 'en-US';
    }

    languageButtons.forEach(btn => {
        const isActive = btn.dataset.lang === langCode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-checked', isActive.toString());
    });

    if (recognition) {
        recognition.lang = currentLanguage.speech;
    }

    loadTranslations(langCode);
    localStorage.setItem('preferredLanguage', langCode);
}

// Language toggle button click handler
document.getElementById('lang-toggle').addEventListener('click', (event) => {
    const currentLang = currentLanguage.code;
    let nextLang;

    if (currentLang === 'lt') nextLang = 'ru';
    else if (currentLang === 'ru') nextLang = 'en';
    else nextLang = 'lt';

    updateLanguage(nextLang);
    event.stopPropagation();
});

// Initialize button text after page load
document.getElementById('lang-toggle').querySelector('span').textContent = currentLanguage.code.toUpperCase();
    // [Продолжение следует в части 2...]
     // Speech Recognition
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

        recognition.onerror = handleSpeechError;

        recognition.onend = () => {
            isRecording = false;
            startVoiceBtn.classList.remove('recording');
            voiceText.textContent = translations.voice_modal_text;
        };

        return true;
    }

    // Voice Handlers
    function handleVoiceButtonClick(e) {
        if (e?.type === 'touchstart') {
            e.preventDefault();
        }
        showVoiceModal();
        if (!recognition) {
            initSpeechRecognition();
        }
    }

    function handleStartVoiceClick(e) {
        if (e?.type === 'touchstart') {
            e.preventDefault();
        }
        
        if (!recognition && !initSpeechRecognition()) {
            return;
        }
        
        if (!isRecording) {
            recognition.lang = currentLanguage.speech;
            recognition.start();
            startVoiceBtn.setAttribute('aria-pressed', 'true');
        } else {
            recognition.stop();
            startVoiceBtn.setAttribute('aria-pressed', 'false');
        }
    }

    function handleSpeechError(error) {
        console.error('Speech recognition error:', error);
        
        let errorMessage;
        switch (error.error) {
            case 'not-allowed':
                errorMessage = 'Microphone access denied';
                break;
            case 'network':
                errorMessage = 'Network error occurred';
                break;
            default:
                errorMessage = translations.voice_error;
        }
        
        voiceText.textContent = errorMessage;
        isRecording = false;
        startVoiceBtn.classList.remove('recording');
        startVoiceBtn.setAttribute('aria-pressed', 'false');
    }

    // Event Listeners
    voiceButton.addEventListener('click', handleVoiceButtonClick);
    voiceButton.addEventListener('touchstart', handleVoiceButtonClick, { passive: false });

    startVoiceBtn.addEventListener('click', handleStartVoiceClick);
    startVoiceBtn.addEventListener('touchstart', handleStartVoiceClick, { passive: false });

    closeModal.addEventListener('click', hideVoiceModal);

    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            addMessage(message, true);
            sendMessage(message);
            messageInput.value = '';
            messageInput.focus();
        }
    });

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });

    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = dropdownMenu.classList.contains('show');
        dropdownMenu?.classList.toggle('show');
        menuButton.setAttribute('aria-expanded', (!isExpanded).toString());
        dropdownMenu.setAttribute('aria-hidden', isExpanded.toString());
    });

    languageButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            updateLanguage(btn.dataset.lang);
        });
    });

    // Touch Events
    let touchStartY = 0;
    voiceModal.addEventListener('touchstart', (e) => {
        if (e.target === voiceModal) {
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    voiceModal.addEventListener('touchmove', (e) => {
        if (e.target === voiceModal) {
            const touchEndY = e.touches[0].clientY;
            const diff = touchEndY - touchStartY;
            if (Math.abs(diff) > 50) {
                hideVoiceModal();
            }
        }
    }, { passive: true });

    // Global Event Listeners
    document.addEventListener('click', (e) => {
        if (dropdownMenu?.classList.contains('show') && 
            !dropdownMenu.contains(e.target) && 
            !menuButton.contains(e.target)) {
            dropdownMenu.classList.remove('show');
            menuButton.setAttribute('aria-expanded', 'false');
            dropdownMenu.setAttribute('aria-hidden', 'true');
        }
        
        if (e.target === voiceModal) {
            hideVoiceModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (voiceModal.classList.contains('active')) {
                hideVoiceModal();
            }
            if (dropdownMenu?.classList.contains('show')) {
                dropdownMenu.classList.remove('show');
                menuButton.setAttribute('aria-expanded', 'false');
                dropdownMenu.setAttribute('aria-hidden', 'true');
            }
        }
    });

    // Mobile Double-tap Prevention
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Online/Offline Handlers
    window.addEventListener('online', () => {
        addMessage('Connected to network', false);
    });

    window.addEventListener('offline', () => {
        addMessage('Lost network connection', false);
    });

    // Initialization
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'lt';
    updateLanguage(savedLanguage);

    if (!('fetch' in window)) {
        addMessage('Your browser might not support all features', false);
    }
});   
