// API сервис для взаимодействия с бэкендом
const ApiService = {
    // Токен авторизации
    token: '12ea-9ef0-c86000245pvc',
    
    // Базовый URL API
    baseUrl: 'https://d.tomato-pizza.ru:44300/ERP/hs/tomatoERP/System',

    // Выполнить запрос к ERP API с детальным логированием
    async toggleERPServices() {
        let response;
        try {
            const targetUrl = `${this.baseUrl}/ServicesOnOff`;
            
            console.log('🔧 Детали запроса:');
            console.log('URL:', targetUrl);
            console.log('Method: POST');
            console.log('Headers:', {
                'token': this.token,
                'Content-Type': 'application/json'
            });

            response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'token': this.token,
                    'Content-Type': 'application/json',
                }
            });

            console.log('📡 Ответ получен:');
            console.log('Status:', response.status);
            console.log('Status Text:', response.statusText);
            console.log('OK:', response.ok);

            if (!response.ok) {
                // Пытаемся прочитать тело ошибки
                let errorBody = '';
                try {
                    errorBody = await response.text();
                } catch (e) {
                    errorBody = 'Не удалось прочитать тело ошибки';
                }
                
                const errorDetails = {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorBody,
                    url: targetUrl
                };
                
                console.error('❌ Детали ошибки:', errorDetails);
                throw new Error(`HTTP ${response.status}: ${response.statusText}. Body: ${errorBody}`);
            }

            // Читаем ответ как plain text (сервер возвращает текст, не JSON)
            const responseBody = await response.text();
            console.log('📦 Тело ответа:', responseBody);
            
            // Анализируем текстовый ответ
            return this.parseTextResponse(responseBody);
            
        } catch (error) {
            console.error('💥 Ошибка при выполнении запроса:', error);
            
            // Добавляем дополнительную информацию об ошибке
            const enhancedError = new Error(this.enhanceErrorMessage(error, response));
            enhancedError.originalError = error;
            enhancedError.response = response;
            
            throw enhancedError;
        }
    },

    // Парсинг текстового ответа от сервера
    parseTextResponse(text) {
        console.log('🔍 Анализ текстового ответа:', text);
        
        const result = {
            rawResponse: text,
            status: 'unknown',
            message: text
        };

        // Анализируем текст для определения статуса
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('включено') || lowerText.includes('on') || lowerText.includes('enabled')) {
            result.status = 'enabled';
            result.state = 'on';
        } else if (lowerText.includes('выключено') || lowerText.includes('off') || lowerText.includes('disabled')) {
            result.status = 'disabled';
            result.state = 'off';
        }

        // Извлекаем название сервиса
        const serviceMatch = text.match(/^([^:]+):/);
        if (serviceMatch) {
            result.service = serviceMatch[1].trim();
        }

        console.log('📊 Результат анализа:', result);
        return result;
    },

    // Улучшенное сообщение об ошибке
    enhanceErrorMessage(error, response) {
        let message = error.message;
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            message = 'Не удалось выполнить запрос. Возможные причины:\n' +
                     '• CORS политика блокирует запрос\n' +
                     '• Сервер недоступен\n' +
                     '• Проблемы с сетью';
        }
        
        if (response) {
            message += `\n\n📋 Детали ответа:\n` +
                      `Status: ${response.status} ${response.statusText}\n` +
                      `URL: ${response.url}`;
        }
        
        return message;
    }
};
