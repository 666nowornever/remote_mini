// Менеджер календаря дежурств с полной синхронизацией через GitHub API
const CalendarManager = {
    // === КОНФИГУРАЦИЯ GITHUB API ===
    config: {
        // Настройки репозитория (замени на свои!)
        owner: '666nowornever', // Твой GitHub username
        repo: 'remote_mini', // Название твоего репозитория (обрати внимание на нижнее подчеркивание)
        path: 'data/calendar-data.json', // Путь к файлу
        branch: 'main',
        
        // URL для чтения данных (тот что видишь при нажатии raw)
        dataUrl: 'https://raw.githubusercontent.com/666nowornever/remote_mini/main/data/calendar-data.json',
        
        // Интервалы
        syncInterval: 30000, // 30 секунд
        maxRetries: 3,

        // Метод для проверки токена (добавь в класс CalendarManager)
        async testGitHubToken() {
        console.log('🔐 Тестирование GitHub токена...');
    
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${this.github.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Telegram-Mini-App'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ Токен валиден. Пользователь:', userData.login);
            return true;
        } else {
            console.error('❌ Токен невалиден. Статус:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка проверки токена:', error.message);
        return false;
    }
},
    },

    // === НАСТРОЙКИ GITHUB API ===
github: {
    // Твой GitHub Personal Access Token
    token: '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', // ← ВСТАВЬ СВОЙ ТОКЕН ЗДЕСЬ
    
    // GitHub API endpoints
    apiBase: 'https://api.github.com',
    get contentUrl() {
        return `${this.apiBase}/repos/${CalendarManager.config.owner}/${CalendarManager.config.repo}/contents/${CalendarManager.config.path}`;
    }
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
        isSyncing: false,
        retryCount: 0,
        lastSync: 0
    },

    // === ИНИЦИАЛИЗАЦИЯ ===
    async init() {
    console.log('🔄 CalendarManager: инициализация...');
    
    // Загружаем локальные данные
    this.loadLocalData();
    
    // Проверяем настройки GitHub
    if (!this.validateGitHubConfig()) {
        this.showGitHubConfigError();
        return;
    }
    
    // Тестируем токен
    const tokenValid = await this.testGitHubToken();
    if (!tokenValid) {
        this.updateSyncStatus('error', 'Неверный GitHub токен');
        return;
    }
    
    // Пробуем синхронизировать с сервером
    await this.syncFromServer();
    
    // Запускаем периодическую синхронизацию
    this.startSyncInterval();
    
    console.log('✅ CalendarManager: инициализация завершена');
},

    // === ПРОВЕРКА НАСТРОЕК GITHUB ===
    validateGitHubConfig() {
        if (!this.github.token || this.github.token === 'ghp_your_actual_token_here') {
            console.error('❌ GitHub token не настроен');
            return false;
        }
        
        if (!this.config.owner || this.config.owner === 'YOUR_GITHUB_USERNAME') {
            console.error('❌ GitHub owner не настроен');
            return false;
        }
        
        return true;
    },

    showGitHubConfigError() {
        console.error(`
⚠️ GitHub API не настроен!

Для работы синхронизации необходимо:

1. Создать GitHub Personal Access Token:
   - Зайди на GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Нажми "Generate new token" → "Generate new token (classic)"
   - Название: "Remote Mini App Sync"
   - Срок: "No expiration"
   - Права: выбери "repo" (полный доступ к репозиториям)
   - Скопируй токен

2. Обнови настройки в calendar-manager.js:
   - Замени 'ghp_your_actual_token_here' на свой токен
   - Убедись что owner и repo указаны правильно

Пока синхронизация отключена. Данные сохраняются только локально.
        `);
        
        this.updateSyncStatus('error', 'GitHub не настроен');
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

    // Синхронизация с сервером (чтение)
    async syncFromServer() {
        if (this.state.isSyncing) return false;
        if (this.state.retryCount >= this.config.maxRetries) {
            console.log('🔄 Превышено количество попыток синхронизации');
            return false;
        }

        this.state.isSyncing = true;
        this.updateSyncStatus('syncing', 'Синхронизация...');

        try {
            console.log('📡 Запрос данных с GitHub...');
            
            const response = await fetch(this.config.dataUrl + '?t=' + Date.now());
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('📁 Файл данных не найден на GitHub');
                    this.updateSyncStatus('warning', 'Файл не найден на GitHub');
                    return false;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const serverData = await response.json();
            console.log('📦 Получены данные с GitHub:', serverData);

            if (this.validateData(serverData)) {
                // Всегда используем данные с сервера (они более актуальные)
                const hadChanges = JSON.stringify(this.data) !== JSON.stringify(serverData);
                
                this.data = serverData;
                this.saveLocalData();
                
                console.log('✅ Данные синхронизированы с GitHub');
                this.state.isOnline = true;
                this.state.retryCount = 0;
                this.state.lastSync = Date.now();
                
                if (hadChanges) {
                    this.updateSyncStatus('success', `Обновлено: ${new Date().toLocaleTimeString()}`);
                    // Перерисовываем календарь если он открыт
                    if (document.getElementById('calendarGrid')) {
                        this.renderCalendar();
                    }
                } else {
                    this.updateSyncStatus('success', 'Синхронизировано');
                }
                
                return true;
            } else {
                throw new Error('Невалидные данные с GitHub');
            }

        } catch (error) {
            console.error('❌ Ошибка синхронизации с GitHub:', error.message);
            this.state.isOnline = false;
            this.state.retryCount++;
            
            if (error.message.includes('Failed to fetch')) {
                this.updateSyncStatus('offline', 'Нет подключения');
            } else {
                this.updateSyncStatus('error', `Ошибка: ${error.message}`);
            }
            
            return false;
        } finally {
            this.state.isSyncing = false;
        }
    },

    // Синхронизация на сервер (запись)
async syncToServer() {
    if (this.state.isSyncing) {
        console.log('🔄 Уже выполняется синхронизация...');
        return false;
    }

    this.state.isSyncing = true;
    this.updateSyncStatus('syncing', 'Отправка на GitHub...');

    try {
        console.log('📤 Отправка данных на GitHub...');
        
        // Сначала получаем текущий файл чтобы узнать sha
        const currentFile = await this.getCurrentFile();
        
        // Подготавливаем данные для отправки
        this.data.lastModified = Date.now();
        const content = JSON.stringify(this.data, null, 2);
        const contentEncoded = btoa(unescape(encodeURIComponent(content)));
        
        // Подготавливаем тело запроса
        const requestBody = {
            message: `Calendar update: ${new Date().toLocaleString()}`,
            content: contentEncoded,
            branch: this.config.branch
        };
        
        // Добавляем sha если файл существует
        if (currentFile?.sha) {
            requestBody.sha = currentFile.sha;
        }
        
        console.log('📦 Отправка запроса:', {
            url: this.github.contentUrl,
            method: 'PUT',
            hasSha: !!currentFile?.sha,
            contentLength: content.length
        });
        
        // Отправляем на GitHub
        const response = await fetch(this.github.contentUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.github.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Telegram-Mini-App'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📡 Ответ GitHub:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ GitHub API error:', errorText);
            
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { message: errorText };
            }
            
            throw new Error(`GitHub API: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Данные успешно отправлены на GitHub:', result);
        
        this.state.isOnline = true;
        this.state.retryCount = 0;
        this.state.lastSync = Date.now();
        this.updateSyncStatus('success', `Сохранено: ${new Date().toLocaleTimeString()}`);
        
        return true;

    } catch (error) {
        console.error('❌ Ошибка отправки на GitHub:', error.message);
        
        // Детальный анализ ошибки
        if (error.message.includes('401') || error.message.includes('Bad credentials')) {
            console.error('🔐 Ошибка аутентификации:');
            console.error('1. Проверь правильность GitHub токена');
            console.error('2. Убедись что токен имеет права repo');
            console.error('3. Убедись что токен не истек');
            this.updateSyncStatus('error', 'Ошибка аутентификации GitHub');
        } else if (error.message.includes('403')) {
            console.error('🚫 Ошибка доступа:');
            console.error('1. Проверь права токена');
            console.error('2. Убедись что репозиторий существует и доступен');
            this.updateSyncStatus('error', 'Нет доступа к репозиторию');
        } else if (error.message.includes('404')) {
            console.error('📁 Репозиторий не найден:');
            console.error('1. Проверь owner и repo в настройках');
            console.error('2. Убедись что репозиторий существует');
            this.updateSyncStatus('error', 'Репозиторий не найден');
        } else {
            console.error('🌐 Сетевая ошибка:', error.message);
            this.updateSyncStatus('warning', 'Сохранено локально (ошибка GitHub)');
        }
        
        // Сохраняем локально даже при ошибке
        this.saveLocalData();
        
        return false;
    } finally {
        this.state.isSyncing = false;
    }
},

    // Получение информации о текущем файле
    async getCurrentFile() {
        try {
            const response = await fetch(this.github.contentUrl, {
                headers: {
                    'Authorization': `token ${this.github.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.log('📁 Файл не найден или ошибка доступа');
            return null;
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
        if (this.state.isSyncing) {
            console.log('🔄 Синхронизация уже выполняется...');
            return false;
        }

        // Сначала загружаем свежие данные, потом отправляем наши
        const readSuccess = await this.syncFromServer();
        
        if (readSuccess) {
            // Если загрузка успешна, отправляем обратно (чтобы сохранить возможные локальные изменения)
            const writeSuccess = await this.syncToServer();
            return writeSuccess;
        }
        
        return false;
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

        // Обновляем кнопку синхронизации
        this.updateSyncButton(status);

        // Автоматически скрываем детали успешного статуса через 3 секунды
        if (status === 'success' && message.includes(':')) {
            setTimeout(() => {
                if (statusElement.className.includes('success')) {
                    this.updateSyncStatus('success', 'Синхронизировано');
                }
            }, 3000);
        }
    },

    // Обновление вида кнопки синхронизации
    updateSyncButton(status) {
        const syncBtn = document.getElementById('manualSyncBtn');
        if (!syncBtn) return;

        // Удаляем предыдущие классы статуса
        syncBtn.classList.remove('syncing', 'success', 'error', 'warning', 'offline');
        
        // Добавляем текущий статус
        if (status !== 'success') {
            syncBtn.classList.add(status);
        }

        // Обновляем иконку
        const icon = syncBtn.querySelector('i');
        if (icon) {
            icon.className = `fas fa-${this.getSyncIcon(status)}`;
        }
    },

    getSyncIcon(status) {
        const icons = {
            syncing: 'sync-alt fa-spin',
            success: 'cloud-check',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            offline: 'wifi-slash'
        };
        return icons[status] || 'cloud';
    },

    // === ОСНОВНЫЕ МЕТОДЫ КАЛЕНДАРЯ ===
    // (остальные методы остаются без изменений)
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
            } else if (activeTab === 'event') {
                this.saveChatEvent(datesToSave);
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

        this.updateSyncStatus('success', 'Событие запланировано');
    },

    // Сохранение данных с синхронизацией
    async saveData() {
        // Сохраняем локально
        this.data.lastModified = Date.now();
        this.saveLocalData();
        
        // Пытаемся синхронизировать с GitHub
        const syncSuccess = await this.syncToServer();
        
        if (syncSuccess) {
            console.log('✅ Данные сохранены и синхронизированы');
        } else {
            console.log('💾 Данные сохранены локально (ошибка синхронизации)');
        }
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
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof CalendarManager !== 'undefined' && CalendarManager.init) {
        CalendarManager.init();
    }

});
