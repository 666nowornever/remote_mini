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
                Navigation.showPage('cash-registers');
                return;
            }
            
            if (serverName.includes('ПК Менеджера')) {
                console.log('🖥️ Переход к списку ПК менеджера...');
                Navigation.showPage('manager-pcs');
                return;
            }
            
            if (serverName.includes('Музыкальный моноблок')) {
                console.log('🎵 Переход к списку музыкальных моноблоков...');
                Navigation.showPage('music-pcs');
                return;
            }
            
            // Здесь можно добавить логику для других серверов
            if (serverName.includes('Сервис принтер')) {
                console.log('🖨️ Обработка сервис принтера...');
                // Добавьте свою логику здесь
            }
        }
    });
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
