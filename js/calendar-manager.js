// Менеджер календаря дежурств с серверной синхронизацией
const CalendarManager = {
    // === КОНФИГУРАЦИЯ ===
    apiUrl: 'https://remote-api-calendar.onrender.com/api', // Ваш сервер на Render
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

    // === ИНИЦИАЛИЗАЦИЯ И СИНХРОНИЗАЦИЯ ===
    async init() {
        console.log('🔄 CalendarManager: инициализация...');
        
        if (this.state.isInitialized) {
            console.log('✅ CalendarManager уже инициализирован');
            return;
        }
        
        try {
            // Пытаемся загрузить локальные данные сразу для быстрого отображения
            if (this.loadLocalFallback()) {
                console.log('✅ Загружены локальные данные для быстрого отображения');
                this.renderCalendar();
            }
            
            // Проверяем доступность сервера
            const isServerAvailable = await this.checkServerHealth();
            
            if (isServerAvailable) {
                // Загружаем данные с сервера
                await this.loadFromServer();
                
                // Запускаем синхронизацию
                this.startSync();
                
                console.log('✅ CalendarManager: успешно подключен к серверу');
            } else {
                console.warn('⚠️ Сервер недоступен, работаем в оффлайн режиме');
                this.state.isOnline = false;
            }
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error.message);
            this.state.isOnline = false;
        }
        
        this.state.isInitialized = true;
        console.log('✅ CalendarManager: инициализация завершена');
    },

    // Проверка доступности сервера
    async checkServerHealth() {
        try {
            console.log('🔍 Проверка доступности сервера...');
            const response = await fetch(`${this.apiUrl}/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                // Добавляем timeout через AbortController
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                console.log('✅ Сервер доступен:', result.status);
                return true;
            }
            throw new Error('Сервер не отвечает корректно');
        } catch (error) {
            console.error('❌ Сервер недоступен:', error.message);
            return false;
        }
    },

    // Загрузка данных с сервера
    async loadFromServer(retry = 0) {
        try {
            console.log('📥 Загрузка данных с сервера...');
            
            const response = await fetch(`${this.apiUrl}/calendar?t=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && this.validateData(result.data)) {
                // Проверяем, какие данные новее
                const serverData = result.data;
                const localData = this.data;
                
                if (serverData.lastModified > localData.lastModified) {
                    console.log('🔄 Данные на сервере новее, загружаем с сервера');
                    this.data = serverData;
                } else if (localData.lastModified > serverData.lastModified) {
                    console.log('💾 Наши данные новее, отправляем на сервер');
                    await this.saveToServer();
                } else {
                    console.log('⚖️ Данные синхронизированы');
                }
                
                this.state.lastServerCheck = Date.now();
                this.state.isOnline = true;
                this.state.retryCount = 0;
                
                // Всегда сохраняем актуальные данные локально
                this.saveLocalFallback();
                
                console.log('✅ Данные синхронизированы с сервером');
                
                // Обновляем интерфейс
                this.renderCalendar();
                this.renderBirthdaysThisMonth();
                
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
            return false;
        }
    },

    // Сохранение данных на сервер
    async saveToServer(retry = 0) {
        if (this.state.isSyncing) {
            console.log('⏳ Уже идет синхронизация, пропускаем...');
            return false;
        }
        
        this.state.isSyncing = true;
        
        try {
            console.log('📤 Сохранение данных на сервер...');
            
            const response = await fetch(`${this.apiUrl}/calendar`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(this.data),
                signal: AbortSignal.timeout(15000)
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
                
                console.log('✅ Данные успешно сохранены на сервер');
                console.log('📊 Ответ сервера:', result);
                
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

        console.log('🔄 Фоновая синхронизация запущена');
    },

    async syncWithServer() {
        try {
            const response = await fetch(`${this.apiUrl}/calendar?t=${Date.now()}`, {
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) return;
            
            const result = await response.json();
            
            if (result.success && this.validateData(result.data)) {
                if (result.data.lastModified > this.data.lastModified) {
                    console.log('🔄 Обнаружены новые данные на сервере');
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
        try {
            return data &&
                typeof data === 'object' &&
                typeof data.events === 'object' &&
                typeof data.vacations === 'object' &&
                typeof data.lastModified === 'number' &&
                typeof data.version === 'number';
        } catch (error) {
            console.error('❌ Ошибка валидации данных:', error);
            return false;
        }
    },

    getUserId() {
        if (window.Telegram && Telegram.WebApp) {
            return Telegram.WebApp.initDataUnsafe.user?.id?.toString();
        }
        return 'unknown';
    },

    // === ДНИ РОЖДЕНИЯ ===
    getBirthdaysForDate(dateKey) {
        try {
            return this.birthdays.filter(birthday => {
                const birthDate = new Date(birthday.date);
                const checkDate = this.parseDateKeyCorrect(dateKey);
                return birthDate.getMonth() === checkDate.getMonth() &&
                       birthDate.getDate() === checkDate.getDate();
            });
        } catch (error) {
            console.error('❌ Ошибка получения дней рождения:', error);
            return [];
        }
    },

    getBirthdaysForCurrentMonth() {
        try {
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
        } catch (error) {
            console.error('❌ Ошибка получения дней рождения месяца:', error);
            return [];
        }
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
        if (!calendarElement) {
            console.error('❌ Не найден элемент calendarGrid');
            return;
        }

        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

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
        if (this.data.events && this.data.events[correctDateKey]) {
            this.data.events[correctDateKey].forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'calendar-event-main';
                eventElement.style.backgroundColor = event.color || '#667eea';
                eventElement.title = `${event.name}\n${event.comment || 'Без комментария'}`;
                eventsContainer.appendChild(eventElement);
            });
        }

        // Отпуска
        if (this.data.vacations && this.data.vacations[correctDateKey]) {
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

        const closeModal = () => {
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };
        
        modal.querySelector('.calendar-modal-close').addEventListener('click', closeModal);
        modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { 
            if (e.target === modal) closeModal(); 
        });

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
            console.log('💾 Начало сохранения дежурств...');
            
            // Собираем выбранных людей
            const selectedPersons = [];
            document.querySelectorAll('#dutyTab .duty-person-item input[type="checkbox"]:checked').forEach(checkbox => {
                const personId = parseInt(checkbox.id.replace('person-', ''));
                const person = this.dutyPersons.find(p => p.id === personId);
                if (person) selectedPersons.push(person);
            });

            const comment = document.getElementById('eventComment')?.value.trim() || '';

            console.log(`📝 Сохраняем для ${datesToSave.length} дат, выбрано ${selectedPersons.length} человек`);

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
                    console.log(`📅 Дежурство на ${actualDateKey}:`, selectedPersons.map(p => p.name));
                } else {
                    delete this.data.events[actualDateKey];
                    console.log(`🗑️ Удалено дежурство на ${actualDateKey}`);
                }
            });

            // Обновляем timestamp
            this.data.lastModified = Date.now();
            this.data.version = (this.data.version || 0) + 1;
            
            console.log('💾 Данные обновлены локально');
            
            // Сохраняем локально сразу (важно для скорости)
            this.saveLocalFallback();
            
            console.log('💾 Локальное сохранение завершено');
            
            // Пытаемся сохранить на сервер
            let serverSaved = false;
            let serverError = null;
            
            if (this.state.isOnline) {
                try {
                    console.log('🌐 Пытаемся сохранить на сервер...');
                    serverSaved = await this.saveToServer();
                    
                    if (serverSaved) {
                        console.log('✅ Данные успешно отправлены на сервер');
                    } else {
                        console.warn('⚠️ Не удалось сохранить на сервер');
                        serverError = 'Не удалось подключиться к серверу';
                    }
                } catch (serverError) {
                    console.error('❌ Ошибка при отправке на сервер:', serverError);
                    serverError = serverError.message;
                }
            } else {
                console.log('📴 Сервер недоступен, сохраняем только локально');
            }
            
            // Обновляем отображение
            this.renderCalendar();
            console.log('🔄 Интерфейс обновлен');
            
            // Показываем результат
            if (serverSaved) {
                DialogService.showMessage(
                    '✅ Успех',
                    'График дежурств сохранен и синхронизирован с сервером',
                    'success'
                );
            } else if (serverError) {
                DialogService.showMessage(
                    '⚠️ Внимание',
                    `График дежурств сохранен локально, но возникла ошибка при синхронизации с сервером: ${serverError}`,
                    'warning'
                );
            } else {
                DialogService.showMessage(
                    '💾 Сохранено',
                    'График дежурств сохранен локально (работа в оффлайн режиме)',
                    'info'
                );
            }
            
        } catch (error) {
            console.error('❌ Критическая ошибка сохранения дежурств:', error);
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
            console.log('💾 Начало сохранения отпусков...');
            
            // Собираем выбранных людей
            const selectedPersons = [];
            document.querySelectorAll('#vacationTab .duty-person-item input[type="checkbox"]:checked').forEach(checkbox => {
                const personId = parseInt(checkbox.id.replace('vacation-person-', ''));
                const person = this.dutyPersons.find(p => p.id === personId);
                if (person) selectedPersons.push(person);
            });

            const comment = document.getElementById('vacationComment')?.value.trim() || '';

            console.log(`📝 Сохраняем отпуска для ${datesToSave.length} дат, выбрано ${selectedPersons.length} человек`);

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
                    console.log(`📅 Отпуск на ${actualDateKey}:`, selectedPersons.map(p => p.name));
                } else {
                    delete this.data.vacations[actualDateKey];
                    console.log(`🗑️ Удален отпуск на ${actualDateKey}`);
                }
            });

            // Обновляем timestamp
            this.data.lastModified = Date.now();
            this.data.version = (this.data.version || 0) + 1;
            
            console.log('💾 Данные обновлены локально');
            
            // Сохраняем локально сразу
            this.saveLocalFallback();
            
            console.log('💾 Локальное сохранение завершено');
            
            // Пытаемся сохранить на сервер
            let serverSaved = false;
            let serverError = null;
            
            if (this.state.isOnline) {
                try {
                    console.log('🌐 Пытаемся сохранить на сервер...');
                    serverSaved = await this.saveToServer();
                    
                    if (serverSaved) {
                        console.log('✅ Данные успешно отправлены на сервер');
                    } else {
                        console.warn('⚠️ Не удалось сохранить на сервер');
                        serverError = 'Не удалось подключиться к серверу';
                    }
                } catch (serverSaveError) {
                    console.error('❌ Ошибка при отправке на сервер:', serverSaveError);
                    serverError = serverSaveError.message;
                }
            } else {
                console.log('📴 Сервер недоступен, сохраняем только локально');
            }
            
            // Обновляем отображение
            this.renderCalendar();
            console.log('🔄 Интерфейс обновлен');
            
            // Показываем результат
            if (serverSaved) {
                DialogService.showMessage(
                    '✅ Успех',
                    'График отпусков сохранен и синхронизирован с сервером',
                    'success'
                );
            } else if (serverError) {
                DialogService.showMessage(
                    '⚠️ Внимание',
                    `График отпусков сохранен локально, но возникла ошибка при синхронизации с сервером: ${serverError}`,
                    'warning'
                );
            } else {
                DialogService.showMessage(
                    '💾 Сохранено',
                    'График отпусков сохранен локально (работа в оффлайн режиме)',
                    'info'
                );
            }
            
        } catch (error) {
            console.error('❌ Критическая ошибка сохранения отпусков:', error);
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
        try {
            const events = this.data.events[dateKey];
            if (!events || !Array.isArray(events)) return false;
            return events.some(event => event.id === personId);
        } catch (error) {
            console.error('❌ Ошибка проверки дежурства:', error);
            return false;
        }
    },

    isPersonOnVacation(dateKey, personId) {
        try {
            const vacations = this.data.vacations[dateKey];
            if (!vacations || !Array.isArray(vacations)) return false;
            return vacations.some(vacation => vacation.id === personId);
        } catch (error) {
            console.error('❌ Ошибка проверки отпуска:', error);
            return false;
        }
    },

    getEventComment(dateKey) {
        try {
            const events = this.data.events[dateKey];
            if (!events || !Array.isArray(events) || events.length === 0) return '';
            return events[0].comment || '';
        } catch (error) {
            console.error('❌ Ошибка получения комментария:', error);
            return '';
        }
    },

    getVacationComment(dateKey) {
        try {
            const vacations = this.data.vacations[dateKey];
            if (!vacations || !Array.isArray(vacations) || vacations.length === 0) return '';
            return vacations[0].comment || '';
        } catch (error) {
            console.error('❌ Ошибка получения комментария отпуска:', error);
            return '';
        }
    },

    handleWeekSelection(selectedDate) {
        try {
            const weekDates = this.getWeekDates(selectedDate);
            const dateKeys = weekDates.map(date => this.getDateKey(date));
            this.openEventModal(dateKeys[0], dateKeys);
        } catch (error) {
            console.error('❌ Ошибка выбора недели:', error);
        }
    },

    getWeekDates(date) {
        try {
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
        } catch (error) {
            console.error('❌ Ошибка расчета недели:', error);
            return [];
        }
    },

    parseDateKeyCorrect(dateKey) {
        try {
            const [year, month, day] = dateKey.split('-').map(Number);
            return new Date(year, month - 1, day);
        } catch (error) {
            console.error('❌ Ошибка парсинга даты:', error);
            return new Date();
        }
    },

    getDateKey(date) {
        try {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('❌ Ошибка создания ключа даты:', error);
            return '1970-01-01';
        }
    },

    // === МЕТОДЫ ДЛЯ ОТЛАДКИ ===
    async checkServerStatus() {
        try {
            console.log('🔍 Проверка статуса сервера...');
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
            console.log('📊 Запрос статистики...');
            const response = await fetch(`${this.apiUrl}/stats`);
            const result = await response.json();
            
            console.log('📈 Статистика:', result);
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
                eventsCount: Object.keys(this.data.events || {}).length,
                vacationsCount: Object.keys(this.data.vacations || {}).length,
                lastModified: this.data.lastModified ? new Date(this.data.lastModified).toLocaleString() : 'Нет данных',
                version: this.data.version || 0
            },
            state: {
                isOnline: this.state.isOnline,
                isSyncing: this.state.isSyncing,
                lastServerCheck: this.state.lastServerCheck ? new Date(this.state.lastServerCheck).toLocaleString() : 'Нет данных',
                retryCount: this.state.retryCount,
                selectionMode: this.state.selectionMode,
                isInitialized: this.state.isInitialized
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
        
        // 1. Проверяем локальные данные
        console.log('1. Локальные данные:', this.data);
        
        // 2. Проверяем состояние
        console.log('2. Состояние:', this.getDebugInfo());
        
        // 3. Проверяем сервер
        console.log('3. Проверка сервера...');
        const serverStatus = await this.checkServerStatus();
        console.log('   Статус сервера:', serverStatus);
        
        // 4. Проверяем статистику
        if (serverStatus.success) {
            const stats = await this.getStats();
            console.log('   Статистика:', stats);
        }
        
        // 5. Обновляем отображение
        this.renderCalendar();
        
        console.log('✅ Тестирование завершено');
    },
    
    // Синхронизация вручную
    async manualSync() {
        try {
            console.log('🔄 Ручная синхронизация...');
            
            DialogService.showLoading('Синхронизация с сервером...');
            
            const wasOnline = this.state.isOnline;
            await this.loadFromServer();
            
            if (this.state.isOnline && wasOnline) {
                DialogService.showMessage(
                    '✅ Синхронизация',
                    'Данные успешно синхронизированы с сервером',
                    'success'
                );
            } else if (this.state.isOnline && !wasOnline) {
                DialogService.showMessage(
                    '🌐 Подключение',
                    'Соединение с сервером восстановлено, данные синхронизированы',
                    'success'
                );
            } else {
                DialogService.showMessage(
                    '⚠️ Оффлайн',
                    'Сервер недоступен, используем локальные данные',
                    'warning'
                );
            }
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            DialogService.showMessage(
                '❌ Ошибка',
                'Не удалось синхронизировать данные: ' + error.message,
                'error'
            );
        }
    }
};

// Добавляем AbortSignal.timeout полифилл для старых браузеров
if (!AbortSignal.timeout) {
    AbortSignal.timeout = function(ms) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms);
        return controller.signal;
    };
}

// Экспортируем глобально
if (typeof window !== 'undefined') {
    window.CalendarManager = CalendarManager;
}