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
        
        // Отладочная проверка кнопок
        setTimeout(() => {
            checkButtonsAvailability();
        }, 1000);
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
    
    // Отладочный обработчик для проверки кликов
    document.addEventListener('click', function(e) {
        console.log('🖱️ Клик по элементу:', e.target);
        console.log('🖱️ Closest .server-item:', e.target.closest('.server-item'));
        console.log('🖱️ Closest #erp-toggle-btn:', e.target.closest('#erp-toggle-btn'));
    });
}

// Функция проверки доступности кнопок
function checkButtonsAvailability() {
    const erpButton = document.getElementById('erp-toggle-btn');
    console.log('🔍 Проверка кнопок:');
    console.log('Кнопка ERP найдена:', !!erpButton);
    
    if (erpButton) {
        console.log('Кнопка ERP:', erpButton);
        console.log('Стили кнопки:', window.getComputedStyle(erpButton));
        console.log('Cursor стиль:', erpButton.style.cursor);
        
        // Проверяем обработчики событий
        erpButton.addEventListener('click', function() {
            console.log('🎯 Кнопка ERP кликнута напрямую!');
        });
    }
}

// Глобальная функция для ручной проверки
window.debugERPButton = function() {
    const erpButton = document.getElementById('erp-toggle-btn');
    if (erpButton) {
        console.log('✅ Кнопка ERP доступна');
        erpButton.style.border = '2px solid green';
    } else {
        console.log('❌ Кнопка ERP не найдена');
    }
};
