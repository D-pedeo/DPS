// Conectando ao servidor Socket.io
const socket = io('http://localhost:3000');

// Atualizar hora e data em tempo real
socket.on('real-time-update', (data) => {
  const timeElement = document.getElementById('current-time');
  const dateElement = document.getElementById('current-date');
  
  if (timeElement) timeElement.textContent = data.time;
  if (dateElement) dateElement.textContent = data.date;
});

// Receber notificações em tempo real
socket.on('new-notification', (notification) => {
  // Adicionar nova notificação à lista
  addNotificationToUI(notification);
  // Atualizar contador de notificações
  updateNotificationBadge();
});

// Função para buscar dados do usuário
async function fetchUserData() {
  try {
    const response = await fetch('/api/user/data');
    const userData = await response.json();
    
    // Atualizar UI com dados do usuário
    document.getElementById('userName').textContent = userData.name;
    document.getElementById('userAvatar').src = userData.avatar;
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
  }
}

// Função para carregar notificações
async function loadNotifications() {
  try {
    const response = await fetch('/api/notifications/user/1'); // ID do usuário hardcoded
    const notifications = await response.json();
    
    // Preencher dropdown de notificações
    const dropdown = document.getElementById('notificationsDropdown');
    dropdown.innerHTML = '<h5 style="margin-bottom:1rem;">Notificações</h5>';
    
    notifications.forEach(notification => {
      dropdown.innerHTML += `
        <div class="notification-item">
          <p style="margin-bottom:0.2rem;"><strong>${notification.title}</strong></p>
          <small>${notification.created_at}</small>
        </div>
      `;
    });
    
    dropdown.innerHTML += '<a href="atualizacoes.html" style="display:block;text-align:center;margin-top:1rem;color:var(--secondary-color);">Ver todas</a>';
    
    // Atualizar badge
    document.querySelector('.notification-badge').textContent = notifications.length;
  } catch (error) {
    console.error('Erro ao carregar notificações:', error);
  }
}

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', () => {
  fetchUserData();
  loadNotifications();
  
  // Adicionar elementos de hora e data ao header
  const header = document.querySelector('.kanawa-header');
  if (header) {
    header.innerHTML += `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <span id="current-time" style="font-size: 1.1rem; font-weight: 500;">00:00:00</span>
        <span id="current-date" style="font-size: 0.8rem;">01/01/2023</span>
      </div>
    `;
  }
});