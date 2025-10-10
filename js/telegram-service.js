// Сервис для работы с Telegram Bot API
const TelegramService = {
    // Конфигурация (ЗАМЕНИТЕ НА СВОИ ДАННЫЕ!)
    config: {
        botToken: '8327060232:AAHctUprj0nLxO1dY0LZXf88Nyl059PV1UQ', // Токен вашего бота
        apiUrl: 'https://api.telegram.org/bot',
        defaultChatId: '2380747129' // ID рабочего чата
    },

    // Инициализация
    init() {
        console.log('🔄 TelegramService: инициализация');
        this.testConfiguration();
    },

    // Тестирование конфигурации
    async testConfiguration() {
        const hasToken = this.config.botToken && this.config.botToken !== '8327060232:AAHctUprj0nLxO1dY0LZXf88Nyl059PV1UQ';
        const hasChatId = this.config.defaultChatId && this.config.defaultChatId !== '2380747129';
        
        if (!hasToken || !hasChatId) {
            console.error('❌ TelegramService: Не настроен BOT_TOKEN или CHAT_ID');
            return false;
        }
        
        const isAvailable = await this.checkBotAvailability();
        if (isAvailable) {
            console.log('✅ TelegramService: Бот доступен');
        } else {
            console.error('❌ TelegramService: Бот недоступен');
        }
        
        return isAvailable;
    },

    // Отправка сообщения в чат
    async sendMessage(chatId, message, options = {}) {
        try {
            const targetChatId = chatId || this.config.defaultChatId;
            
            // Проверяем конфигурацию
            if (!this.config.botToken || this.config.botToken === '8327060232:AAHctUprj0nLxO1dY0LZXf88Nyl059PV1UQ') {
                throw new Error('BOT_TOKEN не настроен');
            }
            
            if (!targetChatId || targetChatId === '2380747129') {
                throw new Error('CHAT_ID не настроен');
            }

            const url = `${this.config.apiUrl}${this.config.botToken}/sendMessage`;
            
            const payload = {
                chat_id: targetChatId,
                text: message,
                parse_mode: 'HTML',
                ...options
            };

            console.log('📤 Отправка сообщения в Telegram:', {
                chatId: targetChatId,
                messageLength: message.length,
                url: url.replace(this.config.botToken, '***')
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (result.ok) {
                console.log('✅ Сообщение отправлено успешно');
                return { success: true, messageId: result.result.message_id };
            } else {
                throw new Error(result.description || 'Unknown Telegram API error');
            }

        } catch (error) {
            console.error('❌ Ошибка отправки сообщения:', error);
            return { 
                success: false, 
                error: error.message,
                details: this.parseError(error)
            };
        }
    },

    // Парсинг ошибок Telegram API
    parseError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('chat not found')) {
            return 'Чат не найден. Проверьте CHAT_ID';
        } else if (message.includes('bot was blocked')) {
            return 'Бот заблокирован в этом чате';
        } else if (message.includes('not enough rights')) {
            return 'У бота недостаточно прав для отправки сообщений';
        } else if (message.includes('message is too long')) {
            return 'Сообщение слишком длинное';
        } else if (message.includes('bot_token')) {
            return 'Неверный BOT_TOKEN';
        } else {
            return 'Ошибка сети или сервера';
        }
    },

    // Проверка доступности бота
    async checkBotAvailability() {
        try {
            if (!this.config.botToken || this.config.botToken === '8327060232:AAHctUprj0nLxO1dY0LZXf88Nyl059PV1UQ') {
                return false;
            }
            
            const url = `${this.config.apiUrl}${this.config.botToken}/getMe`;
            const response = await fetch(url);
            const result = await response.json();
            
            return result.ok;
        } catch (error) {
            console.error('❌ Бот недоступен:', error);
            return false;
        }
    },

    // Отправка сообщения с форматированием
    async sendFormattedMessage(chatId, title, message, type = 'info') {
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            success: '✅',
            event: '📅'
        };

        const formattedMessage = `
<b>${icons[type]} ${title}</b>

${message}

<code>🕒 ${new Date().toLocaleString('ru-RU')}</code>
        `.trim();

        return await this.sendMessage(chatId, formattedMessage);
    },

    // Получить информацию о боте
    async getBotInfo() {
        try {
            const url = `${this.config.apiUrl}${this.config.botToken}/getMe`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.ok) {
                return {
                    success: true,
                    username: result.result.username,
                    firstName: result.result.first_name
                };
            } else {
                throw new Error(result.description);
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    TelegramService.init();
});