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
        if (serverItem && serverItem.id !== 'erp-toggle-btn') {
            const serverName = serverItem.querySelector('.server-name').textContent;
            console.log(`Выбран сервер: ${serverName}`);
        }
    });
}
