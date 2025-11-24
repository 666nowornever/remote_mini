// Конфигурация авторизации через API
const Auth = {
    // Конфигурация API
    API_CONFIG: {
        baseUrl: 'https://wh.tomato-pizza.ru:443/webhook/hs/tomatohook',
        token: '6b852788-cc29-430f-94c8-bf45852b08c4'
    },

    // Инициализация приложения
    initialize: async function() {
        try {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            const user = tg.initDataUnsafe.user;
            
            if (!user) {
                console.error('❌ Не удалось получить данные пользователя');
                this.showAccessDenied('Не удалось получить данные пользователя');
                return false;
            }

            // Отладочная информация
            console.log('=== ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ ===');
            console.log('User ID:', user.id);
            console.log('Username:', user.username);
            console.log('First name:', user.first_name);
            console.log('Language:', user.language_code);
            console.log('========================');

            // Проверка доступа через API
            const accessGranted = await this.checkAccessRights(user.id);
            
            if (accessGranted) {
                this.showApp();
                return true;
            } else {
                this.showAccessDenied(null, user);
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации авторизации:', error);
            this.showAccessDenied('Ошибка проверки прав доступа. Попробуйте позже.');
            return false;
        }
    },

    // Проверка прав доступа через API
    async checkAccessRights(userId) {
        console.log('🔐 Проверка прав доступа для пользователя:', userId);
        
        const url = `${this.API_CONFIG.baseUrl}/CheckingAccessRights`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'token': this.API_CONFIG.token,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: userId
                })
            });

            console.log('📡 Ответ API авторизации:');
            console.log('Status:', response.status);
            console.log('OK:', response.ok);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📦 Данные ответа:', data);

            return data.canUse === true;

        } catch (error) {
            console.error('💥 Ошибка при проверке прав доступа:', error);
            
            // В случае ошибки сети, разрешаем доступ для тестирования
            console.warn('⚠️ Ошибка сети, разрешаем временный доступ для отладки');
            return true; // Временно разрешаем доступ при ошибках
            
            // Если хочешь строгую проверку, закомментируй строку выше и раскомментируй строку ниже:
            // throw error;
        }
    },

    // Показать приложение
    showApp: function() {
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('accessDenied').classList.add('hidden');
        console.log('✅ Доступ разрешен, приложение показано');
    },

    // Показать экран "Доступ запрещен"
    showAccessDenied: function(reason, user = null) {
        document.getElementById('app').classList.add('hidden');
        document.getElementById('accessDenied').classList.remove('hidden');
        
        const deniedUserInfo = document.getElementById('deniedUserInfo');
        
        if (user) {
            deniedUserInfo.innerHTML = `
                <strong>Ваш ID:</strong> ${user.id}<br>
                <strong>Имя:</strong> ${user.first_name || 'Не указано'}<br>
                <strong>Username:</strong> @${user.username || 'Не указан'}<br>
                <strong>Статус:</strong> ❌ Доступ запрещен<br>
                <strong>Причина:</strong> ${reason || 'Пользователь не найден в списке доступа'}
            `;
        } else {
            deniedUserInfo.innerHTML = `<strong>Причина:</strong> ${reason}`;
        }
        
        console.warn('🚫 ДОСТУП ЗАПРЕЩЕН:', user);
    },

    // Метод для ручной проверки доступа (можно вызывать из консоли)
    manualCheck: async function(userId) {
        try {
            const result = await this.checkAccessRights(userId);
            console.log(`🔍 Ручная проверка доступа для ${userId}:`, result);
            return result;
        } catch (error) {
            console.error('❌ Ошибка при ручной проверке:', error);
            return false;
        }
    }
};