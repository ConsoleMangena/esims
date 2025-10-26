import { BrowserProvider, Contract } from "ethers";
import ABI from "../abi/survey_registry.json";

const CONTRACT_ADDRESS = (import.meta as any).env?.VITE_CONTRACT_ADDRESS as string | undefined;
const CHAIN_ID = Number((import.meta as any).env?.VITE_ETH_CHAIN_ID || 0);

function toHexChainId(id: number) {
  return "0x" + id.toString(16);
}

function getProvider(): any {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask not found");
  return eth;
}

export async function connectWallet(): Promise<string> {
  const eth = getProvider();
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  return accounts[0];
}

export async function ensureChain(): Promise<void> {
  if (!CHAIN_ID) return; // optional
  const eth = getProvider();
  const current = await eth.request({ method: "eth_chainId" });
  const target = toHexChainId(CHAIN_ID);
  if (current?.toLowerCase() === target.toLowerCase()) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: target }] });
  } catch (err: any) {
    throw new Error("Please switch MetaMask to the required network and retry.");
  }
}

function getEtherscanBase(): string | null {
  switch (CHAIN_ID) {
    case 1: return "https://etherscan.io";
    case 11155111: return "https://sepolia.etherscan.io";
    case 5: return "https://goerli.etherscan.io";
    default: return null;
  }
}

export function getEtherscanTxUrl(hash: string): string {
  const base = getEtherscanBase();
  return base ? `${base}/tx/${hash}` : "";
}

async function getContract(): Promise<Contract> {
  if (!CONTRACT_ADDRESS) throw new Error("Missing VITE_CONTRACT_ADDRESS");
  await connectWallet();
  await ensureChain();
  const provider = new BrowserProvider(getProvider());
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, ABI as any, signer);
}

export async function recordSubmissionMM(surveyId: number, projectId: number, ipfsCid: string, checksum: string): Promise<{ hash: string }> {
  const contract = await getContract();
  const tx = await contract.recordSubmission(surveyId, projectId, ipfsCid, checksum);
  const receipt = await tx.wait();
  return { hash: receipt?.hash || tx.hash };
}

export async function addFileHashMM(surveyId: number, checksumHex: string): Promise<{ hash: string }> {
  const contract = await getContract();
  const checksum = checksumHex.startsWith("0x") ? checksumHex : ("0x" + checksumHex);
  const tx = await contract.addFileHash(surveyId, checksum);
  const receipt = await tx.wait();
  return { hash: receipt?.hash || tx.hash };
}

export async function markApprovedMM(surveyId: number): Promise<{ hash: string }> {
  const contract = await getContract();
  const tx = await contract.markApproved(surveyId);
  const receipt = await tx.wait();
  return { hash: receipt?.hash || tx.hash };
}

export async function markRejectedMM(surveyId: number): Promise<{ hash: string }> {
  const contract = await getContract();
  const tx = await contract.markRejected(surveyId);
  const receipt = await tx.wait();
  return { hash: receipt?.hash || tx.hash };
}
