from flask import Flask, render_template, request, jsonify
import anthropic
import os
from datetime import datetime
import json
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

logging.basicConfig(level=logging.INFO) # INFO для Heroku
logger = logging.getLogger(__name__)

app = Flask(__name__)  # Объявление app ПЕРЕД декораторами маршрутов!
app.secret_key = os.urandom(24)

@app.route('/chat', methods=['POST'])
@limiter.limit("5 per minute")
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

def get_ai_response(text):
    try:
        message = anthropic_client.beta.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0,
            system="""You are an AI assistant designed to help beginners learn about artificial intelligence. 
            Format your responses with clear structure:
            
            - Use bullet points for lists
            - Add empty lines between paragraphs
            - Use clear section headers followed by colons
            - Number steps or instructions
            - Keep paragraphs short and focused
            - Use indentation for sub-points
            - Add line breaks for better readability
            
            When answering, maintain a clear hierarchy in the information and use appropriate formatting for:
            - Main topics
            - Subtopics
            - Examples
            - Steps
            - Tips
            
            Always ensure your response is well-structured and easy to read.""",
            messages=[{
                "role": "user",
                "content": text
            }]
        )
        return message.content[0].text
    except Exception as e:
        print(f"Claude API error: {str(e)}")
        return "Извините, произошла ошибка. Пожалуйста, попробуйте еще раз."

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
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
