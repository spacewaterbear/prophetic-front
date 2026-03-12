export type UserStatus =
  | "unauthorized"
  | "free"
  | "paid"
  | "admini"
  | "discover"
  | "intelligence"
  | "oracle";

export type AgentType = "discover" | "intelligence" | "oracle" | "flash";

export function getAvailableAgents(status: string | undefined): AgentType[] {
  const normalizedStatus = status === "free" ? "discover" : status;

  switch (normalizedStatus) {
    case "discover":
      return ["discover", "flash"];
    case "intelligence":
      return ["discover", "flash", "intelligence"];
    case "oracle":
    case "admini":
      return ["discover", "flash", "intelligence", "oracle"];
    default:
      return ["discover", "flash"];
  }
}
