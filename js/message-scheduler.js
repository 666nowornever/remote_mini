const MessageScheduler = {
    // ЗАМЕНИ НА СВОЙ РЕАЛЬНЫЙ URL
    apiUrl: 'https://message-scheduler-server.onrender.com/api',
    
    isInitialized: false,
    
    async init() {
        console.log('🔄 MessageScheduler: проверка сервера...');
        
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Сервер доступен:', data.status);
                this.isInitialized = true;
            } else {
                console.warn('⚠️ Сервер недоступен');
            }
        } catch (error) {
            console.warn('⚠️ Сервер недоступен:', error.message);
        }
    },

    async scheduleMessage(timestamp, message, chatId = null, eventData = {}) {
        console.log('📅 Планирование сообщения...');

        try {
            const response = await fetch(`${this.apiUrl}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'telegram_user',
                    chatId: chatId || '-2380747129',
                    message: message,
                    scheduledFor: new Date(timestamp).toISOString(),
                    eventData: eventData
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Сообщение запланировано. ID:', result.message.id);
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

    async debugMessages() {
        console.log('🔍 Проверка запланированных сообщений...');
        const messages = await this.getMessages();
        
        console.log(`📋 Всего сообщений: ${messages.length}`);
        
        messages.forEach(msg => {
            const statusColors = { scheduled: '🟡', sent: '🟢', error: '🔴' };
            console.log(`${statusColors[msg.status] || '⚪'} ${msg.id}: ${msg.message.substring(0, 50)}...`);
        });
        
        return messages;
    }
};

window.MessageScheduler = MessageScheduler;

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.MessageScheduler && MessageScheduler.init) {
            MessageScheduler.init();
        }
    }, 2000);
});