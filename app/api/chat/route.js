import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCollection } from "../../../lib/mongodb";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });

function buildContext(fileName, headers, rows) {
  const sample = rows.slice(0, 300);
  const csvText = [
    headers.join(","),
    ...sample.map(row => headers.map(h => row[h] ?? "").join(",")),
  ].join("\n");

  const numericStats = headers
    .filter(h => {
      const vals = rows.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
      return vals.length / rows.length > 0.8;
    })
    .map(h => {
      const vals = rows.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return `  - ${h}: min=${Math.min(...vals)}, max=${Math.max(...vals)}, avg=${avg.toFixed(2)}, count=${vals.length}`;
    })
    .join("\n");

  return `You are an intelligent data analyst assistant. The user has uploaded a CSV file called "${fileName}".

Dataset summary:
- Total rows: ${rows.length}
- Columns (${headers.length}): ${headers.join(", ")}

Numeric column statistics (full dataset):
${numericStats || "  None detected"}

${rows.length > 300 ? `Data sample (first 300 of ${rows.length} rows):\n` : "Full dataset:\n"}
${csvText}

Instructions:
- Answer questions about this data clearly and concisely
- For counts/averages on the full dataset, use the statistics above
- Format numbers with commas for readability
- If the question cannot be answered from the available data, say so
- Keep answers short unless the user asks for detail`;
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { question, history } = await request.json();
    if (!question?.trim()) return NextResponse.json({ error: "No question provided" }, { status: 400 });

    const col = await getCollection("csv_uploads");
    const upload = await col.findOne({ userId }, { sort: { uploadedAt: -1 } });
    if (!upload) return NextResponse.json({ error: "No CSV data found. Please upload a file first." }, { status: 404 });

    const systemPrompt = buildContext(upload.fileName, upload.headers, upload.rows);

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []),
      { role: "user", content: question },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const answer = response.choices[0].message.content;
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Chat route error:", err?.message, err?.stack);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
