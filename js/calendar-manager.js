// Менеджер календаря дежурств с real-time синхронизацией и днями рождения
const CalendarManager = {
    // === КОНФИГУРАЦИЯ СИНХРОНИЗАЦИИ ===
    syncConfig: {
        wsUrl: 'wss://remote-api-calendar.onrender.com/ws',
        apiUrl: 'https://remote-api-calendar.onrender.com/api',
        reconnectInterval: 3000,
        maxReconnectAttempts: 5,
        syncInterval: 10000
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

    // Дни рождения (хранятся в коде)
    birthdays: [
        // Поздравление в чат в 07:30
        {
            id: 1,
            name: 'Васильев Иван',
            date: '2025-01-09',
            type: 'congratulation',
            message: '🎉 Поздравляем @drmw1kr с днем рождения! 🎂'
        },
        {
            id: 2,
            name: 'Преображенский Дмитрий',
            date: '2025-02-13',
            type: 'congratulation',
            message: '🎉 Поздравляем @DPreobrazhensky с днем рождения! 🎂'
        },
        {
            id: 3,
            name: 'Кремнев Андрей',
            date: '2025-09-03',
            type: 'congratulation',
            message: '🎉 Поздравляем @i666nowornever с днем рождения! 🎂'
        },
        {
            id: 4,
            name: 'Солохин Вячеслав',
            date: '2025-11-07',
            type: 'congratulation',
            message: '🎉 Поздравляем @agent_instigator с днем рождения! 🎂'
        },
        {
            id: 5,
            name: 'Тихонов Никита',
            date: '2025-12-25',
            type: 'congratulation',
            message: '🎉 Поздравляем @darkwellx с днем рождения! 🎂'
        },
        // Просто уведомление в 10:00
        {
            id: 6,
            name: 'Дяблов Алексей',
            date: '2025-01-06',
            type: 'notification',
            message: '📅 Сегодня день рождения у Дяблова А.'
        },
        {
            id: 7,
            name: 'Винковский Алексей',
            date: '2025-01-28',
            type: 'notification',
            message: '📅 Сегодня день рождения у Винковского А.'
        },
        {
            id: 8,
            name: 'Сиворин Михаил',
            date: '2025-02-09',
            type: 'notification',
            message: '📅 Сегодня день рождения у Сиворина М.'
        },
        {
            id: 9,
            name: 'Кунаев Николай',
            date: '2025-05-24',
            type: 'notification',
            message: '📅 Сегодня день рождения у Кунаева Н.'
        },
        {
            id: 10,
            name: 'Нуриахметов Вадим',
            date: '2025-07-09',
            type: 'notification',
            message: '📅 Сегодня день рождения у Нуриахметова В.'
        },
        {
            id: 11,
            name: 'Волков Дмитрий',
            date: '2025-09-05',
            type: 'notification',
            message: '📅 Сегодня день рождения у Волкова Д.'
        },
        {
            id: 12,
            name: 'Чупеткин Иван',
            date: '2025-10-28',
            type: 'notification',
            message: '📅 Сегодня день рождения у Чупеткина И.'
        }
    ],

    // Праздничные дни
    holidays: [
        '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08',
        '2025-02-23', '2025-02-24', '2025-02-25',
        '2025-03-08', '2025-03-09', '2025-03-10',
        '2025-04-29', '2025-04-30', '2025-05-01', '2025-05-02',
        '2025-05-09', '2025-05-10', '2025-05-11',
        '2025-06-11', '2025-06-12', '2025-06-13',
        '2025-11-01', '2025-11-02', '2025-11-03',
        '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08',
        '2026-02-23', '2026-02-24', '2026-02-25',
        '2026-03-08', '2026-03-09', '2026-03-10',
        '2026-04-30', '2026-05-01', '2026-05-02', '2026-05-03',
        '2026-05-09', '2026-05-10', '2026-05-11',
        '2026-06-12', '2026-06-13', '2026-06-14',
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
        // Планируем дни рождения
        this.scheduleBirthdays();
        console.log('✅ CalendarManager: инициализация завершена');
    },

    // === ДНИ РОЖДЕНИЯ ===
    // Планирование дней рождения
   // Планирование дней рождения
scheduleBirthdays() {
    console.log('🎂 Планирование дней рождения...');
    const now = new Date();
    const currentYear = now.getFullYear();
    
    this.birthdays.forEach(birthday => {
        // Создаем дату дня рождения в текущем году
        const birthDate = new Date(birthday.date);
        const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

        // Если день рождения уже прошел в этом году, планируем на следующий год
        if (birthdayThisYear < now) {
            birthdayThisYear.setFullYear(currentYear + 1);
        }

        // Устанавливаем время отправки
        const sendTime = birthday.type === 'congratulation' ? '07:30' : '10:00';
        const [hours, minutes] = sendTime.split(':').map(Number);
        const sendDateTime = new Date(birthdayThisYear);
        sendDateTime.setHours(hours, minutes, 0, 0);

        console.log(`📅 ${birthday.name}: ${birthdayThisYear.toLocaleDateString('ru-RU')} в ${sendTime}`);

        // Планируем сообщение
        this.scheduleBirthdayMessage(birthday, sendDateTime.getTime());
    });
},

    
   // Планирование сообщения о дне рождения
scheduleBirthdayMessage(birthday, timestamp) {
    // ПРОВЕРКА: Убедимся что MessageScheduler доступен
    if (typeof MessageScheduler === 'undefined') {
        console.error('❌ MessageScheduler не доступен для планирования дня рождения');
        return;
    }
    // Проверяем, не запланировано ли уже это сообщение
    const existingMessages = MessageScheduler.getAllMessages();
    const alreadyScheduled = existingMessages.some(msg =>
        msg.eventData?.type === 'birthday' &&
        msg.eventData?.birthdayId === birthday.id &&
        new Date(msg.timestamp).getFullYear() === new Date(timestamp).getFullYear()
    );

    if (!alreadyScheduled) {
        // ИСПРАВЛЕНИЕ: Корректируем timestamp для правильного часового пояса
        const correctedTimestamp = this.correctTimezoneForBirthday(timestamp, birthday.type);
        
        MessageScheduler.scheduleMessage(
            correctedTimestamp,
            birthday.message,
            null,
            {
                type: 'birthday',
                birthdayId: birthday.id,
                birthdayName: birthday.name,
                birthdayType: birthday.type
            }
        );
        
        console.log(`🎂 Запланировано сообщение для ${birthday.name} на ${new Date(correctedTimestamp).toLocaleString('ru-RU')}`);
    }
},

// НОВЫЙ МЕТОД: Коррекция часового пояса для дней рождения
correctTimezoneForBirthday(timestamp, birthdayType) {
    const date = new Date(timestamp);
    
    // Устанавливаем правильное время (07:30 для поздравлений, 10:00 для уведомлений)
    const sendTime = birthdayType === 'congratulation' ? '07:30' : '10:00';
    const [hours, minutes] = sendTime.split(':').map(Number);
    
    // Создаем дату в правильном часовом поясе
    const correctedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
    
    return correctedDate.getTime();
},

    // Получить дни рождения на конкретную дату
    getBirthdaysForDate(dateKey) {
        return this.birthdays.filter(birthday => {
            const birthDate = new Date(birthday.date);
            const checkDate = new Date(dateKey);
            return birthDate.getMonth() === checkDate.getMonth() &&
                   birthDate.getDate() === checkDate.getDate();
        });
    },

    // Получить дни рождения в текущем месяце
    getBirthdaysForCurrentMonth() {
        const currentMonth = this.state.currentDate.getMonth();
        const currentYear = this.state.currentDate.getFullYear();
        
        return this.birthdays.filter(birthday => {
            const birthDate = new Date(birthday.date);
            // Создаем дату в текущем году для сравнения
            const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
            return birthdayThisYear.getMonth() === currentMonth;
        }).sort((a, b) => {
            // Сортируем по дате
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return (dateA.getMonth() * 100 + dateA.getDate()) - (dateB.getMonth() * 100 + dateB.getDate());
        });
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
                this.handleReconnection();
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.isConnected = false;
                this.state.isOnline = false;
            };

        } catch (error) {
            console.error('❌ Error initializing WebSocket:', error);
            this.fallbackToHTTPSync();
        }
    },

    // Обработка сообщений WebSocket
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'INIT_DATA':
                if (this.validateData(message.data)) {
                    this.handleRemoteUpdate(message.data, 'server');
                }
                break;
            case 'DATA_UPDATE':
                if (this.validateData(message.data)) {
                    this.handleRemoteUpdate(message.data, 'client');
                }
                break;
            case 'UPDATE_CONFIRMED':
                this.data.lastModified = message.lastModified;
                this.saveLocalData();
                this.updateSyncStatus('success', 'Сохранено');
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

        if (remoteTimestamp > localTimestamp) {
            const hadChanges = JSON.stringify(this.data) !== JSON.stringify(remoteData);
            this.data = remoteData;
            this.saveLocalData();

            if (hadChanges) {
                this.updateSyncStatus('success', `Обновлено: ${new Date().toLocaleTimeString()}`);
                if (document.getElementById('calendarGrid')) {
                    this.renderCalendar();
                }
            }
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
            return true;
        }
        return false;
    },

    // Переподключение при разрыве соединения
    handleReconnection() {
        if (this.reconnectAttempts < this.syncConfig.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.updateSyncStatus('syncing', 'Переподключение...');
            
            setTimeout(() => {
                this.initRealtimeSync();
            }, this.syncConfig.reconnectInterval);
        } else {
            this.fallbackToHTTPSync();
        }
    },

    // Fallback на HTTP синхронизацию
    fallbackToHTTPSync() {
        this.updateSyncStatus('warning', 'Режим HTTP синхронизации');
        this.startHTTPSyncInterval();
    },

    // HTTP синхронизация - получение данных
    async syncViaHTTP() {
        try {
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
        if (this.httpSyncInterval) {
            clearInterval(this.httpSyncInterval);
        }

        this.syncViaHTTP();
        this.httpSyncInterval = setInterval(async () => {
            await this.syncViaHTTP();
        }, this.syncConfig.syncInterval);
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
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки локальных данных:', error);
        }

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
        this.data.lastModified = Date.now();
        this.saveLocalData();

        let syncSuccess = this.sendUpdateToServer();
        if (!syncSuccess) {
            syncSuccess = await this.sendUpdateViaHTTP();
        }

        if (syncSuccess) {
            this.updateSyncStatus('success', 'Сохранено');
        } else {
            this.updateSyncStatus('warning', 'Сохранено локально');
        }
    },

    // Ручная синхронизация
    async manualSync() {
        if (this.state.isSyncing) {
            return false;
        }

        this.state.isSyncing = true;
        this.updateSyncStatus('syncing', 'Ручная синхронизация...');

        try {
            let success = false;
            if (this.isConnected) {
                success = await this.syncViaHTTP();
            } else {
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
        this.renderBirthdaysThisMonth();

        if (this.isConnected) {
            this.updateSyncStatus('success', 'Синхронизировано в реальном времени');
        } else {
            this.updateSyncStatus(this.state.isOnline ? 'success' : 'offline',
                this.state.isOnline ? 'Синхронизировано' : 'Локальные данные');
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

   // Создание элемента дня для новой структуры
createMainDayElement(date, dateKey, dayNumber, isToday, isOtherMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day-main';
    
    if (isToday) {
        dayElement.classList.add('today');
    }
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }

    // ИСПРАВЛЕНИЕ: Сохраняем корректный dateKey
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

    // Дежурства (используем корректный dateKey)
    if (this.data.events[correctDateKey]) {
        this.data.events[correctDateKey].forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'calendar-event-main';
            eventElement.style.backgroundColor = event.color;
            eventElement.title = `${event.person}\n${event.comment || 'Без комментария'}`;
            eventsContainer.appendChild(eventElement);
        });
    }

   

    // Дни рождения (используем корректный dateKey)
    const birthdays = this.getBirthdaysForDate(correctDateKey);
    if (birthdays.length > 0) {
        const birthdayElement = document.createElement('div');
        birthdayElement.className = 'calendar-birthday-emoji';
        birthdayElement.textContent = '🎂';
        birthdayElement.title = `Дни рождения: ${birthdays.map(b => b.name).join(', ')}`;
        eventsContainer.appendChild(birthdayElement);
    }

     // Отпуска (используем корректный dateKey)
    if (this.data.vacations[correctDateKey]) {
        const vacationContainer = document.createElement('div');
        vacationContainer.className = 'calendar-vacation-container';
        
        this.data.vacations[correctDateKey].forEach(vacation => {
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
            // ИСПРАВЛЕНИЕ: передаем корректный dateKey
            this.openEventModal(correctDateKey);
        } else {
            this.handleWeekSelection(date);
        }
    });

    return dayElement;
},

    // Рендер блока с днями рождения в текущем месяце
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
        // Для недельного режима
        const firstDate = this.parseDateKeyCorrect(weekDates[0]);
        const lastDate = this.parseDateKeyCorrect(weekDates[6]);
        dateString = `${firstDate.toLocaleDateString('ru-RU')} - ${lastDate.toLocaleDateString('ru-RU')}`;
    } else {
        // ИСПРАВЛЕНИЕ: создаем дату напрямую из dateKey без преобразований
        const date = this.parseDateKeyCorrect(dateKey);
        dateString = date.toLocaleDateString('ru-RU');
        actualDateKey = this.getDateKey(date); // Пересоздаем корректный dateKey
    }

    const modal = this.createModal(dateString, actualDateKey, weekDates);
    document.body.appendChild(modal);
    this.initializeModalHandlers(modal, actualDateKey, weekDates);
},

// НОВЫЙ МЕТОД: Корректный парсинг dateKey без проблем с часовым поясом
parseDateKeyCorrect(dateKey) {
    // Разбиваем dateKey на компоненты и создаем дату в локальном времени
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
},

// ОБНОВЛЕННЫЙ МЕТОД: Создание dateKey из даты
getDateKey(date) {
    // Создаем строку в формате YYYY-MM-DD без времени
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

        DialogService.showMessage('✅ Успех', 'Событие запланировано', 'success');
    },

   createDateTime(dateString, timeString) {
    try {
        // ИСПРАВЛЕНИЕ: создаем дату в локальном времени с правильным часовым поясом
        const [year, month, day] = dateString.split('-').map(Number);
        const [hours, minutes] = timeString.split(':').map(Number);
        
        // Создаем дату с указанным временем в локальном часовом поясе
        const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
        
        if (isNaN(date.getTime())) {
            return null;
        }

        return date.getTime();
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

// ОБНОВЛЕННЫЙ МЕТОД: Создание dateKey из даты
getDateKey(date) {
    // Создаем строку в формате YYYY-MM-DD без времени
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
},

// НОВЫЙ МЕТОД: Корректный парсинг dateKey без проблем с часовым поясом
parseDateKeyCorrect(dateKey) {
    // Разбиваем dateKey на компоненты и создаем дату в локальном времени
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
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

};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof CalendarManager !== 'undefined' && CalendarManager.init) {
        CalendarManager.init();
    }

});

