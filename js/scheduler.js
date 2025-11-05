// Планировщик отправки сообщений
const MessageScheduler = {
    // Интервал проверки запланированных сообщений (секунды)
    checkInterval: 30000, // 30 секунд
    timer: null,

    // Инициализация планировщика
    init() {
        console.log('🔄 MessageScheduler: инициализация');
        this.startScheduler();
        this.restoreScheduledMessages();
    },

    // Запуск планировщика
    startScheduler() {
        // Останавливаем предыдущий таймер если есть
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.timer = setInterval(() => {
            this.checkScheduledMessages();
        }, this.checkInterval);

        console.log('⏰ Планировщик сообщений запущен');
    },

    // Остановка планировщика
    stopScheduler() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    // Восстановление запланированных сообщений из localStorage
    restoreScheduledMessages() {
        try {
            const messages = this.getScheduledMessages();
            // Удаляем старые отправленные сообщения (старше 7 дней)
            this.cleanupOldMessages();
        } catch (error) {
            console.error('❌ Ошибка восстановления сообщений:', error);
        }
    },

    // Планирование сообщения
    scheduleMessage(timestamp, message, chatId = null, eventData = {}) {
        const scheduledMessage = {
            id: this.generateId(),
            timestamp: timestamp,
            message: message,
            chatId: chatId,
            eventData: eventData,
            status: 'scheduled',
            createdAt: Date.now(),
            scheduledFor: new Date(timestamp).toLocaleString('ru-RU')
        };

        const messages = this.getScheduledMessages();
        messages.push(scheduledMessage);
        this.saveScheduledMessages(messages);

        return scheduledMessage.id;
    },

    // Проверка запланированных сообщений
    async checkScheduledMessages() {
        const now = Date.now();
        const messages = this.getScheduledMessages();
        const messagesToSend = messages.filter(msg => 
            msg.status === 'scheduled' && msg.timestamp <= now
        );

        if (messagesToSend.length > 0) {
            for (const message of messagesToSend) {
                await this.sendScheduledMessage(message);
            }
        }
    },

    // Отправка запланированного сообщения
    async sendScheduledMessage(scheduledMessage) {
        try {
            // Обновляем статус
            this.updateMessageStatus(scheduledMessage.id, 'sending');
            
            // Отправляем сообщение
            const result = await TelegramService.sendFormattedMessage(
                scheduledMessage.chatId,
                'Запланированное уведомление',
                scheduledMessage.message,
                'event'
            );

            if (result.success) {
                this.updateMessageStatus(scheduledMessage.id, 'sent');
            } else {
                throw new Error(result.error || 'Неизвестная ошибка отправки');
            }

        } catch (error) {
            this.updateMessageStatus(scheduledMessage.id, 'error', error.message);
        }
    },

    // Вспомогательные методы
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    getScheduledMessages() {
        try {
            return JSON.parse(localStorage.getItem('scheduledTelegramMessages') || '[]');
        } catch (error) {
            return [];
        }
    },

    saveScheduledMessages(messages) {
        try {
            localStorage.setItem('scheduledTelegramMessages', JSON.stringify(messages));
        } catch (error) {
            console.error('❌ Ошибка сохранения сообщений:', error);
        }
    },

    updateMessageStatus(messageId, status, error = null) {
        const messages = this.getScheduledMessages();
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
            messages[messageIndex].status = status;
            messages[messageIndex].sentAt = status === 'sent' ? Date.now() : undefined;
            messages[messageIndex].error = error || undefined;
            
            this.saveScheduledMessages(messages);
        }
    },

    // Получение статистики
    getStats() {
        const messages = this.getScheduledMessages();
        const stats = {
            total: messages.length,
            scheduled: messages.filter(m => m.status === 'scheduled').length,
            sent: messages.filter(m => m.status === 'sent').length,
            error: messages.filter(m => m.status === 'error').length,
            sending: messages.filter(m => m.status === 'sending').length
        };
        
        return stats;
    },

    // Отмена запланированного сообщения
    cancelScheduledMessage(messageId) {
        const messages = this.getScheduledMessages();
        const filteredMessages = messages.filter(msg => msg.id !== messageId);
        this.saveScheduledMessages(filteredMessages);
        
        return messages.length !== filteredMessages.length;
    },

    // Очистка старых сообщений
    cleanupOldMessages() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const messages = this.getScheduledMessages();
        const activeMessages = messages.filter(msg => 
            msg.status === 'scheduled' || 
            (msg.status === 'sent' && msg.sentAt > oneWeekAgo)
        );
        
        if (messages.length !== activeMessages.length) {
            this.saveScheduledMessages(activeMessages);
        }
    },

    // Получить все запланированные сообщения (для интерфейса)
    getAllMessages() {
        return this.getScheduledMessages().sort((a, b) => a.timestamp - b.timestamp);
    },

    // Получить сообщения по статусу
    getMessagesByStatus(status) {
        return this.getAllMessages().filter(msg => msg.status === status);
    }
};
// Отладочный метод для проверки запланированных сообщений
debugScheduledMessages() {
    const messages = this.getAllMessages();
    console.log('📋 Отладочная информация о запланированных сообщениях:');
    
    messages.forEach((msg, index) => {
        const date = new Date(msg.timestamp);
        console.log(`${index + 1}. ${msg.message}`);
        console.log(`   ID: ${msg.id}`);
        console.log(`   Статус: ${msg.status}`);
        console.log(`   Запланировано на: ${date.toLocaleString('ru-RU')}`);
        console.log(`   Timestamp: ${msg.timestamp}`);
        console.log(`   Тип: ${msg.eventData?.type || 'обычное'}`);
        if (msg.eventData?.birthdayName) {
            console.log(`   День рождения: ${msg.eventData.birthdayName}`);
        }
        console.log('---');
    });
    
    return messages;
},

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    MessageScheduler.init();

});
