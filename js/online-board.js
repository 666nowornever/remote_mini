// Онлайн табло ресторана
const OnlineBoardManager = {
    iframe: null,
    
    init() {
        console.log('🔄 OnlineBoardManager: инициализация');
        this.loadDashboard();
        this.setupEventListeners();
    },
    
    loadDashboard() {
        const boardContent = document.getElementById('boardContent');
        if (!boardContent) return;
        
        boardContent.innerHTML = `
            <div class="online-board-container">
                <iframe 
                    src="https://dashboard.tomato-pizza.ru/" 
                    class="online-board-frame"
                    frameborder="0"
                    allowfullscreen
                    loading="lazy"
                    onload="onBoardLoad()"
                    onerror="onBoardError()"
                ></iframe>
                <div id="boardError" class="board-error hidden">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Не удалось загрузить онлайн табло</p>
                    <p>Возможно, требуется авторизация</p>
                    <button class="btn btn-retry" onclick="OnlineBoardManager.refreshBoard()">
                        <i class="fas fa-redo"></i>
                        Попробовать снова
                    </button>
                    <button class="btn btn-reauth" onclick="OnlineBoardManager.reauthenticate()">
                        <i class="fas fa-key"></i>
                        Авторизоваться
                    </button>
                </div>
            </div>
        `;
        
        this.iframe = document.querySelector('.online-board-frame');
    },
    
    setupEventListeners() {
        // Автоматическое обновление каждые 5 минут
        setInterval(() => {
            this.refreshBoard();
        }, 5 * 60 * 1000);
    },
    
    refreshBoard() {
        if (this.iframe) {
            const currentSrc = this.iframe.src;
            this.iframe.src = '';
            setTimeout(() => {
                this.iframe.src = currentSrc;
            }, 100);
            
            console.log('🔄 Онлайн табло обновлено');
            DialogService.showMessage('🔄 Обновление', 'Табло обновляется...', 'info');
        }
    },
    
    reauthenticate() {
        // Очищаем старую авторизацию
        localStorage.removeItem('onlineBoardAuth');
        localStorage.removeItem('onlineBoardAuthTime');
        
        // Переходим к авторизации
        Navigation.showPage('online-board-auth');
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
    }
};

// Обработчики событий iframe
function onBoardLoad() {
    console.log('✅ Табло загружено');
    document.getElementById('boardError')?.classList.add('hidden');
}

function onBoardError() {
    console.error('❌ Ошибка загрузки табло');
    document.getElementById('boardError')?.classList.remove('hidden');
}