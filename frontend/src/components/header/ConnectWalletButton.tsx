import { useEffect, useState } from "react";
import { connectWallet, ensureChain } from "../../lib/eth";

export default function ConnectWalletButton() {
  const [address, setAddress] = useState<string>("");
  const [hasMM, setHasMM] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  async function onConnect() {
    try {
      setBusy(true);
      const addr = await connectWallet();
      await ensureChain();
      setAddress(addr);
    } catch (e: any) {
      alert(e?.message || "Failed to connect wallet");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const eth = (window as any).ethereum;
    setHasMM(!!eth);
    if (!eth) return;
    const onAccounts = (accs: string[]) => setAddress(accs?.[0] || "");
    const onChain = () => {};
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  if (!hasMM) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer"
        className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-800 hover:bg-gray-200 dark:bg-white/5 dark:text-white/90"
      >
        Install MetaMask
      </a>
    );
  }

  if (address) {
    return (
      <button
        className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-800 dark:bg-white/5 dark:text-white/90"
        title={address}
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={busy}
      className="rounded-lg bg-brand-500 px-3 py-2 text-xs text-white hover:bg-brand-600 disabled:opacity-50"
    >
      {busy ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
