// Основная инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Приложение запускается...');
    
    try {
        // Показываем индикатор загрузки
        showLoadingIndicator();
        
        // Инициализируем авторизацию
        const accessGranted = await Auth.initialize();
        
        console.log('🔐 Результат авторизации:', accessGranted);
        
        // Скрываем индикатор загрузки
        hideLoadingIndicator();
        
        if (accessGranted) {
            // Инициализируем все менеджеры с обработкой ошибок
            await initializeManagers();
            
            // Загружаем главную страницу
            Navigation.showPage('main');
            
            // Инициализируем обработчики событий
            initializeEventHandlers();
            
            console.log('✅ Приложение успешно инициализировано');
            
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
            'Ошибка: ' + error.message,
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
            name: 'MessageScheduler', 
            instance: MessageScheduler,
            init: () => MessageScheduler.init(),
            optional: true
        },

        {
            name: 'PCManager',
            instance: PCManager,
            init: () => PCManager.init(),
            optional: false
        },
        {
            name: 'PrinterManager',
            instance: PrinterManager,
            init: () => PrinterManager.init(),
            optional: false
        },
        {
            name: 'CashServerManager',
            instance: CashServerManager,
            init: () => CashServerManager.init(),
            optional: false
        },
        {
            name: 'ServicesManager',
            instance: ServicesManager,
            init: () => ServicesManager.init(),
            optional: false
        },
        {
            name: 'TelegramService',
            instance: TelegramService,
            init: () => TelegramService.init(),
            optional: true
        },
        {
            name: 'CalendarManager',
            instance: CalendarManager,
            init: () => CalendarManager.init(),
            optional: true
        }
    ];

    // Инициализируем менеджеры последовательно
    for (const manager of managers) {
        try {
            await initializeManager(manager);
        } catch (error) {
            console.error(`❌ Ошибка инициализации ${manager.name}:`, error);
            if (!manager.optional) {
                throw error;
            }
        }
    }
    
    console.log('✅ Все менеджеры инициализированы');
}

// Инициализация отдельного менеджера
async function initializeManager(manager) {
    const { name, instance, init, optional } = manager;
    
    if (typeof instance === 'undefined') {
        if (optional) {
            console.warn(`⚠️ ${name}: пропущен (опциональный компонент)`);
            return;
        } else {
            throw new Error(`Обязательный компонент ${name} не загружен`);
        }
    }
    
    if (typeof init === 'function') {
        await init();
        console.log(`✅ ${name} инициализирован`);
    } else {
        console.warn(`⚠️ ${name}: метод init не найден`);
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
    
    // Обработчики для элементов списка
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
    });
    
    console.log('✅ Обработчики событий инициализированы');
}