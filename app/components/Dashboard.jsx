"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6"];

function detectColumnTypes(headers, rows) {
  const types = {};
  for (const h of headers) {
    const vals = rows.map(r => r[h]).filter(v => v !== "" && v != null);
    if (!vals.length) { types[h] = "category"; continue; }
    const numCount = vals.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
    types[h] = numCount / vals.length > 0.8 ? "numeric" : "category";
  }
  return types;
}

function calcStats(rows, headers, colTypes) {
  return headers
    .filter(h => colTypes[h] === "numeric")
    .slice(0, 4)
    .map(col => {
      const vals = rows.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
      if (!vals.length) return null;
      const sum = vals.reduce((a, b) => a + b, 0);
      return { col, avg: sum / vals.length, min: Math.min(...vals), max: Math.max(...vals) };
    })
    .filter(Boolean);
}

function prepareBarLine(rows, xCol, yCol, agg) {
  const grouped = {};
  const counts = {};
  for (const row of rows) {
    const key = String(row[xCol] ?? "—").slice(0, 28);
    counts[key] = (counts[key] ?? 0) + 1;
    grouped[key] = (grouped[key] ?? 0) + (parseFloat(row[yCol]) || 0);
  }
  const entries = Object.entries(counts);
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name]) => ({
      name,
      value:
        agg === "count" ? counts[name]
        : agg === "avg"  ? parseFloat((grouped[name] / counts[name]).toFixed(2))
        :                  parseFloat(grouped[name].toFixed(2)),
    }));
}

function preparePie(rows, col) {
  const counts = {};
  for (const row of rows) {
    const key = String(row[col] ?? "—").slice(0, 28);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 8);
  const rest = sorted.slice(8).reduce((s, [, v]) => s + v, 0);
  const data = top.map(([name, value]) => ({ name, value }));
  if (rest > 0) data.push({ name: "Others", value: rest });
  return data;
}

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return typeof n === "number" ? n.toLocaleString() : n;
}

const CustomTooltip = ({ active, payload, label, aggLabel }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <p style={{ color: payload[0].fill ?? "#6366f1" }}>
        {aggLabel}: <span className="font-bold">{Number(payload[0].value).toLocaleString()}</span>
      </p>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-500">{value.toLocaleString()} rows</p>
    </div>
  );
};

const RADIAN = Math.PI / 180;
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.04) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

export default function Dashboard({ data }) {
  const { headers, rows } = data;

  const colTypes = useMemo(() => detectColumnTypes(headers, rows), [headers, rows]);
  const numericCols = useMemo(() => headers.filter(h => colTypes[h] === "numeric"), [headers, colTypes]);
  const categoryCols = useMemo(() => headers.filter(h => colTypes[h] === "category"), [headers, colTypes]);
  const stats = useMemo(() => calcStats(rows, headers, colTypes), [rows, headers, colTypes]);

  const [chartType, setChartType] = useState("bar");
  const [xCol, setXCol] = useState(() => categoryCols[0] || headers[0]);
  const [yCol, setYCol] = useState(() => numericCols[0] || headers[1] || headers[0]);
  const [agg, setAgg] = useState("count");
  const [pieCol, setPieCol] = useState(() => categoryCols[0] || headers[0]);

  const barLineData = useMemo(() => prepareBarLine(rows, xCol, yCol, agg), [rows, xCol, yCol, agg]);
  const pieData = useMemo(() => preparePie(rows, pieCol), [rows, pieCol]);

  const aggLabel = agg === "count" ? "Count" : agg === "avg" ? `Avg ${yCol}` : `Sum ${yCol}`;
  const chartTitle =
    chartType === "pie"
      ? `Distribution of ${pieCol}`
      : `${aggLabel} by ${xCol}`;

  const sel = "border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-2">Total Rows</p>
          <p className="text-4xl font-bold">{rows.length.toLocaleString()}</p>
        </div>
        {stats.slice(0, 3).map((s, i) => {
          const bg = ["from-amber-400 to-amber-500","from-emerald-400 to-emerald-500","from-rose-400 to-rose-500"][i];
          return (
            <div key={s.col} className={`bg-gradient-to-br ${bg} rounded-2xl p-5 text-white shadow-md`}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-2 truncate">{s.col}</p>
              <p className="text-4xl font-bold">{Number.isInteger(s.avg) ? s.avg.toLocaleString() : s.avg.toFixed(1)}</p>
              <p className="text-xs opacity-70 mt-1">avg · {s.min} – {s.max}</p>
            </div>
          );
        })}
      </div>

      {/* Chart card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {/* Chart type */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {["bar","line","pie"].map(t => (
              <button key={t} onClick={() => setChartType(t)}
                className={`px-5 py-2 font-medium transition-colors ${chartType === t ? "bg-indigo-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                {t === "bar" ? "📊 Bar" : t === "line" ? "📈 Line" : "🥧 Pie"}
              </button>
            ))}
          </div>

          {chartType !== "pie" ? (
            <>
              {/* Aggregation */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 font-medium">Show</span>
                <select className={sel} value={agg} onChange={e => setAgg(e.target.value)}>
                  <option value="count">Count</option>
                  <option value="avg">Average</option>
                  <option value="sum">Sum</option>
                </select>
              </div>
              {agg !== "count" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 font-medium">of</span>
                  <select className={sel} value={yCol} onChange={e => setYCol(e.target.value)}>
                    {(numericCols.length ? numericCols : headers).map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 font-medium">by</span>
                <select className={sel} value={xCol} onChange={e => setXCol(e.target.value)}>
                  {headers.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium">Column</span>
              <select className={sel} value={pieCol} onChange={e => setPieCol(e.target.value)}>
                {headers.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
          )}
        </div>

        <p className="text-sm font-semibold text-gray-500 mb-4 ml-1">{chartTitle}</p>

        <ResponsiveContainer width="100%" height={360}>
          {chartType === "bar" ? (
            <BarChart data={barLineData} margin={{ top: 10, right: 20, left: 10, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip aggLabel={aggLabel} />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {barLineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={barLineData} margin={{ top: 10, right: 20, left: 10, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip aggLabel={aggLabel} />} />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3}
                dot={{ r: 5, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 7 }} name={aggLabel} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={140} labelLine={false} label={<PieLabel />}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend iconType="circle" iconSize={10} formatter={v => <span className="text-sm text-gray-600">{v}</span>} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Raw Data <span className="text-gray-400 font-normal ml-1">{rows.length.toLocaleString()} rows</span></h2>
        </div>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 w-12">#</th>
                {headers.map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                    {h}
                    <span className={`ml-1.5 text-xs font-normal px-1.5 py-0.5 rounded-full ${colTypes[h] === "numeric" ? "bg-indigo-100 text-indigo-500" : "bg-gray-100 text-gray-400"}`}>
                      {colTypes[h] === "numeric" ? "123" : "abc"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-gray-300 font-mono">{i + 1}</td>
                  {headers.map(h => (
                    <td key={h} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{row[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
