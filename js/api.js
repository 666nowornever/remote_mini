// API сервис для взаимодействия с бэкендом
const ApiService = {
    // Токен авторизации
    token: '12ea-9ef0-c86000245pvc',
    
    // Базовый URL API
    baseUrl: 'https://d.tomato-pizza.ru:44300/ERP/hs/tomatoERP/System',

    // Выполнить запрос к ERP API
    async toggleERPServices() {
        try {
            const response = await fetch(`${this.baseUrl}/ServicesOnOff`, {
                method: 'POST',
                headers: {
                    'token': this.token,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
            throw error;
        }
    },

    // Универсальный метод для API запросов
    async makeRequest(endpoint, method = 'GET', body = null) {
        const config = {
            method: method,
            headers: {
                'token': this.token,
                'Content-Type': 'application/json',
            }
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
            
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
};
