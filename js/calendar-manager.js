// Менеджер календаря дежурств и отпусков с синхронизацией
const CalendarManager = {
    // Конфигурация
    config: {
        // === ВАЖНО: ЗАМЕНИ ЭТОТ URL НА СВОЙ ===
        dataUrl: 'https://raw.githubusercontent.com/666nowornever/team-calendar-data/main/calendar-data.json',
        syncInterval: 30000, // 30 секунд
        retryInterval: 5000  // 5 секунд при ошибке
    },

    // Данные
    data: {
        events: {},
        vacations: {},
        lastModified: 0,
        version: 1
    },

    // Список дежурных
    dutyPersons: [
        { id: 1, name: 'Кремнев Андрей', color: '#2196F3' },
        { id: 2, name: 'Васильев Иван', color: '#4CAF50' },
        { id: 3, name: 'Преображенский Дмитрий', color: '#FF9800' }
    ],

    // Праздничные дни России 2024
    holidays: [
        '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07', '2024-01-08',
        '2024-02-23', '2024-02-24', '2024-02-25', // День защитника Отечества + выходные
        '2024-03-08', '2024-03-09', '2024-03-10', // Международный женский день + выходные
        '2024-04-28', '2024-04-29', '2024-04-30', '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-09', '2024-05-10', // Майские праздники
        '2024-06-11', '2024-06-12', '2024-06-13', // День России
        '2024-11-02', '2024-11-03', '2024-11-04' // День народного единства
    ],

    // Состояние
    state: {
        currentDate: new Date(),
        selectionMode: 'day', // 'day' или 'week'
        isSyncing: false,
        lastSyncAttempt: 0,
        syncError: null
    },

    // Инициализация
    async init() {
        console.log('🔄 CalendarManager: инициализация...');
        
        // Загружаем локальные данные
        this.loadLocalData();
        
        // Пытаемся синхронизировать с сервером
        await this.syncFromServer();
        
        // Запускаем периодическую синхронизацию
        this.startSyncInterval();
        
        // Запускаем планировщик сообщений
        this.startMessageScheduler();
        
        console.log('✅ CalendarManager: инициализация завершена');
    },

    // === СИНХРОНИЗАЦИЯ ===

    // Загрузка локальных данных
    loadLocalData() {
        try {
            const saved = localStorage.getItem('calendarData');
            if (saved) {
                const localData = JSON.parse(saved);
                this.data = { ...this.data, ...localData };
                console.log('📅 Локальные данные загружены');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки локальных данных:', error);
        }
    },

    // Сохранение данных (локально)
    saveLocalData() {
        try {
            localStorage.setItem('calendarData', JSON.stringify(this.data));
            console.log('💾 Данные сохранены локально');
        } catch (error) {
            console.error('❌ Ошибка сохранения локальных данных:', error);
        }
    },

    // Синхронизация с сервером
    async syncFromServer() {
        if (this.state.isSyncing) return false;
        
        this.state.isSyncing = true;
        this.state.lastSyncAttempt = Date.now();
        this.updateSyncStatus('syncing', 'Синхронизация...');

        try {
            const response = await fetch(`${this.config.dataUrl}?t=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const serverData = await response.json();
            
            // Проверяем валидность данных
            if (this.validateData(serverData)) {
                // Объединяем данные (серверные имеют приоритет)
                this.mergeData(serverData);
                this.state.syncError = null;
                this.updateSyncStatus('success', `Синхронизировано: ${new Date().toLocaleTimeString()}`);
                console.log('✅ Данные синхронизированы с сервером');
                return true;
            } else {
                throw new Error('Невалидные данные с сервера');
            }

        } catch (error) {
            this.state.syncError = error.message;
            this.updateSyncStatus('error', 'Ошибка синхронизации');
            console.log('📡 Не удалось синхронизировать с сервером:', error.message);
            return false;
        } finally {
            this.state.isSyncing = false;
        }
    },

    // Валидация данных
    validateData(data) {
        return data && 
               typeof data === 'object' &&
               typeof data.events === 'object' &&
               typeof data.vacations === 'object' &&
               typeof data.lastModified === 'number' &&
               typeof data.version === 'number';
    },

    // Объединение данных
    mergeData(serverData) {
        // Для событий и отпусков: серверные данные имеют приоритет
        if (serverData.lastModified > this.data.lastModified) {
            this.data.events = { ...this.data.events, ...serverData.events };
            this.data.vacations = { ...this.data.vacations, ...serverData.vacations };
            this.data.lastModified = serverData.lastModified;
        }
        
        // Сохраняем локально
        this.saveLocalData();
    },

    // Периодическая синхронизация
    startSyncInterval() {
        setInterval(async () => {
            await this.syncFromServer();
        }, this.config.syncInterval);
    },

    // Ручная синхронизация
    async manualSync() {
        const success = await this.syncFromServer();
        if (success) {
            this.renderCalendar(); // Перерисовываем календарь
        }
        return success;
    },

    // Обновление статуса синхронизации
    updateSyncStatus(status, message) {
        const statusElement = document.getElementById('syncStatus');
        if (!statusElement) return;

        statusElement.className = `sync-status ${status}`;
        statusElement.innerHTML = `
            <i class="fas fa-${this.getSyncIcon(status)}"></i>
            ${message}
        `;
    },

    getSyncIcon(status) {
        const icons = {
            syncing: 'sync-alt fa-spin',
            success: 'cloud-check',
            error: 'cloud-exclamation',
            offline: 'cloud'
        };
        return icons[status] || 'cloud';
    },

    // === ОСНОВНЫЕ МЕТОДЫ ===

    // Показать календарь
    showCalendar() {
        Navigation.showPage('calendar');
    },

    // Загрузка страницы календаря
    loadCalendarPage() {
        this.renderCalendar();
        this.initializeCalendarHandlers();
        this.updateSyncStatus('success', `Синхронизировано: ${new Date(this.data.lastModified).toLocaleTimeString()}`);
    },

    // Рендер календаря
    renderCalendar() {
        const calendarElement = document.getElementById('calendarGrid');
        if (!calendarElement) return;

        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();

        // Заголовок календаря
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        
        const titleElement = document.getElementById('calendarTitle');
        if (titleElement) {
            titleElement.textContent = `${monthNames[month]} ${year}`;
        }

        // Очищаем календарь
        calendarElement.innerHTML = '';

        // Добавляем заголовки дней недели
        const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarElement.appendChild(dayHeader);
        });

        // Получаем первый день месяца и количество дней
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        // Добавляем пустые ячейки для начала месяца
        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarElement.appendChild(emptyCell);
        }

        // Добавляем дни месяца
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this.getDateKey(date);
            const dayElement = this.createDayElement(date, dateKey, day);
            calendarElement.appendChild(dayElement);
        }
    },

    // Создание элемента дня
    createDayElement(date, dateKey, dayNumber) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.date = dateKey;

        // Проверяем выходной или праздник
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = this.holidays.includes(dateKey);
        
        if (isWeekend || isHoliday) {
            dayElement.classList.add('holiday');
        }

        // Номер дня
        const dayNumberElement = document.createElement('div');
        dayNumberElement.className = 'calendar-day-number';
        dayNumberElement.textContent = dayNumber;
        dayElement.appendChild(dayNumberElement);

        // Контейнер событий
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-day-events';

        // Дежурства
        if (this.data.events[dateKey]) {
            this.data.events[dateKey].forEach(event => {
                eventsContainer.appendChild(this.createEventElement(event));
            });
        }

        // Отпуска (отдельная полоса внизу)
        if (this.data.vacations[dateKey]) {
            eventsContainer.appendChild(this.createVacationContainer(dateKey));
        }

        dayElement.appendChild(eventsContainer);
        
        // Обработчик клика
        dayElement.addEventListener('click', () => {
            if (this.state.selectionMode === 'day') {
                this.openEventModal(dateKey);
            } else {
                this.handleWeekSelection(date);
            }
        });

        return dayElement;
    },

    // Создание элемента дежурства
    createEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.className = 'calendar-event';
        eventElement.style.backgroundColor = event.color;
        eventElement.title = `${event.person}\n${event.comment || 'Без комментария'}`;
        return eventElement;
    },

    // Создание контейнера отпусков
    createVacationContainer(dateKey) {
        const container = document.createElement('div');
        container.className = 'calendar-vacation-container';
        
        this.data.vacations[dateKey].forEach(vacation => {
            const vacationElement = document.createElement('div');
            vacationElement.className = 'calendar-vacation';
            vacationElement.style.backgroundColor = vacation.color;
            vacationElement.title = `Отпуск: ${vacation.person}`;
            container.appendChild(vacationElement);
        });
        
        return container;
    },

    // Обработка выбора недели
    handleWeekSelection(selectedDate) {
        const weekDates = this.getWeekDates(selectedDate);
        const dateKeys = weekDates.map(date => this.getDateKey(date));
        this.openEventModal(dateKeys[0], dateKeys);
    },

    // Получение всех дат недели
    getWeekDates(date) {
        const dates = [];
        const dayOfWeek = date.getDay();
        const startDate = new Date(date);
        startDate.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            dates.push(currentDate);
        }
        
        return dates;
    },

    // Инициализация обработчиков
    initializeCalendarHandlers() {
        // Кнопки навигации
        document.getElementById('calendarPrev')?.addEventListener('click', () => this.previousMonth());
        document.getElementById('calendarNext')?.addEventListener('click', () => this.nextMonth());
        document.getElementById('calendarToday')?.addEventListener('click', () => this.goToToday());
        document.getElementById('selectionModeBtn')?.addEventListener('click', () => this.toggleSelectionMode());
        document.getElementById('manualSyncBtn')?.addEventListener('click', () => this.manualSync());
    },

    // Переключение режима выбора
    toggleSelectionMode() {
        this.state.selectionMode = this.state.selectionMode === 'day' ? 'week' : 'day';
        const modeBtn = document.getElementById('selectionModeBtn');
        if (modeBtn) {
            modeBtn.innerHTML = this.state.selectionMode === 'day' ? 
                '<i class="fas fa-calendar-day"></i> Режим: День' : 
                '<i class="fas fa-calendar-week"></i> Режим: Неделя';
        }
    },

    // Навигация по месяцам
    previousMonth() {
        this.state.currentDate.setMonth(this.state.currentDate.getMonth() - 1);
        this.renderCalendar();
    },

    nextMonth() {
        this.state.currentDate.setMonth(this.state.currentDate.getMonth() + 1);
        this.renderCalendar();
    },

    goToToday() {
        this.state.currentDate = new Date();
        this.renderCalendar();
    },

    // === МОДАЛЬНОЕ ОКНО ===

    // Открытие модального окна
    openEventModal(dateKey, weekDates = null) {
        const isWeekMode = weekDates !== null;
        const date = this.parseDateKey(dateKey);
        
        let dateString;
        if (isWeekMode) {
            const firstDate = this.parseDateKey(weekDates[0]);
            const lastDate = this.parseDateKey(weekDates[6]);
            dateString = `${firstDate.toLocaleDateString('ru-RU')} - ${lastDate.toLocaleDateString('ru-RU')}`;
        } else {
            dateString = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }

        const modal = this.createModal(dateString, dateKey, weekDates);
        document.body.appendChild(modal);
        this.initializeModalHandlers(modal, dateKey, weekDates);
    },

    // Создание модального окна
    createModal(dateString, dateKey, weekDates) {
        const modal = document.createElement('div');
        modal.className = 'calendar-modal-overlay';
        modal.innerHTML = `
            <div class="calendar-modal">
                <div class="calendar-modal-header">
                    <h3>${weekDates ? 'Дежурство на неделю' : 'Дежурство на'} ${dateString}</h3>
                    <button class="calendar-modal-close">&times;</button>
                </div>
                <div class="calendar-modal-content">
                    ${this.createModalTabs(dateKey)}
                </div>
                <div class="calendar-modal-actions">
                    <button class="btn btn-cancel">Отмена</button>
                    <button class="btn btn-save">Сохранить</button>
                </div>
            </div>
        `;
        return modal;
    },

    // Создание табов модального окна
    createModalTabs(dateKey) {
        return `
            <div class="modal-tabs">
                <button class="tab-btn active" data-tab="duty">Дежурство</button>
                <button class="tab-btn" data-tab="vacation">Отпуск</button>
                <button class="tab-btn" data-tab="event">Событие</button>
            </div>
            
            <div class="tab-content" id="dutyTab">
                ${this.createDutyTab(dateKey)}
            </div>
            
            <div class="tab-content hidden" id="vacationTab">
                ${this.createVacationTab(dateKey)}
            </div>
            
            <div class="tab-content hidden" id="eventTab">
                ${this.createEventTab()}
            </div>
        `;
    },

    createDutyTab(dateKey) {
        return `
            <div class="duty-persons-list">
                ${this.dutyPersons.map(person => `
                    <div class="duty-person-item" data-person-id="${person.id}">
                        <div class="person-color" style="background-color: ${person.color}"></div>
                        <div class="person-name">${person.name}</div>
                        <div class="person-checkbox">
                            <input type="checkbox" id="person-${person.id}" 
                                   ${this.isPersonOnDuty(dateKey, person.id) ? 'checked' : ''}>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="comment-section">
                <label for="eventComment">Комментарий к дежурству:</label>
                <textarea id="eventComment" placeholder="Добавьте комментарий к дежурству...">${this.getEventComment(dateKey) || ''}</textarea>
            </div>
        `;
    },

    createVacationTab(dateKey) {
        return `
            <div class="duty-persons-list">
                ${this.dutyPersons.map(person => `
                    <div class="duty-person-item" data-person-id="${person.id}">
                        <div class="person-color" style="background-color: ${person.color}"></div>
                        <div class="person-name">${person.name}</div>
                        <div class="person-checkbox">
                            <input type="checkbox" id="vacation-person-${person.id}" 
                                   ${this.isPersonOnVacation(dateKey, person.id) ? 'checked' : ''}>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="comment-section">
                <label for="vacationComment">Комментарий к отпуску:</label>
                <textarea id="vacationComment" placeholder="Добавьте комментарий к отпуску...">${this.getVacationComment(dateKey) || ''}</textarea>
            </div>
        `;
    },

    createEventTab() {
        return `
            <div class="event-time-section">
                <label for="eventTime">Время отправки уведомления:</label>
                <input type="time" id="eventTime" value="09:00">
            </div>
            <div class="comment-section">
                <label for="eventMessage">Сообщение для чата:</label>
                <textarea id="eventMessage" placeholder="Введите сообщение для отправки в рабочий чат..."></textarea>
            </div>
            <div class="notification-info">
                <i class="fas fa-info-circle"></i>
                Сообщение будет отправлено в рабочий чат Telegram в указанное время
            </div>
        `;
    },

    // Инициализация обработчиков модального окна
    initializeModalHandlers(modal, dateKey, weekDates) {
        this.initializeModalTabs(modal);

        const closeModal = () => document.body.removeChild(modal);
        
        modal.querySelector('.calendar-modal-close').addEventListener('click', closeModal);
        modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
        
        modal.querySelector('.btn-save').addEventListener('click', () => {
            this.handleModalSave(modal, dateKey, weekDates);
            closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    },

    // Инициализация табов
    initializeModalTabs(modal) {
        const tabBtns = modal.querySelectorAll('.tab-btn');
        const tabContents = modal.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.add('hidden'));
                
                btn.classList.add('active');
                const tabId = btn.dataset.tab + 'Tab';
                modal.querySelector(`#${tabId}`).classList.remove('hidden');
            });
        });
    },

    // Обработка сохранения
    handleModalSave(modal, dateKey, weekDates) {
        const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
        const datesToSave = weekDates || [dateKey];

        if (activeTab === 'duty') {
            this.saveDutyEvent(datesToSave);
        } else if (activeTab === 'vacation') {
            this.saveVacationEvent(datesToSave);
        } else if (activeTab === 'event') {
            this.saveChatEvent(datesToSave);
        }

        this.renderCalendar();
    },

    // Сохранение дежурства
    saveDutyEvent(datesToSave) {
        const selectedPersons = [];
        document.querySelectorAll('.duty-person-item input[type="checkbox"]:checked').forEach(checkbox => {
            const personId = parseInt(checkbox.id.replace('person-', ''));
            const person = this.dutyPersons.find(p => p.id === personId);
            if (person) selectedPersons.push(person);
        });

        const comment = document.getElementById('eventComment')?.value.trim() || '';

        datesToSave.forEach(date => {
            if (selectedPersons.length > 0) {
                this.data.events[date] = selectedPersons.map(person => ({
                    ...person,
                    comment: comment
                }));
                
                if (!comment) {
                    this.sendDutyNotification(date);
                }
            } else {
                delete this.data.events[date];
            }
        });

        this.updateData();
    },

    // Сохранение отпуска
    saveVacationEvent(datesToSave) {
        const selectedPersons = [];
        document.querySelectorAll('#vacationTab .duty-person-item input[type="checkbox"]:checked').forEach(checkbox => {
            const personId = parseInt(checkbox.id.replace('vacation-person-', ''));
            const person = this.dutyPersons.find(p => p.id === personId);
            if (person) selectedPersons.push(person);
        });

        const comment = document.getElementById('vacationComment')?.value.trim() || '';

        datesToSave.forEach(date => {
            if (selectedPersons.length > 0) {
                this.data.vacations[date] = selectedPersons.map(person => ({
                    ...person,
                    comment: comment,
                    type: 'vacation'
                }));
            } else {
                delete this.data.vacations[date];
            }
        });

        this.updateData();
    },

    // Сохранение события чата
    saveChatEvent(datesToSave) {
        const eventTime = document.getElementById('eventTime')?.value;
        const eventMessage = document.getElementById('eventMessage')?.value.trim();

        if (!eventMessage) {
            alert('Пожалуйста, введите сообщение для отправки');
            return;
        }

        datesToSave.forEach(date => {
            const eventDateTime = `${date}T${eventTime}:00`;
            this.scheduleTelegramMessage(eventDateTime, eventMessage);
        });
    },

    // Обновление данных
    updateData() {
        this.data.lastModified = Date.now();
        this.saveLocalData();
        
        // В реальном приложении здесь будет отправка на сервер
        console.log('📝 Данные обновлены');
    },

    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

    isPersonOnDuty(dateKey, personId) {
        return this.data.events[dateKey]?.some(event => event.id === personId);
    },

    isPersonOnVacation(dateKey, personId) {
        return this.data.vacations[dateKey]?.some(vacation => vacation.id === personId);
    },

    getEventComment(dateKey) {
        return this.data.events[dateKey]?.[0]?.comment || '';
    },

    getVacationComment(dateKey) {
        return this.data.vacations[dateKey]?.[0]?.comment || '';
    },

    getDateKey(date) {
        return date.toISOString().split('T')[0];
    },

    parseDateKey(dateKey) {
        return new Date(dateKey + 'T00:00:00');
    },

    // === TELEGRAM ИНТЕГРАЦИЯ ===

    scheduleTelegramMessage(eventDateTime, message) {
        const eventTimestamp = new Date(eventDateTime).getTime();
        const now = Date.now();
        
        if (eventTimestamp <= now) {
            alert('Указанное время уже прошло');
            return;
        }

        const scheduledMessages = JSON.parse(localStorage.getItem('scheduledTelegramMessages') || '[]');
        scheduledMessages.push({
            timestamp: eventTimestamp,
            message: message,
            datetime: eventDateTime
        });
        
        localStorage.setItem('scheduledTelegramMessages', JSON.stringify(scheduledMessages));
        console.log(`⏰ Запланировано сообщение на ${eventDateTime}`);
    },

    startMessageScheduler() {
        setInterval(() => {
            this.checkScheduledMessages();
        }, 60000);
    },

    checkScheduledMessages() {
        const scheduledMessages = JSON.parse(localStorage.getItem('scheduledTelegramMessages') || '[]');
        const now = Date.now();
        const messagesToSend = scheduledMessages.filter(msg => msg.timestamp <= now);
        
        messagesToSend.forEach(msg => {
            this.sendToTelegramChat(msg.message);
        });
        
        const remainingMessages = scheduledMessages.filter(msg => msg.timestamp > now);
        localStorage.setItem('scheduledTelegramMessages', JSON.stringify(remainingMessages));
    },

    sendToTelegramChat(message) {
        console.log('🔔 Сообщение для Telegram:', message);
        // Реальная интеграция с Telegram API
    },

    sendDutyNotification(dateKey) {
        const date = this.parseDateKey(dateKey);
        const dateString = date.toLocaleDateString('ru-RU');
        const events = this.data.events[dateKey];

        if (events?.length > 0) {
            const persons = events.map(e => e.person).join(', ');
            const message = `📅 Дежурство на ${dateString}\nДежурные: ${persons}`;
            this.sendToTelegramChat(message);
        }
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof CalendarManager !== 'undefined' && CalendarManager.init) {
        CalendarManager.init();
    }
});