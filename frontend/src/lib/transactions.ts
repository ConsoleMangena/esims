import api from "./api";

export interface ChainTransaction {
  id: number;
  survey: number;
  private_tx_hash: string | null;
  public_anchor_tx_hash: string | null;
  anchor_batch_id: string | null;
  private_block_number: number | null;
  public_block_number: number | null;
  etherscan_url?: string | null;
  // Computed metrics (optional)
  status?: number | null;
  gas_used?: number | null;
  effective_gas_price?: number | null;
  fee_wei?: number | null;
  fee_eth?: number | null;
  block_timestamp?: number | null;
  speed_seconds?: number | null;
  created_at: string;
  updated_at: string;
}

export async function listTransactions(params?: { survey?: number; silent?: boolean }) {
  const { data } = await api.get<ChainTransaction[]>("transactions/", {
    params: params?.survey ? { survey: params.survey } : undefined,
    silent: params?.silent ?? false,
  } as any);
  return data as any;
}

export async function createTransaction(payload: {
  survey: number;
  public_anchor_tx_hash?: string;
  private_tx_hash?: string;
  public_block_number?: number | null;
  private_block_number?: number | null;
}) {
  const { data } = await api.post<ChainTransaction>("transactions/", payload as any, { silent: true } as any);
  return data as any;
}
