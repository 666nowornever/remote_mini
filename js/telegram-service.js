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
        } else {
            this.showConfigurationError();
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
        console.log('🤖 Бот токен:', this.config.botToken.substring(0, 10) + '...');
        console.log('💬 Чат ID:', this.config.defaultChatId);
        
        return true;
    },

    // Показать ошибку конфигурации
    showConfigurationError() {
        const errorMessage = `
❌ Telegram бот не настроен!

Для работы отправки сообщений необходимо:

1. Получить BOT_TOKEN у @BotFather
2. Получить CHAT_ID рабочего чата
3. Обновить настройки в файле telegram-service.js

Текущий статус:
• BOT_TOKEN: ${this.config.botToken ? 'НАСТРОЕН' : 'НЕ НАСТРОЕН'}
• CHAT_ID: ${this.config.defaultChatId ? 'НАСТРОЕН' : 'НЕ НАСТРОЕН'}

Сообщения не будут отправляться до настройки!
        `.trim();

        console.error(errorMessage);
        
        // Показываем уведомление при первой инициализации
        if (typeof DialogService !== 'undefined') {
            setTimeout(() => {
                DialogService.showMessage(
                    '❌ Telegram не настроен',
                    'Для отправки сообщений необходимо настроить бота. Проверьте консоль для инструкций.',
                    'error'
                );
            }, 2000);
        }
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
                
                // Показываем успешное уведомление
                if (typeof DialogService !== 'undefined') {
                    setTimeout(() => {
                        DialogService.showMessage(
                            '✅ Telegram подключен',
                            `Бот @${botInfo.username} успешно подключен!\n\nСообщения будут отправляться в указанный чат.`,
                            'success'
                        );
                    }, 1000);
                }
            }
            
            return true;
        } else {
            console.error('❌ TelegramService: Бот недоступен - проверьте токен');
            
            if (typeof DialogService !== 'undefined') {
                setTimeout(() => {
                    DialogService.showMessage(
                        '❌ Ошибка подключения',
                        'Не удалось подключиться к Telegram боту. Проверьте токен и интернет-соединение.',
                        'error'
                    );
                }, 1000);
            }
            
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

            console.log('📤 Отправка сообщения в Telegram:', {
                chatId: targetChatId,
                messageLength: message.length,
                url: url.replace(this.config.botToken, '***') // Скрываем токен в логах
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
        } else if (message.includes('network') || message.includes('fetch')) {
            return 'Проблемы с интернет-соединением';
        } else {
            return 'Ошибка сервера Telegram';
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
                console.error('❌ Ошибка HTTP при проверке бота:', response.status);
                return false;
            }
            
            const result = await response.json();
            
            if (result.ok) {
                console.log('✅ Бот доступен:', result.result);
                return true;
            } else {
                console.error('❌ Ошибка Telegram API:', result.description);
                return false;
            }
            
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
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    TelegramService.init();
});