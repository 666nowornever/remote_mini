// Основная инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Приложение запускается...');
    
    try {
        // Показываем только основной индикатор
        showLoadingIndicator();
        
        // 1. Сначала авторизация (самое важное)
        const accessGranted = await Auth.initialize();
        
        if (!accessGranted) {
            console.log('❌ Доступ запрещен');
            hideLoadingIndicator();
            return;
        }
        
        // 2. Загружаем главную страницу сразу после авторизации
        Navigation.showPage('main');
        
        // 3. Скрываем индикатор загрузки (пользователь уже видит интерфейс)
        hideLoadingIndicator();
        
        // 4. Фоновая загрузка менеджеров
        setTimeout(() => {
            initializeManagersLazy();
        }, 100);
        
        // 5. Инициализируем обработчики событий
        initializeEventHandlers();
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        hideLoadingIndicator();
        console.error('💥 Критическая ошибка при инициализации:', error);
        
        DialogService.showMessage(
            '❌ Ошибка запуска',
            'Не удалось запустить приложение. Пожалуйста, попробуйте позже.\n\n' +
            'Ошибка: ' + error.message,
            'error'
        );
    }
});

// Ленивая инициализация менеджеров
async function initializeManagersLazy() {
    console.log('🔄 Фоновая инициализация менеджеров...');
    
    // Разделяем на критичные и некритичные менеджеры
    const criticalManagers = [
        { name: 'CashServerManager', instance: window.CashServerManager, optional: false },
        { name: 'ServicesManager', instance: window.ServicesManager, optional: false },
        { name: 'ERPHandler', instance: window.ERPHandler, optional: false },
        { name: 'CashManager', instance: window.CashManager, optional: false }
    ];
    
    const nonCriticalManagers = [
        { name: 'MessageScheduler', instance: window.MessageScheduler, optional: true },
        { name: 'TelegramService', instance: window.TelegramService, optional: true },
        { name: 'CalendarManager', instance: window.CalendarManager, optional: true },
        { name: 'PCManager', instance: window.PCManager, optional: true },
        { name: 'PrinterManager', instance: window.PrinterManager, optional: true }
    ];
    
    // Критичные менеджеры загружаем параллельно
    await Promise.allSettled(
        criticalManagers.map(manager => 
            initializeManagerSafe(manager)
        )
    );
    
    // Некритичные загружаем в фоне с задержкой
    setTimeout(() => {
        nonCriticalManagers.forEach(manager => {
            initializeManagerSafe(manager);
        });
    }, 500);
    
    console.log('✅ Менеджеры инициализированы в фоне');
}

// Безопасная инициализация с обработкой ошибок
async function initializeManagerSafe(manager) {
    const { name, instance, optional } = manager;
    
    if (typeof instance === 'undefined') {
        if (optional) {
            console.warn(`⚠️ ${name}: пропущен (опциональный компонент)`);
        } else {
            console.error(`❌ Обязательный компонент ${name} не загружен`);
        }
        return;
    }
    
    try {
        if (instance.init && typeof instance.init === 'function') {
            await instance.init();
            console.log(`✅ ${name} инициализирован`);
        } else if (instance.initialize && typeof instance.initialize === 'function') {
            await instance.initialize();
            console.log(`✅ ${name} инициализирован через initialize()`);
        }
    } catch (error) {
        console.error(`❌ Ошибка инициализации ${name}:`, error);
        if (!optional) {
            // Для некритичных ошибок только логируем
            if (optional) {
                console.warn(`⚠️ ${name}: ошибка, но компонент опциональный`);
            } else {
                throw error;
            }
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
    
    // Обработчики для элементов списка
    document.addEventListener('click', function(e) {
        const serverItem = e.target.closest('.server-item');
        if (serverItem) {
            const serverName = serverItem.querySelector('.server-name')?.textContent?.trim();
            if (serverName) {
                console.log(`Выбран сервер: ${serverName}`);
            }
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