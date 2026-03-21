import { db } from '../../db/client';
import { Notification, NotificationStatus } from '../../../shared/types/notifications';
import { NotificationType, NotificationChannel } from '../../../shared/types/notifications';

function rowToNotification(row: any): Notification {
  return {
    id: row.id,
    incidentId: row.incident_id,
    type: row.notification_type as NotificationType,
    channel: row.destination as NotificationChannel,
    sentAt: row.sent_at,
    payload: row.payload_json ? JSON.parse(row.payload_json) : {},
    readAt: row.read_at || undefined,
    status: row.status as NotificationStatus
  };
}

export class NotificationRepo {
  /**
   * Save a new notification to the database.
   */
  public saveNotification(notification: Notification): void {
    db.prepare(`
      INSERT INTO notifications (id, incident_id, notification_type, destination, sent_at, payload_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      notification.id,
      notification.incidentId,
      notification.type,
      notification.channel,
      notification.sentAt,
      JSON.stringify(notification.payload),
      notification.status
    );
  }

  /**
   * Update notification status.
   */
  public updateNotificationStatus(id: string, status: NotificationStatus): void {
    db.prepare(`
      UPDATE notifications SET status = ? WHERE id = ?
    `).run(status, id);
  }

  /**
   * Mark a notification as read.
   */
  public markAsRead(id: string): void {
    const readAt = new Date().toISOString();
    db.prepare(`
      UPDATE notifications SET status = ?, read_at = ? WHERE id = ?
    `).run(NotificationStatus.READ, readAt, id);
  }

  /**
   * Get all notifications with optional pagination.
   */
  public getNotifications(limit: number = 50, offset: number = 0): Notification[] {
    const rows = db.prepare(`
      SELECT * FROM notifications 
      ORDER BY sent_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[];

    return rows.map(rowToNotification);
  }

  /**
   * Get notifications for a specific incident.
   */
  public getNotificationsByIncident(incidentId: string): Notification[] {
    const rows = db.prepare(`
      SELECT * FROM notifications 
      WHERE incident_id = ?
      ORDER BY sent_at DESC
    `).all(incidentId) as any[];

    return rows.map(rowToNotification);
  }

  /**
   * Get notification by ID.
   */
  public getById(id: string): Notification | null {
    const row = db.prepare(`
      SELECT * FROM notifications WHERE id = ?
    `).get(id) as any;

    return row ? rowToNotification(row) : null;
  }

  /**
   * Get unread notification count.
   */
  public getUnreadCount(): number {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE status != ?
    `).get(NotificationStatus.READ) as { count: number };

    return result.count;
  }
}

export const notificationRepo = new NotificationRepo();
