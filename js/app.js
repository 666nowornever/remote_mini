// Основная инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    try {
        // Инициализируем авторизацию (асинхронно)
        const accessGranted = await Auth.initialize();
        
        if (accessGranted) {
            // Загружаем главную страницу
            Navigation.showPage('main');
            
            // Инициализируем обработчики событий
            initializeEventHandlers();
        }
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        Auth.showAccessDenied('Ошибка загрузки приложения');
    } finally {
        hideLoadingIndicator();
    }
});

// Показать индикатор загрузки
function showLoadingIndicator() {
    // Можно добавить индикатор загрузки если нужно
    console.log('🔄 Загрузка приложения...');
}

// Скрыть индикатор загрузки
function hideLoadingIndicator() {
    console.log('✅ Приложение загружено');
}

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
