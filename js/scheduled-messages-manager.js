// Менеджер для работы с запланированными сообщениями
const ScheduledMessagesManager = {
    currentFilter: 'all',

    // Инициализация
    init() {
        console.log('🔄 ScheduledMessagesManager: инициализация');
    },

    // Показать страницу сообщений
    showScheduledMessages() {
        Navigation.showPage('scheduled-view');
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
                        <p>Нет сообщений</p>
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
        
        if (message.eventData?.type === 'birthday') {
            messageType = message.eventData.birthdayType === 'congratulation' ? 'ДР 🎉' : 'ДР 📅';
            typeIcon = message.eventData.birthdayType === 'congratulation' ? '🎂' : '📅';
        } else if (message.eventData?.type === 'calendar_event') {
            messageType = 'Календарь';
            typeIcon = '📅';
        }

        // Форматируем дату для отображения
        const messageDate = new Date(message.timestamp);
        const formattedDate = messageDate.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="message-item" data-message-id="${message.id}">
                <div class="message-header">
                    <div class="message-type">
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
                    ${message.message}
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
                </div>
                ${message.error ? `
                    <div class="message-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${message.error}
                    </div>
                ` : ''}
            </div>
        `;
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

    // Очистка старых сообщений
    cleanupMessages() {
        if (confirm('Очистить отправленные сообщения старше 7 дней?')) {
            MessageScheduler.cleanupOldMessages();
            this.loadMessages();
            DialogService.showMessage('✅ Успех', 'Старые сообщения очищены', 'success');
        }
    },

    // Обновление сообщений (для кнопки обновить)
    refreshMessages() {
        this.loadMessages();
        DialogService.showMessage('🔄 Обновлено', 'Список сообщений обновлен', 'info');
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof ScheduledMessagesManager !== 'undefined' && ScheduledMessagesManager.init) {
        ScheduledMessagesManager.init();
    }
});