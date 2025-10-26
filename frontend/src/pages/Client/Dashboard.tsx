import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function ClientDashboard() {
  return (
    <>
      <PageMeta
        title="ESIMS - Client Dashboard"
        description="Project status summaries and key milestones."
      />
      <PageBreadcrumb pageTitle="Client Dashboard" />
      <div className="min-h-[200px] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">Content coming soon.</p>
      </div>
    </>
  );
}
