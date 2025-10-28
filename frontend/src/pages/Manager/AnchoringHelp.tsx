import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function AnchoringHelp() {
  return (
    <>
      <PageMeta title="ESIMS - Anchoring & Verification" description="How to record, anchor, verify, and recover files on your private chain." />
      <PageBreadcrumb pageTitle="Anchoring & Verification" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03] max-w-3xl">
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Overview</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li><b>Record</b>: write header (project, CID, checksum) on chain.</li>
            <li><b>Anchor</b>: store the file as raw chunks on your private chain.</li>
            <li><b>Verify</b>: use <code>/manager/verify-file</code> (hash + chunks).</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Record on chain</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>Manager → Verification → <b>Record on chain</b>.</li>
            <li>Download the header later in Manager → Transactions (<b>Download record</b>).</li>
          </ol>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Anchor full file</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>Manager → Verification → <b>Anchor full file</b> (only if a file is uploaded).</li>
            <li>File is split (~24 KB by default) and written in batches.</li>
            <li>View/download chunks in Manager → Transactions → <b>Show chunks</b>.</li>
          </ol>
          <p className="text-xs text-gray-500">Tune <code>RAW_CHUNK_KB</code> and <code>MAX_PAYLOADS_PER_TX</code> in backend/.env.</p>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Verify integrity</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>Go to <code>/manager/verify-file</code>.</li>
            <li>Select the survey and your local file.</li>
            <li>Check SHA‑256 equals on-chain checksum.</li>
            <li>Optionally compare every on-chain chunk to the file.</li>
          </ol>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Recover file</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>Manager → Transactions → <b>Recover file</b> (if chunks exist).</li>
            <li>Then use <b>Download recovered</b>.</li>
          </ol>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Troubleshooting</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li><b>Gas too high</b>: lower <code>RAW_CHUNK_KB</code>/<code>MAX_PAYLOADS_PER_TX</code> or raise block gas limit.</li>
            <li><b>Already recorded/anchored</b>: the buttons won’t show.</li>
            <li><b>401</b>: sign in again.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
