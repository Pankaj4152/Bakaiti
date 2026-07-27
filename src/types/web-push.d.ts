declare module "web-push" {
  interface VapidKeys {
    publicKey: string
    privateKey: string
  }

  interface PushSubscription {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  interface RequestOptions {
    headers?: Record<string, string>
    proxy?: string
  }

  export function generateVAPIDKeys(): VapidKeys
  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void
  export function sendNotification(
    subscription: PushSubscription,
    payload: string,
    options?: RequestOptions
  ): Promise<void>
}
