// API сервис для взаимодействия с бэкендом
const ApiService = {
    // Токен авторизации
    token: '12ea-9ef0-c86000245pvc',
    
    // Базовый URL API
    baseUrl: 'https://d.tomato-pizza.ru:44300/ERP/hs/tomatoERP/System',

    // Прокси сервер для обхода CORS
    proxyUrl: 'https://cors-anywhere.herokuapp.com/', // Или ваш прокси

    // Выполнить запрос к ERP API через прокси
    async toggleERPServices() {
        try {
            const targetUrl = `${this.baseUrl}/ServicesOnOff`;
            const proxiedUrl = `${this.proxyUrl}${targetUrl}`;

            console.log('Отправка запроса через прокси:', proxiedUrl);

            const response = await fetch(proxiedUrl, {
                method: 'POST',
                headers: {
                    'token': this.token,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
            
            // Пробуем альтернативный метод
            return await this.tryAlternativeMethod();
        }
    },

    // Альтернативный метод - JSONP или другие способы
    async tryAlternativeMethod() {
        try {
            // Метод 1: Пробуем другой прокси
            const alternativeProxy = 'https://api.allorigins.win/raw?url=';
            const targetUrl = encodeURIComponent(`${this.baseUrl}/ServicesOnOff`);
            
            const response = await fetch(alternativeProxy + targetUrl, {
                method: 'POST',
                headers: {
                    'token': this.token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return await response.json();
            }
            throw new Error('Alternative method failed');
            
        } catch (error) {
            console.error('Альтернативный метод также не сработал:', error);
            throw new Error('Не удалось подключиться к серверу ERP. Проверьте подключение к интернету и настройки CORS на сервере.');
        }
    },

    // Метод для тестирования подключения
    async testConnection() {
        try {
            const response = await fetch('https://cors-anywhere.herokuapp.com/https://d.tomato-pizza.ru:44300/', {
                method: 'HEAD',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
};
