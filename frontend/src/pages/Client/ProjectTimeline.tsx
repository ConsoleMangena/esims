import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { listSurveys, type Survey } from "../../lib/surveys";
import { listTransactions, type ChainTransaction } from "../../lib/transactions";

interface EventItem { when: string; label: string; kind: "submitted"|"approved"|"rejected"|"recorded"|"anchored"; }

export default function ProjectTimeline() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [txs, setTxs] = useState<ChainTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, t] = await Promise.all([listSurveys(), listTransactions({ silent: true })]);
        setSurveys(s);
        setTxs(t);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const latestTxBySurvey = useMemo(() => {
    const m = new Map<number, ChainTransaction>();
    for (const t of txs) {
      const prev = m.get(t.survey);
      if (!prev || +new Date(t.created_at) > +new Date(prev.created_at)) m.set(t.survey, t);
    }
    return m;
  }, [txs]);

  const eventsBySurvey = useMemo(() => {
    const map = new Map<number, EventItem[]>();
    for (const s of surveys) {
      const evs: EventItem[] = [];
      evs.push({ when: s.created_at, label: `Submitted: ${s.title}`, kind: "submitted" });
      if (s.status === "approved") evs.push({ when: s.updated_at, label: "Approved", kind: "approved" });
      if (s.status === "rejected") evs.push({ when: s.updated_at, label: "Rejected", kind: "rejected" });
      if (s.has_onchain_record) evs.push({ when: s.updated_at, label: "On‑chain record", kind: "recorded" });
      if (s.has_onchain_file) evs.push({ when: s.updated_at, label: "File anchored on‑chain", kind: "anchored" });
      const lastTx = latestTxBySurvey.get(s.id);
      if (lastTx) evs.push({ when: lastTx.created_at, label: "Anchoring transaction", kind: "anchored" });
      map.set(s.id, evs.sort((a,b)=>+new Date(a.when)-+new Date(b.when)));
    }
    return map;
  }, [surveys, latestTxBySurvey]);

  return (
    <>
      <PageMeta
        title="ESIMS - Project Timeline"
        description="Visual timeline of survey milestones and critical events."
      />
      <PageBreadcrumb pageTitle="Project Timeline" />

      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        {loading ? (
          <div className="animate-pulse h-6 w-1/3 bg-gray-100 dark:bg-white/5 rounded" />
        ) : (
          <div className="space-y-8">
            {surveys.map((s) => (
              <div key={s.id} className="">
                <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 mb-2">{s.title} <span className="text-gray-400">(#{s.id})</span></h3>
                <ol className="relative border-s border-gray-200 dark:border-gray-800 ml-3">
                  {(eventsBySurvey.get(s.id) || []).map((ev, idx) => (
                    <li key={idx} className="mb-4 ms-4">
                      <div className={`absolute w-2 h-2 rounded-full -start-1.5 top-2 ${
                        ev.kind === "approved" ? "bg-green-500" : ev.kind === "rejected" ? "bg-red-500" : "bg-brand-500"
                      }`} />
                      <time className="mb-1 block text-xs text-gray-500">{new Date(ev.when).toLocaleString()}</time>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{ev.label}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            {surveys.length === 0 && <p className="text-gray-500">No surveys yet.</p>}
          </div>
        )}
      </div>
    </>
  );
}
