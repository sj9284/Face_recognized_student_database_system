/**
 * Notification System
 * Handles displaying notifications to the user
 */
class NotificationSystem {
    constructor() {
        this.createNotificationContainer();
        this.timeout = null;
    }

    createNotificationContainer() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }
    }

    /**
     * Show a notification
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, warning, info)
     * @param {number} duration - How long to show the notification in ms
     */
    show(message, type = 'info', duration = 3000) {
        // Clear any existing timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        // Get or create notification element
        let notification = document.querySelector('.notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            
            const content = document.createElement('div');
            content.className = 'notification-content';
            
            const icon = document.createElement('i');
            icon.className = 'notification-icon';
            
            const messageEl = document.createElement('span');
            messageEl.className = 'notification-message';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'notification-close';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.addEventListener('click', () => this.hide());
            
            content.appendChild(icon);
            content.appendChild(messageEl);
            notification.appendChild(content);
            notification.appendChild(closeBtn);
            
            document.getElementById('notification-container').appendChild(notification);
        }

        // Set icon based on type
        const icon = notification.querySelector('.notification-icon');
        switch (type) {
            case 'success':
                icon.className = 'notification-icon fas fa-check-circle';
                notification.className = 'notification success';
                break;
            case 'error':
                icon.className = 'notification-icon fas fa-exclamation-circle';
                notification.className = 'notification error';
                break;
            case 'warning':
                icon.className = 'notification-icon fas fa-exclamation-triangle';
                notification.className = 'notification warning';
                break;
            default:
                icon.className = 'notification-icon fas fa-info-circle';
                notification.className = 'notification info';
        }

        // Set message
        notification.querySelector('.notification-message').textContent = message;

        // Show notification
        notification.classList.add('show');
        
        // Hide after duration
        this.timeout = setTimeout(() => {
            this.hide();
        }, duration);
    }

    /**
     * Hide the notification
     */
    hide() {
        const notification = document.querySelector('.notification');
        if (notification) {
            notification.classList.remove('show');
            notification.classList.add('hide');
            
            // Remove the notification after animation completes
            setTimeout(() => {
                notification.classList.remove('hide');
            }, 300);
        }
    }
}

// Create global notification instance
const notifications = new NotificationSystem();

// Make it available globally
window.showNotification = (message, type, duration) => {
    notifications.show(message, type, duration);
};