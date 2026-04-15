export type UserStatus =
  | "unauthorized"
  | "free"
  | "flash"
  | "paid"
  | "admini"
  | "discover"
  | "intelligence" // legacy — maps to discover access
  | "oracle";

export type AgentType = "discover" | "oracle" | "flash";

export function getAvailableAgents(status: string | undefined): AgentType[] {
  switch (status) {
    case "flash":
    case "free":
      return ["flash"];
    case "discover":
    case "intelligence": // legacy users get discover-level access
      return ["flash", "discover"];
    case "oracle":
    case "admini":
      return ["flash", "discover", "oracle"];
    default:
      return ["flash"];
  }
}
