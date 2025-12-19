// Менеджер календаря дежурств с серверной синхронизацией
const CalendarManager = {
    // === КОНФИГУРАЦИЯ ===
    apiUrl: 'https://remote-api-calendar.onrender.com/api',
    syncInterval: 30000, // 30 секунд
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
        isInitialized: false,
        isLoading: false
    },

    // === ИНИЦИАЛИЗАЦИЯ ===
    async init() {
        console.log('🔄 CalendarManager: инициализация...');
        
        if (this.state.isInitialized) {
            console.log('✅ CalendarManager уже инициализирован');
            return;
        }
        
        // Устанавливаем состояние загрузки
        this.state.isLoading = true;
        
        try {
            // Сначала загружаем локальные данные для быстрого отображения
            const hasLocalData = this.loadLocalFallback();
            console.log('📱 Локальные данные загружены:', hasLocalData);
            
            // Проверяем сервер
            const isServerAvailable = await this.checkServerHealth();
            console.log('🌐 Сервер доступен:', isServerAvailable);
            
            if (isServerAvailable) {
                this.state.isOnline = true;
                // Загружаем данные с сервера
                await this.loadFromServer();
                // Запускаем фоновую синхронизацию
                this.startSync();
            } else {
                this.state.isOnline = false;
                console.warn('⚠️ Сервер недоступен, работаем в оффлайн режиме');
            }
            
        } catch (error) {
            console.error('❌ Ошибка при инициализации:', error);
            this.state.isOnline = false;
        } finally {
            this.state.isLoading = false;
            this.state.isInitialized = true;
            
            // В любом случае рендерим календарь
            this.renderCalendar();
            this.renderBirthdaysThisMonth();
            this.initializeCalendarHandlers();
            
            console.log('✅ CalendarManager инициализирован');
            console.log('📊 Состояние:', {
                eventsCount: Object.keys(this.data.events).length,
                vacationsCount: Object.keys(this.data.vacations).length,
                isOnline: this.state.isOnline,
                lastModified: new Date(this.data.lastModified).toLocaleString()
            });
        }
    },

    // Проверка сервера
    async checkServerHealth() {
        try {
            console.log('🔍 Проверка сервера...');
            
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
            console.log('✅ Сервер отвечает:', result.message);
            return true;
            
        } catch (error) {
            console.log('❌ Сервер недоступен:', error.name === 'AbortError' ? 'Таймаут' : error.message);
            return false;
        }
    },

    // Загрузка данных с сервера
    async loadFromServer(retry = 0) {
        if (retry > 0) {
            console.log(`🔄 Повторная попытка ${retry}/${this.maxRetries}...`);
        }
        
        try {
            console.log('📥 Загрузка данных с сервера...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
            
            const response = await fetch(`${this.apiUrl}/calendar?t=${Date.now()}`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error('Неуспешный ответ сервера');
            }
            
            if (!this.validateData(result.data)) {
                throw new Error('Неверный формат данных от сервера');
            }
            
            // Сравниваем с локальными данными
            if (result.data.lastModified > this.data.lastModified) {
                console.log('📥 Данные на сервере новее, обновляем');
                this.data = result.data;
            } else if (this.data.lastModified > result.data.lastModified) {
                console.log('📤 Наши данные новее, отправляем на сервер');
                await this.saveToServer();
            } else {
                console.log('⚖️ Данные синхронизированы');
            }
            
            this.saveLocalFallback();
            this.state.retryCount = 0;
            console.log('✅ Данные успешно загружены');
            
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error.message);
            
            if (retry < this.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000 * (retry + 1)));
                return this.loadFromServer(retry + 1);
            }
            
            this.state.retryCount++;
            return false;
        }
    },

    // Сохранение на сервер
    async saveToServer(retry = 0) {
        if (this.state.isSyncing) {
            console.log('⏳ Уже идет синхронизация, пропускаем...');
            return false;
        }
        
        this.state.isSyncing = true;
        
        try {
            console.log('📤 Сохранение данных на сервер...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
            
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Ошибка сервера');
            }
            
            // Обновляем метаданные
            this.data.lastModified = result.lastModified;
            this.data.version = result.version;
            
            console.log('✅ Данные успешно сохранены на сервер');
            console.log('📊 Ответ сервера:', result);
            
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error.message);
            
            if (retry < this.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000 * (retry + 1)));
                return this.saveToServer(retry + 1);
            }
            
            return false;
        } finally {
            this.state.isSyncing = false;
        }
    },

    // Фоновая синхронизация
    startSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        
        this.syncTimer = setInterval(async () => {
            if (this.state.isOnline && !this.state.isSyncing && !this.state.isLoading) {
                try {
                    await this.syncWithServer();
                } catch (error) {
                    // Тихая ошибка в фоне
                }
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
                console.log('🔄 Обнаружены новые данные на сервере');
                this.data = result.data;
                this.saveLocalFallback();
                this.renderCalendar();
            }
        } catch (error) {
            // Тихая ошибка
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
                    console.log('✅ Локальные данные загружены из backup');
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

    // === РЕНДЕРИНГ КАЛЕНДАРЯ ===
    renderCalendar() {
        const calendarElement = document.getElementById('calendarGrid');
        if (!calendarElement) {
            console.error('❌ Не найден элемент calendarGrid');
            return;
        }

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

        // Рассчитываем первый день календаря
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        // День недели первого дня месяца (0 - воскресенье, 1 - понедельник, ...)
        const firstDayWeekday = firstDayOfMonth.getDay();
        
        // Корректируем для нашего календаря (понедельник - первый день недели)
        let startOffset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
        
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startOffset);

        const today = new Date();
        let currentDate = new Date(startDate);

        // Создаем 42 ячейки (6 недель) для стабильного отображения
        for (let i = 0; i < 42; i++) {
            const dateKey = this.getDateKey(currentDate);
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = this.isSameDate(currentDate, today);

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
        
        if (isToday) {
            dayElement.classList.add('today');
        }
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }

        const correctDateKey = this.getDateKey(date);
        dayElement.dataset.date = correctDateKey;

        // Проверяем выходной или праздничный день
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = this.holidays.includes(correctDateKey);
        if (isWeekend || isHoliday) {
            dayElement.classList.add('holiday');
        }

        // Номер дня
        const dayNumberElement = document.createElement('div');
        dayNumberElement.className = 'calendar-day-number-main';
        dayNumberElement.textContent = dayNumber;
        dayElement.appendChild(dayNumberElement);

        // Контейнер для событий
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-day-events-main';

        // Дежурства
        if (this.data.events && this.data.events[correctDateKey]) {
            this.data.events[correctDateKey].forEach(event => {
                if (event && event.name) {
                    const eventElement = document.createElement('div');
                    eventElement.className = 'calendar-event-main';
                    eventElement.style.backgroundColor = event.color || '#667eea';
                    eventElement.title = `${event.name}\n${event.comment || 'Без комментария'}`;
                    eventsContainer.appendChild(eventElement);
                }
            });
        }

        // Отпуска
        if (this.data.vacations && this.data.vacations[correctDateKey]) {
            const vacationContainer = document.createElement('div');
            vacationContainer.className = 'calendar-vacation-container';
            
            this.data.vacations[correctDateKey].forEach(vacation => {
                if (vacation && vacation.name) {
                    const vacationElement = document.createElement('div');
                    vacationElement.className = 'calendar-vacation-main';
                    vacationElement.style.backgroundColor = vacation.color || '#ff6b6b';
                    vacationElement.title = `Отпуск: ${vacation.name}\n${vacation.comment || ''}`;
                    vacationContainer.appendChild(vacationElement);
                }
            });
            
            if (vacationContainer.children.length > 0) {
                eventsContainer.appendChild(vacationContainer);
            }
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

        // Добавляем контейнер событий в день
        if (eventsContainer.children.length > 0) {
            dayElement.appendChild(eventsContainer);
        }

        // Обработчик клика
        dayElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleDayClick(correctDateKey);
        });

        return dayElement;
    },

    // === ДНИ РОЖДЕНИЯ ===
    getBirthdaysForDate(dateKey) {
        try {
            const checkDate = this.parseDateKey(dateKey);
            return this.birthdays.filter(birthday => {
                try {
                    const birthDate = new Date(birthday.date);
                    return birthDate.getMonth() === checkDate.getMonth() &&
                           birthDate.getDate() === checkDate.getDate();
                } catch (error) {
                    console.error('❌ Ошибка обработки дня рождения:', birthday, error);
                    return false;
                }
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
                try {
                    const birthDate = new Date(birthday.date);
                    const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
                    return birthdayThisYear.getMonth() === currentMonth;
                } catch (error) {
                    console.error('❌ Ошибка обработки дня рождения:', birthday, error);
                    return false;
                }
            }).sort((a, b) => {
                try {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return (dateA.getMonth() * 100 + dateA.getDate()) - 
                           (dateB.getMonth() * 100 + dateB.getDate());
                } catch (error) {
                    return 0;
                }
            });
        } catch (error) {
            console.error('❌ Ошибка получения дней рождения месяца:', error);
            return [];
        }
    },

    renderBirthdaysThisMonth() {
        const birthdaysContainer = document.getElementById('birthdaysThisMonth');
        if (!birthdaysContainer) {
            console.log('❌ Не найден элемент birthdaysThisMonth');
            return;
        }
        
        const birthdays = this.getBirthdaysForCurrentMonth();
        
        if (birthdays.length === 0) {
            birthdaysContainer.innerHTML = `
                <div class="no-birthdays">
                    <div class="birthday-icon">🎂</div>
                    <p>В этом месяце дней рождения нет</p>
                </div>
            `;
            return;
        }

        let birthdaysHTML = '<div class="birthdays-list">';
        
        birthdays.forEach(birthday => {
            try {
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
            } catch (error) {
                console.error('❌ Ошибка рендеринга дня рождения:', birthday, error);
            }
        });
        
        birthdaysHTML += '</div>';
        birthdaysContainer.innerHTML = birthdaysHTML;
    },

    // === НАВИГАЦИЯ ===
    initializeCalendarHandlers() {
        console.log('🔄 Инициализация обработчиков календаря...');
        
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
        
        console.log('✅ Обработчики календаря инициализированы');
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
    handleDayClick(dateKey) {
        console.log('📅 Клик по дню:', dateKey);
        this.openEventModal(dateKey);
    },

    openEventModal(dateKey) {
        const date = this.parseDateKey(dateKey);
        const dateString = date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Проверяем, не открыто ли уже модальное окно
        if (document.querySelector('.calendar-modal-overlay')) {
            return;
        }
        
        // Создаем HTML модального окна
        const modalHTML = `
            <div class="calendar-modal-overlay">
                <div class="calendar-modal">
                    <div class="calendar-modal-header">
                        <h3>${dateString}</h3>
                        <button class="calendar-modal-close">&times;</button>
                    </div>
                    <div class="calendar-modal-content">
                        <div class="modal-tabs">
                            <button class="tab-btn active" data-tab="duty">Дежурство</button>
                            <button class="tab-btn" data-tab="vacation">Отпуск</button>
                        </div>
                        
                        <div class="tab-content active" id="dutyTab">
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
                        
                        <div class="tab-content" id="vacationTab" style="display: none;">
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
            </div>
        `;
        
        // Добавляем модальное окно в DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        const modal = document.querySelector('.calendar-modal-overlay');
        
        // Обработчики событий
        const closeModal = () => {
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };
        
        // Закрытие по клику на крестик
        modal.querySelector('.calendar-modal-close').addEventListener('click', closeModal);
        
        // Закрытие по клику на отмену
        modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
        
        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Переключение табов
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Скрываем все табы
                modal.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                
                // Убираем активный класс у всех кнопок
                modal.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                });
                
                // Показываем выбранный таб
                const tabId = btn.dataset.tab + 'Tab';
                document.getElementById(tabId).style.display = 'block';
                btn.classList.add('active');
            });
        });
        
        // Сохранение
        modal.querySelector('.btn-save').addEventListener('click', async () => {
            const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
            
            try {
                if (activeTab === 'duty') {
                    await this.saveDutyEvent([dateKey]);
                } else {
                    await this.saveVacationEvent([dateKey]);
                }
                
                closeModal();
                this.showNotification('✅ Изменения сохранены');
                
            } catch (error) {
                console.error('❌ Ошибка сохранения:', error);
                this.showNotification('❌ Ошибка сохранения', 'error');
            }
        });
    },

    async saveDutyEvent(datesToSave) {
        try {
            // Получаем активное модальное окно
            const modal = document.querySelector('.calendar-modal-overlay');
            if (!modal) return;
            
            // Собираем выбранных людей
            const selectedPersons = [];
            modal.querySelectorAll('#dutyTab .duty-person-item input[type="checkbox"]:checked').forEach(checkbox => {
                const personId = parseInt(checkbox.id.replace('person-', ''));
                const person = this.dutyPersons.find(p => p.id === personId);
                if (person) selectedPersons.push(person);
            });
            
            const comment = modal.querySelector('#eventComment')?.value.trim() || '';
            
            // Обновляем данные
            datesToSave.forEach(date => {
                const actualDateKey = this.getDateKey(this.parseDateKey(date));
                
                if (selectedPersons.length > 0) {
                    this.data.events[actualDateKey] = selectedPersons.map(person => ({
                        id: person.id,
                        name: person.name,
                        color: person.color,
                        comment: comment
                    }));
                } else {
                    delete this.data.events[actualDateKey];
                }
            });
            
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
            
        } catch (error) {
            console.error('❌ Ошибка сохранения дежурства:', error);
            throw error;
        }
    },

    async saveVacationEvent(datesToSave) {
        try {
            // Получаем активное модальное окно
            const modal = document.querySelector('.calendar-modal-overlay');
            if (!modal) return;
            
            // Собираем выбранных людей
            const selectedPersons = [];
            modal.querySelectorAll('#vacationTab .duty-person-item input[type="checkbox"]:checked').forEach(checkbox => {
                const personId = parseInt(checkbox.id.replace('vacation-person-', ''));
                const person = this.dutyPersons.find(p => p.id === personId);
                if (person) selectedPersons.push(person);
            });
            
            const comment = modal.querySelector('#vacationComment')?.value.trim() || '';
            
            // Обновляем данные
            datesToSave.forEach(date => {
                const actualDateKey = this.getDateKey(this.parseDateKey(date));
                
                if (selectedPersons.length > 0) {
                    this.data.vacations[actualDateKey] = selectedPersons.map(person => ({
                        id: person.id,
                        name: person.name,
                        color: person.color,
                        comment: comment,
                        type: 'vacation'
                    }));
                } else {
                    delete this.data.vacations[actualDateKey];
                }
            });
            
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
            
        } catch (error) {
            console.error('❌ Ошибка сохранения отпуска:', error);
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

    parseDateKey(dateKey) {
        try {
            const [year, month, day] = dateKey.split('-').map(Number);
            return new Date(year, month - 1, day);
        } catch (error) {
            console.error('❌ Ошибка парсинга даты:', dateKey, error);
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
            console.error('❌ Ошибка создания ключа даты:', date, error);
            return '1970-01-01';
        }
    },

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    },

    showNotification(message, type = 'success') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `calendar-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            background: ${type === 'error' ? '#ff6b6b' : '#4CAF50'};
            color: white;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    },

    // === ПУБЛИЧНЫЕ МЕТОДЫ ===
    showCalendar() {
        // Проверяем, инициализирован ли менеджер
        if (!this.state.isInitialized) {
            console.log('⚠️ Менеджер не инициализирован, инициализируем...');
            this.init().then(() => {
                this.renderCalendar();
                this.renderBirthdaysThisMonth();
                this.initializeCalendarHandlers();
            });
        } else {
            this.renderCalendar();
            this.renderBirthdaysThisMonth();
            this.initializeCalendarHandlers();
        }
    },

    // Ручная синхронизация
    async manualSync() {
        try {
            console.log('🔄 Ручная синхронизация...');
            
            // Показываем индикатор загрузки
            this.showNotification('🔄 Синхронизация...');
            
            const isServerAvailable = await this.checkServerHealth();
            
            if (isServerAvailable) {
                await this.loadFromServer();
                this.showNotification('✅ Данные синхронизированы');
            } else {
                this.showNotification('⚠️ Сервер недоступен', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            this.showNotification('❌ Ошибка синхронизации', 'error');
        }
    },

    // Получить информацию для отладки
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
                isInitialized: this.state.isInitialized,
                isLoading: this.state.isLoading,
                currentDate: this.state.currentDate.toLocaleDateString()
            },
            config: {
                apiUrl: this.apiUrl,
                syncInterval: this.syncInterval
            }
        };
    }
};

// Добавляем полифилл для AbortSignal.timeout если его нет
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

console.log('📅 CalendarManager загружен');