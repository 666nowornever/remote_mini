// Онлайн табло ресторана
const OnlineBoardManager = {
    iframe: null,
    
    init() {
        console.log('🔄 OnlineBoardManager: инициализация');
        this.iframe = document.querySelector('.online-board-frame');
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        // Обработка сообщений от iframe (если нужно)
        window.addEventListener('message', this.handleIframeMessage.bind(this));
        
        // Автоматическое обновление каждые 5 минут
        setInterval(() => {
            this.refreshBoard();
        }, 5 * 60 * 1000);
    },
    
    handleIframeMessage(event) {
        // Обработка сообщений от встроенного табло
        console.log('📨 Сообщение от табло:', event.data);
    },
    
    refreshBoard() {
        if (this.iframe) {
            const currentSrc = this.iframe.src;
            this.iframe.src = '';
            setTimeout(() => {
                this.iframe.src = currentSrc;
            }, 100);
            
            console.log('🔄 Онлайн табло обновлено');
        }
    },
    
    toggleFullscreen() {
        if (!this.iframe) return;
        
        if (!document.fullscreenElement) {
            if (this.iframe.requestFullscreen) {
                this.iframe.requestFullscreen();
            } else if (this.iframe.webkitRequestFullscreen) {
                this.iframe.webkitRequestFullscreen();
            } else if (this.iframe.msRequestFullscreen) {
                this.iframe.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    },
    
    // Проверка доступности табло
    async checkAvailability() {
        try {
            const response = await fetch('https://dashboard.tomato-pizza.ru/', {
                method: 'HEAD',
                mode: 'no-cors'
            });
            return true;
        } catch (error) {
            console.error('❌ Табло недоступно:', error);
            return false;
        }
    }
};

// Глобальные функции для вызова из HTML
function refreshOnlineBoard() {
    OnlineBoardManager.refreshBoard();
    DialogService.showMessage('🔄 Обновление', 'Табло обновляется...', 'info');
}

function toggleFullscreen() {
    OnlineBoardManager.toggleFullscreen();
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof OnlineBoardManager !== 'undefined' && OnlineBoardManager.init) {
        OnlineBoardManager.init();
    }
});