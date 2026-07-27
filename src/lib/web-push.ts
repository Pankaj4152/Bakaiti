import webPush from "web-push"

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY

if (publicKey && privateKey) {
  webPush.setVapidDetails("mailto:admin@chitput.app", publicKey, privateKey)
}

export { webPush }

export function getVapidPublicKey(): string {
  return publicKey ?? ""
}
