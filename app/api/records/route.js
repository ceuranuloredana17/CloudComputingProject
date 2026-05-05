// /api/records/route.js

import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export async function GET() {
    const records = await getCollection('records');
    const all = await records.find({}).toArray();
    return NextResponse.json(all);
}

export async function POST(request) {
    const body = await request.json();
    const records = await getCollection('records');
    const { insertedId } = await records.insertOne(body);
    return NextResponse.json({ _id: insertedId, ...body }, { status: 201 });
}