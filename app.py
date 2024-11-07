from flask import Flask, render_template, request, jsonify
import anthropic
import os
from datetime import datetime
import json
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

logging.basicConfig(level=logging.INFO) # Изменено на INFO для Heroku
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Настройка лимитера запросов
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["5 per minute"]
)

# Инициализация Claude API - ОБЯЗАТЕЛЬНО проверьте наличие ключа в настройках Heroku
anthropic_client = anthropic.Anthropic(
    api_key=os.environ.get('Anthropic_API_KEY')
)

def get_ai_response(text):
    try:
        message = anthropic_client.beta.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0,
            system="""You are an AI assistant ...""", # Ваш system prompt
            messages=[{
                "role": "user",
                "content": text
            }]
        )
        #  Более надежная обработка ответа:
        response_text = message.content[0].text if message.content and message.content[0] and message.content[0].text else "Claude не смог сгенерировать ответ."
        logger.info(f"AI response: {response_text}") # INFO для Heroku
        return response_text
    except Exception as e:
        logger.exception(f"Claude API error: {e}") # Более подробное логирование с traceback
        return "Извините, произошла ошибка при обращении к Claude. Пожалуйста, попробуйте еще раз."


@app.route('/')
def index():
    return render_template('index.html', year=datetime.now().year)


@app.route('/chat', methods=['POST'])
@limiter.limit("5 per minute")
def chat():
    try:
        message = request.json.get('message', '')
        if not message:
            return jsonify({'error': 'Пустое сообщение'}), 400

        response = get_ai_response(message)
        save_conversation(message, response)
        return jsonify({'reply': response})
    except Exception as e:
        logger.exception(f"Error in chat endpoint: {e}") # Подробное логирование
        return jsonify({'error': 'Внутренняя ошибка сервера'}), 500



@app.route('/process_voice', methods=['POST'])
@limiter.limit("5 per minute")
def process_voice():
    try:
        voice_input = request.json.get('voice_input', '')
        if not voice_input:
            return jsonify({'error': 'Пустой голосовой ввод'}), 400

        response = get_ai_response(voice_input)
        save_conversation(voice_input, response, is_voice=True)
        return jsonify({'processed_text': response})
    except Exception as e:
        logger.exception(f"Error in process_voice endpoint: {e}")  # Подробное логирование
        return jsonify({'error': 'Внутренняя ошибка сервера'}), 500


def save_conversation(user_message, bot_response, is_voice=False):
    try:
        conversation = {
            'timestamp': datetime.now().isoformat(),
            'type': 'voice' if is_voice else 'text',
            'user_message': user_message,
            'bot_response': bot_response
        }
        os.makedirs('logs', exist_ok=True)
        filename = f"logs/conversations_{datetime.now().strftime('%Y%m%d')}.txt"
        with open(filename, 'a', encoding='utf-8') as f:
            f.write(json.dumps(conversation, ensure_ascii=False) + '\n')
    except Exception as e:
        logger.exception(f"Error saving conversation: {e}") # Подробное логирование


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
