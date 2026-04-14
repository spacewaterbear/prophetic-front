const MAINTENANCE_KEYWORDS = [
  "error generating insight",
  "error code: 400",
  "error code: 429",
  "error code: 500",
  "credit balance",
  "credit_balance",
  "too low",
  "Plans & Billing",
  "invalid_request_error",
  "api error",
  "api_error",
  "rate limit",
  "rate_limit",
  "anthropic api",
];

export function isMaintenanceError(errorText: unknown): boolean {
  const errorString =
    typeof errorText === "string" ? errorText : JSON.stringify(errorText);
  const lower = errorString.toLowerCase();
  return MAINTENANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function extractErrorMessage(errorText: unknown): string {
  const errorString =
    typeof errorText === "string" ? errorText : JSON.stringify(errorText);

  if (isMaintenanceError(errorString)) {
    return "My brain is in maintenance right now, please wait";
  }

  try {
    const jsonMatch = errorString.match(/\{.*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.detail?.message) {
        return isMaintenanceError(parsed.detail.message)
          ? "My brain is in maintenance right now, please wait"
          : parsed.detail.message;
      }
      if (typeof parsed.detail === "string") {
        return isMaintenanceError(parsed.detail)
          ? "My brain is in maintenance right now, please wait"
          : parsed.detail;
      }
      if (parsed.message) {
        return isMaintenanceError(parsed.message)
          ? "My brain is in maintenance right now, please wait"
          : parsed.message;
      }
    }
  } catch {
    // fall through to return raw string
  }

  return errorString;
}
