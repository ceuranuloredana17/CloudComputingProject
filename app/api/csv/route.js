import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCollection } from "../../../lib/mongodb";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await getCollection("csv_uploads");
  const upload = await col.findOne({ userId }, { sort: { uploadedAt: -1 } });
  if (!upload) return NextResponse.json(null);

  return NextResponse.json({ ...upload, _id: upload._id.toString() });
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileName, headers, rows } = await request.json();
  const col = await getCollection("csv_uploads");
  const { insertedId } = await col.insertOne({
    userId,
    fileName,
    headers,
    rows,
    uploadedAt: new Date(),
  });

  return NextResponse.json(
    { _id: insertedId.toString(), fileName, headers, rows },
    { status: 201 }
  );
}
