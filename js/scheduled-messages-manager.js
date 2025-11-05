// Менеджер для работы с запланированными сообщениями
const ScheduledMessagesManager = {
    currentFilter: 'all',

    // Инициализация
    init() {
        console.log('🔄 ScheduledMessagesManager: инициализация');
    },

    // Показать страницу сообщений
    showScheduledMessages() {
        Navigation.showPage('scheduled-messages');
    },

    // Загрузка страницы
    loadScheduledMessagesPage() {
        console.log('🔄 Загрузка страницы запланированных сообщений');
        this.loadStats();
        this.loadMessages();
        this.initializeFilters();
    },

    // Загрузка статистики
    loadStats() {
        const stats = MessageScheduler.getStats();
        const statsElement = document.getElementById('messagesStats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${stats.total}</div>
                        <div class="stat-label">Всего</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" style="color: #ff9800;">${stats.scheduled}</div>
                        <div class="stat-label">Запланировано</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" style="color: #4CAF50;">${stats.sent}</div>
                        <div class="stat-label">Отправлено</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" style="color: #f44336;">${stats.error}</div>
                        <div class="stat-label">Ошибки</div>
                    </div>
                </div>
            `;
        }
    },

    // Загрузка сообщений
    loadMessages() {
        console.log('📨 Загрузка сообщений...');
        const messages = MessageScheduler.getAllMessages();
        console.log('Найдено сообщений:', messages.length);
        
        const filteredMessages = this.filterMessages(messages, this.currentFilter);
        const messagesList = document.getElementById('messagesList');
        
        if (messagesList) {
            if (filteredMessages.length === 0) {
                messagesList.innerHTML = `
                    <div class="no-messages">
                        <i class="fas fa-inbox"></i>
                        <p>Нет сообщений для отображения</p>
                        <small>Выберите другой фильтр или запланируйте новое сообщение</small>
                    </div>
                `;
            } else {
                messagesList.innerHTML = filteredMessages.map(message => 
                    this.createMessageElement(message)
                ).join('');
            }
        }
        
        this.loadStats();
    },

    // Фильтрация сообщений
    filterMessages(messages, filter) {
        switch (filter) {
            case 'scheduled':
                return messages.filter(m => m.status === 'scheduled');
            case 'sent':
                return messages.filter(m => m.status === 'sent');
            case 'error':
                return messages.filter(m => m.status === 'error');
            case 'birthday':
                return messages.filter(m => m.eventData?.type === 'birthday');
            default:
                return messages;
        }
    },

    // Создание элемента сообщения
    createMessageElement(message) {
        const statusIcons = {
            scheduled: '⏰',
            sent: '✅',
            error: '❌',
            sending: '🔄'
        };

        const statusColors = {
            scheduled: '#ff9800',
            sent: '#4CAF50',
            error: '#f44336',
            sending: '#2196F3'
        };

        const statusTexts = {
            scheduled: 'Запланировано',
            sent: 'Отправлено',
            error: 'Ошибка',
            sending: 'Отправляется'
        };

        // Определяем тип сообщения
        let messageType = 'Обычное';
        let typeIcon = '📝';
        let typeColor = '#666';
        
        if (message.eventData?.type === 'birthday') {
            messageType = message.eventData.birthdayType === 'congratulation' ? 'ДР 🎉' : 'ДР 📅';
            typeIcon = message.eventData.birthdayType === 'congratulation' ? '🎂' : '📅';
            typeColor = message.eventData.birthdayType === 'congratulation' ? '#E91E63' : '#9C27B0';
        } else if (message.eventData?.type === 'calendar_event') {
            messageType = 'Календарь';
            typeIcon = '📅';
            typeColor = '#2196F3';
        }

        // Форматируем дату для отображения
        const messageDate = new Date(message.timestamp);
        const now = new Date();
        const isToday = messageDate.toDateString() === now.toDateString();
        
        let formattedDate;
        if (isToday) {
            formattedDate = `Сегодня в ${messageDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        } else {
            formattedDate = messageDate.toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        return `
            <div class="message-item" data-message-id="${message.id}">
                <div class="message-header">
                    <div class="message-type" style="color: ${typeColor}">
                        ${typeIcon} ${messageType}
                    </div>
                    <div class="message-status" style="color: ${statusColors[message.status]}">
                        ${statusIcons[message.status]} ${statusTexts[message.status]}
                    </div>
                </div>
                <div class="message-time">
                    ${formattedDate}
                </div>
                <div class="message-content">
                    ${this.escapeHtml(message.message)}
                </div>
                ${message.eventData?.birthdayName ? `
                    <div class="message-birthday-info">
                        <i class="fas fa-user"></i>
                        ${message.eventData.birthdayName}
                    </div>
                ` : ''}
                <div class="message-actions">
                    ${message.status === 'scheduled' ? `
                        <button class="btn-cancel-message" onclick="ScheduledMessagesManager.cancelMessage('${message.id}')">
                            <i class="fas fa-times"></i> Отменить
                        </button>
                    ` : ''}
                    ${message.status === 'error' ? `
                        <button class="btn-retry-message" onclick="ScheduledMessagesManager.retryMessage('${message.id}')">
                            <i class="fas fa-redo"></i> Повторить
                        </button>
                    ` : ''}
                    ${message.status === 'sent' ? `
                        <button class="btn-info-message" onclick="ScheduledMessagesManager.showMessageInfo('${message.id}')">
                            <i class="fas fa-info"></i> Инфо
                        </button>
                    ` : ''}
                </div>
                ${message.error ? `
                    <div class="message-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${this.escapeHtml(message.error)}
                    </div>
                ` : ''}
                ${message.sentAt ? `
                    <div class="message-sent-time">
                        <i class="fas fa-check"></i>
                        Отправлено: ${new Date(message.sentAt).toLocaleString('ru-RU')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Экранирование HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Инициализация фильтров
    initializeFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.loadMessages();
            });
        });
    },

    // Отмена сообщения
    cancelMessage(messageId) {
        if (confirm('Вы уверены, что хотите отменить это сообщение?')) {
            const success = MessageScheduler.cancelScheduledMessage(messageId);
            if (success) {
                this.loadMessages();
                DialogService.showMessage('✅ Успех', 'Сообщение отменено', 'success');
            } else {
                DialogService.showMessage('❌ Ошибка', 'Не удалось отменить сообщение', 'error');
            }
        }
    },

    // Повторная отправка сообщения с ошибкой
    retryMessage(messageId) {
        const messages = MessageScheduler.getAllMessages();
        const message = messages.find(m => m.id === messageId);
        
        if (message && message.status === 'error') {
            MessageScheduler.updateMessageStatus(messageId, 'scheduled');
            this.loadMessages();
            DialogService.showMessage('✅ Успех', 'Сообщение запланировано для повторной отправки', 'success');
        }
    },

    // Показать информацию о сообщении
    showMessageInfo(messageId) {
        const messages = MessageScheduler.getAllMessages();
        const message = messages.find(m => m.id === messageId);
        
        if (message) {
            let infoText = `
<b>Информация о сообщении</b>

📝 <b>Текст:</b>
${message.message}

🕒 <b>Запланировано на:</b>
${new Date(message.timestamp).toLocaleString('ru-RU')}

📊 <b>Статус:</b> ${message.status}
            `;
            
            if (message.sentAt) {
                infoText += `\n\n✅ <b>Отправлено:</b>\n${new Date(message.sentAt).toLocaleString('ru-RU')}`;
            }
            
            if (message.eventData) {
                infoText += `\n\n📋 <b>Данные события:</b>\n${JSON.stringify(message.eventData, null, 2)}`;
            }
            
            DialogService.showMessage('📋 Информация о сообщении', infoText, 'info');
        }
    },

    // Очистка старых сообщений
    cleanupMessages() {
        if (confirm('Очистить отправленные сообщения старше 7 дней?')) {
            const beforeCount = MessageScheduler.getAllMessages().length;
            MessageScheduler.cleanupOldMessages();
            const afterCount = MessageScheduler.getAllMessages().length;
            const cleanedCount = beforeCount - afterCount;
            
            this.loadMessages();
            DialogService.showMessage(
                '✅ Успех', 
                `Очищено ${cleanedCount} старых сообщений`,
                'success'
            );
        }
    },

    // Обновление сообщений (для кнопки обновить)
    refreshMessages() {
        this.loadMessages();
        DialogService.showMessage('🔄 Обновлено', 'Список сообщений обновлен', 'info');
    },

    // Отладочная информация
    debugMessages() {
        const debugInfo = MessageScheduler.debugScheduledMessages();
        let debugText = `
<b>Отладочная информация</b>

📊 <b>Статистика:</b>
${JSON.stringify(MessageScheduler.getStats(), null, 2)}

🕒 <b>Текущее время:</b>
${new Date().toLocaleString('ru-RU')}

⏰ <b>Таймер планировщика:</b>
${MessageScheduler.timer ? 'Активен' : 'Не активен'}

🤖 <b>TelegramService:</b>
${typeof TelegramService !== 'undefined' ? 'Доступен' : 'Не доступен'}
        `;
        
        DialogService.showMessage('🐛 Отладочная информация', debugText, 'info');
    },

    // Проверка дней рождения
    checkBirthdayMessages() {
        console.log('🔍 Проверка запланированных дней рождения...');
        const messages = MessageScheduler.getAllMessages();
        const birthdayMessages = messages.filter(m => m.eventData?.type === 'birthday');
        
        let checkText = `
<b>Проверка дней рождения</b>

🎂 <b>Всего запланировано дней рождения:</b> ${birthdayMessages.length}

📅 <b>Детали:</b>
        `;
        
        if (birthdayMessages.length === 0) {
            checkText += '\nНет запланированных дней рождения';
        } else {
            birthdayMessages.forEach((msg, index) => {
                checkText += `\n\n${index + 1}. ${msg.eventData.birthdayName}`;
                checkText += `\n   📅 ${new Date(msg.timestamp).toLocaleString('ru-RU')}`;
                checkText += `\n   🎯 ${msg.eventData.birthdayType === 'congratulation' ? 'Поздравление 🎉' : 'Уведомление 📅'}`;
                checkText += `\n   📊 Статус: ${msg.status}`;
            });
        }
        
        DialogService.showMessage('🎂 Проверка дней рождения', checkText, 'info');
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof ScheduledMessagesManager !== 'undefined' && ScheduledMessagesManager.init) {
        ScheduledMessagesManager.init();
    }
});