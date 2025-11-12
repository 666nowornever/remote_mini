// Планировщик отправки сообщений
console.log('🔄 scheduler.js загружен');

const MessageScheduler = {
    // Интервал проверки запланированных сообщений (секунды)
    checkInterval: 30000, // 30 секунд
    timer: null,
    isInitialized: false,

    // Инициализация планировщика
    init() {
        console.log('🔄 MessageScheduler: инициализация');
        if (this.isInitialized) {
            console.log('ℹ️ MessageScheduler уже инициализирован');
            return;
        }
        
        this.startScheduler();
        this.restoreScheduledMessages();
        this.isInitialized = true;
        
        // Проверяем сразу при инициализации
        setTimeout(() => {
            this.checkScheduledMessages();
        }, 5000);
    },

    // Запуск планировщика
    startScheduler() {
        if (this.timer) {
            clearInterval(this.timer);
            console.log('🔄 Перезапуск планировщика сообщений');
        }

        this.timer = setInterval(() => {
            this.checkScheduledMessages();
        }, this.checkInterval);

        console.log('⏰ Планировщик сообщений запущен');
        
        // Логируем следующую проверку
        const nextCheck = new Date(Date.now() + this.checkInterval);
        console.log(`⏰ Следующая проверка в: ${nextCheck.toLocaleTimeString('ru-RU')}`);
    },

    // Остановка планировщика
    stopScheduler() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log('⏹️ Планировщик сообщений остановлен');
        }
    },

    // Восстановление запланированных сообщений из localStorage
    restoreScheduledMessages() {
        try {
            const messages = this.getScheduledMessages();
            console.log(`📨 Восстановлено сообщений: ${messages.length}`);
            
            // Логируем запланированные сообщения
            const scheduledMessages = messages.filter(m => m.status === 'scheduled');
            if (scheduledMessages.length > 0) {
                console.log(`⏰ Запланировано к отправке: ${scheduledMessages.length}`);
                scheduledMessages.forEach(msg => {
                    console.log(`   📅 ${new Date(msg.timestamp).toLocaleString('ru-RU')}: ${msg.message.substring(0, 50)}...`);
                });
            }
        } catch (error) {
            console.error('❌ Ошибка восстановления сообщений:', error);
        }
    },

    // Планирование сообщения
    scheduleMessage(timestamp, message, chatId = null, eventData = {}) {
        console.log('📅 Планирование сообщения:', { timestamp, message: message.substring(0, 50) });
        
        // Проверяем, что timestamp в будущем
        if (timestamp <= Date.now()) {
            console.error('❌ Нельзя запланировать сообщение в прошлом');
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
        console.log(`🆔 ID: ${scheduledMessage.id}`);
        
        // Запускаем немедленную проверку
        setTimeout(() => {
            this.checkScheduledMessages();
        }, 1000);
        
        return scheduledMessage.id;
    },

    // Проверка запланированных сообщений
    async checkScheduledMessages() {
        const now = Date.now();
        const messages = this.getScheduledMessages();
        const messagesToSend = messages.filter(msg =>
            msg.status === 'scheduled' && msg.timestamp <= now
        );

        console.log(`🔍 Проверка сообщений: ${messagesToSend.length} для отправки`);

        if (messagesToSend.length > 0) {
            console.log(`📤 Найдено сообщений для отправки: ${messagesToSend.length}`);
            for (const message of messagesToSend) {
                await this.sendScheduledMessage(message);
                // Небольшая задержка между отправками
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Логируем оставшиеся запланированные сообщения
            const remainingMessages = this.getScheduledMessages().filter(m => m.status === 'scheduled');
            console.log(`⏰ Осталось запланированных: ${remainingMessages.length}`);
        }
    },

    // Отправка запланированного сообщения
    async sendScheduledMessage(scheduledMessage) {
        console.log(`📤 Отправка сообщения: ${scheduledMessage.message.substring(0, 50)}...`);
        
        try {
            this.updateMessageStatus(scheduledMessage.id, 'sending');
            
            // Проверяем доступность TelegramService
            if (typeof TelegramService === 'undefined') {
                throw new Error('TelegramService не доступен');
            }

            // Проверяем конфигурацию TelegramService
            if (!TelegramService.config.botToken || !TelegramService.config.defaultChatId) {
                throw new Error('TelegramService не настроен');
            }

            const result = await TelegramService.sendMessage(
                scheduledMessage.chatId,
                scheduledMessage.message
            );

            if (result.success) {
                this.updateMessageStatus(scheduledMessage.id, 'sent');
                console.log(`✅ Сообщение отправлено: ${scheduledMessage.message.substring(0, 50)}...`);
                console.log(`🆔 Message ID: ${result.messageId}`);
                
                // Логируем успешную отправку
                this.logMessageDelivery(scheduledMessage, true);
            } else {
                throw new Error(result.error || 'Неизвестная ошибка отправки');
            }
        } catch (error) {
            this.updateMessageStatus(scheduledMessage.id, 'error', error.message);
            console.error('❌ Ошибка отправки сообщения:', error);
            console.error('📝 Сообщение:', scheduledMessage.message);
            console.error('⏰ Время отправки:', new Date(scheduledMessage.timestamp).toLocaleString('ru-RU'));
            
            // Логируем ошибку
            this.logMessageDelivery(scheduledMessage, false, error.message);
        }
    },

    // Логирование доставки сообщений
    logMessageDelivery(message, success, error = null) {
        const logEntry = {
            timestamp: Date.now(),
            messageId: message.id,
            success: success,
            error: error,
            message: message.message.substring(0, 100),
            scheduledFor: message.scheduledFor,
            eventType: message.eventData?.type || 'unknown'
        };
        
        // Сохраняем в localStorage для отладки
        try {
            const deliveryLog = JSON.parse(localStorage.getItem('messageDeliveryLog') || '[]');
            deliveryLog.push(logEntry);
            
            // Храним только последние 100 записей
            if (deliveryLog.length > 100) {
                deliveryLog.splice(0, deliveryLog.length - 100);
            }
            
            localStorage.setItem('messageDeliveryLog', JSON.stringify(deliveryLog));
        } catch (e) {
            console.error('❌ Ошибка сохранения лога доставки:', e);
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
            messages[messageIndex].updatedAt = Date.now();
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
            console.log(`🗑️ Очищено ${messages.length - activeMessages.length} старых сообщений`);
        }
    },

    // Получить все запланированные сообщения (для интерфейса)
    getAllMessages() {
        return this.getScheduledMessages().sort((a, b) => a.timestamp - b.timestamp);
    },

    // Получить сообщения по статусу
    getMessagesByStatus(status) {
        return this.getAllMessages().filter(msg => msg.status === status);
    },

    // Принудительная отправка всех просроченных сообщений
    forceSendOverdueMessages() {
        console.log('🚀 Принудительная отправка просроченных сообщений...');
        const now = Date.now();
        const messages = this.getScheduledMessages();
        const overdueMessages = messages.filter(msg => 
            msg.status === 'scheduled' && msg.timestamp <= now
        );
        
        console.log(`📨 Найдено просроченных сообщений: ${overdueMessages.length}`);
        
        overdueMessages.forEach(msg => {
            console.log(`⏰ Просрочено: ${new Date(msg.timestamp).toLocaleString('ru-RU')} - ${msg.message.substring(0, 50)}...`);
        });
        
        return this.checkScheduledMessages();
    },

    // Проверка состояния планировщика
    getSchedulerStatus() {
        return {
            isRunning: !!this.timer,
            isInitialized: this.isInitialized,
            checkInterval: this.checkInterval,
            nextCheck: this.timer ? new Date(Date.now() + this.checkInterval).toLocaleString('ru-RU') : 'Не запущен',
            totalMessages: this.getScheduledMessages().length,
            scheduledMessages: this.getMessagesByStatus('scheduled').length
        };
    },

    // Отладочный метод для проверки запланированных сообщений
    debugScheduledMessages() {
        const messages = this.getAllMessages();
        console.log('📋 Отладочная информация о запланированных сообщениях:');
        console.log('🔄 Статус планировщика:', this.getSchedulerStatus());
        
        if (messages.length === 0) {
            console.log('   Нет запланированных сообщений');
            return messages;
        }
        
        messages.forEach((msg, index) => {
            const date = new Date(msg.timestamp);
            const statusColors = {
                scheduled: '🟡',
                sent: '🟢',
                error: '🔴',
                sending: '🔵'
            };
            
            console.log(`${statusColors[msg.status] || '⚪'} ${index + 1}. ${msg.message.substring(0, 50)}...`);
            console.log(`   ID: ${msg.id}`);
            console.log(`   Статус: ${msg.status}`);
            console.log(`   Запланировано на: ${date.toLocaleString('ru-RU')}`);
            console.log(`   Timestamp: ${msg.timestamp}`);
            console.log(`   Тип: ${msg.eventData?.type || 'обычное'}`);
            if (msg.eventData?.birthdayName) {
                console.log(`   День рождения: ${msg.eventData.birthdayName}`);
            }
            if (msg.error) {
                console.log(`   Ошибка: ${msg.error}`);
            }
            console.log('---');
        });
        
        return messages;
    },

    // Проверка лога доставки
    getDeliveryLog() {
        try {
            return JSON.parse(localStorage.getItem('messageDeliveryLog') || '[]');
        } catch (error) {
            console.error('❌ Ошибка получения лога доставки:', error);
            return [];
        }
    }
};

// Сделаем глобально доступным
window.MessageScheduler = MessageScheduler;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MessageScheduler: запуск инициализации...');
    if (typeof MessageScheduler !== 'undefined') {
        // Задержка для инициализации других компонентов
        setTimeout(() => {
            MessageScheduler.init();
            console.log('✅ MessageScheduler инициализирован');
            
            // Дополнительная проверка через 10 секунд
            setTimeout(() => {
                console.log('🔍 Дополнительная проверка сообщений...');
                MessageScheduler.checkScheduledMessages();
            }, 10000);
        }, 2000);
    } else {
        console.error('❌ MessageScheduler не определен при инициализации');
    }
});

console.log('✅ MessageScheduler создан и готов к использованию');