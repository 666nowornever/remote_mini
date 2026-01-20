// Менеджер для работы со срезом заказов
const OrderCutManager = {
    // Список ресторанов с кодами
    restaurants: [
        { code: "00-000064", name: "ТМ01" },
        { code: "00-000062", name: "ТМ02" },
        { code: "00-000050", name: "ТМ03" },
        { code: "00-000056", name: "ТМ04" },
        { code: "00-000034", name: "ТМ05" },
        { code: "00-000038", name: "ТМ06" },
        { code: "БТ-000101", name: "ТМ07" },
        { code: "00-000048", name: "ТМ08" },
        { code: "00-000055", name: "ТМ09" },
        { code: "00-000065", name: "ТМ10" },
        { code: "00-000027", name: "ТМ11" },
        { code: "00-000030", name: "ТМ12" },
        { code: "00-000042", name: "ТМ13" },
        { code: "00-000036", name: "ТМ14" },
        { code: "0019", name: "ТМ15" },
        { code: "00-000046", name: "ТМ15Pr" },
        { code: "00-000024", name: "ТМ16" },
        { code: "00-000044", name: "ТМ17" },
        { code: "00-000052", name: "ТМ18" },
        { code: "00-000040", name: "ТМ19" },
        { code: "00-000028", name: "ТМ20" },
        { code: "00-000057", name: "ТМ21" },
        { code: "00-000043", name: "ТМ22" },
        { code: "00-000045", name: "ТМ23" },
        { code: "00-000025", name: "ТМ24" },
        { code: "00-000049", name: "ТМ25" },
        { code: "00-000058", name: "ТМ26" },
        { code: "00-000003", name: "ТМ27" },
        { code: "00-000035", name: "ТМ28" },
        { code: "00-000032", name: "ТМ29" },
        { code: "00-000047", name: "ТМ30" },
        { code: "00-000060", name: "ТМ31" },
        { code: "00-000033", name: "ТМ32" },
        { code: "00-000037", name: "ТМ33" },
        { code: "00-000029", name: "ТМ34" },
        { code: "00-000063", name: "ТМ35" },
        { code: "00-000061", name: "ТМ36" },
        { code: "00-000051", name: "ТМ37" },
        { code: "00-000059", name: "ТМ38" },
        { code: "00-000053", name: "ТМ39" },
        { code: "00-000054", name: "ТМ40" },
        { code: "00-000069", name: "ТМ41" },
        { code: "00-000070", name: "ТМ42" },
        { code: "00-000071", name: "ТМ43" },
        { code: "БТ-000072", name: "ТМ44" },
        { code: "БТ-000096", name: "ТМ45" },
        { code: "БТ-000097", name: "ТМ46" },
        { code: "БТ-000098", name: "ТМ47" },
        { code: "БТ-000099", name: "ТМ48" }
    ],

    // Конфигурация API
    apiConfig: {
        baseUrl: 'https://d.tomato-pizza.ru:44300/ERP/hs/tomatoERP/System',
        token: '12ea-9ef0-c86000245pvc' // Используем существующий токен из api.js
    },

    // Инициализация
    init: function() {
        console.log('🔄 OrderCutManager: инициализация...');
        return true;
    },

    // Метод для совместимости с navigation.js
    initialize: function() {
        console.log('🔄 OrderCutManager: загрузка списка ресторанов...');
        this.initializeRestaurantsList();
    },

    // Инициализация списка ресторанов
    initializeRestaurantsList: function() {
        const listContainer = document.getElementById('restaurantsList');
        if (!listContainer) {
            console.error('❌ OrderCutManager: контейнер restaurantsList не найден');
            return;
        }

        listContainer.innerHTML = '';

        // Группируем по 10 ресторанов для лучшей читаемости
        this.restaurants.forEach((restaurant, index) => {
            // Добавляем разделитель каждые 10 ресторанов
            if (index > 0 && index % 10 === 0) {
                const separator = document.createElement('div');
                separator.className = 'restaurant-separator';
                separator.innerHTML = '<div class="separator-line"></div>';
                listContainer.appendChild(separator);
            }

            // Создаем элемент ресторана
            const restaurantItem = document.createElement('div');
            restaurantItem.className = 'server-item restaurant-item';
            
            restaurantItem.innerHTML = `
                <div class="server-name restaurant-name-centered">
                    <span class="restaurant-name">${restaurant.name}</span>
                </div>
            `;
            
            restaurantItem.addEventListener('click', () => this.requestOrderCut(restaurant));
            listContainer.appendChild(restaurantItem);
        });

        console.log(`✅ OrderCutManager: загружено ${this.restaurants.length} ресторанов`);
    },

    // Запрос среза заказов
    async requestOrderCut(restaurant) {
        if (!restaurant) return;

        this.addToLog(`🔄 Отправка запроса среза заказов для ${restaurant.name} (код: ${restaurant.code})...`);

        try {
            const url = `${this.apiConfig.baseUrl}/OrderCut`;
            
            console.log('🔧 Детали запроса OrderCut:');
            console.log('URL:', url);
            console.log('Method: POST');
            console.log('Headers:', {
                'token': this.apiConfig.token,
                'Content-Type': 'application/json'
            });
            console.log('Body:', { id: restaurant.code });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'token': this.apiConfig.token,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: restaurant.code })
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
                    url: url
                };
                
                console.error('❌ Детали ошибки:', errorDetails);
                
                this.addToLog(`❌ Ошибка HTTP ${response.status}: ${response.statusText}`, 'error');
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Проверяем статус 200
            if (response.status === 200) {
                this.addToLog(`✅ Срез заказов для ${restaurant.name} успешно отправлен в system_log`, 'success');
                
                // Показываем диалог успеха
                DialogService.showMessage(
                    '✅ Успех',
                    `Срез последних заказов для ${restaurant.name} успешно отправлен в system_log`,
                    'success'
                );
            } else {
                this.addToLog(`⚠️ Неожиданный статус ответа: ${response.status}`, 'warning');
                DialogService.showMessage(
                    '⚠️ Внимание',
                    `Получен неожиданный статус ответа: ${response.status}`,
                    'warning'
                );
            }

        } catch (error) {
            console.error('💥 Ошибка при выполнении запроса OrderCut:', error);
            
            this.addToLog(`❌ Ошибка: ${error.message}`, 'error');
            
            // Показываем диалог ошибки
            DialogService.showMessage(
                '❌ Ошибка',
                `Не удалось выполнить срез заказов для ${restaurant.name}:\n${error.message}`,
                'error'
            );
        }
    },

    // Добавление сообщения в лог
    addToLog: function(message, type = 'info') {
        const logElement = document.getElementById('actionLog');
        if (!logElement) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
        
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
    },

    // Вспомогательные методы для отладки
    getRestaurantByCode: function(code) {
        return this.restaurants.find(r => r.code === code);
    },

    getRestaurantByName: function(name) {
        return this.restaurants.find(r => r.name === name);
    },

    // Тестовый метод
    testApiConnection: async function() {
        try {
            console.log('🔍 Тестирование подключения к API OrderCut...');
            
            // Проверяем первый ресторан для теста
            const testRestaurant = this.restaurants[0];
            
            const url = `${this.apiConfig.baseUrl}/OrderCut`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'token': this.apiConfig.token,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: testRestaurant.code })
            });

            console.log('📡 Тестовый ответ:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            return {
                success: response.ok,
                status: response.status,
                message: response.statusText
            };

        } catch (error) {
            console.error('❌ Тестовый запрос не удался:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// Экспортируем глобально
if (typeof window !== 'undefined') {
    window.OrderCutManager = OrderCutManager;
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    if (typeof OrderCutManager !== 'undefined' && OrderCutManager.init) {
        OrderCutManager.init();
    }
});