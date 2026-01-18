import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
        return NextResponse.json([]);
    }

    const { data, error } = await supabase
        .from('inmuebles')
        .select('*')
        .or(`partido_id.ilike.%${q}%,nro_partida.ilike.%${q}%`)
        .limit(10);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
