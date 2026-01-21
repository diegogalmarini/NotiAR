const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qcqrcrpnnvvlitiidrlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjcXJjcnBubnZ2bGl0aWlkcmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MDk0MSwiZXhwIjoyMDgzODY2OTQxfQ.glvDtnzbolcUY5u2hrp2flTuLa3VNRFDNsapp1qOs44';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugClientRelations() {
    const dni = '27841387';

    console.log('=== TESTING WITH PERSONA_ID FIX ===\n');

    // 1. Get participaciones - NOW WITH persona_id
    const { data: participaciones, error: partError } = await supabase
        .from('participantes_operacion')
        .select('*')
        .eq('persona_id', dni);

    console.log('1. PARTICIPACIONES:');
    console.log('   Count:', participaciones?.length || 0);
    console.log('   Data:', JSON.stringify(participaciones, null, 2));

    if (!participaciones || participaciones.length === 0) {
        console.log('❌ Still no participaciones - persona_id might not be DNI');
        return;
    }

    // 2. Get operaciones
    const operacionIds = participaciones.map(p => p.operacion_id).filter(Boolean);
    const { data: operaciones } = await supabase
        .from('operaciones')
        .select('*')
        .in('id', operacionIds);

    console.log('\n2. OPERACIONES:');
    console.log('   Count:', operaciones?.length || 0);
    console.log('   Data:', JSON.stringify(operaciones, null, 2));

    // 3. Get escrituras
    const escrituraIds = operaciones?.map(o => o.escritura_id).filter(Boolean) || [];
    const { data: escrituras } = await supabase
        .from('escrituras')
        .select('*')
        .in('id', escrituraIds);

    console.log('\n3. ESCRITURAS:');
    console.log('   Count:', escrituras?.length || 0);
    console.log('   Data:', JSON.stringify(escrituras, null, 2));

    // 4. Get carpetas
    const carpetaIds = escrituras?.map(e => e.carpeta_id).filter(Boolean) || [];
    const { data: carpetas } = await supabase
        .from('carpetas')
        .select('*')
        .in('id', carpetaIds);

    console.log('\n4. CARPETAS:');
    console.log('   Count:', carpetas?.length || 0);
    console.log('   Data:', JSON.stringify(carpetas, null, 2));
}

debugClientRelations().then(() => process.exit(0)).catch(console.error);
