// Сервис для работы с Telegram Bot API
const TelegramService = {
    // Конфигурация с вашими данными
    config: {
        botToken: '8327060232:AAHctUprj0nLxO1dY0LZXf88Nyl059PV1UQ',
        apiUrl: 'https://api.telegram.org/bot',
        defaultChatId: '1002380747129'
    },

    // Инициализация
    init() {
        console.log('🔄 TelegramService: инициализация');
        
        // Проверяем конфигурацию при инициализации
        const configValid = this.validateConfiguration();
        if (configValid) {
            this.testConfiguration();
        }
        
        return configValid;
    },

    // Проверка конфигурации
    validateConfiguration() {
        const hasToken = this.config.botToken && 
                        this.config.botToken.length > 20;
        
        const hasChatId = this.config.defaultChatId && 
                         this.config.defaultChatId.length > 5;
        
        if (!hasToken) {
            console.error('❌ TelegramService: BOT_TOKEN не настроен или неверный');
            return false;
        }
        
        if (!hasChatId) {
            console.error('❌ TelegramService: CHAT_ID не настроен');
            return false;
        }
        
        console.log('✅ TelegramService: Конфигурация проверена');
        return true;
    },

    // Тестирование конфигурации
    async testConfiguration() {
        const configValid = this.validateConfiguration();
        if (!configValid) {
            return false;
        }
        
        console.log('🔍 Проверка доступности бота...');
        
        const isAvailable = await this.checkBotAvailability();
        if (isAvailable) {
            console.log('✅ TelegramService: Бот доступен и готов к работе');
            
            // Получаем информацию о боте
            const botInfo = await this.getBotInfo();
            if (botInfo.success) {
                console.log(`🤖 Бот: @${botInfo.username} (${botInfo.firstName})`);
            }
            
            return true;
        } else {
            console.error('❌ TelegramService: Бот недоступен - проверьте токен');
            return false;
        }
    },

    // Отправка сообщения в чат
    async sendMessage(chatId, message, options = {}) {
        try {
            const targetChatId = chatId || this.config.defaultChatId;
            
            // Проверяем конфигурацию перед отправкой
            if (!this.validateConfiguration()) {
                throw new Error('Telegram бот не настроен');
            }

            const url = `${this.config.apiUrl}${this.config.botToken}/sendMessage`;
            
            const payload = {
                chat_id: targetChatId,
                text: message,
                parse_mode: 'HTML',
                ...options
            };

            console.log('📤 Отправка сообщения в Telegram');

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
                error: error.message
            };
        }
    },

    // Проверка доступности бота
    async checkBotAvailability() {
        try {
            if (!this.config.botToken) {
                return false;
            }
            
            const url = `${this.config.apiUrl}${this.config.botToken}/getMe`;
            const response = await fetch(url);
            
            if (!response.ok) {
                return false;
            }
            
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
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.ok) {
                return {
                    success: true,
                    username: result.result.username,
                    firstName: result.result.first_name,
                    id: result.result.id
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
    },

    // Отправить тестовое сообщение
    async sendTestMessage() {
        const testMessage = `
<b>🧪 Тестовое сообщение</b>

Это тестовое сообщение от вашего бота.

✅ Если вы видите это сообщение, значит бот настроен правильно и может отправлять сообщения в чат.

<code>🕒 ${new Date().toLocaleString('ru-RU')}</code>
        `.trim();

        const result = await this.sendFormattedMessage(
            this.config.defaultChatId,
            'Тестовое сообщение',
            'Это тестовое сообщение для проверки работы бота.',
            'success'
        );

        return result;
    },

    // Получить текущие обновления (для поиска CHAT_ID)
    async getUpdates() {
        try {
            const url = `${this.config.apiUrl}${this.config.botToken}/getUpdates`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.ok) {
                return result.result;
            } else {
                throw new Error(result.description);
            }
        } catch (error) {
            console.error('❌ Ошибка получения обновлений:', error);
            return null;
        }
    },

    // Найти CHAT_ID в обновлениях
    async findChatId() {
        console.log('🔍 Поиск CHAT_ID в обновлениях...');
        
        const updates = await this.getUpdates();
        if (!updates || updates.length === 0) {
            return null;
        }
        
        const chatIds = [];
        
        updates.forEach(update => {
            if (update.message) {
                const chat = update.message.chat;
                chatIds.push({
                    id: chat.id,
                    type: chat.type,
                    title: chat.title || `${chat.first_name} ${chat.last_name || ''}`.trim(),
                    username: chat.username
                });
            }
        });
        
        return chatIds;
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    TelegramService.init();
});