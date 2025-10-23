// Онлайн табло ресторана
const OnlineBoardManager = {
    iframe: null,
    isAuthenticated: false,
    loginUrl: 'https://p.tomato-pizza.ru/index/Account/Login?ReturnUrl=%2Findex%2F',
    boardUrl: 'https://dashboard.tomato-pizza.ru/',
    
    init() {
        console.log('🔄 OnlineBoardManager: инициализация');
        this.iframe = document.querySelector('.online-board-frame');
        this.checkExistingSession();
    },
    
    // Проверка существующей сессии
    checkExistingSession() {
        const savedSession = localStorage.getItem('boardSession');
        if (savedSession) {
            this.isAuthenticated = true;
            this.showBoard();
        } else {
            this.showLoginForm();
        }
    },
    
    // Показать форму авторизации
    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('boardContainer').classList.add('hidden');
        document.getElementById('boardControls').classList.add('hidden');
        this.isAuthenticated = false;
    },
    
    // Показать табло
    showBoard() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('boardContainer').classList.remove('hidden');
        document.getElementById('boardControls').classList.remove('hidden');
        this.isAuthenticated = true;
        
        // Загружаем табло после небольшой задержки
        setTimeout(() => {
            this.loadBoard();
        }, 500);
    },
    
    // Авторизация
    async login() {
        const loginDialog = DialogService.showLoading('Выполняется вход в табло...');
        
        try {
            // Создаем скрытый iframe для авторизации
            await this.performLogin();
            
            // Сохраняем сессию
            localStorage.setItem('boardSession', 'authenticated');
            localStorage.setItem('boardSessionTime', Date.now().toString());
            
            this.showBoard();
            loginDialog.close();
            DialogService.showMessage('✅ Успех', 'Авторизация прошла успешно', 'success');
            
        } catch (error) {
            loginDialog.close();
            DialogService.showMessage('❌ Ошибка', 'Не удалось выполнить вход в табло', 'error');
            console.error('Ошибка авторизации:', error);
        }
    },
    
    // Выполнение авторизации через скрытый iframe
    performLogin() {
        return new Promise((resolve, reject) => {
            const authFrame = document.createElement('iframe');
            authFrame.style.display = 'none';
            authFrame.src = this.loginUrl;
            
            authFrame.onload = () => {
                console.log('🔐 Iframe авторизации загружен');
                
                // Даем время для загрузки формы
                setTimeout(() => {
                    try {
                        // Заполняем форму авторизации
                        const frameDoc = authFrame.contentDocument || authFrame.contentWindow.document;
                        const usernameInput = frameDoc.querySelector('input[name="username"], input[type="text"], #username');
                        const passwordInput = frameDoc.querySelector('input[name="password"], input[type="password"], #password');
                        const submitButton = frameDoc.querySelector('input[type="submit"], button[type="submit"], .btn-login');
                        
                        if (usernameInput && passwordInput && submitButton) {
                            usernameInput.value = 'kremnevav';
                            passwordInput.value = 'drewhix1994';
                            submitButton.click();
                            
                            // Ждем редирект после авторизации
                            setTimeout(() => {
                                document.body.removeChild(authFrame);
                                resolve();
                            }, 2000);
                        } else {
                            document.body.removeChild(authFrame);
                            reject(new Error('Форма авторизации не найдена'));
                        }
                    } catch (error) {
                        document.body.removeChild(authFrame);
                        reject(error);
                    }
                }, 1000);
            };
            
            authFrame.onerror = () => {
                document.body.removeChild(authFrame);
                reject(new Error('Ошибка загрузки страницы авторизации'));
            };
            
            document.body.appendChild(authFrame);
        });
    },
    
    // Загрузка табло
    loadBoard() {
        if (this.iframe) {
            this.iframe.src = this.boardUrl;
            console.log('📊 Загружаем онлайн табло...');
        }
    },
    
    // Обновление табло
    refreshBoard() {
        if (this.iframe && this.isAuthenticated) {
            const currentSrc = this.iframe.src;
            this.iframe.src = '';
            setTimeout(() => {
                this.iframe.src = currentSrc;
            }, 100);
            
            DialogService.showMessage('🔄 Обновление', 'Табло обновляется...', 'info');
        }
    },
    
    // Полноэкранный режим
    toggleFullscreen() {
        if (!this.iframe || !this.isAuthenticated) return;
        
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
    
    // Выход
    logout() {
        localStorage.removeItem('boardSession');
        localStorage.removeItem('boardSessionTime');
        this.isAuthenticated = false;
        this.showLoginForm();
        
        // Очищаем iframe
        if (this.iframe) {
            this.iframe.src = 'about:blank';
        }
        
        DialogService.showMessage('👋 Выход', 'Вы вышли из табло', 'info');
    },
    
    // Проверка срока действия сессии (24 часа)
    checkSessionExpiry() {
        const sessionTime = localStorage.getItem('boardSessionTime');
        if (sessionTime) {
            const sessionAge = Date.now() - parseInt(sessionTime);
            const twentyFourHours = 24 * 60 * 60 * 1000;
            
            if (sessionAge > twentyFourHours) {
                this.logout();
                return false;
            }
        }
        return true;
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof OnlineBoardManager !== 'undefined' && OnlineBoardManager.init) {
        OnlineBoardManager.init();
    }
});