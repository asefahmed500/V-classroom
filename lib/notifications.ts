export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  requireInteraction?: boolean
}

export class NotificationManager {
  private static instance: NotificationManager
  private permission: NotificationPermission = "default"

  private constructor() {
    this.checkPermission()
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  private checkPermission() {
    if ("Notification" in window) {
      this.permission = Notification.permission
    }
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if ("Notification" in window) {
      this.permission = await Notification.requestPermission()
    }
    return this.permission
  }

  public async showNotification(options: NotificationOptions): Promise<void> {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications")
      return
    }

    if (this.permission === "default") {
      await this.requestPermission()
    }

    if (this.permission === "granted") {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || "/favicon.ico",
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
      })

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }
    }
  }

  public showUserJoinedNotification(userName: string, roomName: string) {
    this.showNotification({
      title: "New Participant Joined",
      body: `${userName} joined ${roomName}`,
      tag: "user-joined",
    })
  }

  public showUserLeftNotification(userName: string, roomName: string) {
    this.showNotification({
      title: "Participant Left",
      body: `${userName} left ${roomName}`,
      tag: "user-left",
    })
  }

  public showNewMessageNotification(userName: string, message: string, roomName: string) {
    this.showNotification({
      title: `New message in ${roomName}`,
      body: `${userName}: ${message.substring(0, 50)}${message.length > 50 ? "..." : ""}`,
      tag: "new-message",
    })
  }

  public showInvitationNotification(inviterName: string, roomName: string) {
    this.showNotification({
      title: "Study Room Invitation",
      body: `${inviterName} invited you to join ${roomName}`,
      tag: "invitation",
      requireInteraction: true,
    })
  }
}

export const notificationManager = NotificationManager.getInstance()