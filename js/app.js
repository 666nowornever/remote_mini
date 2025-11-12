// Основная инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Приложение запускается...');
    
    try {
        // Показываем индикатор загрузки
        showLoadingIndicator();
        
        // Инициализируем авторизацию (теперь асинхронно)
        const accessGranted = await Auth.initialize();
        
        // Скрываем индикатор загрузки
        hideLoadingIndicator();
        
        if (accessGranted) {
            // Инициализируем все менеджеры
            await initializeManagers();
            
            // Загружаем главную страницу
            Navigation.showPage('main');
            
            // Инициализируем обработчики событий
            initializeEventHandlers();
            
            // Инициализируем ERP обработчик
            ERPHandler.initialize();
            
            console.log('✅ Приложение успешно инициализировано');
            
            // Финальная проверка систем
            setTimeout(() => {
                performFinalSystemCheck();
            }, 5000);
            
        } else {
            console.log('❌ Доступ запрещен');
        }
    } catch (error) {
        // Скрываем индикатор загрузки в случае ошибки
        hideLoadingIndicator();
        
        console.error('💥 Критическая ошибка при инициализации:', error);
        
        // Показываем сообщение об ошибке
        DialogService.showMessage(
            '❌ Ошибка запуска',
            'Не удалось запустить приложение. Пожалуйста, попробуйте позже.\n\n' +
            'Если проблема повторяется, обратитесь в поддержку.',
            'error'
        );
    }
});

// Инициализация всех менеджеров
async function initializeManagers() {
    console.log('🔄 Инициализация менеджеров...');
    
    // Список менеджеров для инициализации в правильном порядке
    const managers = [
        {
            name: 'PCManager',
            instance: PCManager,
            init: () => PCManager.init(),
            dependencies: []
        },
        {
            name: 'PrinterManager',
            instance: PrinterManager,
            init: () => PrinterManager.init(),
            dependencies: []
        },
        {
            name: 'CashServerManager',
            instance: CashServerManager,
            init: () => CashServerManager.init(),
            dependencies: []
        },
        {
            name: 'ServicesManager',
            instance: ServicesManager,
            init: () => ServicesManager.init(),
            dependencies: []
        },
        {
            name: 'TelegramService',
            instance: TelegramService,
            init: () => TelegramService.init(),
            dependencies: []
        },
        {
            name: 'MessageScheduler',
            instance: MessageScheduler,
            init: () => MessageScheduler.init(),
            dependencies: ['TelegramService']
        },
        {
            name: 'CalendarManager',
            instance: CalendarManager,
            init: () => CalendarManager.init(),
            dependencies: ['MessageScheduler']
        },
        {
            name: 'ScheduledMessagesManager',
            instance: ScheduledMessagesManager,
            init: () => ScheduledMessagesManager.init(),
            dependencies: ['MessageScheduler']
        }
    ];

    // Инициализируем менеджеры последовательно
    for (const manager of managers) {
        await initializeManager(manager);
    }
    
    console.log('✅ Все менеджеры инициализированы');
    
    // Запускаем отложенные задачи после инициализации всех менеджеров
    startDelayedTasks();
}

// Инициализация отдельного менеджера
async function initializeManager(manager) {
    const { name, instance, init, dependencies } = manager;
    
    // Проверяем зависимости
    const missingDeps = dependencies.filter(dep => typeof window[dep] === 'undefined');
    if (missingDeps.length > 0) {
        console.warn(`⚠️ ${name}: пропущен, отсутствуют зависимости: ${missingDeps.join(', ')}`);
        return;
    }
    
    if (typeof instance !== 'undefined' && init) {
        try {
            await init();
            console.log(`✅ ${name} инициализирован`);
            
            // Специальная обработка для CalendarManager
            if (name === 'CalendarManager' && CalendarManager.scheduleBirthdaysWithCheck) {
                setTimeout(() => {
                    console.log('🎂 Запуск планирования дней рождения...');
                    CalendarManager.scheduleBirthdaysWithCheck();
                }, 2000);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка инициализации ${name}:`, error);
        }
    } else {
        console.warn(`⚠️ ${name}: не доступен для инициализации`);
    }
}

// Запуск отложенных задач
function startDelayedTasks() {
    console.log('🔄 Запуск отложенных задач...');
    
    // Принудительная проверка MessageScheduler через 3 секунды
    setTimeout(() => {
        if (typeof MessageScheduler !== 'undefined') {
            console.log('🔍 Принудительная проверка MessageScheduler...');
            MessageScheduler.forceSendOverdueMessages();
            
            // Проверяем статус планировщика
            const status = MessageScheduler.getSchedulerStatus();
            console.log('📊 Статус MessageScheduler:', status);
        }
    }, 3000);
    
    // Проверка дней рождения через 10 секунд
    setTimeout(() => {
        if (typeof CalendarManager !== 'undefined' && CalendarManager.checkScheduledBirthdays) {
            console.log('🔍 Проверка запланированных дней рождения...');
            CalendarManager.checkScheduledBirthdays();
        }
    }, 10000);
    
    // Периодическая проверка каждые 5 минут
    setInterval(() => {
        if (typeof MessageScheduler !== 'undefined') {
            console.log('🔄 Периодическая проверка MessageScheduler...');
            MessageScheduler.checkScheduledMessages();
        }
    }, 5 * 60 * 1000); // 5 минут
}

// Финальная проверка систем
function performFinalSystemCheck() {
    console.log('🔧 Финальная проверка систем...');
    
    const systems = [
        { name: 'Navigation', check: () => typeof Navigation !== 'undefined' },
        { name: 'DialogService', check: () => typeof DialogService !== 'undefined' },
        { name: 'ERPHandler', check: () => typeof ERPHandler !== 'undefined' },
        { name: 'TelegramService', check: () => typeof TelegramService !== 'undefined' && TelegramService.config?.botToken },
        { name: 'MessageScheduler', check: () => typeof MessageScheduler !== 'undefined' && MessageScheduler.isInitialized },
        { name: 'CalendarManager', check: () => typeof CalendarManager !== 'undefined' }
    ];
    
    let allSystemsOk = true;
    
    systems.forEach(system => {
        const isOk = system.check();
        console.log(`${isOk ? '✅' : '❌'} ${system.name}: ${isOk ? 'OK' : 'FAIL'}`);
        if (!isOk) allSystemsOk = false;
    });
    
    if (allSystemsOk) {
        console.log('🎉 Все системы работают корректно!');
    } else {
        console.warn('⚠️ Некоторые системы требуют внимания');
        
        // Показываем предупреждение только если критичные системы не работают
        const criticalSystems = ['Navigation', 'DialogService', 'ERPHandler'];
        const criticalFailures = systems.filter(s => 
            criticalSystems.includes(s.name) && !s.check()
        );
        
        if (criticalFailures.length > 0) {
            DialogService.showMessage(
                '⚠️ Предупреждение системы',
                `Некоторые компоненты не загружены:\n${criticalFailures.map(s => s.name).join(', ')}\n\nПриложение может работать с ограничениями.`,
                'warning'
            );
        }
    }
}

// Показать индикатор загрузки
function showLoadingIndicator() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
}

// Скрыть индикатор загрузки
function hideLoadingIndicator() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// Инициализация обработчиков событий
function initializeEventHandlers() {
    console.log('🔄 Инициализация обработчиков событий...');
    
    // Обработчики для элементов списка (делегирование событий)
    document.addEventListener('click', function(e) {
        const serverItem = e.target.closest('.server-item');
        if (serverItem) {
            const serverName = serverItem.querySelector('.server-name').textContent.trim();
            console.log(`Выбран сервер: ${serverName}`);
        }
        
        // Обработка кнопки календаря
        const calendarBtn = e.target.closest('.calendar-floating-btn');
        if (calendarBtn && typeof CalendarManager !== 'undefined') {
            e.preventDefault();
            CalendarManager.showCalendar();
        }
        
        // Обработка кнопки запланированных сообщений
        const scheduleBtn = e.target.closest('.schedule-floating-btn');
        if (scheduleBtn && typeof ScheduledMessagesManager !== 'undefined') {
            e.preventDefault();
            ScheduledMessagesManager.showScheduledMessages();
        }
    });
    
    // Глобальные горячие клавиши
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+C - открыть календарь
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            if (typeof CalendarManager !== 'undefined') {
                CalendarManager.showCalendar();
            }
        }
        
        // Ctrl+Shift+M - открыть запланированные сообщения
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
            e.preventDefault();
            if (typeof ScheduledMessagesManager !== 'undefined') {
                ScheduledMessagesManager.showScheduledMessages();
            }
        }
        
        // Escape - закрыть модальные окна
        if (e.key === 'Escape') {
            const modal = document.querySelector('.calendar-modal-overlay, .dialog-overlay');
            if (modal) {
                modal.remove();
            }
        }
    });
    
    // Обработка изменения видимости страницы (для возобновления планировщика)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && typeof MessageScheduler !== 'undefined') {
            console.log('🔍 Страница активна, проверка сообщений...');
            setTimeout(() => {
                MessageScheduler.checkScheduledMessages();
            }, 1000);
        }
    });
    
    console.log('✅ Обработчики событий инициализированы');
}

// Глобальные утилиты для отладки
window.debugApp = function() {
    console.log('🔧 Отладка приложения:');
    console.log('=== СИСТЕМНЫЕ ПЕРЕМЕННЫЕ ===');
    console.log('Navigation:', typeof Navigation !== 'undefined' ? '✅' : '❌');
    console.log('DialogService:', typeof DialogService !== 'undefined' ? '✅' : '❌');
    console.log('ERPHandler:', typeof ERPHandler !== 'undefined' ? '✅' : '❌');
    console.log('TelegramService:', typeof TelegramService !== 'undefined' ? '✅' : '❌');
    console.log('MessageScheduler:', typeof MessageScheduler !== 'undefined' ? '✅' : '❌');
    console.log('CalendarManager:', typeof CalendarManager !== 'undefined' ? '✅' : '❌');
    
    if (typeof MessageScheduler !== 'undefined') {
        console.log('=== MESSAGE SCHEDULER ===');
        console.log('Статус:', MessageScheduler.getSchedulerStatus());
        console.log('Сообщения:', MessageScheduler.getAllMessages().length);
        MessageScheduler.debugScheduledMessages();
    }
    
    if (typeof CalendarManager !== 'undefined') {
        console.log('=== CALENDAR MANAGER ===');
        CalendarManager.debugAllSystems();
    }
};

// Перезапуск планировщика
window.restartScheduler = function() {
    if (typeof MessageScheduler !== 'undefined') {
        console.log('🔄 Перезапуск MessageScheduler...');
        MessageScheduler.startScheduler();
        MessageScheduler.forceSendOverdueMessages();
        return '✅ Планировщик перезапущен';
    } else {
        return '❌ MessageScheduler не доступен';
    }
};

// Проверка дней рождения
window.checkBirthdays = function() {
    if (typeof CalendarManager !== 'undefined') {
        console.log('🔍 Проверка дней рождения...');
        CalendarManager.checkScheduledBirthdays();
        return '✅ Проверка завершена';
    } else {
        return '❌ CalendarManager не доступен';
    }
};