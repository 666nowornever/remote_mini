// Обработчик операций с ERP системами
const ERPHandler = {
    // Инициализация обработчиков событий для ERP
    initialize: function() {
        console.log('🔄 Инициализация ERP обработчика...');
        this.bindEvents();
    },

    // Привязка событий
    bindEvents: function() {
        // Используем делегирование событий на всем документе
        document.addEventListener('click', (e) => {
            const erpButton = e.target.closest('#erp-toggle-btn');
            if (erpButton) {
                console.log('🎯 Кнопка ERP найдена, обработка клика...');
                this.handleERPToggle();
            }
        });

        console.log('✅ ERP обработчики событий инициализированы');
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
    disableButton(button) {
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
        button.style.pointerEvents = 'none';
    },

    // Разблокировка кнопки
    enableButton(button) {
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.pointerEvents = 'auto';
    },

    // Показать результат операции ERP
    showERPResult(result) {
        console.log('✅ ERP Response:', result);
        
        let title, message, type;

        if (result && typeof result === 'object') {
            if (result.status === 'enabled' || result.state === 'on' || result.rawResponse?.includes('включено')) {
                title = '✅ Включено';
                message = result.message || 'Регламенты ERP успешно включены';
                type = 'success';
            } else if (result.status === 'disabled' || result.state === 'off' || result.rawResponse?.includes('выключено')) {
                title = 'ℹ️ Выключено';
                message = result.message || 'Регламенты ERP успешно выключены';
                type = 'info';
            } else if (result.rawResponse) {
                title = '📊 Ответ от сервера';
                message = result.rawResponse;
                type = 'info';
            } else {
                title = '📊 Статус ERP';
                message = JSON.stringify(result, null, 2);
                type = 'info';
            }
        } else if (typeof result === 'string') {
            title = '📊 Ответ от сервера';
            message = result;
            type = 'info';
        } else {
            title = '📊 Статус ERP';
            message = 'Операция выполнена';
            type = 'info';
        }

        DialogService.showMessage(title, message, type);
    },

    // Показать детальную ошибку
    showDetailedError(error) {
        console.error('💥 ERP Operation Error:', error);
        
        let title = '❌ Ошибка';
        let message = '';
        let details = '';

        // Основное сообщение
        if (error.originalError) {
            message = error.message;
            details = this.formatErrorDetails(error.originalError, error.response);
        } else {
            message = error.message;
            details = this.formatErrorDetails(error);
        }

        // Добавляем предложения по решению
        const suggestions = this.getErrorSuggestions(error);

        const fullMessage = `${message}\n\n${details}\n\n💡 ${suggestions}`;

        DialogService.showMessage(title, fullMessage, 'error');
    },

    // Форматирование деталей ошибки
    formatErrorDetails(error, response) {
        let details = '🔍 Детали ошибки:\n';
        
        if (error.name) {
            details += `Тип: ${error.name}\n`;
        }
        
        if (response) {
            details += `\n📡 Ответ сервера:\n`;
            details += `Status: ${response.status} ${response.statusText}\n`;
            details += `URL: ${response.url}\n`;
        }
        
        // Добавляем информацию о CORS
        if (error.message.includes('CORS')) {
            details += `\n🌐 CORS информация:\n`;
            details += `Origin: ${window.location.origin}\n`;
            details += `Target: https://d.tomato-pizza.ru:44300\n`;
        }
        
        return details;
    },

    // Получить предложения по решению ошибки
    getErrorSuggestions(error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('cors')) {
            return 'Решение: Необходимо настроить CORS на сервере ERP или использовать прокси-сервер.';
        }
        
        if (errorMessage.includes('403')) {
            return 'Решение: Проверьте токен авторизации и права доступа. Токен может быть неверным или устаревшим.';
        }
        
        if (errorMessage.includes('failed to fetch')) {
            return 'Решение: Проверьте подключение к интернету, доступность сервера ERP и настройки firewall.';
        }
        
        return 'Проверьте консоль браузера для более детальной информации (F12 → Console).';
    }
};
