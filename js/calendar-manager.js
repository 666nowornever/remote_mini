// Менеджер календаря дежурств - упрощенная версия
const CalendarManager = {
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

    // Праздничные дни 2024
    holidays: [
        '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08',
'2025-02-22', '2025-02-23', '2025-02-24',
'2025-03-08', '2025-03-09', '2025-03-10',
'2025-04-28', '2025-04-29', '2025-04-30', '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-09', '2025-05-10', '2025-05-11',
'2025-06-11', '2025-06-12', '2025-06-13', '2025-06-14',
'2025-11-03', '2025-11-04', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09',
'2026-02-21', '2026-02-22', '2026-02-23',
'2026-03-07', '2026-03-08', '2026-03-09',
'2026-04-30', '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-09', '2026-05-10', '2026-05-11',
'2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14',
'2026-11-03', '2026-11-04'
    ],

    // Состояние
    state: {
        currentDate: new Date(),
        selectionMode: 'day'
    },

    // === ИНИЦИАЛИЗАЦИЯ ===
    async init() {
        console.log('📅 CalendarManager: инициализация...');
        this.loadLocalData();
        console.log('✅ CalendarManager: инициализация завершена');
    },

    // === ЗАГРУЗКА И СОХРАНЕНИЕ ДАННЫХ ===
    loadLocalData() {
        try {
            const saved = localStorage.getItem('calendarData');
            if (saved) {
                const localData = JSON.parse(saved);
                if (this.validateData(localData)) {
                    this.data = localData;
                    console.log('📅 Локальные данные загружены');
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

    saveLocalData() {
        try {
            this.data.lastModified = Date.now();
            localStorage.setItem('calendarData', JSON.stringify(this.data));
            console.log('💾 Данные сохранены локально');
        } catch (error) {
            console.error('❌ Ошибка сохранения локальных данных:', error);
        }
    },

    validateData(data) {
        return data && 
               typeof data === 'object' &&
               typeof data.events === 'object' &&
               typeof data.vacations === 'object' &&
               typeof data.lastModified === 'number';
    },

    // === ОСНОВНЫЕ МЕТОДЫ КАЛЕНДАРЯ ===
    showCalendar() {
        Navigation.showPage('calendar');
    },

    loadCalendarPage() {
        this.renderCalendar();
        this.initializeCalendarHandlers();
    },

    renderCalendar() {
        const calendarElement = document.getElementById('calendarGrid');
        if (!calendarElement) return;

        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();

        // Обновляем заголовок
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const titleElement = document.getElementById('calendarTitle');
        if (titleElement) {
            titleElement.textContent = `${monthNames[month]} ${year}`;
        }

        // Очищаем сетку
        calendarElement.innerHTML = '';

        // Добавляем заголовки дней недели
        const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarElement.appendChild(dayHeader);
        });

        // Рассчитываем дни для отображения
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Получаем день недели первого дня (0 - воскресенье, 1 - понедельник)
        const startingDay = firstDay.getDay();
        // Преобразуем в наш формат (понедельник = 0)
        const startingDayAdjusted = startingDay === 0 ? 6 : startingDay - 1;

        // Добавляем дни предыдущего месяца
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayAdjusted - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const date = new Date(year, month - 1, day);
            const dateKey = this.getDateKey(date);
            const dayElement = this.createDayElement(date, dateKey, day, true);
            calendarElement.appendChild(dayElement);
        }

        // Добавляем дни текущего месяца
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this.getDateKey(date);
            const dayElement = this.createDayElement(date, dateKey, day, false);
            calendarElement.appendChild(dayElement);
        }

        // Добавляем дни следующего месяца чтобы заполнить сетку (6 строк × 7 дней = 42 ячейки)
        const totalCells = 42;
        const totalDaysDisplayed = startingDayAdjusted + daysInMonth;
        const nextMonthDays = totalCells - totalDaysDisplayed;
        
        for (let day = 1; day <= nextMonthDays; day++) {
            const date = new Date(year, month + 1, day);
            const dateKey = this.getDateKey(date);
            const dayElement = this.createDayElement(date, dateKey, day, true);
            calendarElement.appendChild(dayElement);
        }
    },

    createDayElement(date, dateKey, dayNumber, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        dayElement.dataset.date = dateKey;

        // Проверяем выходные и праздничные дни
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

        // Контейнер для событий
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-day-events';

        // Показываем события только для текущего месяца
        if (!isOtherMonth) {
            // Дежурства
            if (this.data.events[dateKey]) {
                this.data.events[dateKey].forEach(event => {
                    const eventElement = document.createElement('div');
                    eventElement.className = 'calendar-event';
                    eventElement.style.backgroundColor = event.color;
                    eventElement.title = `${event.person}\n${event.comment || 'Без комментария'}`;
                    eventsContainer.appendChild(eventElement);
                });
            }

            // Отпуска
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
        }

        dayElement.appendChild(eventsContainer);
        
        // Обработчик клика только для дней текущего месяца
        if (!isOtherMonth) {
            dayElement.addEventListener('click', () => {
                if (this.state.selectionMode === 'day') {
                    this.openEventModal(dateKey);
                } else {
                    this.handleWeekSelection(date);
                }
            });
        } else {
            dayElement.style.cursor = 'default';
        }

        return dayElement;
    },

    // В разделе методов добавляем:

// === ОБРАБОТЧИКИ УПРАВЛЕНИЯ ===
initializeCalendarHandlers() {
    // Кнопки навигации по месяцам
    document.getElementById('calendarPrev')?.addEventListener('click', () => this.previousMonth());
    document.getElementById('calendarNext')?.addEventListener('click', () => this.nextMonth());
    
    // Кнопка смены режима
    document.getElementById('selectionModeBtn')?.addEventListener('click', () => this.toggleSelectionMode());
},

// Переключение режима (день/неделя)
toggleSelectionMode() {
    this.state.selectionMode = this.state.selectionMode === 'day' ? 'week' : 'day';
    
    // Обновляем текст кнопки
    const modeBtn = document.getElementById('selectionModeBtn');
    if (modeBtn) {
        const icon = this.state.selectionMode === 'day' ? 'fa-calendar-day' : 'fa-calendar-week';
        const text = this.state.selectionMode === 'day' ? 'Режим: День' : 'Режим: Неделя';
        
        modeBtn.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
    }
    
    console.log(`📅 Режим изменен на: ${this.state.selectionMode}`);
},

// Навигация по месяцам
previousMonth() { 
    this.state.currentDate.setMonth(this.state.currentDate.getMonth() - 1); 
    this.renderCalendar(); 
    console.log('📅 Переход к предыдущему месяцу');
},

nextMonth() { 
    this.state.currentDate.setMonth(this.state.currentDate.getMonth() + 1); 
    this.renderCalendar(); 
    console.log('📅 Переход к следующему месяцу');
},

goToToday() { 
    this.state.currentDate = new Date(); 
    this.renderCalendar(); 
    console.log('📅 Переход к текущему месяцу');
},

    // === МОДАЛЬНОЕ ОКНО ===
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
        modal.addEventListener('click', (e) => { 
            if (e.target === modal) closeModal(); 
        });

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

        this.saveLocalData();
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

        this.saveLocalData();
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
    },

    // Упрощенные методы навигации (если понадобятся)
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

    toggleSelectionMode() {
        this.state.selectionMode = this.state.selectionMode === 'day' ? 'week' : 'day';
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof CalendarManager !== 'undefined' && CalendarManager.init) {
        CalendarManager.init();
    }
});