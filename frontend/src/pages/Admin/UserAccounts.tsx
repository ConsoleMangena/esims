import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function UserAccounts() {
  return (
    <>
      <PageMeta
        title="ESIMS - User Accounts Management"
        description="Manage user registration, roles, permissions, and account status."
      />
      <PageBreadcrumb pageTitle="User Accounts Management" />
      <div className="min-h-[200px] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">User accounts UI coming soon.</p>
      </div>
    </>
  );
}
