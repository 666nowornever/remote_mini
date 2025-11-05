// Планировщик отправки сообщений
console.log('🔄 scheduler.js загружен');

const MessageScheduler = {
    // Интервал проверки запланированных сообщений (секунды)
    checkInterval: 30000, // 30 секунд
    timer: null,

    // Инициализация планировщика
    init() {
        console.log('🔄 MessageScheduler: инициализация');
        this.startScheduler();
        this.restoreScheduledMessages();
        this.checkBirthdaySchedule();
    },

    // Запуск планировщика
    startScheduler() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            this.checkScheduledMessages();
        }, this.checkInterval);

        console.log('⏰ Планировщик сообщений запущен');
    },

    // Проверка расписания дней рождения
    checkBirthdaySchedule() {
        console.log('🎂 Проверка расписания дней рождения...');
        const birthdayMessages = this.getMessagesByStatus('scheduled').filter(
            m => m.eventData?.type === 'birthday'
        );
        console.log(`📅 Запланировано дней рождения: ${birthdayMessages.length}`);
        
        birthdayMessages.forEach(msg => {
            console.log(`   - ${msg.eventData.birthdayName}: ${new Date(msg.timestamp).toLocaleString('ru-RU')}`);
        });
    },

    // Восстановление запланированных сообщений из localStorage
    restoreScheduledMessages() {
        try {
            const messages = this.getScheduledMessages();
            console.log(`📨 Восстановлено сообщений: ${messages.length}`);
            
            // Проверяем корректность временных меток
            messages.forEach(msg => {
                if (isNaN(new Date(msg.timestamp).getTime())) {
                    console.error(`❌ Некорректная временная метка у сообщения ${msg.id}`);
                }
            });
        } catch (error) {
            console.error('❌ Ошибка восстановления сообщений:', error);
        }
    },

    // Планирование сообщения
    scheduleMessage(timestamp, message, chatId = null, eventData = {}) {
        console.log('📅 Планирование сообщения:', { 
            timestamp, 
            date: new Date(timestamp).toLocaleString('ru-RU'),
            message: message.substring(0, 50) 
        });
        
        // Проверяем корректность timestamp
        if (isNaN(new Date(timestamp).getTime())) {
            console.error('❌ Некорректная временная метка:', timestamp);
            return null;
        }

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

        console.log(`✅ Сообщение запланировано: ${new Date(timestamp).toLocaleString('ru-RU')}`);
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
            console.log(`📤 Найдено сообщений для отправки: ${messagesToSend.length}`);
            for (const message of messagesToSend) {
                await this.sendScheduledMessage(message);
            }
        }
    },

    // Отправка запланированного сообщения
    async sendScheduledMessage(scheduledMessage) {
        try {
            console.log(`🚀 Отправка сообщения: ${scheduledMessage.message.substring(0, 50)}...`);
            this.updateMessageStatus(scheduledMessage.id, 'sending');
            
            // Проверяем доступность TelegramService
            if (typeof TelegramService === 'undefined') {
                throw new Error('TelegramService не доступен');
            }

            const result = await TelegramService.sendFormattedMessage(
                scheduledMessage.chatId,
                'Запланированное уведомление',
                scheduledMessage.message,
                'event'
            );

            if (result.success) {
                this.updateMessageStatus(scheduledMessage.id, 'sent');
                console.log(`✅ Сообщение отправлено: ${scheduledMessage.message.substring(0, 50)}...`);
                
                // Для дней рождения логируем дополнительную информацию
                if (scheduledMessage.eventData?.type === 'birthday') {
                    console.log(`🎂 День рождения отправлен: ${scheduledMessage.eventData.birthdayName}`);
                }
            } else {
                throw new Error(result.error || 'Неизвестная ошибка отправки');
            }
        } catch (error) {
            console.error('❌ Ошибка отправки сообщения:', error);
            this.updateMessageStatus(scheduledMessage.id, 'error', error.message);
            
            // Детальный лог ошибок для отладки
            console.error('🔍 Детали ошибки:', {
                messageId: scheduledMessage.id,
                timestamp: scheduledMessage.timestamp,
                scheduledTime: new Date(scheduledMessage.timestamp).toLocaleString('ru-RU'),
                currentTime: new Date().toLocaleString('ru-RU'),
                error: error.message
            });
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
            console.error('❌ Ошибка получения сообщений:', error);
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
            (msg.status === 'sent' && msg.sentAt > oneWeekAgo) ||
            (msg.status === 'error' && msg.createdAt > oneWeekAgo)
        );

        if (messages.length !== activeMessages.length) {
            this.saveScheduledMessages(activeMessages);
            console.log(`🗑️ Очищено ${messages.length - activeMessages.length} старых сообщений`);
        }
    },

    // Получить все запланированные сообщения (для интерфейса)
    getAllMessages() {
        return this.getScheduledMessages().sort((a, b) => b.timestamp - a.timestamp); // Сначала новые
    },

    // Получить сообщения по статусу
    getMessagesByStatus(status) {
        return this.getAllMessages().filter(msg => msg.status === status);
    },

    // Отладочный метод для проверки запланированных сообщений
    debugScheduledMessages() {
        const messages = this.getAllMessages();
        console.log('📋 Отладочная информация о запланированных сообщениях:');
        
        if (messages.length === 0) {
            console.log('   Нет запланированных сообщений');
            return messages;
        }
        
        messages.forEach((msg, index) => {
            const date = new Date(msg.timestamp);
            console.log(`${index + 1}. ${msg.message.substring(0, 50)}...`);
            console.log(`   ID: ${msg.id}`);
            console.log(`   Статус: ${msg.status}`);
            console.log(`   Запланировано на: ${date.toLocaleString('ru-RU')}`);
            console.log(`   Timestamp: ${msg.timestamp}`);
            console.log(`   Тип: ${msg.eventData?.type || 'обычное'}`);
            if (msg.eventData?.birthdayName) {
                console.log(`   День рождения: ${msg.eventData.birthdayName}`);
                console.log(`   Тип ДР: ${msg.eventData.birthdayType}`);
            }
            if (msg.error) {
                console.log(`   Ошибка: ${msg.error}`);
            }
            if (msg.sentAt) {
                console.log(`   Отправлено: ${new Date(msg.sentAt).toLocaleString('ru-RU')}`);
            }
            console.log('---');
        });
        
        return messages;
    }
};

// Сделаем глобально доступным
window.MessageScheduler = MessageScheduler;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MessageScheduler: запуск инициализации...');
    if (typeof MessageScheduler !== 'undefined') {
        MessageScheduler.init();
        console.log('✅ MessageScheduler инициализирован');
    } else {
        console.error('❌ MessageScheduler не определен при инициализации');
    }
});

console.log('✅ MessageScheduler создан и готов к использованию');