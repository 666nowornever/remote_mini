// Конфигурация авторизации
const Auth = {
    // Разрешенные пользователи - ОБНОВЛЕННЫЙ СПИСОК
    ALLOWED_USER_IDS: [
        349807461,      // Добавлен первый пользователь
        838646989,    // Добавлен второй пользователь
        // Можно добавить других пользователей при необходимости
    ],

    // Инициализация приложения
    initialize: function() {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        const user = tg.initDataUnsafe.user;
        
        if (!user) {
            this.showAccessDenied('Не удалось получить данные пользователя');
            return false;
        }

        // Отладочная информация
        console.log('=== ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ ===');
        console.log('User ID:', user.id);
        console.log('Username:', user.username);
        console.log('First name:', user.first_name);
        console.log('Language:', user.language_code);
        console.log('Разрешенные ID:', this.ALLOWED_USER_IDS);
        console.log('Доступ разрешен:', this.ALLOWED_USER_IDS.includes(user.id));
        console.log('========================');

        // Проверка доступа
        if (this.ALLOWED_USER_IDS.includes(user.id)) {
            this.showApp();
            return true;
        } else {
            this.showAccessDenied(null, user);
            return false;
        }
    },

    // Показать приложение
    showApp: function() {
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('accessDenied').classList.add('hidden');
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
                <strong>Статус:</strong> ❌ Не в списке разрешенных пользователей<br>
                <strong>Разрешенные ID:</strong> ${this.ALLOWED_USER_IDS.join(', ')}
            `;
        } else {
            deniedUserInfo.innerHTML = `<strong>Причина:</strong> ${reason}`;
        }
        
        console.warn('🚫 ПОПЫТКА НЕСАНКЦИОНИРОВАННОГО ДОСТУПА:', user);
    },

    // Метод для добавления новых пользователей (можно вызывать из консоли)
    addUser: function(userId) {
        if (!this.ALLOWED_USER_IDS.includes(userId)) {
            this.ALLOWED_USER_IDS.push(userId);
            console.log(`✅ Пользователь ${userId} добавлен в список разрешенных`);
            console.log('Текущий список:', this.ALLOWED_USER_IDS);
            return true;
        } else {
            console.log(`ℹ️ Пользователь ${userId} уже в списке`);
            return false;
        }
    },

    // Метод для удаления пользователей
    removeUser: function(userId) {
        const index = this.ALLOWED_USER_IDS.indexOf(userId);
        if (index > -1) {
            this.ALLOWED_USER_IDS.splice(index, 1);
            console.log(`❌ Пользователь ${userId} удален из списка`);
            console.log('Текущий список:', this.ALLOWED_USER_IDS);
            return true;
        } else {
            console.log(`ℹ️ Пользователь ${userId} не найден в списке`);
            return false;
        }
    }
};
