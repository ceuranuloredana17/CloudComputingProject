import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCollection } from '../../../lib/mongodb';

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const records = await getCollection('records');
    const all = await records.find({ userId }).toArray();
    return NextResponse.json(all);
}

export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const records = await getCollection('records');
    const { insertedId } = await records.insertOne({ ...body, userId });
    return NextResponse.json({ _id: insertedId, ...body, userId }, { status: 201 });
}