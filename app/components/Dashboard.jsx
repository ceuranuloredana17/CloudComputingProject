"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];

function detectColumnTypes(headers, rows) {
  const types = {};
  for (const h of headers) {
    const vals = rows.map(r => r[h]).filter(v => v !== "" && v != null);
    if (vals.length === 0) { types[h] = "category"; continue; }
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
      if (vals.length === 0) return null;
      const sum = vals.reduce((a, b) => a + b, 0);
      return { col, avg: sum / vals.length, min: Math.min(...vals), max: Math.max(...vals), sum };
    })
    .filter(Boolean);
}

function prepareBarLine(rows, xCol, yCol) {
  const grouped = {};
  for (const row of rows) {
    const key = String(row[xCol] ?? "—").slice(0, 24);
    grouped[key] = (grouped[key] ?? 0) + (parseFloat(row[yCol]) || 0);
  }
  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
}

function preparePie(rows, col) {
  const counts = {};
  for (const row of rows) {
    const key = String(row[col] ?? "—").slice(0, 24);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7).reduce((s, [, v]) => s + v, 0);
  const data = top.map(([name, value]) => ({ name, value }));
  if (rest > 0) data.push({ name: "Others", value: rest });
  return data;
}

export default function Dashboard({ data }) {
  const { headers, rows, fileName } = data;

  const colTypes = useMemo(() => detectColumnTypes(headers, rows), [headers, rows]);
  const numericCols = useMemo(() => headers.filter(h => colTypes[h] === "numeric"), [headers, colTypes]);
  const categoryCols = useMemo(() => headers.filter(h => colTypes[h] === "category"), [headers, colTypes]);
  const stats = useMemo(() => calcStats(rows, headers, colTypes), [rows, headers, colTypes]);

  const [chartType, setChartType] = useState("bar");
  const [xCol, setXCol] = useState(() => categoryCols[0] || headers[0]);
  const [yCol, setYCol] = useState(() => numericCols[0] || headers[1] || headers[0]);
  const [pieCol, setPieCol] = useState(() => categoryCols[0] || headers[0]);

  const barLineData = useMemo(() => prepareBarLine(rows, xCol, yCol), [rows, xCol, yCol]);
  const pieData = useMemo(() => preparePie(rows, pieCol), [rows, pieCol]);

  const select =
    "border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300";

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-indigo-50 rounded-xl p-4">
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-1">Total Rows</p>
          <p className="text-3xl font-bold text-indigo-700">{rows.length.toLocaleString()}</p>
        </div>
        {stats.slice(0, 3).map(s => (
          <div key={s.col} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 truncate">{s.col}</p>
            <p className="text-3xl font-bold text-gray-800">{s.avg % 1 === 0 ? s.avg : s.avg.toFixed(1)}</p>
            <p className="text-xs text-gray-400 mt-1">avg · min {s.min} · max {s.max}</p>
          </div>
        ))}
      </div>

      {/* Chart section */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 mb-8">
        {/* Chart type tabs + axis controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {["bar", "line", "pie"].map(t => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  chartType === t
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {chartType !== "pie" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">X axis</span>
                <select className={select} value={xCol} onChange={e => setXCol(e.target.value)}>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Y axis</span>
                <select className={select} value={yCol} onChange={e => setYCol(e.target.value)}>
                  {numericCols.length > 0
                    ? numericCols.map(h => <option key={h} value={h}>{h}</option>)
                    : headers.map(h => <option key={h} value={h}>{h}</option>)
                  }
                </select>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Column</span>
              <select className={select} value={pieCol} onChange={e => setPieCol(e.target.value)}>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={320}>
          {chartType === "bar" ? (
            <BarChart data={barLineData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name={yCol} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={barLineData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name={yCol} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
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
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {headers.map(h => (
                  <td key={h} className="px-4 py-2.5 text-gray-700 border-b border-gray-100 whitespace-nowrap">
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
