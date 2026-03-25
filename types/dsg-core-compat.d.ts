declare module "../../../../lib/dsg-core" {
  export type DSGCoreDeterminism = {
    sequence: number;
    region_count: number;
    unique_state_hashes: number;
    max_entropy: number;
    deterministic: boolean;
    gate_action: string;
  };

  export function getDSGCoreDeterminism(
    sequence: number
  ): Promise<{
    ok: boolean;
    data?: DSGCoreDeterminism | null;
    error?: string;
  }>;
}
