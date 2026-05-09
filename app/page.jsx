"use client";

import { useState, useEffect, useRef } from "react";
import Dashboard from "./components/Dashboard";
import ChatAgent from "./components/ChatAgent";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines
    .slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = parseRow(line);
      return headers.reduce((obj, h, i) => {
        obj[h] = values[i] ?? "";
        return obj;
      }, {});
    });

  return { headers, rows };
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetch("/api/csv")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) {
        setError("The CSV file appears to be empty or invalid.");
        return;
      }

      const res = await fetch("/api/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, headers, rows }),
      });

      if (!res.ok) throw new Error("Upload failed");
      const saved = await res.json();
      setData(saved);
    } catch {
      setError("Something went wrong uploading the file.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {data && <p className="text-sm text-gray-400 mt-0.5">{data.fileName}</p>}
        </div>

        <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploading ? "bg-gray-100 text-gray-400" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
          {uploading ? "Uploading…" : data ? "Replace CSV" : "Upload CSV"}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-center text-gray-400 py-24">Loading…</p>
      )}

      {!loading && !data && (
        <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-4">No data yet. Upload a CSV to get started.</p>
          <label className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Choose CSV file
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          <Dashboard data={data} />
          <ChatAgent fileName={data.fileName} />
        </div>
      )}
    </div>
  );
}
