import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function AuditTrail() {
  return (
    <>
      <PageMeta
        title="ESIMS - Audit Trail"
        description="Read-only access to blockchain transaction proofs and logs."
      />
      <PageBreadcrumb pageTitle="Audit Trail" />
      <div className="min-h-[200px] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">Audit trail viewer coming soon.</p>
      </div>
    </>
  );
}
