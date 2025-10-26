import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function ProjectTransactions() {
  return (
    <>
      <PageMeta
        title="ESIMS - Project Transactions Log"
        description="Blockchain transaction records filtered by project."
      />
      <PageBreadcrumb pageTitle="Project Transactions Log" />
      <div className="min-h-[200px] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">Transactions table coming soon.</p>
      </div>
    </>
  );
}
