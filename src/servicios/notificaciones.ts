import { LocalNotifications } from '@capacitor/local-notifications';

export const NotificationService = {
    async requestPermissions() {
        const result = await LocalNotifications.requestPermissions();
        return result.display;
    },

    async schedule(title: string, body: string, id?: number, scheduleAt?: Date) {
        // Generate a random ID if not provided, ensuring it fits within integer limits
        const notificationId = id || Math.floor(Math.random() * 100000);

        await LocalNotifications.schedule({
            notifications: [
                {
                    title,
                    body,
                    id: notificationId,
                    schedule: scheduleAt ? { at: scheduleAt } : undefined,
                    sound: undefined,
                    attachments: undefined,
                    actionTypeId: "",
                    extra: null
                }
            ]
        });
    },

    async scheduleLoanReminder(loanId: string, resourceName: string, dueDate: Date) {
        const reminderDate = new Date(dueDate);
        reminderDate.setHours(reminderDate.getHours() - 24); // 24 hours before

        if (reminderDate > new Date()) {
            // Use a hash of the loan ID for the notification ID to avoid duplicates/collisions
            // Simple hash function for demo
            const id = loanId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

            await this.schedule(
                "Recordatorio de Devolución",
                `Recuerda devolver "${resourceName}" mañana antes de la hora límite.`,
                id,
                reminderDate
            );
        }
    },

    async scheduleEventReminder(eventId: string, eventTitle: string, startDate: Date) {
        const reminderDate = new Date(startDate);
        reminderDate.setHours(reminderDate.getHours() - 1); // 1 hour before

        if (reminderDate > new Date()) {
            const id = eventId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            await this.schedule(
                "Evento Próximo",
                `El evento "${eventTitle}" comienza en 1 hora.`,
                id,
                reminderDate
            );
        }
    }
};
