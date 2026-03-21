import { db } from '../../db/client';
import { Notification, NotificationStatus } from '../../../shared/types/notifications';
import { NotificationType, NotificationChannel } from '../../../shared/types/notifications';

function safeParsePayload(row: any) {
  if (!row.payload_json) {
    return {};
  }

  try {
    return JSON.parse(row.payload_json);
  } catch (error) {
    console.warn(`[NotificationRepo] Failed to parse payload_json for notification ${row.id}:`, error);
    return {};
  }
}

function rowToNotification(row: any): Notification {
  return {
    id: row.id,
    incidentId: row.incident_id,
    type: row.notification_type as NotificationType,
    channel: row.destination as NotificationChannel,
    sentAt: row.sent_at,
    payload: safeParsePayload(row),
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
  public updateNotificationStatus(id: string, status: NotificationStatus, sentAt?: string | null): void {
    const fields = ['status = ?'];
    const values: Array<string | null> = [status];

    if (sentAt !== undefined) {
      fields.push('sent_at = ?');
      values.push(sentAt);
    }

    values.push(id);

    db.prepare(`
      UPDATE notifications SET ${fields.join(', ')} WHERE id = ?
    `).run(...values);
  }

  /**
   * Mark a notification as read.
   */
  public markAsRead(id: string): boolean {
    const readAt = new Date().toISOString();
    const result = db.prepare(`
      UPDATE notifications SET status = ?, read_at = ? WHERE id = ?
    `).run(NotificationStatus.READ, readAt, id);

    return result.changes > 0;
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
