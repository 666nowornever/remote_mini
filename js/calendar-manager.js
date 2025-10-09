// Менеджер календаря дежурств
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

    // Инициализация менеджера
    init: function() {
        console.log('🔄 CalendarManager: инициализация...');
        this.loadEventsFromStorage();
    },

    // Загрузка событий из localStorage
    loadEventsFromStorage: function() {
        const savedEvents = localStorage.getItem('dutyCalendarEvents');
        if (savedEvents) {
            this.events = JSON.parse(savedEvents);
            console.log('📅 События загружены из хранилища');
        } else {
            this.events = {};
            console.log('📅 Хранилище событий пустое');
        }
    },

    // Сохранение событий в localStorage
    saveEventsToStorage: function() {
        localStorage.setItem('dutyCalendarEvents', JSON.stringify(this.events));
        console.log('💾 События сохранены в хранилище');
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
            const dateKey = this.getDateKey(new Date(year, month, day));
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.dataset.date = dateKey;

            const dayNumber = document.createElement('div');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = day;

            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'calendar-day-events';

            // Добавляем события для этого дня
            if (this.events[dateKey]) {
                this.events[dateKey].forEach(event => {
                    const eventElement = document.createElement('div');
                    eventElement.className = 'calendar-event';
                    eventElement.style.backgroundColor = event.color;
                    eventElement.title = `${event.person}\n${event.comment || 'Без комментария'}`;
                    eventsContainer.appendChild(eventElement);
                });
            }

            dayElement.appendChild(dayNumber);
            dayElement.appendChild(eventsContainer);
            dayElement.addEventListener('click', () => this.openEventModal(dateKey));

            calendarElement.appendChild(dayElement);
        }
    },

    // Инициализация обработчиков календаря
    initializeCalendarHandlers: function() {
        // Кнопки навигации
        const prevBtn = document.getElementById('calendarPrev');
        const nextBtn = document.getElementById('calendarNext');
        const todayBtn = document.getElementById('calendarToday');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousMonth());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextMonth());
        }
        if (todayBtn) {
            todayBtn.addEventListener('click', () => this.goToToday());
        }
    },

    // Переход к предыдущему месяцу
    previousMonth: function() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    },

    // Переход к следующему месяцу
    nextMonth: function() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    },

    // Переход к текущему месяцу
    goToToday: function() {
        this.currentDate = new Date();
        this.renderCalendar();
    },

    // Открытие модального окна для добавления/редактирования события
    openEventModal: function(dateKey) {
        const date = this.parseDateKey(dateKey);
        const dateString = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'calendar-modal-overlay';
        modal.innerHTML = `
            <div class="calendar-modal">
                <div class="calendar-modal-header">
                    <h3>Дежурство на ${dateString}</h3>
                    <button class="calendar-modal-close">&times;</button>
                </div>
                <div class="calendar-modal-content">
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
                        <textarea id="eventComment" placeholder="Добавьте комментарий к дежурству...">${this.getEventComment(dateKey) || ''}</textarea>
                    </div>
                </div>
                <div class="calendar-modal-actions">
                    <button class="btn btn-cancel">Отмена</button>
                    <button class="btn btn-save">Сохранить</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

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
            this.saveEvent(dateKey);
            closeModal();
            this.renderCalendar();
            this.sendNotification(dateKey);
        });

        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    },

    // Сохранение события
    saveEvent: function(dateKey) {
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

        if (selectedPersons.length > 0) {
            this.events[dateKey] = selectedPersons.map(person => ({
                ...person,
                comment: comment
            }));
        } else {
            delete this.events[dateKey];
        }

        this.saveEventsToStorage();
        console.log(`💾 Событие сохранено для даты: ${dateKey}`);
    },

    // Проверка, дежурит ли человек в указанную дату
    isPersonOnDuty: function(dateKey, personId) {
        return this.events[dateKey] && this.events[dateKey].some(event => event.id === personId);
    },

    // Получение комментария для даты
    getEventComment: function(dateKey) {
        if (this.events[dateKey] && this.events[dateKey].length > 0) {
            return this.events[dateKey][0].comment;
        }
        return '';
    },

    // Отправка уведомления (заглушка - в реальности будет интеграция с ботом)
    sendNotification: function(dateKey) {
        const date = this.parseDateKey(dateKey);
        const dateString = date.toLocaleDateString('ru-RU');
        const events = this.events[dateKey];

        if (events && events.length > 0) {
            const persons = events.map(e => e.person).join(', ');
            const comment = events[0].comment ? `\nКомментарий: ${events[0].comment}` : '';
            
            const message = `📅 Обновлено дежурство на ${dateString}\nДежурные: ${persons}${comment}`;
            
            console.log('🔔 Уведомление:', message);
            
            // Здесь будет интеграция с Telegram ботом
            // await this.sendToTelegramBot(message);
            
            DialogService.showMessage(
                'Уведомление отправлено',
                `Информация о дежурстве на ${dateString} отправлена в чат бота.`,
                'success'
            );
        }
    },

    // Вспомогательные методы
    getDateKey: function(date) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    },

    parseDateKey: function(dateKey) {
        return new Date(dateKey + 'T00:00:00');
    }
};

// Инициализация CalendarManager при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    if (typeof CalendarManager !== 'undefined' && CalendarManager.init) {
        CalendarManager.init();
    }
});