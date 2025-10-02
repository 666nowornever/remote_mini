// Сервис для показа диалоговых окон
const DialogService = {
    // Показать диалоговое окно с сообщением
    showMessage(title, message, type = 'info') {
        // Создаем overlay
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
            padding: 20px;
        `;

        // Определяем иконку и цвет в зависимости от типа
        const typeConfig = {
            info: { icon: 'ℹ️', color: '#667eea' },
            success: { icon: '✅', color: '#4CAF50' },
            error: { icon: '❌', color: '#f44336' },
            warning: { icon: '⚠️', color: '#ff9800' }
        };

        const config = typeConfig[type] || typeConfig.info;

        // Создаем диалоговое окно
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.style.cssText = `
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            max-width: 90%;
            max-height: 80vh;
            width: 500px;
            text-align: left;
            color: #333;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 2px solid ${config.color};
            animation: dialogAppear 0.3s ease-out;
            overflow-y: auto;
        `;

        // Добавляем стили для анимации
        if (!document.querySelector('#dialog-styles')) {
            const styles = document.createElement('style');
            styles.id = 'dialog-styles';
            styles.textContent = `
                @keyframes dialogAppear {
                    from { 
                        opacity: 0; 
                        transform: scale(0.8) translateY(-20px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: scale(1) translateY(0); 
                    }
                }
                
                @keyframes dialogDisappear {
                    from { 
                        opacity: 1; 
                        transform: scale(1) translateY(0); 
                    }
                    to { 
                        opacity: 0; 
                        transform: scale(0.8) translateY(-20px); 
                    }
                }
                
                .dialog-message {
                    white-space: pre-line;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    line-height: 1.4;
                    margin: 15px 0;
                    max-height: 300px;
                    overflow-y: auto;
                    background: rgba(0,0,0,0.05);
                    padding: 15px;
                    border-radius: 8px;
                }
            `;
            document.head.appendChild(styles);
        }

        // Заполняем содержимое диалога
        dialog.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 48px; margin-bottom: 10px;">${config.icon}</div>
                <h3 style="margin: 0; color: ${config.color}; font-size: 20px;">${title}</h3>
            </div>
            <div class="dialog-message">${message}</div>
            <div style="text-align: center; margin-top: 20px;">
                <button class="dialog-close-btn" style="
                    background: ${config.color};
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">OK</button>
            </div>
        `;

        // Добавляем элементы в DOM
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Функция закрытия диалога
        const closeDialog = () => {
            dialog.style.animation = 'dialogDisappear 0.3s ease-out forwards';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        };

        // Обработчики событий
        const closeBtn = dialog.querySelector('.dialog-close-btn');
        closeBtn.addEventListener('click', closeDialog);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog();
            }
        });

        // Закрытие по ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        return {
            close: closeDialog
        };
    },

    // Показать диалог загрузки
    showLoading(message = 'Выполнение запроса...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            color: #333;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 2px solid #667eea;
            animation: dialogAppear 0.3s ease-out;
        `;

        spinner.innerHTML = `
            <div class="spinner" style="
                border: 4px solid rgba(102, 126, 234, 0.3);
                border-radius: 50%;
                border-top: 4px solid #667eea;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            "></div>
            <div style="font-size: 16px; font-weight: 500;">${message}</div>
        `;

        // Добавляем стили для спиннера если их нет
        if (!document.querySelector('#spinner-styles')) {
            const styles = document.createElement('style');
            styles.id = 'spinner-styles';
            styles.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(styles);
        }

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);

        return {
            close: () => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }
        };
    }
};
