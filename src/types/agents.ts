export type UserStatus =
  | "unauthorized"
  | "free"
  | "paid"
  | "admini"
  | "discover"
  | "intelligence"
  | "oracle";

export type AgentType = "discover" | "intelligence" | "oracle";

export function getAvailableAgents(status: string | undefined): AgentType[] {
  const normalizedStatus = status === "free" ? "discover" : status;

  switch (normalizedStatus) {
    case "discover":
      return ["discover"];
    case "intelligence":
      return ["discover", "intelligence"];
    case "oracle":
    case "admini":
      return ["discover", "intelligence", "oracle"];
    default:
      return ["discover"];
  }
}
