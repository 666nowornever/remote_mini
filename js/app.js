// Основная инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем авторизацию
    const accessGranted = Auth.initialize();
    
    if (accessGranted) {
        // Загружаем главную страницу
        Navigation.showPage('main');
        
        // Инициализируем обработчики событий
        initializeEventHandlers();
    }
});

// Инициализация обработчиков событий
function initializeEventHandlers() {
    // Обработчики для элементов списка (делегирование событий)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.server-item')) {
            const serverItem = e.target.closest('.server-item');
            const serverName = serverItem.querySelector('.server-name').textContent;
            console.log(`Выбран сервер: ${serverName}`);
            // Здесь можно добавить логику управления конкретным сервером
        }
    });
}
