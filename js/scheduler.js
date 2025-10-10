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
            console.log('⏰ Планировщик сообщений остановлен');
        }
    },

    // Восстановление запланированных сообщений из localStorage
    restoreScheduledMessages() {
        try {
            const messages = this.getScheduledMessages();
            console.log(`📋 Восстановлено ${messages.length} запланированных сообщений`);
            
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

        console.log(`⏰ Сообщение запланировано на ${scheduledMessage.scheduledFor}`, {
            id: scheduledMessage.id,
            messageLength: message.length
        });

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
            console.log(`📨 Найдено ${messagesToSend.length} сообщений для отправки`);
            
            for (const message of messagesToSend) {
                await this.sendScheduledMessage(message);
            }
        }
    },

    // Отправка запланированного сообщения
    async sendScheduledMessage(scheduledMessage) {
        try {
            console.log(`🚀 Отправка запланированного сообщения: ${scheduledMessage.id}`);
            
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
                console.log(`✅ Запланированное сообщение отправлено: ${scheduledMessage.id}`);
                
                // Показываем уведомление пользователю
                this.showNotification('✅ Сообщение отправлено в рабочий чат');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error(`❌ Ошибка отправки запланированного сообщения: ${scheduledMessage.id}`, error);
            this.updateMessageStatus(scheduledMessage.id, 'error', error.message);
            this.showNotification('❌ Ошибка отправки сообщения');
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
            console.error('❌ Ошибка чтения сообщений:', error);
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

    showNotification(message) {
        if (typeof DialogService !== 'undefined') {
            DialogService.showMessage('Уведомление', message, 'info');
        } else {
            // Fallback уведомление
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 15px;
                border-radius: 10px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);
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
            console.log(`🧹 Очищено ${messages.length - activeMessages.length} старых сообщений`);
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    MessageScheduler.init();
});