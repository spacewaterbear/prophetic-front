const MAINTENANCE_HTTP_CODES = new Set([429, 502, 503, 504, 529]);

const MAINTENANCE_KEYWORDS = [
  "error generating insight",
  "error code: 400",
  "error code: 429",
  "error code: 500",
  "error code: 529",
  "overloaded",
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
  "maintenance",
  "brain is",
];

export function isMaintenanceError(errorText: unknown, httpStatus?: number): boolean {
  if (httpStatus !== undefined && MAINTENANCE_HTTP_CODES.has(httpStatus)) {
    return true;
  }
  const errorString =
    typeof errorText === "string" ? errorText : JSON.stringify(errorText);
  const lower = errorString.toLowerCase();
  return MAINTENANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function extractErrorMessage(errorText: unknown): string {
  const errorString =
    typeof errorText === "string" ? errorText : JSON.stringify(errorText);

  if (isMaintenanceError(errorString)) {
    return "J'ai besoin de me mettre en veille pour le moment. Contactez mon créateur pour en savoir plus";
  }

  try {
    const jsonMatch = errorString.match(/\{.*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.detail?.message) {
        return isMaintenanceError(parsed.detail.message)
          ? "J'ai besoin de me mettre en veille pour le moment. Contactez mon créateur pour en savoir plus"
          : parsed.detail.message;
      }
      if (typeof parsed.detail === "string") {
        return isMaintenanceError(parsed.detail)
          ? "J'ai besoin de me mettre en veille pour le moment. Contactez mon créateur pour en savoir plus"
          : parsed.detail;
      }
      if (parsed.message) {
        return isMaintenanceError(parsed.message)
          ? "J'ai besoin de me mettre en veille pour le moment. Contactez mon créateur pour en savoir plus"
          : parsed.message;
      }
    }
  } catch {
    // fall through to return raw string
  }

  return errorString;
}
