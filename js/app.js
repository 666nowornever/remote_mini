// Основная инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Приложение запускается...');
    
    try {
        // Инициализируем авторизацию (теперь асинхронно)
        const accessGranted = await Auth.initialize();
        
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

// Инициализация обработчиков событий (остается без изменений)
function initializeEventHandlers() {
    // Обработчики для элементов списка (делегирование событий)
    document.addEventListener('click', function(e) {
        const serverItem = e.target.closest('.server-item');
        if (serverItem) {
            const serverName = serverItem.querySelector('.server-name').textContent.trim();
            console.log(`Выбран сервер: ${serverName}`);
            
            // Обработка конкретных серверов
            if (serverName.includes('Кассы')) {
                // Навигация обрабатывается через onclick в HTML
                return;
            }
            
            // Здесь можно добавить логику для других серверов
            if (serverName.includes('ПК Менеджера')) {
                console.log('Обработка ПК Менеджера...');
                // Добавьте свою логику здесь
            }
        }
    });
}
