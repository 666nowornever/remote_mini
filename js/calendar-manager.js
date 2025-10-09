// Менеджер календаря дежурств с синхронизацией через GitHub Pages
const CalendarManager = {
    // === КОНФИГУРАЦИЯ - ИСПОЛЬЗУЕМ ОТНОСИТЕЛЬНЫЙ ПУТЬ ===
    config: {
        // Относительный путь к файлу данных в том же домене
        dataUrl: 'data/calendar-data.json',
        syncInterval: 30000,
        maxRetries: 3
    },

    // Данные
    data: {
        events: {},
        vacations: {},
        lastModified: 0,
        version: 1
    },

    // Дежурные
    dutyPersons: [
        { id: 1, name: 'Кремнев Андрей', color: '#2196F3' },
        { id: 2, name: 'Васильев Иван', color: '#4CAF50' },
        { id: 3, name: 'Преображенский Дмитрий', color: '#FF9800' }
    ],

    // Праздничные дни
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
        isOnline: false,
        pendingChanges: false,
        retryCount: 0
    },

    // === ИНИЦИАЛИЗАЦИЯ ===
    async init() {
        console.log('🔄 CalendarManager: инициализация...');
        
        // Загружаем локальные данные
        this.loadLocalData();
        
        // Пробуем загрузить общие данные
        await this.syncFromServer();
        
        // Запускаем периодическую синхронизацию
        this.startSyncInterval();
        
        console.log('✅ CalendarManager: инициализация завершена');
    },

    // === СИНХРОНИЗАЦИЯ ===

    // Загрузка локальных данных
    loadLocalData() {
        try {
            const saved = localStorage.getItem('calendarData');
            if (saved) {
                const localData = JSON.parse(saved);
                if (this.validateData(localData)) {
                    this.data = localData;
                    console.log('📅 Локальные данные загружены');
                    this.updateSyncStatus('offline', 'Локальные данные');
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки локальных данных:', error);
        }
        
        // Если локальных данных нет, инициализируем пустые
        this.data = {
            events: {},
            vacations: {},
            lastModified: Date.now(),
            version: 1
        };
        return false;
    },

    // Сохранение локальных данных
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
        if (this.state.retryCount >= this.config.maxRetries) {
            console.log('🔄 Превышено количество попыток синхронизации');
            return false;
        }

        this.updateSyncStatus('syncing', 'Проверка обновлений...');

        try {
            console.log('📡 Запрос данных с:', this.config.dataUrl);
            
            const response = await fetch(this.config.dataUrl + '?t=' + Date.now());
            
            console.log('📊 Статус ответа:', response.status, response.statusText);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('📁 Файл данных не найден, используем локальные данные');
                    this.updateSyncStatus('offline', 'Файл данных не найден');
                    return false;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const serverData = await response.json();
            console.log('📦 Получены общие данные:', serverData);

            if (this.validateData(serverData)) {
                // Серверные данные имеют приоритет
                if (serverData.lastModified > this.data.lastModified) {
                    this.data = serverData;
                    this.saveLocalData();
                    console.log('✅ Данные обновлены с сервера');
                    this.state.isOnline = true;
                    this.state.retryCount = 0;
                    this.updateSyncStatus('success', `Обновлено: ${new Date().toLocaleTimeString()}`);
                    
                    // Перерисовываем календарь если он открыт
                    if (document.getElementById('calendarGrid')) {
                        this.renderCalendar();
                    }
                    
                    return true;
                } else {
                    console.log('📅 Данные актуальны');
                    this.state.isOnline = true;
                    this.state.retryCount = 0;
                    this.updateSyncStatus('success', 'Данные актуальны');
                    return true;
                }
            } else {
                throw new Error('Невалидные данные с сервера');
            }

        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error.message);
            this.state.isOnline = false;
            this.state.retryCount++;
            
            if (error.message.includes('Failed to fetch')) {
                this.updateSyncStatus('offline', 'Нет подключения');
            } else {
                this.updateSyncStatus('error', `Ошибка: ${error.message}`);
            }
            
            return false;
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

    // Периодическая синхронизация
    startSyncInterval() {
        setInterval(async () => {
            await this.syncFromServer();
        }, this.config.syncInterval);
    },

    // Ручная синхронизация
    async manualSync() {
        const success = await this.syncFromServer();
        if (success && document.getElementById('calendarGrid')) {
            this.renderCalendar();
        }
        return success;
    },

    // Обновление статуса
    updateSyncStatus(status, message) {
        const statusElement = document.getElementById('syncStatus');
        if (!statusElement) return;

        statusElement.className = `sync-status ${status}`;
        statusElement.innerHTML = `
            <i class="fas fa-${this.getSyncIcon(status)}"></i>
            ${message}
        `;

        // Автоматически скрываем успешный статус через 3 секунды
        if (status === 'success') {
            setTimeout(() => {
                if (statusElement.className.includes('success')) {
                    this.updateSyncStatus('success', 'Синхронизировано');
                }
            }, 3000);
        }
    },

    getSyncIcon(status) {
        const icons = {
            syncing: 'sync-alt fa-spin',
            success: 'cloud-check',
            error: 'cloud-exclamation',
            offline: 'desktop'
        };
        return icons[status] || 'desktop';
    },

    // === ОСНОВНЫЕ МЕТОДЫ (без изменений) ===

    showCalendar() {
        Navigation.showPage('calendar');
    },

    loadCalendarPage() {
        this.renderCalendar();
        this.initializeCalendarHandlers();
        
        if (this.state.isOnline) {
            this.updateSyncStatus('success', 'Синхронизировано');
        } else {
            this.updateSyncStatus('offline', 'Локальные данные');
        }
    },

    renderCalendar() {
        const calendarElement = document.getElementById('calendarGrid');
        if (!calendarElement) return;

        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();

        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const titleElement = document.getElementById('calendarTitle');
        if (titleElement) {
            titleElement.textContent = `${monthNames[month]} ${year}`;
        }

        calendarElement.innerHTML = '';

        const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarElement.appendChild(dayHeader);
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarElement.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this.getDateKey(date);
            const dayElement = this.createDayElement(date, dateKey, day);
            calendarElement.appendChild(dayElement);
        }
    },

    createDayElement(date, dateKey, dayNumber) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.date = dateKey;

        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = this.holidays.includes(dateKey);
        if (isWeekend || isHoliday) dayElement.classList.add('holiday');

        const dayNumberElement = document.createElement('div');
        dayNumberElement.className = 'calendar-day-number';
        dayNumberElement.textContent = dayNumber;
        dayElement.appendChild(dayNumberElement);

        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-day-events';

        if (this.data.events[dateKey]) {
            this.data.events[dateKey].forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'calendar-event';
                eventElement.style.backgroundColor = event.color;
                eventElement.title = `${event.person}\n${event.comment || 'Без комментария'}`;
                eventsContainer.appendChild(eventElement);
            });
        }

        if (this.data.vacations[dateKey]) {
            const vacationContainer = document.createElement('div');
            vacationContainer.className = 'calendar-vacation-container';
            
            this.data.vacations[dateKey].forEach(vacation => {
                const vacationElement = document.createElement('div');
                vacationElement.className = 'calendar-vacation';
                vacationElement.style.backgroundColor = vacation.color;
                vacationElement.title = `Отпуск: ${vacation.person}`;
                vacationContainer.appendChild(vacationElement);
            });
            
            eventsContainer.appendChild(vacationContainer);
        }

        dayElement.appendChild(eventsContainer);
        
        dayElement.addEventListener('click', () => {
            if (this.state.selectionMode === 'day') {
                this.openEventModal(dateKey);
            } else {
                this.handleWeekSelection(date);
            }
        });

        return dayElement;
    },

    initializeCalendarHandlers() {
        document.getElementById('calendarPrev')?.addEventListener('click', () => this.previousMonth());
        document.getElementById('calendarNext')?.addEventListener('click', () => this.nextMonth());
        document.getElementById('calendarToday')?.addEventListener('click', () => this.goToToday());
        document.getElementById('selectionModeBtn')?.addEventListener('click', () => this.toggleSelectionMode());
        document.getElementById('manualSyncBtn')?.addEventListener('click', () => this.manualSync());
    },

    toggleSelectionMode() {
        this.state.selectionMode = this.state.selectionMode === 'day' ? 'week' : 'day';
        const modeBtn = document.getElementById('selectionModeBtn');
        if (modeBtn) {
            modeBtn.innerHTML = this.state.selectionMode === 'day' ? 
                '<i class="fas fa-calendar-day"></i> Режим: День' : 
                '<i class="fas fa-calendar-week"></i> Режим: Неделя';
        }
    },

    previousMonth() { this.state.currentDate.setMonth(this.state.currentDate.getMonth() - 1); this.renderCalendar(); },
    nextMonth() { this.state.currentDate.setMonth(this.state.currentDate.getMonth() + 1); this.renderCalendar(); },
    goToToday() { this.state.currentDate = new Date(); this.renderCalendar(); },

    // === МОДАЛЬНОЕ ОКНО И СОХРАНЕНИЕ ===

    openEventModal(dateKey, weekDates = null) {
        const isWeekMode = weekDates !== null;
        const date = this.parseDateKey(dateKey);
        
        let dateString;
        if (isWeekMode) {
            const firstDate = this.parseDateKey(weekDates[0]);
            const lastDate = this.parseDateKey(weekDates[6]);
            dateString = `${firstDate.toLocaleDateString('ru-RU')} - ${lastDate.toLocaleDateString('ru-RU')}`;
        } else {
            dateString = date.toLocaleDateString('ru-RU');
        }

        const modal = this.createModal(dateString, dateKey, weekDates);
        document.body.appendChild(modal);
        this.initializeModalHandlers(modal, dateKey, weekDates);
    },

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
                    <div class="modal-tabs">
                        <button class="tab-btn active" data-tab="duty">Дежурство</button>
                        <button class="tab-btn" data-tab="vacation">Отпуск</button>
                    </div>
                    
                    <div class="tab-content" id="dutyTab">
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
                            <label for="eventComment">Комментарий:</label>
                            <textarea id="eventComment" placeholder="Добавьте комментарий...">${this.getEventComment(dateKey) || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="tab-content hidden" id="vacationTab">
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
                            <label for="vacationComment">Комментарий:</label>
                            <textarea id="vacationComment" placeholder="Добавьте комментарий...">${this.getVacationComment(dateKey) || ''}</textarea>
                        </div>
                    </div>
                </div>
                <div class="calendar-modal-actions">
                    <button class="btn btn-cancel">Отмена</button>
                    <button class="btn btn-save">Сохранить</button>
                </div>
            </div>
        `;
        return modal;
    },

    initializeModalHandlers(modal, dateKey, weekDates) {
        const tabBtns = modal.querySelectorAll('.tab-btn');
        const tabContents = modal.querySelectorAll('.tab-content');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.add('hidden'));
                btn.classList.add('active');
                modal.querySelector(`#${btn.dataset.tab}Tab`).classList.remove('hidden');
            });
        });

        const closeModal = () => document.body.removeChild(modal);
        modal.querySelector('.calendar-modal-close').addEventListener('click', closeModal);
        modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        modal.querySelector('.btn-save').addEventListener('click', () => {
            const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
            const datesToSave = weekDates || [dateKey];

            if (activeTab === 'duty') {
                this.saveDutyEvent(datesToSave);
            } else if (activeTab === 'vacation') {
                this.saveVacationEvent(datesToSave);
            }

            closeModal();
            this.renderCalendar();
        });
    },

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
            } else {
                delete this.data.events[date];
            }
        });

        this.saveData();
    },

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

    saveData() {
        this.data.lastModified = Date.now();
        this.saveLocalData();
        this.updateSyncStatus('success', 'Сохранено локально');
        console.log('💾 Данные сохранены локально');
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

    handleWeekSelection(selectedDate) {
        const weekDates = this.getWeekDates(selectedDate);
        const dateKeys = weekDates.map(date => this.getDateKey(date));
        this.openEventModal(dateKeys[0], dateKeys);
    },

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
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof CalendarManager !== 'undefined' && CalendarManager.init) {
        CalendarManager.init();
    }
});