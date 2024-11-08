from flask import Flask, render_template, request, jsonify
import anthropic
import os
from datetime import datetime
import json
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
import re
import traceback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.urandom(24)

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["20 per minute", "100 per hour"]
)

try:
    anthropic_client = anthropic.Anthropic(
        api_key=os.environ.get('ANTHROPIC_API_KEY')
    )
except Exception as e:
    logger.exception(f"Error initializing Anthropic client: {e}")
    anthropic_client = None

def get_invitation_message(language):
    url = "https://spiecius.inovacijuagentura.lt/office/visagine/"
    invitations = {
        "ru": f"""

«Я всех приглашаю на личную консультацию по искусственному интеллекту на бесплатные 20 минут. А в эту пятницу, 8 ноября, пройдет урок по искусственному интеллекту в Висагинасе в Инкубаторе ([Подробнее здесь]({url})).»""",
        
        "lt": f"""

«Kviečiu visus į nemokamą 20 minučių asmeninę konsultaciją apie dirbtinį intelektą. O šį penktadienį, lapkričio 8 d., Visagino inkubatoriuje vyks dirbtinio intelekto pamoka ([Sužinoti daugiau]({url})).»""",
        
        "en": f"""

«I invite everyone to a free 20-minute personal consultation on artificial intelligence. And this Friday, November 8, there will be an artificial intelligence lesson at the Visaginas Incubator ([Learn more]({url})).»"""
    }
    return invitations.get(language, invitations["en"])

def normalize_text(text):
    """Нормализует текст, удаляя специальные символы и лишние пробелы"""
    if not text:
        return ""
    text = re.sub(r'[^\w\s\u0400-\u04FF\u0100-\u017F]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()

def detect_language(text):
    if not text:
        return "en"

    normalized_text = normalize_text(text)
    
    lt_specific = set('ąčęėįšųūž')
    ru_specific = set('абвгдеёжзийклмнопрстуфхцчшщъыьэюя')
    
    lt_count = sum(1 for char in normalized_text if char in lt_specific)
    ru_count = sum(1 for char in normalized_text if char in ru_specific)
    
    lt_markers = [
        'labas', 'ačiū', 'prašau', 'taip', 'kaip', 'kodėl', 
        'dirbtinis', 'intelektas', 'sveiki', 'gerai', 'mokytis',
        'kalba', 'darbas', 'sistema', 'programa'
    ]
    has_lt_markers = any(marker in normalized_text for marker in lt_markers)
    
    ru_markers = [
        'привет', 'спасибо', 'пожалуйста', 'как', 'почему', 
        'искусственный', 'интеллект', 'здравствуйте', 'хорошо',
        'учиться', 'система', 'программа', 'работа'
    ]
    has_ru_markers = any(marker in normalized_text for marker in ru_markers)

    en_markers = ['hello', 'hi', 'thanks', 'please', 'artificial', 'intelligence', 'learn', 'system']
    has_en_markers = any(marker in normalized_text for marker in en_markers)

    if lt_count > 0 or has_lt_markers:
        return "lt"
    elif ru_count > 0 or has_ru_markers:
        return "ru"
    elif has_en_markers:
        return "en"
    return "en"

def get_ai_response(text):
    try:
        detected_language = detect_language(text)
        logger.info(f"Detected language: {detected_language} for text: {text[:50]}...")

        system_prompts = {
            "lt": """You are an AI assistant helping beginners learn about artificial intelligence.
            ALWAYS RESPOND IN LITHUANIAN, regardless of the input language.
            Use natural, conversational Lithuanian language.
            Keep responses clear and engaging.
            
            Format responses with clear structure:
            - Use bullet points for lists
            - Add empty lines between paragraphs
            - Use clear section headers
            - Number steps or instructions
            - Keep paragraphs focused and concise
            
            Important: Always maintain a helpful and friendly tone while explaining concepts in Lithuanian.""",
            
            "ru": """You are an AI assistant helping beginners learn about artificial intelligence.
            ALWAYS RESPOND IN RUSSIAN, regardless of the input language.
            Use natural, conversational Russian language.
            Keep responses clear and engaging.
            
            Format responses with clear structure:
            - Use bullet points for lists
            - Add empty lines between paragraphs
            - Use clear section headers
            - Number steps or instructions
            - Keep paragraphs focused and concise
            
            Important: Always maintain a helpful and friendly tone while explaining concepts in Russian.""",
            
            "en": """You are an AI assistant helping beginners learn about artificial intelligence.
            ALWAYS RESPOND IN ENGLISH, regardless of the input language.
            Use natural, conversational English language.
            Keep responses clear and engaging.
            
            Format responses with clear structure:
            - Use bullet points for lists
            - Add empty lines between paragraphs
            - Use clear section headers
            - Number steps or instructions
            - Keep paragraphs focused and concise
            
            Important: Always maintain a helpful and friendly tone while explaining concepts in English."""
        }

        message = anthropic_client.beta.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0,
            system=system_prompts[detected_language],
            messages=[{
                "role": "user",
                "content": text
            }]
        )
        response = message.content[0].text
        
        invitation = get_invitation_message(detected_language)
        
        return response + invitation
    except Exception as e:
        logger.exception(f"Error in get_ai_response: {str(e)}")
        error_messages = {
            "ru": "Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.",
            "lt": "Atsiprašome, įvyko klaida. Prašome bandyti dar kartą.",
            "en": "Sorry, an error occurred. Please try again."
        }
        return error_messages.get(detect_language(text), error_messages["en"])

@app.route('/')
def index():
    try:
        return render_template('index.html', year=datetime.now().year)
    except Exception as e:
        logger.error(f"Error rendering index page: {str(e)}")
        return "Server Error", 500

@app.route('/chat', methods=['POST'])
@limiter.limit("5 per minute")
def chat():
    try:
        message = request.json.get('message', '').strip()
        if not message:
            return jsonify({'reply': 'Пожалуйста, введите сообщение.'})

        if anthropic_client is None:
            return jsonify({'error': 'Сервис временно недоступен.'}), 503

        response = get_ai_response(message)
        save_conversation(message, response)
        return jsonify({'reply': response})
    except Exception as e:
        logger.exception(f"Error in chat endpoint: {e}")
        return jsonify({'error': 'Сервис временно недоступен.'}), 503

@app.route('/process_voice', methods=['POST'])
@limiter.limit("5 per minute")
def process_voice():
    try:
        voice_input = request.json.get('voice_input', '').strip()
        if not voice_input:
            return jsonify({'processed_text': 'Пожалуйста, произнесите сообщение.'}), 200

        if anthropic_client is None:
            return jsonify({'error': 'Сервис временно недоступен.'}), 503

        response = get_ai_response(voice_input)
        save_conversation(voice_input, response, is_voice=True)
        return jsonify({'processed_text': response})
    except Exception as e:
        logger.exception(f"Error in process_voice endpoint: {e}")
        return jsonify({'error': 'Сервис временно недоступен.'}), 503

def save_conversation(user_message, bot_response, is_voice=False):
    try:
        conversation = {
            'timestamp': datetime.now().isoformat(),
            'type': 'voice' if is_voice else 'text',
            'user_message': user_message,
            'bot_response': bot_response,
            'detected_language': detect_language(user_message)
        }
        
        os.makedirs('logs', exist_ok=True)
        filename = f"logs/conversations_{datetime.now().strftime('%Y%m%d')}.txt"
        with open(filename, 'a', encoding='utf-8') as f:
            f.write(json.dumps(conversation, ensure_ascii=False) + '\n')
    except Exception as e:
        logger.error(f"Error saving conversation: {str(e)}")

if __name__ == '__main__':
    try:
        port = int(os.environ.get('PORT', 5000))
        app.run(host='0.0.0.0', port=port)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
