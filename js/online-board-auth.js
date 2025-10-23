// Менеджер авторизации онлайн табло
const OnlineBoardAuth = {
    iframe: null,
    authChecked: false,
    
    init() {
        console.log('🔄 OnlineBoardAuth: инициализация');
        this.iframe = document.querySelector('.auth-frame');
        this.setupEventListeners();
        this.checkAuthStatus();
    },
    
    setupEventListeners() {
        // Проверяем URL iframe каждую секунду для обнаружения редиректа
        this.checkInterval = setInterval(() => {
            this.checkRedirect();
        }, 1000);
        
        // Обработка сообщений от iframe
        window.addEventListener('message', this.handleIframeMessage.bind(this));
    },
    
    checkRedirect() {
        if (!this.iframe || !this.iframe.contentWindow) return;
        
        try {
            const iframeUrl = this.iframe.contentWindow.location.href;
            console.log('🔍 Проверка URL iframe:', iframeUrl);
            
            // Если URL изменился на dashboard, значит авторизация успешна
            if (iframeUrl.includes('dashboard.tomato-pizza.ru')) {
                console.log('✅ Авторизация успешна, перенаправление на табло');
                this.onAuthSuccess();
            }
            
            // Если находимся на dashboard странице
            if (iframeUrl === 'https://dashboard.tomato-pizza.ru/' || 
                iframeUrl.startsWith('https://dashboard.tomato-pizza.ru/')) {
                console.log('✅ Уже авторизован, переход к табло');
                this.onAuthSuccess();
            }
            
        } catch (error) {
            // CORS ошибка - нормально для iframe с другим доменом
            console.log('🔒 CORS ограничение, продолжаем мониторинг...');
        }
    },
    
    handleIframeMessage(event) {
        console.log('📨 Сообщение от iframe авторизации:', event.data);
        // Можно добавить обработку специфичных сообщений от формы авторизации
    },
    
    onAuthSuccess() {
        clearInterval(this.checkInterval);
        this.authChecked = true;
        
        // Сохраняем статус авторизации
        localStorage.setItem('onlineBoardAuth', 'true');
        localStorage.setItem('onlineBoardAuthTime', Date.now().toString());
        
        // Показываем уведомление
        DialogService.showMessage('✅ Успех', 'Авторизация прошла успешно! Переход к табло...', 'success');
        
        // Переходим к табло
        setTimeout(() => {
            Navigation.showPage('online-board');
        }, 1500);
    },
    
    checkAuthStatus() {
        const authTime = localStorage.getItem('onlineBoardAuthTime');
        const isAuthenticated = localStorage.getItem('onlineBoardAuth') === 'true';
        
        // Проверяем, не устарела ли авторизация (24 часа)
        if (isAuthenticated && authTime) {
            const authDate = new Date(parseInt(authTime));
            const now = new Date();
            const hoursDiff = (now - authDate) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
                console.log('✅ Авторизация активна, переход к табло');
                Navigation.showPage('online-board');
                return;
            } else {
                console.log('🔄 Авторизация устарела, требуется повторный вход');
                localStorage.removeItem('onlineBoardAuth');
                localStorage.removeItem('onlineBoardAuthTime');
            }
        }
    },
    
    refreshAuth() {
        if (this.iframe) {
            this.iframe.src = this.iframe.src;
            this.updateStatus('Обновление формы авторизации...', 'syncing');
        }
    },
    
    skipToDashboard() {
        if (confirm('Перейти к табло без авторизации? Возможно, некоторые функции будут недоступны.')) {
            Navigation.showPage('online-board');
        }
    },
    
    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('authStatus');
        if (!statusElement) return;
        
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            error: 'fa-exclamation-triangle',
            syncing: 'fa-sync-alt fa-spin'
        };
        
        statusElement.innerHTML = `
            <i class="fas ${icons[type]} ${type === 'syncing' ? 'fa-spin' : ''}"></i>
            <span>${message}</span>
        `;
    }
};

// Глобальные функции для вызова из HTML
function onAuthFrameLoad() {
    console.log('✅ Фрейм авторизации загружен');
    OnlineBoardAuth.updateStatus('Форма авторизации загружена', 'success');
}

function onAuthFrameError() {
    console.error('❌ Ошибка загрузки фрейма авторизации');
    OnlineBoardAuth.updateStatus('Ошибка загрузки формы авторизации', 'error');
}

function refreshAuthFrame() {
    OnlineBoardAuth.refreshAuth();
}

function skipToDashboard() {
    OnlineBoardAuth.skipToDashboard();
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof OnlineBoardAuth !== 'undefined' && OnlineBoardAuth.init) {
        OnlineBoardAuth.init();
    }
});