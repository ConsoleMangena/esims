import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useParams } from "react-router";

export default function TransactionDetails() {
  const { id } = useParams();
  return (
    <>
      <PageMeta
        title="ESIMS - Transaction Details"
        description="Detailed blockchain transaction record."
      />
      <PageBreadcrumb pageTitle="Transaction Details" />
      <div className="min-h-[200px] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">Transaction ID: {id}</p>
      </div>
    </>
  );
}
