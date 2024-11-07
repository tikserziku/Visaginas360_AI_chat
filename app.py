from flask import Flask, render_template, request, jsonify
import anthropic
import os
from datetime import datetime
import json
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)  # Объявляем app только ОДИН раз
app.secret_key = os.urandom(24)

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)
def chat():
    """Chat endpoint using Claude"""
    try:
        message = request.json.get('message', '')
        logger.debug(f"Received message: {message}")
        
        if not message:
            return jsonify({'error': 'Empty message'}), 400

        response = get_ai_response(message)
        logger.debug(f"AI response: {response}")
        
        # Save conversation to file
        save_conversation(message, response)
        
        return jsonify({'reply': response})
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': 'Service temporarily unavailable'}), 503
app = Flask(__name__)
app.secret_key = os.urandom(24)

# Настройка лимитера запросов
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

# Инициализация Claude API
anthropic_client = anthropic.Anthropic(
    api_key=os.environ.get('Anthropic_API_KEY')
)

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

def detect_language(text):
    first_chars = text.lower()[:100]
    
    if any(char in 'ąčęėįšųūž' for char in first_chars):
        return "lt"
    elif any(char in 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя' for char in first_chars):
        return "ru"
    else:
        return "en"

def get_ai_response(text):
    try:
        detected_language = detect_language(text)
        
        message = anthropic_client.beta.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0,
            system="""You are an AI assistant designed to help beginners learn about artificial intelligence. 
            Format your responses with clear structure and support for Markdown formatting:
            
            - Use bullet points for lists
            - Add empty lines between paragraphs
            - Use clear section headers followed by colons
            - Number steps or instructions
            - Keep paragraphs short and focused
            - Use indentation for sub-points
            - Add line breaks for better readability
            - Support Markdown links in the format [text](url)
            
            When answering, maintain a clear hierarchy in the information and use appropriate formatting for:
            - Main topics
            - Subtopics
            - Examples
            - Steps
            - Tips
            
            Respond in the same language as the user's question.
            
            Always ensure your response is well-structured and easy to read.""",
            messages=[{
                "role": "user",
                "content": text
            }]
        )
        response = message.content[0].text
        
        # Добавляем приглашение на соответствующем языке
        invitation = get_invitation_message(detected_language)
        
        return response + invitation
    except Exception as e:
        print(f"Claude API error: {str(e)}")
        error_messages = {
            "ru": "Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.",
            "lt": "Atsiprašome, įvyko klaida. Prašome bandyti dar kartą.",
            "en": "Sorry, an error occurred. Please try again."
        }
        return error_messages.get(detected_language, error_messages["en"])

@app.route('/')
def index():
    """Main chat page route"""
    return render_template('index.html', year=datetime.now().year)

@app.route('/chat', methods=['POST'])
@limiter.limit("5 per minute")
def chat():
    """Chat endpoint using Claude"""
    try:
        message = request.json.get('message', '')
        if not message:
            return jsonify({'error': 'Empty message'}), 400

        response = get_ai_response(message)
        
        # Save conversation to file
        save_conversation(message, response)
        
        return jsonify({'reply': response})
    except Exception as e:
        return jsonify({'error': 'Service temporarily unavailable'}), 503

@app.route('/process_voice', methods=['POST'])
@limiter.limit("5 per minute")
def process_voice():
    """Voice processing endpoint"""
    try:
        voice_input = request.json.get('voice_input', '')
        if not voice_input:
            return jsonify({'error': 'Empty voice input'}), 400

        response = get_ai_response(voice_input)
        
        # Save conversation to file
        save_conversation(voice_input, response, is_voice=True)
        
        return jsonify({'processed_text': response})
    except Exception as e:
        return jsonify({'error': 'Service temporarily unavailable'}), 503

def save_conversation(user_message, bot_response, is_voice=False):
    """Save conversation to a text file"""
    conversation = {
        'timestamp': datetime.now().isoformat(),
        'type': 'voice' if is_voice else 'text',
        'user_message': user_message,
        'bot_response': bot_response
    }
    
    # Создаем папку logs если её нет
    os.makedirs('logs', exist_ok=True)
    
    # Сохраняем в файл с датой
    filename = f"logs/conversations_{datetime.now().strftime('%Y%m%d')}.txt"
    with open(filename, 'a', encoding='utf-8') as f:
        f.write(json.dumps(conversation, ensure_ascii=False) + '\n')

if __name__ == '__main__':
    gunicorn_logger = logging.getLogger('gunicorn.error')
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
