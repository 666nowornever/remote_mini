// Менеджер календаря дежурств с серверной синхронизацией
const CalendarManager = {
    // === КОНФИГУРАЦИЯ ===
    apiUrl: 'https://remote-api-calendar.onrender.com/api', // Новый сервер календаря
    syncInterval: 30000, // 30 секунд
    syncTimer: null,
    maxRetries: 3,

    // Данные (синхронизируются с сервером)
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

    // Дни рождения (только для отображения)
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
        retryCount: 0
    },

    // === ИНИЦИАЛИЗАЦИЯ И СИНХРОНИЗАЦИЯ ===
    async init() {
        console.log('🔄 CalendarManager: инициализация...');
        
        try {
            // Проверяем доступность сервера
            await this.checkServerHealth();
            
            // Загружаем данные с сервера
            await this.loadFromServer();
            
            // Запускаем синхронизацию
            this.startSync();
            
            console.log('✅ CalendarManager: успешно подключен к серверу');
        } catch (error) {
            console.error('❌ Ошибка подключения к серверу:', error.message);
            
            // Пробуем загрузить локальные данные
            if (this.loadLocalFallback()) {
                console.log('✅ Используем локальные данные');
                this.state.isOnline = false;
            } else {
                console.log('📝 Используем пустые данные');
                this.data = {
                    events: {},
                    vacations: {},
                    lastModified: Date.now(),
                    version: 1
                };
            }
        }
        
        console.log('✅ CalendarManager: инициализация завершена');
    },

    // Проверка доступности сервера
    async checkServerHealth() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            if (result.success) {
                console.log('✅ Сервер доступен');
                return true;
            }
            throw new Error('Сервер не отвечает');
        } catch (error) {
            console.error('❌ Сервер недоступен:', error.message);
            throw error;
        }
    },
    // Проверка доступности сервера с обработкой CORS
async checkServerHealth() {
    try {
        const response = await fetch(`${this.apiUrl}/health`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        if (result.success) {
            console.log('✅ Сервер доступен:', result);
            return true;
        }
        throw new Error('Сервер не отвечает корректно');
    } catch (error) {
        console.error('❌ Сервер недоступен:', error.message);
        
        // Проверяем, если это CORS ошибка
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            console.warn('⚠️ Возможно проблема с CORS на сервере');
        }
        
        throw error;
    }
},

    // Загрузка данных с сервера
    async loadFromServer(retry = 0) {
        try {
            try {
        console.log('📥 Загрузка данных с сервера...');
        
        const response = await fetch(`${this.apiUrl}/calendar?t=${Date.now()}`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && this.validateData(result.data)) {
                this.data = result.data;
                this.state.lastServerCheck = Date.now();
                this.state.isOnline = true;
                this.state.retryCount = 0;
                
                // Сохраняем локальную копию
                this.saveLocalFallback();
                
                console.log('✅ Данные загружены с сервера');
                
                // Обновляем интерфейс если он отображается
                if (document.getElementById('calendarGrid')) {
                    this.renderCalendar();
                    this.renderBirthdaysThisMonth();
                }
                
                return true;
            } else {
                throw new Error('Неверный ответ сервера');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки с сервера:', error.message);
            
            // Пробуем повторить
            if (retry < this.maxRetries) {
                console.log(`🔄 Повторная попытка ${retry + 1}/${this.maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * (retry + 1)));
                return this.loadFromServer(retry + 1);
            }
            
            this.state.isOnline = false;
            this.state.retryCount++;
            throw error;
        }
    },

    // Сохранение данных на сервер
    async saveToServer(retry = 0) {
    if (this.state.isSyncing) return false;
    this.state.isSyncing = true;
    
    try {
        console.log('📤 Сохранение данных на сервер...');
        
        const response = await fetch(`${this.apiUrl}/calendar`, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(this.data)
        });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.data.lastModified = result.lastModified;
                this.data.version = result.version;
                this.state.isOnline = true;
                this.state.retryCount = 0;
                
                console.log('✅ Данные сохранены на сервер');
                return true;
            } else {
                throw new Error(result.error || 'Ошибка сервера');
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения на сервер:', error.message);
            
            // Пробуем повторить
            if (retry < this.maxRetries) {
                console.log(`🔄 Повторная попытка ${retry + 1}/${this.maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * (retry + 1)));
                return this.saveToServer(retry + 1);
            }
            
            this.state.isOnline = false;
            this.state.retryCount++;
            return false;
        } finally {
            this.state.isSyncing = false;
        }
    },

    startSync() {
        if (this.syncTimer) clearInterval(this.syncTimer);

        this.syncTimer = setInterval(async () => {
            if (this.state.isOnline && !this.state.isSyncing) {
                await this.syncWithServer();
            }
        }, this.syncInterval);

        console.log('🔄 Синхронизация запущена');
    },

    async syncWithServer() {
        try {
            const response = await fetch(`${this.apiUrl}/calendar?t=${Date.now()}`);
            if (!response.ok) return;
            
            const result = await response.json();
            
            if (result.success && this.validateData(result.data)) {
                if (result.data.lastModified > this.data.lastModified) {
                    console.log('🔄 Обновление данных с сервера');
                    this.data = result.data;
                    this.state.lastServerCheck = Date.now();
                    
                    // Сохраняем локально
                    this.saveLocalFallback();
                    
                    // Обновляем интерфейс
                    this.renderCalendar();
                }
            }
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error.message);
        }
    },

    // Локальное хранение (fallback)
    loadLocalFallback() {
        try {
            const saved = localStorage.getItem('calendarData_backup');
            if (saved) {
                const localData = JSON.parse(saved);
                if (this.validateData(localData)) {
                    this.data = localData;
                    console.log('✅ Данные загружены из локального backup');
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки backup:', error);
        }
        return false;
    },

    saveLocalFallback() {
        try {
            localStorage.setItem('calendarData_backup', JSON.stringify(this.data));
            console.log('💾 Данные сохранены в локальный backup');
        } catch (error) {
            console.error('❌ Ошибка сохранения backup:', error);
        }
    },

    validateData(data) {
        return data &&
            typeof data === 'object' &&
            typeof data.events === 'object' &&
            typeof data.vacations === 'object' &&
            typeof data.lastModified === 'number' &&
            typeof data.version === 'number';
    },

    getUserId() {
        if (window.Telegram && Telegram.WebApp) {
            return Telegram.WebApp.initDataUnsafe.user?.id?.toString();
        }
        return 'unknown';
    },

    // === ДНИ РОЖДЕНИЯ ===
    getBirthdaysForDate(dateKey) {
        return this.birthdays.filter(birthday => {
            const birthDate = new Date(birthday.date);
            const checkDate = this.parseDateKeyCorrect(dateKey);
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

    // === ОСНОВНЫЕ МЕТОДЫ КАЛЕНДАРЯ ===
    showCalendar() {
        Navigation.showPage('calendar');
    },

    loadCalendarPage() {
        this.renderCalendar();
        this.initializeCalendarHandlers();
        this.renderBirthdaysThisMonth();
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

        // Очищаем только если есть loading
        const loading = calendarElement.querySelector('.calendar-loading');
        if (loading) {
            calendarElement.innerHTML = '';
        } else {
            calendarElement.innerHTML = '';
        }

        // Заголовки дней недели
        const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarElement.appendChild(dayHeader);
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + (firstDay.getDay() === 0 ? -6 : 1));

        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (7 - lastDay.getDay()) - (lastDay.getDay() === 0 ? 0 : 1));

        const today = new Date();
        let currentDate = new Date(startDate);

        for (let i = 0; i < 35; i++) {
            const dateKey = this.getDateKey(currentDate);
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = currentDate.toDateString() === today.toDateString();

            const dayElement = this.createMainDayElement(
                new Date(currentDate),
                dateKey,
                currentDate.getDate(),
                isToday,
                !isCurrentMonth
            );

            calendarElement.appendChild(dayElement);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    },

    createMainDayElement(date, dateKey, dayNumber, isToday, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day-main';
        
        if (isToday) dayElement.classList.add('today');
        if (isOtherMonth) dayElement.classList.add('other-month');

        const correctDateKey = this.getDateKey(date);
        dayElement.dataset.date = correctDateKey;

        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = this.holidays.includes(correctDateKey);
        if (isWeekend || isHoliday) dayElement.classList.add('holiday');

        const dayNumberElement = document.createElement('div');
        dayNumberElement.className = 'calendar-day-number-main';
        dayNumberElement.textContent = dayNumber;
        dayElement.appendChild(dayNumberElement);

        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-day-events-main';

        // Дежурства
        if (this.data.events[correctDateKey]) {
            this.data.events[correctDateKey].forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'calendar-event-main';
                eventElement.style.backgroundColor = event.color || '#667eea';
                eventElement.title = `${event.name}\n${event.comment || 'Без комментария'}`;
                eventsContainer.appendChild(eventElement);
            });
        }

        // Отпуска
        if (this.data.vacations[correctDateKey]) {
            const vacationContainer = document.createElement('div');
            vacationContainer.className = 'calendar-vacation-container';
            
            this.data.vacations[correctDateKey].forEach(vacation => {
                const vacationElement = document.createElement('div');
                vacationElement.className = 'calendar-vacation-main';
                vacationElement.style.backgroundColor = vacation.color || '#ff6b6b';
                vacationElement.title = `Отпуск: ${vacation.name}\n${vacation.comment || ''}`;
                vacationContainer.appendChild(vacationElement);
            });
            
            eventsContainer.appendChild(vacationContainer);
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

        dayElement.addEventListener('click', () => {
            if (this.state.selectionMode === 'day') {
                this.openEventModal(correctDateKey);
            } else {
                this.handleWeekSelection(date);
            }
        });

        return dayElement;
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

    initializeCalendarHandlers() {
        document.getElementById('calendarPrev')?.addEventListener('click', () => this.previousMonth());
        document.getElementById('calendarNext')?.addEventListener('click', () => this.nextMonth());
        document.getElementById('calendarToday')?.addEventListener('click', () => this.goToToday());
        document.getElementById('selectionModeBtn')?.addEventListener('click', () => this.toggleSelectionMode());
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

    // === МОДАЛЬНОЕ ОКНО И СОХРАНЕНИЕ ===
    openEventModal(dateKey, weekDates = null) {
        const isWeekMode = weekDates !== null;
        
        let dateString;
        let actualDateKey = dateKey;
        
        if (isWeekMode) {
            const firstDate = this.parseDateKeyCorrect(weekDates[0]);
            const lastDate = this.parseDateKeyCorrect(weekDates[6]);
            dateString = `${firstDate.toLocaleDateString('ru-RU')} - ${lastDate.toLocaleDateString('ru-RU')}`;
        } else {
            const date = this.parseDateKeyCorrect(dateKey);
            dateString = date.toLocaleDateString('ru-RU');
            actualDateKey = this.getDateKey(date);
        }

        const modal = this.createModal(dateString, actualDateKey, weekDates);
        document.body.appendChild(modal);
        this.initializeModalHandlers(modal, actualDateKey, weekDates);
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

        modal.querySelector('.btn-save').addEventListener('click', async () => {
            const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
            const datesToSave = weekDates || [dateKey];

            try {
                if (activeTab === 'duty') {
                    await this.saveDutyEvent(datesToSave);
                } else if (activeTab === 'vacation') {
                    await this.saveVacationEvent(datesToSave);
                }
                
                closeModal();
                
            } catch (error) {
                console.error('❌ Ошибка при сохранении:', error);
                DialogService.showMessage('❌ Ошибка', 'Не удалось сохранить данные. Попробуйте снова.', 'error');
            }
        });
    },

    async saveDutyEvent(datesToSave) {
        try {
            // Собираем выбранных людей
            const selectedPersons = [];
            document.querySelectorAll('#dutyTab .duty-person-item input[type="checkbox"]:checked').forEach(checkbox => {
                const personId = parseInt(checkbox.id.replace('person-', ''));
                const person = this.dutyPersons.find(p => p.id === personId);
                if (person) selectedPersons.push(person);
            });

            const comment = document.getElementById('eventComment')?.value.trim() || '';

            // Сохраняем для каждой даты
            datesToSave.forEach(date => {
                const actualDateKey = this.getDateKey(this.parseDateKeyCorrect(date));
                
                if (selectedPersons.length > 0) {
                    this.data.events[actualDateKey] = selectedPersons.map(person => ({
                        id: person.id,
                        name: person.name,
                        color: person.color,
                        comment: comment
                    }));
                    console.log(`💾 Сохранено дежурство на ${actualDateKey}:`, selectedPersons.map(p => p.name));
                } else {
                    delete this.data.events[actualDateKey];
                    console.log(`🗑️ Удалено дежурство на ${actualDateKey}`);
                }
            });

            // Обновляем timestamp
            this.data.lastModified = Date.now();
            this.data.version++;
            
            // Сохраняем локально сразу
            this.saveLocalFallback();
            
            // Пытаемся сохранить на сервер
            let serverSaved = false;
            if (this.state.isOnline) {
                serverSaved = await this.saveToServer();
            }
            
            // Обновляем отображение
            this.renderCalendar();
            
            // Показываем результат
            if (serverSaved) {
                DialogService.showMessage(
                    '✅ Успех',
                    'График дежурств сохранен и синхронизирован',
                    'success'
                );
            } else if (this.state.isOnline) {
                DialogService.showMessage(
                    '⚠️ Внимание',
                    'График дежурств сохранен локально, но не синхронизирован с сервером',
                    'warning'
                );
            } else {
                DialogService.showMessage(
                    '💾 Сохранено',
                    'График дежурств сохранен локально (оффлайн режим)',
                    'info'
                );
            }
            
        } catch (error) {
            console.error('❌ Ошибка сохранения дежурств:', error);
            DialogService.showMessage(
                '❌ Ошибка',
                'Не удалось сохранить график дежурств: ' + error.message,
                'error'
            );
            throw error;
        }
    },

    async saveVacationEvent(datesToSave) {
        try {
            // Собираем выбранных людей
            const selectedPersons = [];
            document.querySelectorAll('#vacationTab .duty-person-item input[type="checkbox"]:checked').forEach(checkbox => {
                const personId = parseInt(checkbox.id.replace('vacation-person-', ''));
                const person = this.dutyPersons.find(p => p.id === personId);
                if (person) selectedPersons.push(person);
            });

            const comment = document.getElementById('vacationComment')?.value.trim() || '';

            // Сохраняем для каждой даты
            datesToSave.forEach(date => {
                const actualDateKey = this.getDateKey(this.parseDateKeyCorrect(date));
                
                if (selectedPersons.length > 0) {
                    this.data.vacations[actualDateKey] = selectedPersons.map(person => ({
                        id: person.id,
                        name: person.name,
                        color: person.color,
                        comment: comment,
                        type: 'vacation'
                    }));
                    console.log(`💾 Сохранен отпуск на ${actualDateKey}:`, selectedPersons.map(p => p.name));
                } else {
                    delete this.data.vacations[actualDateKey];
                    console.log(`🗑️ Удален отпуск на ${actualDateKey}`);
                }
            });

            // Обновляем timestamp
            this.data.lastModified = Date.now();
            this.data.version++;
            
            // Сохраняем локально сразу
            this.saveLocalFallback();
            
            // Пытаемся сохранить на сервер
            let serverSaved = false;
            if (this.state.isOnline) {
                serverSaved = await this.saveToServer();
            }
            
            // Обновляем отображение
            this.renderCalendar();
            
            // Показываем результат
            if (serverSaved) {
                DialogService.showMessage(
                    '✅ Успех',
                    'График отпусков сохранен и синхронизирован',
                    'success'
                );
            } else if (this.state.isOnline) {
                DialogService.showMessage(
                    '⚠️ Внимание',
                    'График отпусков сохранен локально, но не синхронизирован с сервером',
                    'warning'
                );
            } else {
                DialogService.showMessage(
                    '💾 Сохранено',
                    'График отпусков сохранен локально (оффлайн режим)',
                    'info'
                );
            }
            
        } catch (error) {
            console.error('❌ Ошибка сохранения отпусков:', error);
            DialogService.showMessage(
                '❌ Ошибка',
                'Не удалось сохранить график отпусков: ' + error.message,
                'error'
            );
            throw error;
        }
    },

    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===
    isPersonOnDuty(dateKey, personId) {
        const events = this.data.events[dateKey];
        if (!events) return false;
        return events.some(event => event.id === personId);
    },

    isPersonOnVacation(dateKey, personId) {
        const vacations = this.data.vacations[dateKey];
        if (!vacations) return false;
        return vacations.some(vacation => vacation.id === personId);
    },

    getEventComment(dateKey) {
        const events = this.data.events[dateKey];
        if (!events || events.length === 0) return '';
        return events[0].comment || '';
    },

    getVacationComment(dateKey) {
        const vacations = this.data.vacations[dateKey];
        if (!vacations || vacations.length === 0) return '';
        return vacations[0].comment || '';
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

    parseDateKeyCorrect(dateKey) {
        const [year, month, day] = dateKey.split('-').map(Number);
        return new Date(year, month - 1, day);
    },

    getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // === МЕТОДЫ ДЛЯ ОТЛАДКИ ===
    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            const result = await response.json();
            
            console.log('📊 Статус сервера:', result);
            return result;
        } catch (error) {
            console.error('❌ Сервер недоступен:', error);
            return { success: false, error: error.message };
        }
    },
    
    async getStats() {
        try {
            const response = await fetch(`${this.apiUrl}/stats`);
            const result = await response.json();
            
            console.log('📊 Статистика:', result);
            return result;
        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Полная информация о состоянии
    getDebugInfo() {
        return {
            data: {
                eventsCount: Object.keys(this.data.events).length,
                vacationsCount: Object.keys(this.data.vacations).length,
                lastModified: new Date(this.data.lastModified).toLocaleString(),
                version: this.data.version
            },
            state: {
                isOnline: this.state.isOnline,
                isSyncing: this.state.isSyncing,
                lastServerCheck: new Date(this.state.lastServerCheck).toLocaleString(),
                retryCount: this.state.retryCount,
                selectionMode: this.state.selectionMode
            },
            config: {
                apiUrl: this.apiUrl,
                syncInterval: this.syncInterval
            }
        };
    },
    
    // Тестирование
    async testSystem() {
        console.log('🧪 Тестирование системы календаря...');
        console.log('Отладочная информация:', this.getDebugInfo());
        
        // Проверяем сервер
        const serverStatus = await this.checkServerStatus();
        console.log('Статус сервера:', serverStatus);
        
        // Проверяем данные
        const stats = await this.getStats();
        console.log('Статистика:', stats);
        
        // Обновляем отображение
        this.renderCalendar();
        
        console.log('✅ Тестирование завершено');
    }
};

// Экспортируем глобально
if (typeof window !== 'undefined') {
    // Принудительная синхронизация с сервером
async forceSync() {
    try {
        console.log('🔄 Принудительная синхронизация с сервером...');
        
        // Сохраняем локальные данные на сервер
        const saved = await this.saveToServer();
        
        if (saved) {
            DialogService.showMessage(
                '✅ Успех',
                'Данные успешно синхронизированы с сервером',
                'success'
            );
        } else {
            DialogService.showMessage(
                '⚠️ Внимание',
                'Не удалось синхронизировать с сервером. Проверьте подключение.',
                'warning'
            );
        }
        
        return saved;
    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error);
        DialogService.showMessage(
            '❌ Ошибка',
            'Ошибка синхронизации: ' + error.message,
            'error'
        );
        return false;
    }
},
    window.CalendarManager = CalendarManager;
}