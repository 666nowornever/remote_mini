// Менеджер календаря дежурств и отпусков с синхронизацией
const CalendarManager = {
    // Конфигурация
    config: {
        // Используем локальный файл для начала
        dataUrl: 'data/calendar-data.json',
        syncInterval: 30000, // 30 секунд
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
        '2024-02-23', '2024-02-24', '2024-02-25',
        '2024-03-08', '2024-03-09', '2024-03-10',
        '2024-04-28', '2024-04-29', '2024-04-30', '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-09', '2024-05-10',
        '2024-06-11', '2024-06-12', '2024-06-13',
        '2024-11-02', '2024-11-03', '2024-11-04'
    ],

    // Состояние
    state: {
        currentDate: new Date(),
        selectionMode: 'day',
        isSyncing: false,
        syncEnabled: false // Сначала отключаем синхронизацию
    },

    // Инициализация
    async init() {
        console.log('🔄 CalendarManager: инициализация...');
        
        // Загружаем локальные данные
        this.loadLocalData();
        
        // Пробуем загрузить данные из файла (не блокируем инициализацию при ошибке)
        this.tryLoadFromFile().then(success => {
            if (success) {
                this.state.syncEnabled = true;
                this.startSyncInterval();
            }
        });
        
        // Запускаем планировщик сообщений
        this.startMessageScheduler();
        
        console.log('✅ CalendarManager: инициализация завершена');
    },

    // Попытка загрузки из файла
    async tryLoadFromFile() {
        try {
            const response = await fetch(this.config.dataUrl);
            if (response.ok) {
                const fileData = await response.json();
                if (this.validateData(fileData)) {
                    this.mergeData(fileData);
                    console.log('✅ Данные загружены из файла');
                    this.updateSyncStatus('success', 'Данные загружены');
                    return true;
                }
            }
        } catch (error) {
            console.log('📁 Файл данных недоступен, используем локальные данные');
            this.updateSyncStatus('offline', 'Локальные данные');
        }
        return false;
    },

    // Загрузка локальных данных
    loadLocalData() {
        try {
            const saved = localStorage.getItem('calendarData');
            if (saved) {
                const localData = JSON.parse(saved);
                // Объединяем с текущими данными
                this.data = { ...this.data, ...localData };
                console.log('📅 Локальные данные загружены');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки локальных данных:', error);
        }
    },

    // Сохранение данных
    saveData() {
        try {
            // Сохраняем локально
            localStorage.setItem('calendarData', JSON.stringify(this.data));
            this.data.lastModified = Date.now();
            
            console.log('💾 Данные сохранены локально');
            this.updateSyncStatus('success', 'Сохранено: ' + new Date().toLocaleTimeString());
            
        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error);
            this.updateSyncStatus('error', 'Ошибка сохранения');
        }
    },

    // Валидация данных
    validateData(data) {
        return data && 
               typeof data === 'object' &&
               typeof data.events === 'object' &&
               typeof data.vacations === 'object' &&
               typeof data.lastModified === 'number';
    },

    // Объединение данных
    mergeData(newData) {
        // Используем новые данные только если они новее
        if (newData.lastModified > this.data.lastModified) {
            this.data.events = { ...this.data.events, ...newData.events };
            this.data.vacations = { ...this.data.vacations, ...newData.vacations };
            this.data.lastModified = newData.lastModified;
        }
    },

    // Периодическая проверка файла
    startSyncInterval() {
        if (!this.state.syncEnabled) return;
        
        setInterval(async () => {
            await this.tryLoadFromFile();
        }, this.config.syncInterval);
    },

    // Ручная синхронизация
    async manualSync() {
        this.updateSyncStatus('syncing', 'Синхронизация...');
        const success = await this.tryLoadFromFile();
        if (success) {
            this.renderCalendar();
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
            success: 'check-circle',
            error: 'exclamation-circle',
            offline: 'desktop'
        };
        return icons[status] || 'desktop';
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
        
        // Обновляем статус
        if (this.state.syncEnabled) {
            this.updateSyncStatus('success', 'Синхронизировано');
        } else {
            this.updateSyncStatus('offline', 'Локальные данные');
        }
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

    // === МОДАЛЬНОЕ ОКНО И СОХРАНЕНИЕ ===

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

        this.saveData();
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

        this.saveData();
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