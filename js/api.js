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
                },
                // Добавляем режим 'no-cors' для обхода preflight
                mode: 'no-cors'
            });

            console.log('📡 Ответ получен:');
            console.log('Status:', response.status);
            console.log('Status Text:', response.statusText);
            console.log('OK:', response.ok);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            // В режиме 'no-cors' response будет opaque, поэтому не можем читать body
            if (response.type === 'opaque') {
                throw new Error('Response is opaque (no-cors mode). Cannot read body.');
            }

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
                    headers: Object.fromEntries(response.headers.entries()),
                    body: errorBody,
                    url: targetUrl
                };
                
                console.error('❌ Детали ошибки:', errorDetails);
                throw new Error(`HTTP ${response.status}: ${response.statusText}. Body: ${errorBody}`);
            }

            // Пытаемся прочитать успешный ответ
            let responseBody;
            try {
                responseBody = await response.text();
                console.log('📦 Тело ответа:', responseBody);
                
                // Пытаемся распарсить JSON
                const data = responseBody ? JSON.parse(responseBody) : {};
                return data;
                
            } catch (parseError) {
                console.warn('⚠️ Не удалось распарсить JSON:', parseError);
                return { rawResponse: responseBody };
            }
            
        } catch (error) {
            console.error('💥 Ошибка при выполнении запроса:', error);
            
            // Добавляем дополнительную информацию об ошибке
            const enhancedError = new Error(this.enhanceErrorMessage(error, response));
            enhancedError.originalError = error;
            enhancedError.response = response;
            
            throw enhancedError;
        }
    },

    // Улучшенное сообщение об ошибке
    enhanceErrorMessage(error, response) {
        let message = error.message;
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            message = 'Не удалось выполнить запрос. Возможные причины:\n' +
                     '• CORS политика блокирует запрос\n' +
                     '• Сервер недоступен\n' +
                     '• Проблемы с сетью\n' +
                     '• Неверный SSL сертификат';
        }
        
        if (response) {
            message += `\n\n📋 Детали ответа:\n` +
                      `Status: ${response.status} ${response.statusText}\n` +
                      `URL: ${response.url}\n` +
                      `Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`;
        }
        
        return message;
    },

    // Альтернативный метод с разными подходами
    async tryAllMethods() {
        const methods = [
            this.tryDirectRequest.bind(this),
            this.tryWithCorsProxy.bind(this),
            this.tryWithJsonp.bind(this)
        ];

        for (const method of methods) {
            try {
                console.log(`🔄 Пробуем метод: ${method.name}`);
                const result = await method();
                console.log(`✅ Метод ${method.name} успешен`);
                return result;
            } catch (error) {
                console.warn(`❌ Метод ${method.name} не сработал:`, error.message);
                continue;
            }
        }
        
        throw new Error('Все методы подключения не сработали');
    },

    // Прямой запрос
    async tryDirectRequest() {
        const response = await fetch(`${this.baseUrl}/ServicesOnOff`, {
            method: 'POST',
            headers: {
                'token': this.token,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    },

    // Запрос через CORS прокси
    async tryWithCorsProxy() {
        const proxies = [
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://cors-anywhere.herokuapp.com/'
        ];

        for (const proxy of proxies) {
            try {
                const proxiedUrl = proxy + encodeURIComponent(`${this.baseUrl}/ServicesOnOff`);
                const response = await fetch(proxiedUrl, {
                    method: 'POST',
                    headers: {
                        'token': this.token,
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.warn(`Прокси ${proxy} не сработал:`, error.message);
                continue;
            }
        }
        
        throw new Error('Все прокси серверы не сработали');
    },

    // JSONP метод (если сервер поддерживает)
    tryWithJsonp() {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Date.now();
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };

            const script = document.createElement('script');
            script.src = `${this.baseUrl}/ServicesOnOff?callback=${callbackName}&token=${this.token}`;
            script.onerror = () => {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('JSONP request failed'));
            };

            document.body.appendChild(script);
        });
    }
};
