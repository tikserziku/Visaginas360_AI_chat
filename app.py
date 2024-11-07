from flask import Flask, render_template, request, jsonify
import openai
import os
from datetime import datetime
import json
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Настройка лимитера запросов
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

# Получение API ключей из переменных окружения Heroku
openai.api_key = os.environ.get('OPENAI_API_KEY')
anthropic_api_key = os.environ.get('Anthropic_API_KEY')

@app.route('/')
def index():
    """Main chat page route"""
    return render_template('index.html', year=datetime.now().year)

@app.route('/chat', methods=['POST'])
@limiter.limit("5 per minute")
def chat():
    """ChatGPT API endpoint"""
    if not openai.api_key:
        return jsonify({'error': 'OpenAI API not configured'}), 503

    try:
        message = request.json.get('message', '')
        if not message:
            return jsonify({'error': 'Empty message'}), 400

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful AI learning assistant."},
                {"role": "user", "content": message}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        # Save conversation to file
        save_conversation(message, response.choices[0].message.content)
        
        return jsonify({'reply': response.choices[0].message.content})
    except Exception as e:
        return jsonify({'error': 'Service temporarily unavailable'}), 503

@app.route('/process_voice', methods=['POST'])
@limiter.limit("5 per minute")
def process_voice():
    """Voice processing endpoint"""
    if not openai.api_key:
        return jsonify({'error': 'OpenAI API not configured'}), 503

    try:
        voice_input = request.json.get('voice_input', '')
        if not voice_input:
            return jsonify({'error': 'Empty voice input'}), 400

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful AI learning assistant."},
                {"role": "user", "content": voice_input}
            ],
            max_tokens=150,
            temperature=0.5
        )
        
        # Save conversation to file
        save_conversation(voice_input, response.choices[0].message.content, is_voice=True)
        
        return jsonify({'processed_text': response.choices[0].message.content})
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
    # Получаем порт из переменной окружения Heroku
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
