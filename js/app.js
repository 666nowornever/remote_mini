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

// Инициализация обработчиков событий (остается без изменений)
function initializeEventHandlers() {
    // ... существующий код
}
