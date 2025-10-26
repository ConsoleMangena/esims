import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function AnchoringHelp() {
  return (
    <>
      <PageMeta title="ESIMS - Anchoring & Recovery" description="How to anchor full files on-chain (encrypted) and recover them using your master key." />
      <PageBreadcrumb pageTitle="Anchoring & Recovery" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03] max-w-3xl">
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Overview</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Managers can encrypt a file in chunks and store only cipher text on-chain using SSTORE2 pointers. The encryption
            key is managed off-chain via a master Key Encryption Key (KEK). No raw keys are ever displayed in the UI.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Anchor full file</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>Go to Manager → Verification.</li>
            <li>Pick a submission with an uploaded file and click <b>Anchor full file</b>.</li>
            <li>The server splits the file (~24KB chunks), encrypts each chunk with AES‑256‑GCM, and stores only ciphertext on-chain.</li>
            <li>Encryption metadata (scheme, key version, and wrapped key or KDF salt) is stored in the survey record.</li>
          </ol>
          <p className="text-xs text-gray-500">Note: Anchoring uses the server KEK configured in backend .env.</p>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Set your master key (KEK)</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>Go to Profile Settings.</li>
            <li>Under <b>Manager Recovery Key</b>, paste your base64 KEK and set the <b>Key Version</b> to match the server’s.</li>
            <li>Save. The KEK is stored write-only; it will not be displayed back.</li>
          </ol>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Recover a file</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>Go to Manager → Verification and click <b>Recover</b> on a survey.</li>
            <li>Optionally paste a base64 KEK (and version) for a one-time recovery; otherwise your stored profile KEK is used.</li>
            <li>The server reads encrypted chunks from chain, derives/unwraps the DEK, decrypts, and stores the recovered file on the server.</li>
            <li>A <b>Download</b> link appears in the Recovered column once complete.</li>
          </ol>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Key schemes</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li><b>Envelope (default):</b> Per-file DEK is wrapped under the KEK (AES Key Wrap). Survey stores wrapped DEK + key version.</li>
            <li><b>KDF:</b> DEK = HKDF(KEK, salt, "esims-v1"). Survey stores only KDF salt + key version.</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Troubleshooting</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li><b>Key version mismatch:</b> Ensure your profile key version matches the survey’s key_version.</li>
            <li><b>Invalid KEK base64:</b> The KEK must be valid base64; typically 32 bytes before base64 for AES‑256.</li>
            <li><b>No encrypted chunks:</b> Confirm the file was anchored and the contract has encrypted pointers for the survey.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
