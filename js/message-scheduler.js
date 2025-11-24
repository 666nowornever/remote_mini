// Упрощенный MessageScheduler для работы с сервером
const MessageScheduler = {
    apiUrl: 'https://message-scheduler-server.onrender.com/api', // ЗАМЕНИ НА СВОЙ URL
    
    isInitialized: false,
    
    // Инициализация
    async init() {
        console.log('🔄 MessageScheduler: инициализация');
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            if (response.ok) {
                console.log('✅ Сервер доступен');
                this.isInitialized = true;
            }
        } catch (error) {
            console.warn('⚠️ Сервер недоступен:', error.message);
        }
    },

    // Планирование сообщения
    async scheduleMessage(timestamp, message, chatId = null, eventData = {}) {
        console.log('📅 Планирование сообщения...', {
            time: new Date(timestamp).toLocaleString('ru-RU'),
            message: message.substring(0, 50)
        });

        try {
            const response = await fetch(`${this.apiUrl}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'telegram_user',
                    chatId: chatId || '-2380747129', // Замени на реальный chatId
                    message: message,
                    scheduledFor: new Date(timestamp).toISOString(),
                    eventData: eventData
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Сообщение запланировано на сервере. ID:', result.message.id);
                return result.message.id;
            } else {
                console.error('❌ Ошибка сервера:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Ошибка сети:', error);
            return null;
        }
    },

    // Получение сообщений
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

    // Отладочные методы
    async debugMessages() {
        console.log('🔍 Проверка запланированных сообщений...');
        const messages = await this.getMessages();
        
        console.log(`📋 Всего сообщений: ${messages.length}`);
        
        if (messages.length === 0) {
            console.log('📭 Нет запланированных сообщений');
            return;
        }
        
        messages.forEach(msg => {
            const statusColors = {
                scheduled: '🟡',
                sent: '🟢', 
                error: '🔴'
            };
            
            console.log(`${statusColors[msg.status] || '⚪'} ${msg.id}:`);
            console.log(`   📝 ${msg.message.substring(0, 60)}...`);
            console.log(`   ⏰ ${new Date(msg.scheduledFor).toLocaleString('ru-RU')}`);
            console.log(`   📊 Статус: ${msg.status}`);
            if (msg.error) console.log(`   ❌ Ошибка: ${msg.error}`);
        });
    },

    // Статус
    getSchedulerStatus() {
        return {
            isRunning: true,
            isInitialized: this.isInitialized,
            server: this.apiUrl
        };
    }
};

// Сделаем глобально доступным
window.MessageScheduler = MessageScheduler;

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof MessageScheduler !== 'undefined' && MessageScheduler.init) {
        setTimeout(() => {
            MessageScheduler.init();
        }, 1000);
    }
});

console.log('✅ MessageScheduler загружен');