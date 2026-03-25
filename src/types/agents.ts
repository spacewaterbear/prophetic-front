export type UserStatus =
  | "unauthorized"
  | "free"
  | "flash"
  | "paid"
  | "admini"
  | "discover"
  | "intelligence"
  | "oracle";

export type AgentType = "discover" | "intelligence" | "oracle" | "flash";

export function getAvailableAgents(status: string | undefined): AgentType[] {
  switch (status) {
    case "flash":
    case "free":
      return ["flash"];
    case "discover":
      return ["flash", "discover"];
    case "intelligence":
      return ["flash", "discover", "intelligence"];
    case "oracle":
    case "admini":
      return ["flash", "discover", "intelligence", "oracle"];
    default:
      return ["flash"];
  }
}
