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
            // Используем улучшенный анализ статуса
            if (result.status === 'enabled' || result.state === 'on') {
                title = '✅ Включено';
                message = this.formatSuccessMessage(result);
                type = 'success';
            } else if (result.status === 'disabled' || result.state === 'off') {
                title = 'ℹ️ Выключено';
                message = this.formatSuccessMessage(result);
                type = 'info';
            } else {
                title = '📊 Статус ERP';
                message = this.formatUnknownMessage(result);
                type = 'info';
            }
        } else {
            title = '📊 Ответ от сервера';
            message = String(result);
            type = 'info';
        }

        DialogService.showMessage(title, message, type);
    },

    // Форматирование сообщения об успешном включении/выключении
    formatSuccessMessage(result) {
        let message = '';
        
        if (result.service) {
            message += `**Сервис:** ${result.service}\n\n`;
        }
        
        if (result.status === 'enabled') {
            message += '✅ **Статус:** Включено\n\n';
        } else {
            message += '⏸️ **Статус:** Выключено\n\n';
        }
        
        if (result.rawResponse) {
            message += `**Полный ответ:**\n${result.rawResponse}`;
        }
        
        return message;
    },

    // Форматирование неизвестного ответа
    formatUnknownMessage(result) {
        let message = 'Сервер вернул ответ:\n\n';
        
        if (result.rawResponse) {
            message += `**Текст ответа:**\n${result.rawResponse}\n\n`;
        }
        
        if (result.service) {
            message += `**Обнаружен сервис:** ${result.service}\n\n`;
        }
        
        message += '⚠️ *Не удалось определить статус включения/выключения*';
        
        return message;
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
