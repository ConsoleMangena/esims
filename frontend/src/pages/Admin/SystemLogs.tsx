import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function SystemLogs() {
  return (
    <>
      <PageMeta
        title="ESIMS - System Logs & Audit"
        description="Comprehensive system activity and security logs."
      />
      <PageBreadcrumb pageTitle="System Logs & Audit" />
      <div className="min-h-[200px] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">Logs and audit UI coming soon.</p>
      </div>
    </>
  );
}
