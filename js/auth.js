// Варианты CORS Proxy
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/',
    'https://corsproxy.io/?'
];

// Конфигурация аутентификации
const Auth = {
    // Конфигурация API
    API_CONFIG: {
        // Меняйте индекс [0] на [1], [2], [3] если первый не работает
        URL: CORS_PROXIES[0] + encodeURIComponent('https://wh.tomato-pizza.ru:443/webhook/hs/tomatohook/CheckingAccessRights'),
        TOKEN: '6b852788-cc29-430f-94c8-bf45852b08c4',
        proxyIndex: 0 // Меняйте этот индекс если proxy не работает
    },

    // ... остальной код без изменений ...

    // Проверка доступа через API с ротацией proxy
    checkAccess: async function(userId) {
        let lastError = null;
        
        // Пробуем все proxy по очереди
        for (let i = 0; i < CORS_PROXIES.length; i++) {
            try {
                const proxyUrl = CORS_PROXIES[i] + encodeURIComponent('https://wh.tomato-pizza.ru:443/webhook/hs/tomatohook/CheckingAccessRights');
                console.log(`🔐 Попытка ${i + 1}/${CORS_PROXIES.length} через proxy:`, CORS_PROXIES[i]);
                
                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'token': this.API_CONFIG.TOKEN
                    },
                    body: JSON.stringify({ id: parseInt(userId) })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Успешный ответ через proxy', i);
                    return {
                        success: true,
                        canUse: result.canUse === true,
                        message: result.canUse ? 'Доступ разрешен' : 'Доступ запрещен системой'
                    };
                }
            } catch (error) {
                lastError = error;
                console.warn(`❌ Proxy ${i} не сработал:`, error);
                // Пробуем следующий proxy
            }
        }
        
        console.error('❌ Все proxy не сработали');
        return {
            success: false,
            canUse: false,
            message: 'Ошибка подключения через все proxy'
        };
    }
};
