// Обработчик операций с ERP системами
const ERPHandler = {
    // Инициализация обработчиков событий для ERP
    init: function() {
        console.log('🔄 ERPHandler: инициализация...');
        this.initialize();
        return true;
    },

    initialize: function() {
        console.log('🔄 Инициализация ERP обработчика...');
        
        // Используем делегирование событий на всем документе
        document.addEventListener('click', (e) => {
            const erpButton = e.target.closest('#erp-toggle-btn');
            if (erpButton) {
                console.log('🎯 Кнопка ERP найдена, обработка клика...');
                e.preventDefault();
                e.stopPropagation();
                this.handleERPToggle();
            }
        });

        // Также привязываемся при загрузке страницы
        this.bindERPButton();
        
        console.log('✅ ERP обработчики событий инициализированы');
        return true;
    },

    // Явная привязка кнопки ERP
    bindERPButton: function() {
        // Прямая привязка (для надежности)
        const erpButton = document.getElementById('erp-toggle-btn');
        if (erpButton) {
            console.log('🔗 Прямая привязка кнопки ERP');
            erpButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleERPToggle();
            });
        }
    },

    // Обработка переключения ERP сервисов
    async handleERPToggle() {
        console.log('🚀 Начало обработки ERP переключения...');
        
        // Проверяем, что кнопка существует
        const erpButton = document.getElementById('erp-toggle-btn');
        if (!erpButton) {
            console.error('❌ Кнопка ERP не найдена в DOM');
            DialogService.showMessage(
                '❌ Ошибка',
                'Кнопка управления ERP не найдена. Попробуйте обновить страницу.',
                'error'
            );
            return;
        }

        // Временно блокируем кнопку от повторных нажатий
        this.disableButton(erpButton);

        // Показываем индикатор загрузки
        const loadingDialog = DialogService.showLoading('Переключение регламентов ERP...');

        try {
            console.group('🚀 ERP Запрос запущен');
            
            // Выполняем запрос к API
            const result = await ApiService.toggleERPServices();
            
            console.groupEnd();
            
            // Закрываем индикатор загрузки
            loadingDialog.close();

            // Разблокируем кнопку
            this.enableButton(erpButton);

            // Парсим ответ и показываем результат
            this.showERPResult(result);

        } catch (error) {
            console.groupEnd();
            
            // Закрываем индикатор загрузки
            loadingDialog.close();

            // Разблокируем кнопку
            this.enableButton(erpButton);

            // Показываем детальную ошибку
            this.showDetailedError(error);
        }
    },

    // Блокировка кнопки
    disableButton: function(button) {
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
        button.style.pointerEvents = 'none';
    },

    // Разблокировка кнопки
    enableButton: function(button) {
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.pointerEvents = 'auto';
    },

    // Показать результат операции ERP
    showERPResult: function(result) {
        console.log('✅ ERP Response:', result);
        
        // Определяем статус на основе текста ответа
        const status = this.determineStatus(result);
        
        if (status === 'enabled') {
            DialogService.showMessage('✅ Включено', 'Регламенты ERP включены', 'success');
        } else if (status === 'disabled') {
            DialogService.showMessage('⏸️ Выключено', 'Регламенты ERP выключены', 'info');
        } 
    },

    // Определить статус из ответа
    determineStatus: function(result) {
        if (!result || !result.rawResponse) {
            return 'unknown';
        }

        const text = result.rawResponse.toLowerCase();
        
        // Ищем ключевые слова в ответе
        if (text.includes('включено') || text.includes('on') || text.includes('enabled')) {
            return 'enabled';
        } else if (text.includes('выключено') || text.includes('off') || text.includes('disabled') || text.includes('отключено')) {
            return 'disabled';
        }
        
        return 'unknown';
    },

    // Показать детальную ошибку
    showDetailedError: function(error) {
        console.error('💥 ERP Operation Error:', error);
        
        let title = '❌ Ошибка';
        let message = 'Произошла ошибка при переключении регламентов ERP.\n\n';
        
        if (error.message.includes('Failed to fetch')) {
            message += 'Сервер ERP недоступен. Проверьте:\n';
            message += '• Интернет соединение\n';
            message += '• Доступность сервера ERP\n';
            message += '• Настройки CORS на сервере';
        } else if (error.message.includes('403')) {
            message += 'Ошибка доступа (403). Возможно:\n';
            message += '• Неверный токен авторизации\n';
            message += '• Истек срок действия токена\n';
            message += '• Недостаточно прав';
        } else {
            message += 'Ошибка: ' + error.message;
        }
        
        message += '\n\nПодробности в консоли браузера (F12 → Console)';
        
        DialogService.showMessage(title, message, 'error');
    }
};

// Инициализация при загрузке
if (typeof window !== 'undefined') {
    window.ERPHandler = ERPHandler;
    
    // Также перехватываем загрузку страницы second-line
    document.addEventListener('DOMContentLoaded', function() {
        // Небольшая задержка для гарантии загрузки Navigation
        setTimeout(() => {
            if (window.Navigation) {
                const originalShowPage = Navigation.showPage;
                Navigation.showPage = function(pageId) {
                    originalShowPage.call(this, pageId);
                    
                    // После загрузки страницы second-line привязываем кнопку ERP
                    if (pageId === 'second-line') {
                        setTimeout(() => {
                            if (window.ERPHandler && ERPHandler.bindERPButton) {
                                ERPHandler.bindERPButton();
                            }
                        }, 300);
                    }
                };
            }
        }, 1000);
    });
}