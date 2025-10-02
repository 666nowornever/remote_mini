// Обработчик операций с ERP системами
const ERPHandler = {
    // Инициализация обработчиков событий для ERP
    initialize: function() {
        this.bindEvents();
    },

    // Привязка обработчиков событий
    bindEvents: function() {
        // Используем делегирование событий для динамически загружаемых элементов
        document.addEventListener('click', (e) => {
            if (e.target.closest('#erp-toggle-btn')) {
                this.handleERPToggle();
            }
        });
    },

    // Обработка переключения ERP сервисов
    async handleERPToggle() {
        // Показываем индикатор загрузки
        const loadingDialog = DialogService.showLoading('Переключение регламентов ERP...');

        try {
            // Выполняем запрос к API
            const result = await ApiService.toggleERPServices();
            
            // Закрываем индикатор загрузки
            loadingDialog.close();

            // Парсим ответ и показываем результат
            this.showERPResult(result);

        } catch (error) {
            // Закрываем индикатор загрузки
            loadingDialog.close();

            // Показываем ошибку
            this.showError(error);
        }
    },

    // Показать результат операции ERP
    showERPResult(result) {
        console.log('ERP Response:', result);
        
        let title, message, type;

        // Анализируем ответ JSON
        if (typeof result === 'object') {
            // Если ответ - объект, пытаемся извлечь полезную информацию
            const status = result.status || result.State || result.state;
            const messageText = result.message || result.Message || result.description;
            
            if (status === 'on' || status === 'enabled' || status === true) {
                title = 'Регламенты ERP';
                message = messageText || 'Регламенты ERP включены';
                type = 'success';
            } else if (status === 'off' || status === 'disabled' || status === false) {
                title = 'Регламенты ERP';
                message = messageText || 'Регламенты ERP выключены';
                type = 'info';
            } else {
                title = 'Регламенты ERP';
                message = messageText || JSON.stringify(result, null, 2);
                type = 'info';
            }
        } else if (typeof result === 'string') {
            // Если ответ - строка
            const lowerResult = result.toLowerCase();
            if (lowerResult.includes('включено') || lowerResult.includes('on') || lowerResult.includes('enabled')) {
                title = 'Регламенты ERP';
                message = 'Регламенты ERP включены';
                type = 'success';
            } else if (lowerResult.includes('выключено') || lowerResult.includes('off') || lowerResult.includes('disabled')) {
                title = 'Регламенты ERP';
                message = 'Регламенты ERP выключены';
                type = 'info';
            } else {
                title = 'Регламенты ERP';
                message = result;
                type = 'info';
            }
        } else {
            // Если непонятный формат ответа
            title = 'Регламенты ERP';
            message = `Статус: ${JSON.stringify(result)}`;
            type = 'info';
        }

        // Показываем диалог с результатом
        DialogService.showMessage(title, message, type);
    },

    // Показать ошибку
    showError(error) {
        console.error('ERP Operation Error:', error);
        
        let errorMessage = 'Произошла неизвестная ошибка';
        
        if (error.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        DialogService.showMessage(
            'Ошибка',
            `Не удалось выполнить операцию: ${errorMessage}`,
            'error'
        );
    }
};
