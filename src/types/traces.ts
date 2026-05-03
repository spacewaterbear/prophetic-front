export interface TraceProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  mail: string | null;
  status: string;
  trace_count: number;
}

export interface Trace {
  id: string;
  timestamp: string | null;
  name: string | null;
  user_id: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  total_cost: number;
  metadata: Record<string, unknown> | null;
}

export interface Observation {
  id: string;
  trace_id: string;
  parent_observation_id: string | null;
  type: "GENERATION" | "SPAN" | "EVENT" | string;
  name: string | null;
  start_time: string | null;
  end_time: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  usage_tokens: number | null;
  usage_cost: number | null;
}

export interface ObservationNode extends Observation {
  children: ObservationNode[];
}
