// Упрощенный MessageScheduler для работы с сервером
const MessageScheduler = {
    apiUrl: 'https://your-server.com/api', // Замени на реальный URL сервера
    
    // Инициализация
    async init() {
        console.log('🔄 MessageScheduler: инициализация');
        this.isInitialized = true;
        console.log('✅ MessageScheduler готов к работе');
    },

    // Планирование сообщения
    async scheduleMessage(timestamp, message, chatId = null, eventData = {}) {
        try {
            console.log('📅 Планирование сообщения на сервере...', {
                timestamp: new Date(timestamp).toLocaleString('ru-RU'),
                message: message.substring(0, 50)
            });

            const response = await fetch(`${this.apiUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: 'telegram_user', // Временно, пока не настроен TelegramService
                    chatId: chatId || '-1001234567890', // Твой chat ID
                    message: message,
                    scheduledFor: new Date(timestamp).toISOString(),
                    eventData: eventData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Сообщение запланировано на сервере');
                return result.message.id;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Ошибка планирования сообщения:', error);
            return null;
        }
    },

    // Получение сообщений пользователя
    async getMessages() {
        try {
            const response = await fetch(`${this.apiUrl}/messages/telegram_user`);
            const result = await response.json();
            
            return result.success ? result.messages : [];
        } catch (error) {
            console.error('❌ Ошибка получения сообщений:', error);
            return [];
        }
    },

    // Отмена сообщения
    async cancelMessage(messageId) {
        try {
            const response = await fetch(`${this.apiUrl}/messages/${messageId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('❌ Ошибка отмены сообщения:', error);
            return false;
        }
    },

    // Проверка запланированных сообщений
    async checkScheduledMessages() {
        console.log('🔍 Проверка сообщений на сервере...');
        const messages = await this.getMessages();
        const scheduled = messages.filter(msg => msg.status === 'scheduled');
        console.log(`⏰ Запланировано сообщений: ${scheduled.length}`);
        return scheduled;
    },

    // Статус планировщика
    getSchedulerStatus() {
        return {
            isRunning: true,
            isInitialized: this.isInitialized,
            serviceWorker: false,
            checkInterval: 30000,
            nextCheck: 'На сервере',
            nextMessage: 'На сервере',
            totalMessages: 0,
            scheduledMessages: 0
        };
    },

    // Получить все сообщения
    async getAllMessages() {
        return await this.getMessages();
    },

    // Отправка просроченных сообщений
    async forceSendOverdueMessages() {
        console.log('🚀 Принудительная отправка сообщений...');
        // Сервер сам обрабатывает отправку
        return 0;
    },

    // Отладка
    debugScheduledMessages() {
        console.log('🔍 Отладка запланированных сообщений:');
        this.getMessages().then(messages => {
            console.log(`📋 Всего сообщений: ${messages.length}`);
            messages.forEach(msg => {
                console.log(`📝 ${msg.status}: ${msg.message.substring(0, 50)}...`);
            });
        });
    }
};

// Сделаем глобально доступным
window.MessageScheduler = MessageScheduler;

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof MessageScheduler !== 'undefined' && MessageScheduler.init) {
        MessageScheduler.init();
    }
});