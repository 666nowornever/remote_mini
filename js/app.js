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
            initializeManagers();
            
            // Загружаем главную страницу
            Navigation.showPage('main');
            
            // Инициализируем обработчики событий
            initializeEventHandlers();
            
            // Инициализируем ERP обработчик
            ERPHandler.initialize();
            
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
            'Если проблема повторяется, обратитесь в поддержку.',
            'error'
        );
    }
});

// Инициализация всех менеджеров
function initializeManagers() {
    console.log('🔄 Инициализация менеджеров...');
    
    // Инициализируем PCManager если он есть
    if (typeof PCManager !== 'undefined' && PCManager.init) {
        PCManager.init();
        console.log('✅ PCManager инициализирован');
    }
    
    // Инициализируем PrinterManager если он есть
    if (typeof PrinterManager !== 'undefined' && PrinterManager.init) {
        PrinterManager.init();
        console.log('✅ PrinterManager инициализирован');
    }
    
    // Инициализируем CashServerManager если он есть
    if (typeof CashServerManager !== 'undefined' && CashServerManager.init) {
        CashServerManager.init();
        console.log('✅ CashServerManager инициализирован');
    }

     // Инициализируем ServicesManager если он есть
    if (typeof ServicesManager !== 'undefined' && ServicesManager.init) {
        ServicesManager.init();
        console.log('✅ ServicesManager инициализирован');
    }
    
    console.log('✅ Все менеджеры инициализированы');
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
    // Обработчики для элементов списка (делегирование событий)
    document.addEventListener('click', function(e) {
        const serverItem = e.target.closest('.server-item');
        if (serverItem) {
            const serverName = serverItem.querySelector('.server-name').textContent.trim();
            console.log(`Выбран сервер: ${serverName}`);
        }
    });
}
