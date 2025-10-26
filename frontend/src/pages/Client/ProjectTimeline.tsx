import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function ProjectTimeline() {
  return (
    <>
      <PageMeta
        title="ESIMS - Project Timeline"
        description="Visual timeline of survey milestones and critical events."
      />
      <PageBreadcrumb pageTitle="Project Timeline" />
      <div className="min-h-[200px] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">Timeline view coming soon.</p>
      </div>
    </>
  );
}
