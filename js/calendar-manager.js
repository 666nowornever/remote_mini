// Менеджер календаря дежурств с серверной синхронизацией
const CalendarManager = {
    // === КОНФИГУРАЦИЯ ===
    apiUrl: 'https://remote-api-calendar.onrender.com/api',
    syncInterval: 30000,
    syncTimer: null,
    maxRetries: 3,
    requestTimeout: 5000,

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

    // Дни рождения
    birthdays: [
        { name: 'Васильев Иван', date: '2025-01-09' },
        { name: 'Преображенский Дмитрий', date: '2025-02-13' },
        { name: 'Кремнев Андрей', date: '2025-09-03' },
        { name: 'Солохин Вячеслав', date: '2025-11-07' },
        { name: 'Тихонов Никита', date: '2025-12-25' },
        { name: 'Дяблов Алексей', date: '2025-01-06' },
        { name: 'Винковский Алексей', date: '2025-01-28' },
        { name: 'Сиворин Михаил', date: '2025-02-09' },
        { name: 'Кунаев Николай', date: '2025-05-24' },
        { name: 'Нуриахметов Вадим', date: '2025-07-09' },
        { name: 'Волков Дмитрий', date: '2025-09-05' },
        { name: 'Чупеткин Иван', date: '2025-10-28' }
    ],

    // Праздничные дни
    holidays: [
        '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08',
        '2025-02-23', '2025-02-24', '2025-02-25',
        '2025-03-08', '2025-03-09', '2025-03-10',
        '2025-04-29', '2025-04-30', '2025-05-01', '2025-05-02',
        '2025-05-09', '2025-05-10', '2025-05-11',
        '2025-06-11', '2025-06-12', '2025-06-13',
        '2025-11-01', '2025-11-02', '2025-11-03'
    ],

    // Состояние
    state: {
        currentDate: new Date(),
        selectionMode: 'day',
        isOnline: false,
        isSyncing: false,
        lastServerCheck: 0,
        retryCount: 0,
        isInitialized: false
    },

    // === ИНИЦИАЛИЗАЦИЯ ===
    async init() {
        console.log('🔄 CalendarManager: инициализация...');
        
        if (this.state.isInitialized) {
            console.log('✅ CalendarManager уже инициализирован');
            return;
        }
        
        // Загружаем локальные данные для быстрого старта
        this.loadLocalFallback();
        
        try {
            // Проверяем сервер
            const isServerAvailable = await this.checkServerHealth();
            
            if (isServerAvailable) {
                // Загружаем с сервера
                await this.loadFromServer();
                this.startSync();
                console.log('✅ Подключено к серверу');
            } else {
                console.log('📴 Работаем в оффлайн режиме');
                this.state.isOnline = false;
            }
        } catch (error) {
            console.error('⚠️ Ошибка при инициализации:', error);
            this.state.isOnline = false;
        }
        
        // Рендерим календарь в любом случае
        this.renderCalendar();
        this.renderBirthdaysThisMonth();
        
        this.state.isInitialized = true;
        console.log('✅ CalendarManager инициализирован');
    },

    // Проверка сервера (упрощенная версия)
    async checkServerHealth() {
        try {
            console.log('🔍 Проверка сервера...');
            
            // Используем более простой подход
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(`${this.apiUrl}/ping`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Сервер доступен:', result.message);
            return true;
            
        } catch (error) {
            console.log('❌ Сервер недоступен:', error.name === 'AbortError' ? 'Timeout' : error.message);
            return false;
        }
    },

    // Загрузка с сервера
    async loadFromServer(retry = 0) {
        try {
            console.log('📥 Загрузка данных с сервера...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.apiUrl}/calendar?t=${Date.now()}`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && this.validateData(result.data)) {
                this.data = result.data;
                this.state.isOnline = true;
                this.state.retryCount = 0;
                
                this.saveLocalFallback();
                console.log('✅ Данные загружены с сервера');
                
                return true;
            } else {
                throw new Error('Неверный формат данных');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error.message);
            
            if (retry < this.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.loadFromServer(retry + 1);
            }
            
            this.state.isOnline = false;
            return false;
        }
    },

    // Сохранение на сервер
    async saveToServer(retry = 0) {
        if (this.state.isSyncing) {
            console.log('⏳ Уже идет синхронизация...');
            return false;
        }
        
        this.state.isSyncing = true;
        
        try {
            console.log('📤 Сохранение на сервер...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(`${this.apiUrl}/calendar`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.data.lastModified = result.lastModified;
                this.data.version = result.version;
                this.state.isOnline = true;
                
                console.log('✅ Данные сохранены на сервере');
                return true;
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error.message);
            
            if (retry < this.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.saveToServer(retry + 1);
            }
            
            this.state.isOnline = false;
            return false;
        } finally {
            this.state.isSyncing = false;
        }
    },

    // Фоновая синхронизация
    startSync() {
        if (this.syncTimer) clearInterval(this.syncTimer);
        
        this.syncTimer = setInterval(async () => {
            if (this.state.isOnline && !this.state.isSyncing) {
                await this.syncWithServer();
            }
        }, this.syncInterval);
        
        console.log('🔄 Фоновая синхронизация запущена');
    },

    async syncWithServer() {
        try {
            const response = await fetch(`${this.apiUrl}/calendar?t=${Date.now()}`, {
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) return;
            
            const result = await response.json();
            
            if (result.success && result.data.lastModified > this.data.lastModified) {
                console.log('🔄 Получены новые данные с сервера');
                this.data = result.data;
                this.saveLocalFallback();
                this.renderCalendar();
            }
        } catch (error) {
            // Тихая ошибка при синхронизации
        }
    },

    // Локальное хранение
    loadLocalFallback() {
        try {
            const saved = localStorage.getItem('calendarData_backup');
            if (saved) {
                const localData = JSON.parse(saved);
                if (this.validateData(localData)) {
                    this.data = localData;
                    console.log('✅ Загружены локальные данные');
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки локальных данных:', error);
        }
        return false;
    },

    saveLocalFallback() {
        try {
            localStorage.setItem('calendarData_backup', JSON.stringify(this.data));
        } catch (error) {
            console.error('❌ Ошибка сохранения локальных данных:', error);
        }
    },

    validateData(data) {
        return data &&
               typeof data === 'object' &&
               typeof data.events === 'object' &&
               typeof data.vacations === 'object';
    },

    // === РЕНДЕРИНГ КАЛЕНДАРЯ ===
    renderCalendar() {
        const calendarElement = document.getElementById('calendarGrid');
        if (!calendarElement) return;
        
        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                           'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        
        // Обновляем заголовок
        const titleElement = document.getElementById('calendarTitle');
        if (titleElement) {
            titleElement.textContent = `${monthNames[month]} ${year}`;
        }
        
        // Очищаем grid
        calendarElement.innerHTML = '';
        
        // Заголовки дней недели
        const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarElement.appendChild(dayHeader);
        });
        
        // Генерируем дни месяца
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + (firstDay.getDay() === 0 ? -6 : 1));
        
        const today = new Date();
        let currentDate = new Date(startDate);
        
        for (let i = 0; i < 35; i++) {
            const dateKey = this.getDateKey(currentDate);
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = currentDate.toDateString() === today.toDateString();
            
            const dayElement = this.createDayElement(
                currentDate,
                dateKey,
                currentDate.getDate(),
                isToday,
                !isCurrentMonth
            );
            
            calendarElement.appendChild(dayElement);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    },

    createDayElement(date, dateKey, dayNumber, isToday, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day-main';
        if (isToday) dayElement.classList.add('today');
        if (isOtherMonth) dayElement.classList.add('other-month');
        
        const correctDateKey = this.getDateKey(date);
        dayElement.dataset.date = correctDateKey;
        
        // Проверка выходного/праздничного дня
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = this.holidays.includes(correctDateKey);
        if (isWeekend || isHoliday) dayElement.classList.add('holiday');
        
        // Номер дня
        const dayNumberElement = document.createElement('div');
        dayNumberElement.className = 'calendar-day-number-main';
        dayNumberElement.textContent = dayNumber;
        dayElement.appendChild(dayNumberElement);
        
        // События
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-day-events-main';
        
        // Дежурства
        if (this.data.events && this.data.events[correctDateKey]) {
            this.data.events[correctDateKey].forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'calendar-event-main';
                eventElement.style.backgroundColor = event.color || '#667eea';
                eventElement.title = `${event.name}\n${event.comment || ''}`;
                eventsContainer.appendChild(eventElement);
            });
        }
        
        // Отпуска
        if (this.data.vacations && this.data.vacations[correctDateKey]) {
            const vacationElement = document.createElement('div');
            vacationElement.className = 'calendar-vacation-main';
            vacationElement.title = 'В отпуске';
            eventsContainer.appendChild(vacationElement);
        }
        
        // Дни рождения
        const birthdays = this.getBirthdaysForDate(correctDateKey);
        if (birthdays.length > 0) {
            const birthdayElement = document.createElement('div');
            birthdayElement.className = 'calendar-birthday-emoji';
            birthdayElement.textContent = '🎂';
            birthdayElement.title = `Дни рождения: ${birthdays.map(b => b.name).join(', ')}`;
            eventsContainer.appendChild(birthdayElement);
        }
        
        dayElement.appendChild(eventsContainer);
        
        // Обработчик клика
        dayElement.addEventListener('click', () => {
            this.openEventModal(correctDateKey);
        });
        
        return dayElement;
    },

    // Дни рождения
    getBirthdaysForDate(dateKey) {
        return this.birthdays.filter(birthday => {
            const birthDate = new Date(birthday.date);
            const checkDate = this.parseDateKey(dateKey);
            return birthDate.getMonth() === checkDate.getMonth() &&
                   birthDate.getDate() === checkDate.getDate();
        });
    },

    getBirthdaysForCurrentMonth() {
        const currentMonth = this.state.currentDate.getMonth();
        const currentYear = this.state.currentDate.getFullYear();
        
        return this.birthdays.filter(birthday => {
            const birthDate = new Date(birthday.date);
            const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
            return birthdayThisYear.getMonth() === currentMonth;
        }).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return (dateA.getMonth() * 100 + dateA.getDate()) - (dateB.getMonth() * 100 + dateB.getDate());
        });
    },

    renderBirthdaysThisMonth() {
        const birthdaysContainer = document.getElementById('birthdaysThisMonth');
        if (!birthdaysContainer) return;
        
        const birthdays = this.getBirthdaysForCurrentMonth();
        
        if (birthdays.length === 0) {
            birthdaysContainer.innerHTML = `
                <div class="no-birthdays">
                    <i class="fas fa-birthday-cake"></i>
                    <p>В этом месяце дней рождения нет</p>
                </div>
            `;
            return;
        }
        
        let birthdaysHTML = '<div class="birthdays-list">';
        
        birthdays.forEach(birthday => {
            const birthDate = new Date(birthday.date);
            const formattedDate = birthDate.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long' 
            });
            
            birthdaysHTML += `
                <div class="birthday-item">
                    <div class="birthday-date">${formattedDate}</div>
                    <div class="birthday-name">${birthday.name}</div>
                </div>
            `;
        });
        
        birthdaysHTML += '</div>';
        birthdaysContainer.innerHTML = birthdaysHTML;
    },

    // Навигация по месяцам
    initializeCalendarHandlers() {
        document.getElementById('calendarPrev')?.addEventListener('click', () => this.previousMonth());
        document.getElementById('calendarNext')?.addEventListener('click', () => this.nextMonth());
        document.getElementById('calendarToday')?.addEventListener('click', () => this.goToToday());
    },

    previousMonth() {
        this.state.currentDate.setMonth(this.state.currentDate.getMonth() - 1);
        this.renderCalendar();
        this.renderBirthdaysThisMonth();
    },

    nextMonth() {
        this.state.currentDate.setMonth(this.state.currentDate.getMonth() + 1);
        this.renderCalendar();
        this.renderBirthdaysThisMonth();
    },

    goToToday() {
        this.state.currentDate = new Date();
        this.renderCalendar();
        this.renderBirthdaysThisMonth();
    },

    // === МОДАЛЬНОЕ ОКНО ===
    openEventModal(dateKey) {
        const date = this.parseDateKey(dateKey);
        const dateString = date.toLocaleDateString('ru-RU');
        
        // Создаем модальное окно
        const modalHTML = `
            <div class="calendar-modal-overlay">
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
                            <textarea id="eventComment" placeholder="Добавьте комментарий...">${this.getEventComment(dateKey) || ''}</textarea>
                        </div>
                    </div>
                    <div class="calendar-modal-actions">
                        <button class="btn btn-cancel">Отмена</button>
                        <button class="btn btn-save">Сохранить</button>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем в DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        // Обработчики событий
        const modal = modalContainer.firstChild;
        
        const closeModal = () => {
            modal.remove();
        };
        
        modal.querySelector('.calendar-modal-close').addEventListener('click', closeModal);
        modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Сохранение
        modal.querySelector('.btn-save').addEventListener('click', async () => {
            await this.saveDutyEvent(dateKey);
            closeModal();
        });
    },

    async saveDutyEvent(dateKey) {
        try {
            // Собираем выбранных людей
            const selectedPersons = [];
            document.querySelectorAll('.duty-person-item input[type="checkbox"]:checked').forEach(checkbox => {
                const personId = parseInt(checkbox.id.replace('person-', ''));
                const person = this.dutyPersons.find(p => p.id === personId);
                if (person) selectedPersons.push(person);
            });
            
            const comment = document.getElementById('eventComment')?.value.trim() || '';
            
            // Обновляем данные
            if (selectedPersons.length > 0) {
                this.data.events[dateKey] = selectedPersons.map(person => ({
                    id: person.id,
                    name: person.name,
                    color: person.color,
                    comment: comment
                }));
            } else {
                delete this.data.events[dateKey];
            }
            
            // Обновляем метаданные
            this.data.lastModified = Date.now();
            this.data.version = (this.data.version || 0) + 1;
            
            // Сохраняем локально
            this.saveLocalFallback();
            
            // Пытаемся сохранить на сервер
            if (this.state.isOnline) {
                await this.saveToServer();
            }
            
            // Обновляем отображение
            this.renderCalendar();
            
            // Показываем сообщение
            alert(selectedPersons.length > 0 ? 'Дежурство сохранено' : 'Дежурство удалено');
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            alert('Ошибка сохранения: ' + error.message);
        }
    },

    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===
    isPersonOnDuty(dateKey, personId) {
        const events = this.data.events[dateKey];
        if (!events || !Array.isArray(events)) return false;
        return events.some(event => event.id === personId);
    },

    getEventComment(dateKey) {
        const events = this.data.events[dateKey];
        if (!events || !Array.isArray(events) || events.length === 0) return '';
        return events[0].comment || '';
    },

    parseDateKey(dateKey) {
        const [year, month, day] = dateKey.split('-').map(Number);
        return new Date(year, month - 1, day);
    },

    getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // === ПУБЛИЧНЫЕ МЕТОДЫ ===
    showCalendar() {
        Navigation.showPage('calendar');
        this.renderCalendar();
        this.renderBirthdaysThisMonth();
        this.initializeCalendarHandlers();
    },

    // Ручная синхронизация
    async manualSync() {
        try {
            const isServerAvailable = await this.checkServerHealth();
            if (isServerAvailable) {
                await this.loadFromServer();
                alert('✅ Данные синхронизированы');
            } else {
                alert('⚠️ Сервер недоступен');
            }
        } catch (error) {
            alert('❌ Ошибка синхронизации: ' + error.message);
        }
    }
};

// Экспорт
if (typeof window !== 'undefined') {
    window.CalendarManager = CalendarManager;
}