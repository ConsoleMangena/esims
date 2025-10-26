import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import { listTransactions, type ChainTransaction } from "../../lib/transactions";
import { listProjects, type Project } from "../../lib/projects";
import { listSurveys, type Survey } from "../../lib/surveys";
import { getEtherscanTxUrl } from "../../lib/eth";

export default function ProjectTransactions() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [txs, setTxs] = useState<ChainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [projs, survs, t] = await Promise.all([
          listProjects(),
          listSurveys(),
          listTransactions({ silent: true }),
        ]);
        setProjects(projs);
        setSurveys(survs);
        setTxs(t);
      } catch (e: any) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const surveyById = useMemo(() => {
    const m = new Map<number, Survey>();
    surveys.forEach((s) => m.set(s.id, s));
    return m;
  }, [surveys]);

  const projectName = useMemo(() => {
    const m = new Map<number, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return (id: number) => m.get(id) || `#${id}`;
  }, [projects]);

  const filtered = useMemo(() => {
    const pid = projectFilter ? Number(projectFilter) : null;
    return txs.filter((tx) => {
      const s = surveyById.get(tx.survey);
      if (!s) return false;
      if (pid && s.project !== pid) return false;
      return true;
    });
  }, [txs, projectFilter, surveyById]);

  return (
    <>
      <PageMeta
        title="ESIMS - Project Transactions Log"
        description="Blockchain transaction records filtered by project."
      />
      <PageBreadcrumb pageTitle="Project Transactions Log" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Project</Label>
            <Select
              options={[{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
              value={projectFilter}
              onChange={setProjectFilter}
              placeholder="All projects"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">Survey</th>
                <th className="py-2 pr-4">Tx Hash</th>
                <th className="py-2 pr-4">Block</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const s = surveyById.get(t.survey);
                const url = t.etherscan_url || (t.public_anchor_tx_hash ? getEtherscanTxUrl(t.public_anchor_tx_hash) : (t.private_tx_hash ? getEtherscanTxUrl(t.private_tx_hash) : ""));
                const hash = t.public_anchor_tx_hash || t.private_tx_hash || "";
                const short = hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "";
                return (
                  <tr key={t.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{s ? projectName(s.project) : "—"}</td>
                    <td className="py-2 pr-4 text-gray-700 dark:text-white/90">{s ? `${s.title} (#${s.id})` : `Survey #${t.survey}`}</td>
                    <td className="py-2 pr-4">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" title={hash || undefined}>{short || "View"}</a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{t.public_block_number ?? t.private_block_number ?? "—"}</td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-gray-500">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <p className="mt-4 text-sm text-error-500">{error}</p>}
      </div>
    </>
  );
}
