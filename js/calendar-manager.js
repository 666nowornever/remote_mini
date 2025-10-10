// Менеджер календаря дежурств с real-time синхронизацией
const CalendarManager = {
    // === КОНФИГУРАЦИЯ СИНХРОНИЗАЦИИ ===
    syncConfig: {
        // URL вашего сервера на Render.com (ЗАМЕНИТЕ НА СВОЙ ПОСЛЕ ДЕПЛОЯ)
        wsUrl: 'wss://remote-api-calendar.onrender.com/ws',
        apiUrl: 'https://remote-api-calendar.onrender.com/api',
        reconnectInterval: 3000,
        maxReconnectAttempts: 5,
        syncInterval: 10000 // HTTP синхронизация каждые 10 сек
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
        // Новогодние каникулы (8 дней)
        '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08',
        // День защитника Отечества (3 дня)
        '2025-02-23', '2025-02-24', '2025-02-25',
        // Международный женский день (3 дня)
        '2025-03-08', '2025-03-09', '2025-03-10',
        // Праздник Весны и Труда (4 дня)
        '2025-04-29', '2025-04-30', '2025-05-01', '2025-05-02',
        // День Победы (3 дня)
        '2025-05-09', '2025-05-10', '2025-05-11',
        // День России (3 дня)
        '2025-06-11', '2025-06-12', '2025-06-13',
        // День народного единства (3 дня)
        '2025-11-01', '2025-11-02', '2025-11-03',
        // Новогодние каникулы (8 дней)
        '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08',
        // День защитника Отечества (3 дня)
        '2026-02-23', '2026-02-24', '2026-02-25',
        // Международный женский день (3 дня)
        '2026-03-08', '2026-03-09', '2026-03-10',
        // Праздник Весны и Труда (4 дня)
        '2026-04-30', '2026-05-01', '2026-05-02', '2026-05-03',
        // День Победы (3 дня)
        '2026-05-09', '2026-05-10', '2026-05-11',
        // День России (3 дня)
        '2026-06-12', '2026-06-13', '2026-06-14',
        // День народного единства (3 дня)
        '2026-11-01', '2026-11-02', '2026-11-03'
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

    // WebSocket
    ws: null,
    reconnectAttempts: 0,
    isConnected: false,
    httpSyncInterval: null,

    // === ИНИЦИАЛИЗАЦИЯ ===
    async init() {
        console.log('🔄 CalendarManager: инициализация...');
        
        // Загружаем локальные данные
        this.loadLocalData();
        
        // Инициализируем real-time синхронизацию
        this.initRealtimeSync();
        
        console.log('✅ CalendarManager: инициализация завершена');
    },

    // === REAL-TIME СИНХРОНИЗАЦИЯ ===

    // Инициализация WebSocket соединения
    initRealtimeSync() {
        try {
            console.log('🔗 Подключение к WebSocket...');
            this.ws = new WebSocket(this.syncConfig.wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.state.isOnline = true;
                this.updateSyncStatus('success', 'Синхронизировано в реальном времени');
                this.showConnectionStatus('connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket disconnected:', event.code, event.reason);
                this.isConnected = false;
                this.state.isOnline = false;
                this.showConnectionStatus('disconnected');
                this.handleReconnection();
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.isConnected = false;
                this.state.isOnline = false;
                this.showConnectionStatus('error');
            };

        } catch (error) {
            console.error('❌ Error initializing WebSocket:', error);
            this.fallbackToHTTPSync();
        }
    },

    // Обработка сообщений WebSocket
    handleWebSocketMessage(message) {
        console.log('📨 WebSocket message:', message.type);

        switch (message.type) {
            case 'INIT_DATA':
                // Первоначальные данные при подключении
                if (this.validateData(message.data)) {
                    this.handleRemoteUpdate(message.data, 'server');
                }
                break;

            case 'DATA_UPDATE':
                // Обновление данных от другого клиента
                if (this.validateData(message.data)) {
                    this.handleRemoteUpdate(message.data, 'client');
                }
                break;

            case 'UPDATE_CONFIRMED':
                // Подтверждение нашего обновления
                this.data.lastModified = message.lastModified;
                this.saveLocalData();
                console.log('✅ Изменения подтверждены сервером');
                this.updateSyncStatus('success', 'Сохранено');
                break;

            case 'HEARTBEAT':
                console.log('💓 Heartbeat, clients:', message.clients);
                break;

            case 'PONG':
                break;

            case 'ERROR':
                console.error('❌ Server error:', message.message);
                this.updateSyncStatus('error', message.message);
                break;
        }
    },

    // Обработка удаленного обновления
    handleRemoteUpdate(remoteData, source) {
        const localTimestamp = this.data.lastModified || 0;
        const remoteTimestamp = remoteData.lastModified || 0;

        // Если удаленные данные новее
        if (remoteTimestamp > localTimestamp) {
            const hadChanges = JSON.stringify(this.data) !== JSON.stringify(remoteData);
            
            this.data = remoteData;
            this.saveLocalData();
            
            if (hadChanges) {
                console.log(`🔄 Данные обновлены от ${source}`);
                this.updateSyncStatus('success', `Обновлено: ${new Date().toLocaleTimeString()}`);
                
                // Перерисовываем календарь если он открыт
                if (document.getElementById('calendarGrid')) {
                    this.renderCalendar();
                }
                
                // Показываем уведомление о изменении от другого пользователя
                if (source === 'client') {
                    this.showChangeNotification();
                }
            }
        } else {
            console.log('📊 Локальные данные актуальнее');
        }
    },

    // Отправка обновления на сервер через WebSocket
    sendUpdateToServer() {
        if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'DATA_UPDATE',
                data: this.data,
                timestamp: Date.now()
            }));
            console.log('📤 Sent update via WebSocket');
            return true;
        }
        return false;
    },

    // Переподключение при разрыве соединения
    handleReconnection() {
        if (this.reconnectAttempts < this.syncConfig.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Попытка переподключения ${this.reconnectAttempts}/${this.syncConfig.maxReconnectAttempts}`);
            
            this.updateSyncStatus('syncing', 'Переподключение...');
            this.showConnectionStatus('reconnecting');
            
            setTimeout(() => {
                this.initRealtimeSync();
            }, this.syncConfig.reconnectInterval);
        } else {
            console.log('❌ Превышено количество попыток переподключения');
            this.fallbackToHTTPSync();
        }
    },

    // Fallback на HTTP синхронизацию
    fallbackToHTTPSync() {
        console.log('🔄 Переход на HTTP синхронизацию');
        this.updateSyncStatus('warning', 'Режим HTTP синхронизации');
        this.showConnectionStatus('http');
        this.startHTTPSyncInterval();
    },

    // HTTP синхронизация - получение данных
    async syncViaHTTP() {
        try {
            console.log('📡 HTTP sync request...');
            const response = await fetch(`${this.syncConfig.apiUrl}/calendar?t=${Date.now()}`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && this.validateData(result.data)) {
                    this.handleRemoteUpdate(result.data, 'http');
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ HTTP sync error:', error);
        }
        return false;
    },

    // HTTP синхронизация - отправка данных
    async sendUpdateViaHTTP() {
        try {
            console.log('📤 HTTP update request...');
            const response = await fetch(`${this.syncConfig.apiUrl}/calendar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.data)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.data.lastModified = result.lastModified;
                    this.saveLocalData();
                    console.log('✅ HTTP update successful');
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ HTTP update error:', error);
        }
        return false;
    },

    // Запуск периодической HTTP синхронизации
    startHTTPSyncInterval() {
        // Останавливаем предыдущий интервал
        if (this.httpSyncInterval) {
            clearInterval(this.httpSyncInterval);
        }
        
        // Синхронизируем сразу
        this.syncViaHTTP();
        
        // Запускаем периодическую синхронизацию
        this.httpSyncInterval = setInterval(async () => {
            await this.syncViaHTTP();
        }, this.syncConfig.syncInterval);
    },

    // Показать статус соединения
    showConnectionStatus(status) {
        // Создаем или находим элемент статуса
        let statusElement = document.getElementById('connectionStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'connectionStatus';
            statusElement.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                z-index: 1000;
                background: rgba(0,0,0,0.8);
                color: white;
                font-weight: 500;
            `;
            document.body.appendChild(statusElement);
        }

        const statusConfig = {
            connected: { text: '🟢 Online', color: '#4CAF50' },
            disconnected: { text: '🔴 Offline', color: '#f44336' },
            reconnecting: { text: '🟡 Reconnecting...', color: '#ff9800' },
            error: { text: '🔴 Error', color: '#f44336' },
            http: { text: '🟠 HTTP Mode', color: '#ff9800' }
        };

        const config = statusConfig[status] || statusConfig.disconnected;
        statusElement.textContent = config.text;
        statusElement.style.background = config.color;
    },

    // === СИНХРОНИЗАЦИЯ ДАННЫХ ===

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

    // Валидация данных
    validateData(data) {
        return data && 
               typeof data === 'object' &&
               typeof data.events === 'object' &&
               typeof data.vacations === 'object' &&
               typeof data.lastModified === 'number' &&
               typeof data.version === 'number';
    },

    // Обновленный метод saveData
    async saveData() {
        // Сохраняем локально
        this.data.lastModified = Date.now();
        this.saveLocalData();
        
        // Пытаемся отправить через WebSocket
        let syncSuccess = this.sendUpdateToServer();
        
        // Если WebSocket не доступен, используем HTTP
        if (!syncSuccess) {
            syncSuccess = await this.sendUpdateViaHTTP();
        }
        
        if (syncSuccess) {
            console.log('✅ Данные сохранены и синхронизированы');
            this.updateSyncStatus('success', 'Сохранено');
        } else {
            console.log('💾 Данные сохранены локально (ошибка синхронизации)');
            this.updateSyncStatus('warning', 'Сохранено локально');
        }
    },

    // Ручная синхронизация
    async manualSync() {
        if (this.state.isSyncing) {
            console.log('🔄 Синхронизация уже выполняется...');
            return false;
        }

        this.state.isSyncing = true;
        this.updateSyncStatus('syncing', 'Ручная синхронизация...');

        try {
            let success = false;
            
            if (this.isConnected) {
                // Пробуем WebSocket синхронизацию
                success = await this.syncViaHTTP(); // HTTP для получения данных
            } else {
                // Только HTTP синхронизация
                success = await this.syncViaHTTP();
            }

            if (success) {
                this.updateSyncStatus('success', 'Синхронизировано');
            } else {
                this.updateSyncStatus('error', 'Ошибка синхронизации');
            }

            return success;
        } finally {
            this.state.isSyncing = false;
        }
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
    },

    // Обновление вида кнопки синхронизации
    updateSyncButton(status) {
        const syncBtn = document.getElementById('manualSyncBtn');
        if (!syncBtn) return;

        syncBtn.classList.remove('syncing', 'success', 'error', 'warning', 'offline');
        
        if (status !== 'success') {
            syncBtn.classList.add(status);
        }

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
    showCalendar() {
        Navigation.showPage('calendar');
    },

    loadCalendarPage() {
        this.renderCalendar();
        this.initializeCalendarHandlers();
        
        // Показываем статус соединения
        if (this.isConnected) {
            this.updateSyncStatus('success', 'Синхронизировано в реальном времени');
        } else {
            this.updateSyncStatus(this.state.isOnline ? 'success' : 'offline', 
                               this.state.isOnline ? 'Синхронизировано' : 'Локальные данные');
        }
    },

    renderCalendar: function() {
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
        
        // Находим первый день для отображения (может быть из предыдущего месяца)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + (firstDay.getDay() === 0 ? -6 : 1));
        
        // Находим последний день для отображения (может быть из следующего месяца)
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (7 - lastDay.getDay()) - (lastDay.getDay() === 0 ? 0 : 1));
        
        const today = new Date();
        let currentDate = new Date(startDate);

        // Заполняем все 35 ячейки (5 недель)
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

    // Создание элемента дня для новой структуры
    createMainDayElement: function(date, dateKey, dayNumber, isToday) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day-main';
        if (isToday) {
            dayElement.classList.add('today');
        }
        dayElement.dataset.date = dateKey;

        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = this.holidays.includes(dateKey);
        if (isWeekend || isHoliday) dayElement.classList.add('holiday');

        const dayNumberElement = document.createElement('div');
        dayNumberElement.className = 'calendar-day-number-main';
        dayNumberElement.textContent = dayNumber;
        dayElement.appendChild(dayNumberElement);

        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-day-events-main';

        // Дежурства
        if (this.data.events[dateKey]) {
            this.data.events[dateKey].forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'calendar-event-main';
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
                vacationElement.className = 'calendar-vacation-main';
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
    
    let dateString;
    if (isWeekMode) {
        // Для недельного режима
        const firstDate = this.parseDateKey(weekDates[0]);
        const lastDate = this.parseDateKey(weekDates[6]);
        dateString = `${firstDate.toLocaleDateString('ru-RU')} - ${lastDate.toLocaleDateString('ru-RU')}`;
    } else {
        // Для дневного режима - исправляем отображение даты
        const date = this.parseDateKey(dateKey);
        dateString = date.toLocaleDateString('ru-RU');
        
        // Отладочная информация
        console.log('📅 Открытие модального окна:', {
            dateKey: dateKey,
            parsedDate: date.toISOString(),
            localDate: date.toLocaleDateString('ru-RU'),
            localTime: date.toLocaleTimeString('ru-RU')
        });
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
        DialogService.showMessage('❌ Ошибка', 'Пожалуйста, введите сообщение для отправки', 'error');
        return;
    }

    if (!eventTime) {
        DialogService.showMessage('❌ Ошибка', 'Пожалуйста, укажите время отправки', 'error');
        return;
    }

    datesToSave.forEach(date => {
        const eventDateTime = this.createDateTime(date, eventTime);
        
        if (!eventDateTime) {
            DialogService.showMessage('❌ Ошибка', 'Неверный формат даты или времени', 'error');
            return;
        }

        this.scheduleTelegramMessage(eventDateTime, eventMessage);
    });

    // Только одно уведомление об успешном сохранении
    DialogService.showMessage('✅ Успех', 'Событие запланировано', 'success');
},

    
    createDateTime(dateString, timeString) {
        try {
            // Создаем базовую дату из строки
            const date = new Date(dateString + 'T00:00:00');
            
            if (isNaN(date.getTime())) {
                console.error('❌ Неверный формат даты:', dateString);
                return null;
            }

            // Разбираем время (формат HH:MM)
            const [hours, minutes] = timeString.split(':').map(Number);
            
            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                console.error('❌ Неверный формат времени:', timeString);
                return null;
            }

            // Устанавливаем время
            date.setHours(hours, minutes, 0, 0);
            
            console.log('📅 Создана дата:', {
                input: `${dateString} ${timeString}`,
                result: date.toISOString(),
                local: date.toLocaleString('ru-RU')
            });

            return date.getTime(); // Возвращаем timestamp

        } catch (error) {
            console.error('❌ Ошибка создания даты:', error);
            return null;
        }
    },

    
   scheduleTelegramMessage(eventTimestamp, message, chatId = null) {
    const now = Date.now();
    
    if (eventTimestamp <= now) {
        DialogService.showMessage(
            '❌ Ошибка', 
            'Указанное время уже прошло. Выберите будущее время.',
            'error'
        );
        return null;
    }

    if (!message || message.trim().length === 0) {
        DialogService.showMessage(
            '❌ Ошибка', 
            'Введите текст сообщения для отправки.',
            'error'
        );
        return null;
    }

    try {
        const messageId = MessageScheduler.scheduleMessage(
            eventTimestamp, 
            message.trim(), 
            chatId,
            {
                type: 'calendar_event',
                dateTime: new Date(eventTimestamp).toISOString(),
                source: 'calendar'
            }
        );

        return messageId;

    } catch (error) {
        console.error('❌ Ошибка планирования сообщения:', error);
        DialogService.showMessage(
            '❌ Ошибка', 
            'Не удалось запланировать сообщение. Попробуйте снова.',
            'error'
        );
        return null;
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
    // Гарантируем корректный формат даты
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
},

parseDateKey(dateKey) {
    // Надежный парсинг даты с учетом часового пояса
    const [year, month, day] = dateKey.split('-').map(Number);
    
    // Создаем дату с явным указанием локального времени
    // Используем полдень чтобы избежать проблем с переходом на летнее время
    const date = new Date(year, month - 1, day, 12, 0, 0);
    
    return date;
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