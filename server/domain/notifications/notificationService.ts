import { Notification, NotificationType, NotificationChannel, NotificationStatus } from '../../../shared/types/notifications';
import { notificationRepo } from './notificationRepo';
import { INCIDENT_STATUSES } from '../../../shared/constants/statuses';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export interface IncidentData {
  id: string;
  beacon_id: string;
  status: string;
  domain_type: string;
  confidence_score: number;
  severity: string;
  estimated_lat?: number;
  estimated_lng?: number;
  external_identifier?: string;
  beacon_type?: string;
  isTest?: boolean;
}

export class NotificationService {
  /**
   * Sends a notification when an incident reaches HIGH_CONFIDENCE status.
   * Called after confidence updates in incidentService.
   */
  public alertOnThreshold(incident: IncidentData): void {
    if (incident.status !== INCIDENT_STATUSES.HIGH_CONFIDENCE) {
      return;
    }

    if ((incident.isTest ?? false) || incident.domain_type === 'test' || incident.beacon_type === 'test') {
      return;
    }

    const notification: Notification = {
      id: `NOTIF-${generateId()}`,
      incidentId: incident.id,
      type: NotificationType.HIGH_CONFIDENCE,
      channel: NotificationChannel.EMAIL,
      sentAt: '',
      payload: {
        incidentId: incident.id,
        beaconId: incident.beacon_id,
        beaconType: incident.domain_type || incident.beacon_type || 'unknown',
        severity: incident.severity,
        confidenceScore: incident.confidence_score,
        location: incident.estimated_lat != null && incident.estimated_lng != null
          ? { lat: incident.estimated_lat, lng: incident.estimated_lng }
          : undefined,
        message: `Incident ${incident.id} has reached HIGH_CONFIDENCE status with score ${incident.confidence_score.toFixed(2)}`
      },
      status: NotificationStatus.PENDING
    };

    void this.sendNotification(notification);
  }

  /**
   * Sends a notification through the appropriate channel.
   * Currently stubs to console.log, structured for real provider integration.
   */
  public async sendNotification(notification: Notification): Promise<void> {
    notificationRepo.saveNotification(notification);

    console.log('[NotificationService] Sending notification:', {
      id: notification.id,
      type: notification.type,
      channel: notification.channel,
      incidentId: notification.incidentId,
      payload: notification.payload
    });

    try {
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSms(notification);
          break;
        case NotificationChannel.WEBHOOK:
          await this.sendWebhook(notification);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInApp(notification);
          break;
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date().toISOString();
      notificationRepo.updateNotificationStatus(notification.id, NotificationStatus.SENT, notification.sentAt);
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notificationRepo.updateNotificationStatus(notification.id, NotificationStatus.FAILED, null);
      console.error('[NotificationService] Failed to send notification:', {
        id: notification.id,
        channel: notification.channel,
        incidentId: notification.incidentId,
        error
      });
    }
  }

  /**
   * Stub for email sending - integrate with SendGrid, SES, etc.
   */
  private async sendEmail(notification: Notification): Promise<void> {
    console.log('[NotificationService] EMAIL stub:', notification.payload.message);
    // TODO: Integrate with email provider (SendGrid, AWS SES, etc.)
    // await emailProvider.send({
    //   to: config.alertEmail,
    //   subject: `Alert: ${notification.type}`,
    //   body: notification.payload.message
    // });
  }

  /**
   * Stub for SMS sending - integrate with Twilio, etc.
   */
  private async sendSms(notification: Notification): Promise<void> {
    console.log('[NotificationService] SMS stub:', notification.payload.message);
    // TODO: Integrate with SMS provider (Twilio, etc.)
    // await smsProvider.send({
    //   to: config.alertPhone,
    //   message: notification.payload.message
    // });
  }

  /**
   * Stub for webhook delivery - integrate with Slack, PagerDuty, etc.
   */
  private async sendWebhook(notification: Notification): Promise<void> {
    console.log('[NotificationService] WEBHOOK stub:', notification.payload);
    // TODO: Integrate with webhook endpoints
    // await fetch(config.webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(notification.payload)
    // });
  }

  /**
   * Stub for in-app notification.
   */
  private async sendInApp(notification: Notification): Promise<void> {
    console.log('[NotificationService] IN_APP stub:', notification.payload);
    // TODO: Push to WebSocket for real-time in-app display
    // wsServer.broadcast({
    //   type: 'notification.raised',
    //   payload: notification
    // });
  }

  /**
   * Mark a notification as read.
   */
  public markAsRead(notificationId: string): boolean {
    return notificationRepo.markAsRead(notificationId);
  }

  /**
   * Get all notifications.
   */
  public getNotifications(limit?: number, offset?: number): Notification[] {
    return notificationRepo.getNotifications(limit, offset);
  }

  /**
   * Get notifications for a specific incident.
   */
  public getNotificationsByIncident(incidentId: string): Notification[] {
    return notificationRepo.getNotificationsByIncident(incidentId);
  }
}

export const notificationService = new NotificationService();
