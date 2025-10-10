// Загрузка сообщений
loadMessages() {
    const messages = MessageScheduler.getAllMessages();
    
    // Разделяем на будущие и прошедшие
    const now = Date.now();
    const futureMessages = messages.filter(m => m.timestamp > now);
    const pastMessages = messages.filter(m => m.timestamp <= now);
    
    // Сортируем: будущие по возрастанию даты, прошедшие по убыванию
    futureMessages.sort((a, b) => a.timestamp - b.timestamp);
    pastMessages.sort((a, b) => b.timestamp - a.timestamp);
    
    const combinedMessages = [...futureMessages, ...pastMessages];
    const messagesList = document.getElementById('messagesList');
    
    if (messagesList) {
        if (combinedMessages.length === 0) {
            messagesList.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-inbox"></i>
                    <p>Нет запланированных событий</p>
                </div>
            `;
        } else {
            let html = '';
            
            // Будущие события
            if (futureMessages.length > 0) {
                html += '<div class="messages-section">';
                html += '<div class="section-title">Предстоящие события</div>';
                futureMessages.forEach(message => {
                    html += this.createMessageElement(message);
                });
                html += '</div>';
            }
            
            // Прошедшие события
            if (pastMessages.length > 0) {
                html += '<div class="messages-section">';
                html += '<div class="section-title">Прошедшие события</div>';
                pastMessages.forEach(message => {
                    html += this.createMessageElement(message);
                });
                html += '</div>';
            }
            
            messagesList.innerHTML = html;
        }
    }
    this.loadStats();
},