// Планировщик отправки сообщений с фоновой работой
console.log('🔄 scheduler.js загружен');

const MessageScheduler = {
    // Конфигурация
    checkInterval: 30000, // 30 секунд
    timer: null,
    isInitialized: false,
    serviceWorkerSupported: 'serviceWorker' in navigator,

    // Инициализация планировщика
    async init() {
    console.log('🔄 MessageScheduler: инициализация');
    
    if (this.isInitialized) {
        console.log('ℹ️ MessageScheduler уже инициализирован');
        return;
    }
    
    try {
        // Регистрируем Service Worker
        if (this.serviceWorkerSupported) {
            await this.registerServiceWorker();
            
            // Запрашиваем разрешение на уведомления и фоновую работу
            await this.requestPermissions();
        } else {
            console.warn('⚠️ Service Worker не поддерживается, используется fallback режим');
        }
        
        // Запускаем планировщик
        this.startScheduler();
        
        // Восстанавливаем сообщения
        this.restoreScheduledMessages();
        
        // Синхронизируем с Service Worker
        await this.syncAllWithServiceWorker();
        
        // Проверяем сразу
        setTimeout(() => {
            this.checkScheduledMessages();
        }, 2000);
        
        this.isInitialized = true;
        console.log('✅ MessageScheduler инициализирован');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации MessageScheduler:', error);
        // Fallback
        this.startScheduler();
        this.restoreScheduledMessages();
    }
},

// Запрос разрешений
async requestPermissions() {
    try {
        // Запрашиваем разрешение на уведомления
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        
        // Запрашиваем фоновую синхронизацию
        if ('periodicSync' in registration) {
            try {
                await registration.periodicSync.register('message-check', {
                    minInterval: 5 * 60 * 1000 // 5 минут
                });
                console.log('✅ Фоновая синхронизация зарегистрирована');
            } catch (error) {
                console.warn('⚠️ Фоновая синхронизация не поддерживается:', error);
            }
        }
    } catch (error) {
        console.warn('⚠️ Ошибка запроса разрешений:', error);
    }
},
// Полная синхронизация с Service Worker
async syncAllWithServiceWorker() {
    if (!navigator.serviceWorker.controller) return;
    
    const messages = this.getScheduledMessages();
    const config = {
        botToken: TelegramService?.config?.botToken,
        defaultChatId: TelegramService?.config?.defaultChatId
    };
    
    // Синхронизируем конфигурацию
    navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_CONFIG',
        config: config
    });
    
    // Синхронизируем сообщения
    navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_MESSAGES',
        messages: messages
    });
    
    console.log(`📡 Синхронизировано ${messages.length} сообщений и конфигурация с Service Worker`);
},

    // Регистрация Service Worker
    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            console.log('✅ Service Worker зарегистрирован:', registration);
            
            // Отправляем сообщения в Service Worker
            if (registration.active) {
                await this.syncWithServiceWorker();
            }
            
            // Слушаем сообщения от Service Worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event.data);
            });
            
        } catch (error) {
            console.error('❌ Ошибка регистрации Service Worker:', error);
            throw error;
        }
    },

    // Синхронизация с Service Worker
    async syncWithServiceWorker() {
        if (!navigator.serviceWorker.controller) return;
        
        const messages = this.getScheduledMessages();
        const scheduledMessages = messages.filter(msg => msg.status === 'scheduled');
        
        navigator.serviceWorker.controller.postMessage({
            type: 'SYNC_MESSAGES',
            messages: scheduledMessages
        });
        
        console.log(`📡 Синхронизировано ${scheduledMessages.length} сообщений с Service Worker`);
    },

    // Обработка сообщений от Service Worker
    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'MESSAGE_SENT':
                console.log('✅ Service Worker отправил сообщение:', data.messageId);
                this.updateMessageStatus(data.messageId, 'sent');
                break;
                
            case 'MESSAGE_ERROR':
                console.error('❌ Service Worker: ошибка отправки:', data.messageId, data.error);
                this.updateMessageStatus(data.messageId, 'error', data.error);
                break;
                
            case 'NEED_SYNC':
                console.log('🔄 Service Worker запросил синхронизацию');
                this.syncWithServiceWorker();
                break;
        }
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
        
        // Логируем следующую проверку
        const nextCheck = new Date(Date.now() + this.checkInterval);
        console.log(`⏰ Следующая проверка в: ${nextCheck.toLocaleTimeString('ru-RU')}`);
        
        // Также запускаем проверку при видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔍 Страница активна, проверка сообщений...');
                this.checkScheduledMessages();
            }
        });
    },

    // Остановка планировщика
    stopScheduler() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log('⏹️ Планировщик сообщений остановлен');
        }
    },

    // Восстановление запланированных сообщений
    restoreScheduledMessages() {
        try {
            const messages = this.getScheduledMessages();
            console.log(`📨 Восстановлено сообщений: ${messages.length}`);
            
            const scheduledMessages = messages.filter(m => m.status === 'scheduled');
            const overdueMessages = scheduledMessages.filter(msg => msg.timestamp <= Date.now());
            
            if (overdueMessages.length > 0) {
                console.log(`⚠️ Найдено просроченных сообщений: ${overdueMessages.length}`);
                overdueMessages.forEach(msg => {
                    console.log(`   ⏰ ${new Date(msg.timestamp).toLocaleString('ru-RU')}: ${msg.message.substring(0, 50)}...`);
                });
            }
            
            if (scheduledMessages.length > 0) {
                console.log(`⏰ Запланировано к отправке: ${scheduledMessages.length}`);
            }
            
        } catch (error) {
            console.error('❌ Ошибка восстановления сообщений:', error);
        }
    },

    // Планирование сообщения
    scheduleMessage(timestamp, message, chatId = null, eventData = {}) {
    console.log('📅 Планирование сообщения:', { 
        timestamp, 
        scheduledTime: new Date(timestamp).toLocaleString('ru-RU'),
        message: message.substring(0, 50) 
    });
    
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
        scheduledFor: new Date(timestamp).toLocaleString('ru-RU'),
        attempts: 0,
        maxAttempts: 3
    };

    const messages = this.getScheduledMessages();
    messages.push(scheduledMessage);
    this.saveScheduledMessages(messages);

    console.log(`✅ Сообщение запланировано: ${new Date(timestamp).toLocaleString('ru-RU')}`);
    console.log(`🆔 ID: ${scheduledMessage.id}`);
    
    // Синхронизируем с Service Worker
    this.syncAllWithServiceWorker();
    
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
            
            // Отправляем сообщения последовательно с задержкой
            for (const message of messagesToSend) {
                await this.sendScheduledMessage(message);
                // Задержка между отправками
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Логируем оставшиеся запланированные сообщения
            const remainingMessages = this.getScheduledMessages().filter(m => m.status === 'scheduled');
            console.log(`⏰ Осталось запланированных: ${remainingMessages.length}`);
        }
    },

    // Отправка запланированного сообщения
    async sendScheduledMessage(scheduledMessage) {
        console.log(`📤 Отправка сообщения: ${scheduledMessage.message.substring(0, 50)}...`);
        console.log(`⏰ Время отправки: ${new Date(scheduledMessage.timestamp).toLocaleString('ru-RU')}`);
        
        try {
            this.updateMessageStatus(scheduledMessage.id, 'sending');
            
            // Увеличиваем счетчик попыток
            this.incrementAttempts(scheduledMessage.id);
            
            // Проверяем доступность TelegramService
            if (typeof TelegramService === 'undefined') {
                throw new Error('TelegramService не доступен');
            }

            // Проверяем конфигурацию TelegramService
            if (!TelegramService.config?.botToken) {
                throw new Error('TelegramService: токен бота не настроен');
            }

            if (!TelegramService.config?.defaultChatId) {
                throw new Error('TelegramService: chatId не настроен');
            }

            // Проверяем доступность бота
            const botAvailable = await TelegramService.checkBotAvailability();
            if (!botAvailable) {
                throw new Error('Telegram бот недоступен');
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
                
                // Уведомляем Service Worker
                this.notifyServiceWorker('MESSAGE_SENT', {
                    messageId: scheduledMessage.id
                });
                
            } else {
                throw new Error(result.error || 'Неизвестная ошибка отправки');
            }
        } catch (error) {
            console.error('❌ Ошибка отправки сообщения:', error);
            console.error('📝 Сообщение:', scheduledMessage.message);
            
            // Проверяем, не превышено ли количество попыток
            const messages = this.getScheduledMessages();
            const message = messages.find(m => m.id === scheduledMessage.id);
            
            if (message && message.attempts >= message.maxAttempts) {
                this.updateMessageStatus(scheduledMessage.id, 'error', `Превышено количество попыток: ${error.message}`);
                console.error(`❌ Превышено количество попыток для сообщения: ${scheduledMessage.id}`);
            } else {
                this.updateMessageStatus(scheduledMessage.id, 'scheduled', error.message);
                console.log(`🔄 Сообщение возвращено в очередь: ${scheduledMessage.id}`);
            }
            
            // Логируем ошибку
            this.logMessageDelivery(scheduledMessage, false, error.message);
            
            // Уведомляем Service Worker
            this.notifyServiceWorker('MESSAGE_ERROR', {
                messageId: scheduledMessage.id,
                error: error.message
            });
        }
    },

    // Уведомление Service Worker
    notifyServiceWorker(type, data) {
        if (navigator.serviceWorker?.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: type,
                ...data
            });
        }
    },

    // Увеличение счетчика попыток
    incrementAttempts(messageId) {
        const messages = this.getScheduledMessages();
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
            if (!messages[messageIndex].attempts) {
                messages[messageIndex].attempts = 0;
            }
            messages[messageIndex].attempts++;
            messages[messageIndex].lastAttempt = Date.now();
            this.saveScheduledMessages(messages);
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
            eventType: message.eventData?.type || 'unknown',
            attempts: message.attempts || 0
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
        
        const success = messages.length !== filteredMessages.length;
        if (success) {
            this.notifyServiceWorker('MESSAGE_CANCELLED', { messageId });
        }
        
        return success;
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

    // Получить все запланированные сообщения
    getAllMessages() {
        return this.getScheduledMessages().sort((a, b) => a.timestamp - b.timestamp);
    },

    // Получить сообщения по статусу
    getMessagesByStatus(status) {
        return this.getAllMessages().filter(msg => msg.status === status);
    },

    // Принудительная отправка всех просроченных сообщений
    async forceSendOverdueMessages() {
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
        
        await this.checkScheduledMessages();
        return overdueMessages.length;
    },

    // Проверка состояния планировщика
    getSchedulerStatus() {
        const messages = this.getScheduledMessages();
        const nextMessage = messages
            .filter(m => m.status === 'scheduled')
            .sort((a, b) => a.timestamp - b.timestamp)[0];
            
        return {
            isRunning: !!this.timer,
            isInitialized: this.isInitialized,
            serviceWorker: this.serviceWorkerSupported,
            checkInterval: this.checkInterval,
            nextCheck: this.timer ? new Date(Date.now() + this.checkInterval).toLocaleString('ru-RU') : 'Не запущен',
            nextMessage: nextMessage ? new Date(nextMessage.timestamp).toLocaleString('ru-RU') : 'Нет',
            totalMessages: messages.length,
            scheduledMessages: this.getMessagesByStatus('scheduled').length
        };
    },

    // Проверка лога доставки
    getDeliveryLog() {
        try {
            return JSON.parse(localStorage.getItem('messageDeliveryLog') || '[]');
        } catch (error) {
            console.error('❌ Ошибка получения лога доставки:', error);
            return [];
        }
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
            console.log(`   Попытки: ${msg.attempts || 0}/${msg.maxAttempts || 3}`);
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