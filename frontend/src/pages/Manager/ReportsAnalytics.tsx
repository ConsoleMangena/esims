import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { listTransactions, type ChainTransaction } from "../../lib/transactions";
import Chart from "react-apexcharts";

function toFixed(n: number | null | undefined, d = 4) {
  if (n == null || Number.isNaN(n as any)) return "—";
  return Number(n).toFixed(d);
}

export default function ReportsAnalytics() {
  const [txs, setTxs] = useState<ChainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listTransactions({ silent: true });
        setTxs(data);
      } catch (e: any) {
        setError("Failed to load transactions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    const ok = txs.filter((t) => (t.status ?? 1) === 1);
    const fees = ok.map((t) => t.fee_eth || 0).filter((x) => x > 0);
    const speeds = txs.map((t) => t.speed_seconds || 0).filter((x) => x > 0);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0);
    const p = (arr: number[], q: number) => {
      if (!arr.length) return 0;
      const a = [...arr].sort((x, y) => x - y);
      const i = Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))));
      return a[i];
    };
    return {
      total: txs.length,
      successRate: txs.length ? Math.round((ok.length / txs.length) * 100) : 0,
      avgFee: avg(fees),
      p95Fee: p(fees, 0.95),
      avgSpeed: avg(speeds),
      p95Speed: p(speeds, 0.95),
    };
  }, [txs]);

  // Time-series for fees
  const feeSeries = useMemo(() => {
    const items = txs
      .filter((t) => (t.fee_eth || 0) > 0)
      .map((t) => ({ x: new Date(t.created_at).getTime(), y: Number(t.fee_eth) }))
      .sort((a, b) => a.x - b.x);
    return [{ name: "Fee (ETH)", data: items }];
  }, [txs]);

  // Histogram for speeds
  const speedHist = useMemo(() => {
    const buckets: Record<string, number> = {};
    const secs = txs.map((t) => t.speed_seconds || 0).filter((x) => x > 0);
    const step = 2; // 2s buckets (HH network is fast)
    for (const s of secs) {
      const k = `${Math.floor(s / step) * step}-${Math.floor(s / step) * step + step}`;
      buckets[k] = (buckets[k] || 0) + 1;
    }
    const labels = Object.keys(buckets).sort((a, b) => parseInt(a) - parseInt(b));
    const data = labels.map((k) => buckets[k]);
    return { labels, data };
  }, [txs]);

  // Gas used per tx (bar)
  const gasSeries = useMemo(() => {
    const items = txs
      .filter((t) => (t.gas_used || 0) > 0)
      .map((t) => ({ x: new Date(t.created_at).getTime(), y: Number(t.gas_used) }))
      .sort((a, b) => a.x - b.x);
    return [{ name: "Gas Used", data: items }];
  }, [txs]);

  return (
    <>
      <PageMeta
        title="ESIMS - Reports & Analytics"
        description="Summary charts: fees, speed, gas usage."
      />
      <PageBreadcrumb pageTitle="Reports & Analytics" />
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500">Total transactions</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{loading ? "—" : metrics.total}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500">Success rate</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{loading ? "—" : `${metrics.successRate}%`}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500">Avg fee (ETH)</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{loading ? "—" : toFixed(metrics.avgFee, 6)}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500">Avg speed (s)</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{loading ? "—" : toFixed(metrics.avgSpeed, 2)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Transaction fee over time</h3>
          <Chart
            type="line"
            height={300}
            series={feeSeries as any}
            options={{
              chart: { id: "fees-line", animations: { enabled: true } },
              xaxis: { type: "datetime" },
              yaxis: { labels: { formatter: (v) => `${v}` } },
              dataLabels: { enabled: false },
              stroke: { curve: "smooth" },
              tooltip: { y: { formatter: (v) => `${v} ETH` } },
            }}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Gas used per transaction</h3>
            <Chart
              type="bar"
              height={300}
              series={gasSeries as any}
              options={{
                chart: { id: "gas-bar" },
                xaxis: { type: "datetime" },
                yaxis: {
                  title: { text: "Gas (units)" },
                  labels: { formatter: (v: number) => `${Math.round(v).toLocaleString()}` },
                },
                tooltip: { y: { formatter: (v: number) => `${Math.round(v).toLocaleString()} gas` } },
                dataLabels: { enabled: false },
              }}
            />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Transaction speed distribution (s)</h3>
            <Chart
              type="bar"
              height={300}
              series={[{ name: "Tx count", data: speedHist.data }] as any}
              options={{
                chart: { id: "speed-hist" },
                xaxis: { categories: speedHist.labels },
                dataLabels: { enabled: false },
              }}
            />
          </div>
        </div>

        {error && <p className="text-sm text-error-500">{error}</p>}
      </div>
    </>
  );
}
