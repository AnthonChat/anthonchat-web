export type NormalizedSubscriptionStatus =
  | "trialing"
  | "subscribed"
  | "unsubscribed"
  | "canceled"
  | "past_due";

export function normalizeSubscriptionStatus(
  stripeStatus: string | null | undefined
): NormalizedSubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "subscribed";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    default:
      return "unsubscribed";
  }
}
