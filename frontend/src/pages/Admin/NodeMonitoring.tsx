import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function NodeMonitoring() {
  return (
    <>
      <PageMeta
        title="ESIMS - Blockchain Node Monitoring"
        description="Real-time status and logs of blockchain nodes."
      />
      <PageBreadcrumb pageTitle="Blockchain Node Monitoring" />
      <div className="min-h-[200px] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">Node monitoring dashboards coming soon.</p>
      </div>
    </>
  );
}
