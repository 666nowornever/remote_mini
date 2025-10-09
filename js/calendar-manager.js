// Менеджер календаря дежурств и отпусков
const CalendarManager = {
    // Список дежурных
    dutyPersons: [
        { id: 1, name: 'Кремнев Андрей', color: '#2196F3' },
        { id: 2, name: 'Васильев Иван', color: '#4CAF50' },
        { id: 3, name: 'Преображенский Дмитрий', color: '#FF9800' }
    ],

    // Текущий месяц и год
    currentDate: new Date(),
    events: {},
    vacations: {},

    // Режим выбора (один день / неделя)
    selectionMode: 'day', // 'day' или 'week'

    // Инициализация менеджера
    init: function() {
        console.log('🔄 CalendarManager: инициализация...');
        this.loadEventsFromStorage();
        this.loadVacationsFromStorage();
    },

    // Загрузка событий из localStorage
    loadEventsFromStorage: function() {
        const savedEvents = localStorage.getItem('dutyCalendarEvents');
        const savedVacations = localStorage.getItem('dutyCalendarVacations');
        
        if (savedEvents) {
            this.events = JSON.parse(savedEvents);
            console.log('📅 События загружены из хранилища');
        } else {
            this.events = {};
        }
        
        if (savedVacations) {
            this.vacations = JSON.parse(savedVacations);
            console.log('🏖️ Отпуска загружены из хранилища');
        } else {
            this.vacations = {};
        }
    },

    // Сохранение событий в localStorage
    saveEventsToStorage: function() {
        localStorage.setItem('dutyCalendarEvents', JSON.stringify(this.events));
        localStorage.setItem('dutyCalendarVacations', JSON.stringify(this.vacations));
        console.log('💾 Данные сохранены в хранилище');
    },

    // Переключение режима выбора
    toggleSelectionMode: function() {
        this.selectionMode = this.selectionMode === 'day' ? 'week' : 'day';
        const modeBtn = document.getElementById('selectionModeBtn');
        if (modeBtn) {
            modeBtn.innerHTML = this.selectionMode === 'day' ? 
                '<i class="fas fa-calendar-day"></i> Режим: День' : 
                '<i class="fas fa-calendar-week"></i> Режим: Неделя';
        }
        console.log(`📅 Режим выбора: ${this.selectionMode}`);
    },

    // Показать календарь
    showCalendar: function() {
        Navigation.showPage('calendar');
    },

    // Загрузка страницы календаря
    loadCalendarPage: function() {
        this.renderCalendar();
        this.initializeCalendarHandlers();
    },

    // Рендер календаря
    renderCalendar: function() {
        const calendarElement = document.getElementById('calendarGrid');
        if (!calendarElement) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

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
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.dataset.date = dateKey;

            // Проверяем выходной
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            if (isWeekend) {
                dayElement.classList.add('weekend');
            }

            const dayNumber = document.createElement('div');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = day;

            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'calendar-day-events';

            // Добавляем дежурства для этого дня
            if (this.events[dateKey]) {
                this.events[dateKey].forEach(event => {
                    const eventElement = document.createElement('div');
                    eventElement.className = 'calendar-event';
                    eventElement.style.backgroundColor = event.color;
                    eventElement.title = `${event.person}\n${event.comment || 'Без комментария'}`;
                    eventsContainer.appendChild(eventElement);
                });
            }

            // Добавляем отпуска для этого дня
            if (this.vacations[dateKey]) {
                this.vacations[dateKey].forEach(vacation => {
                    const vacationElement = document.createElement('div');
                    vacationElement.className = 'calendar-vacation';
                    vacationElement.style.backgroundColor = vacation.color;
                    vacationElement.title = `Отпуск: ${vacation.person}`;
                    eventsContainer.appendChild(vacationElement);
                });
            }

            dayElement.appendChild(dayNumber);
            dayElement.appendChild(eventsContainer);
            
            // Обработчик клика в зависимости от режима
            dayElement.addEventListener('click', () => {
                if (this.selectionMode === 'day') {
                    this.openEventModal(dateKey);
                } else {
                    this.handleWeekSelection(date);
                }
            });

            calendarElement.appendChild(dayElement);
        }
    },

    // Обработка выбора недели
    handleWeekSelection: function(selectedDate) {
        const weekDates = this.getWeekDates(selectedDate);
        const dateKeys = weekDates.map(date => this.getDateKey(date));
        
        console.log('📅 Выбрана неделя:', dateKeys);
        this.openEventModalForWeek(dateKeys);
    },

    // Получение всех дат недели
    getWeekDates: function(date) {
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

    // Открытие модального окна для недели
    openEventModalForWeek: function(dateKeys) {
        const firstDate = this.parseDateKey(dateKeys[0]);
        const lastDate = this.parseDateKey(dateKeys[6]);
        
        const dateString = `${firstDate.toLocaleDateString('ru-RU')} - ${lastDate.toLocaleDateString('ru-RU')}`;

        this.openEventModal(dateKeys[0], dateKeys);
    },

    // Открытие модального окна для добавления/редактирования события
    openEventModal: function(dateKey, weekDates = null) {
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

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'calendar-modal-overlay';
        modal.innerHTML = `
            <div class="calendar-modal">
                <div class="calendar-modal-header">
                    <h3>${isWeekMode ? 'Дежурство на неделю' : 'Дежурство на'} ${dateString}</h3>
                    <button class="calendar-modal-close">&times;</button>
                </div>
                <div class="calendar-modal-content">
                    <div class="modal-tabs">
                        <button class="tab-btn active" data-tab="duty">Дежурство</button>
                        <button class="tab-btn" data-tab="vacation">Отпуск</button>
                        <button class="tab-btn" data-tab="event">Событие</button>
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
                            <label for="eventComment">Комментарий к дежурству:</label>
                            <textarea id="eventComment" placeholder="Добавьте комментарий к дежурству...">${this.getEventComment(dateKey) || ''}</textarea>
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
                            <label for="vacationComment">Комментарий к отпуску:</label>
                            <textarea id="vacationComment" placeholder="Добавьте комментарий к отпуску...">${this.getVacationComment(dateKey) || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="tab-content hidden" id="eventTab">
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
                    </div>
                </div>
                <div class="calendar-modal-actions">
                    <button class="btn btn-cancel">Отмена</button>
                    <button class="btn btn-save">Сохранить</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Инициализация табов
        this.initializeModalTabs(modal);

        // Обработчики событий модального окна
        const closeBtn = modal.querySelector('.calendar-modal-close');
        const cancelBtn = modal.querySelector('.btn-cancel');
        const saveBtn = modal.querySelector('.btn-save');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        saveBtn.addEventListener('click', () => {
            const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
            
            if (activeTab === 'duty') {
                this.saveDutyEvent(dateKey, weekDates);
            } else if (activeTab === 'vacation') {
                this.saveVacationEvent(dateKey, weekDates);
            } else if (activeTab === 'event') {
                this.saveChatEvent(dateKey, weekDates);
            }
            
            closeModal();
            this.renderCalendar();
        });

        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    },

    // Инициализация табов в модальном окне
    initializeModalTabs: function(modal) {
        const tabBtns = modal.querySelectorAll('.tab-btn');
        const tabContents = modal.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Деактивируем все табы
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.add('hidden'));

                // Активируем выбранный таб
                btn.classList.add('active');
                const tabId = btn.dataset.tab + 'Tab';
                const tabContent = modal.querySelector(`#${tabId}`);
                if (tabContent) {
                    tabContent.classList.remove('hidden');
                }
            });
        });
    },

    // Сохранение дежурства
    saveDutyEvent: function(dateKey, weekDates = null) {
        const datesToSave = weekDates || [dateKey];
        const selectedPersons = [];
        const checkboxes = document.querySelectorAll('.duty-person-item input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            const personId = parseInt(checkbox.id.replace('person-', ''));
            const person = this.dutyPersons.find(p => p.id === personId);
            if (person) {
                selectedPersons.push({
                    id: person.id,
                    person: person.name,
                    color: person.color
                });
            }
        });

        const comment = document.getElementById('eventComment').value.trim();

        datesToSave.forEach(date => {
            if (selectedPersons.length > 0) {
                this.events[date] = selectedPersons.map(person => ({
                    ...person,
                    comment: comment
                }));
                
                // Отправляем уведомление только если нет комментария
                if (!comment) {
                    this.sendDutyNotification(date);
                }
            } else {
                delete this.events[date];
            }
        });

        this.saveEventsToStorage();
        console.log(`💾 Дежурства сохранены для дат: ${datesToSave.join(', ')}`);
    },

    // Сохранение отпуска
    saveVacationEvent: function(dateKey, weekDates = null) {
        const datesToSave = weekDates || [dateKey];
        const selectedPersons = [];
        const checkboxes = document.querySelectorAll('#vacationTab .duty-person-item input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            const personId = parseInt(checkbox.id.replace('vacation-person-', ''));
            const person = this.dutyPersons.find(p => p.id === personId);
            if (person) {
                selectedPersons.push({
                    id: person.id,
                    person: person.name,
                    color: person.color
                });
            }
        });

        const comment = document.getElementById('vacationComment').value.trim();

        datesToSave.forEach(date => {
            if (selectedPersons.length > 0) {
                this.vacations[date] = selectedPersons.map(person => ({
                    ...person,
                    comment: comment,
                    type: 'vacation'
                }));
            } else {
                delete this.vacations[date];
            }
        });

        this.saveEventsToStorage();
        console.log(`🏖️ Отпуска сохранены для дат: ${datesToSave.join(', ')}`);
    },

    // Сохранение события для чата
    saveChatEvent: function(dateKey, weekDates = null) {
        const eventTime = document.getElementById('eventTime').value;
        const eventMessage = document.getElementById('eventMessage').value.trim();
        
        if (!eventMessage) {
            alert('Пожалуйста, введите сообщение для отправки');
            return;
        }

        const datesToSave = weekDates || [dateKey];
        
        datesToSave.forEach(date => {
            const eventDateTime = `${date}T${eventTime}:00`;
            this.scheduleTelegramMessage(eventDateTime, eventMessage);
        });

        console.log(`📨 События чата сохранены для дат: ${datesToSave.join(', ')}`);
    },

    // Планирование отправки сообщения в Telegram
    scheduleTelegramMessage: function(eventDateTime, message) {
        const eventTimestamp = new Date(eventDateTime).getTime();
        const now = Date.now();
        
        if (eventTimestamp <= now) {
            alert('Указанное время уже прошло. Пожалуйста, выберите будущее время.');
            return;
        }

        // Сохраняем запланированное сообщение
        const scheduledMessages = JSON.parse(localStorage.getItem('scheduledTelegramMessages') || '[]');
        scheduledMessages.push({
            timestamp: eventTimestamp,
            message: message,
            datetime: eventDateTime
        });
        
        localStorage.setItem('scheduledTelegramMessages', JSON.stringify(scheduledMessages));
        
        // Здесь будет интеграция с сервером для отправки в Telegram
        console.log(`⏰ Запланировано сообщение на ${eventDateTime}: ${message}`);
        
        // Запускаем проверку запланированных сообщений
        this.startMessageScheduler();
    },

    // Запуск планировщика сообщений
    startMessageScheduler: function() {
        setInterval(() => {
            this.checkScheduledMessages();
        }, 60000); // Проверяем каждую минуту
    },

    // Проверка запланированных сообщений
    checkScheduledMessages: function() {
        const scheduledMessages = JSON.parse(localStorage.getItem('scheduledTelegramMessages') || '[]');
        const now = Date.now();
        const messagesToSend = scheduledMessages.filter(msg => msg.timestamp <= now);
        
        if (messagesToSend.length > 0) {
            messagesToSend.forEach(msg => {
                this.sendToTelegramChat(msg.message);
                console.log(`📨 Отправлено сообщение в Telegram: ${msg.message}`);
            });
            
            // Удаляем отправленные сообщения
            const remainingMessages = scheduledMessages.filter(msg => msg.timestamp > now);
            localStorage.setItem('scheduledTelegramMessages', JSON.stringify(remainingMessages));
        }
    },

    // Отправка в Telegram чат (заглушка - нужно реализовать интеграцию)
    sendToTelegramChat: function(message) {
        // Интеграция с Telegram Bot API
        // Пример: fetch(`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         chat_id: <YOUR_CHAT_ID>,
        //         text: message
        //     })
        // });
        
        console.log('🔔 Сообщение для Telegram:', message);
    },

    // Отправка уведомления о дежурстве (только если нет комментария)
    sendDutyNotification: function(dateKey) {
        const date = this.parseDateKey(dateKey);
        const dateString = date.toLocaleDateString('ru-RU');
        const events = this.events[dateKey];

        if (events && events.length > 0) {
            const persons = events.map(e => e.person).join(', ');
            const message = `📅 Дежурство на ${dateString}\nДежурные: ${persons}`;
            
            console.log('🔔 Уведомление о дежурстве:', message);
            this.sendToTelegramChat(message);
        }
    },

    // Проверка, дежурит ли человек в указанную дату
    isPersonOnDuty: function(dateKey, personId) {
        return this.events[dateKey] && this.events[dateKey].some(event => event.id === personId);
    },

    // Проверка, в отпуске ли человек в указанную дату
    isPersonOnVacation: function(dateKey, personId) {
        return this.vacations[dateKey] && this.vacations[dateKey].some(vacation => vacation.id === personId);
    },

    // Получение комментария для даты
    getEventComment: function(dateKey) {
        if (this.events[dateKey] && this.events[dateKey].length > 0) {
            return this.events[dateKey][0].comment;
        }
        return '';
    },

    // Получение комментария к отпуску
    getVacationComment: function(dateKey) {
        if (this.vacations[dateKey] && this.vacations[dateKey].length > 0) {
            return this.vacations[dateKey][0].comment;
        }
        return '';
    },

    // Загрузка отпусков из хранилища
    loadVacationsFromStorage: function() {
        const savedVacations = localStorage.getItem('dutyCalendarVacations');
        if (savedVacations) {
            this.vacations = JSON.parse(savedVacations);
        } else {
            this.vacations = {};
        }
    },

    // Инициализация обработчиков календаря
    initializeCalendarHandlers: function() {
        // Кнопки навигации
        const prevBtn = document.getElementById('calendarPrev');
        const nextBtn = document.getElementById('calendarNext');
        const todayBtn = document.getElementById('calendarToday');
        const modeBtn = document.getElementById('selectionModeBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousMonth());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextMonth());
        }
        if (todayBtn) {
            todayBtn.addEventListener('click', () => this.goToToday());
        }
        if (modeBtn) {
            modeBtn.addEventListener('click', () => this.toggleSelectionMode());
        }
    },

    // Вспомогательные методы
    getDateKey: function(date) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    },

    parseDateKey: function(dateKey) {
        return new Date(dateKey + 'T00:00:00');
    },

    previousMonth: function() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    },

    nextMonth: function() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    },

    goToToday: function() {
        this.currentDate = new Date();
        this.renderCalendar();
    }
};

// Инициализация CalendarManager при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    if (typeof CalendarManager !== 'undefined' && CalendarManager.init) {
        CalendarManager.init();
        // Запускаем планировщик сообщений
        CalendarManager.startMessageScheduler();
    }
});