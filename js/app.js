// Основная инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Приложение запускается...');
    
    // Инициализируем авторизацию
    const accessGranted = Auth.initialize();
    
    if (accessGranted) {
        // Загружаем главную страницу
        Navigation.showPage('main');
        
        // Инициализируем обработчики событий
        initializeEventHandlers();
        
        // Инициализируем ERP обработчик
        ERPHandler.initialize();
    }
});

// Инициализация обработчиков событий
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
