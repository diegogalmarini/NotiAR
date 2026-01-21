const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qcqrcrpnnvvlitiidrlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjcXJjcnBubnZ2bGl0aWlkcmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MDk0MSwiZXhwIjoyMDgzODY2OTQxfQ.glvDtnzbolcUY5u2hrp2flTuLa3VNRFDNsapp1qOs44';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugClientRelations() {
    const dni = '27841387';

    console.log('=== DEBUGGING CLIENT RELATIONS FOR DNI:', dni, '===\n');

    // 1. Get participaciones
    console.log('1. Querying participantes_operacion...');
    const { data: participaciones, error: partError } = await supabase
        .from('participantes_operacion')
        .select('*')
        .eq('persona_dni', dni);

    if (partError) {
        console.log('   ❌ ERROR:', partError.message);
        console.log('   Full error:', partError);
        return;
    }

    console.log('   ✓ Count:', participaciones?.length || 0);
    console.log('   Data:', JSON.stringify(participaciones, null, 2));
    console.log('');

    if (!participaciones || participaciones.length === 0) {
        console.log('❌ NO PARTICIPACIONES FOUND - Cliente not linked to any operaciones');
        return;
    }

    // 2. Get operaciones
    const operacionIds = participaciones.map(p => p.operacion_id).filter(Boolean);
    console.log('2. OPERACION IDs from participaciones:', operacionIds);

    const { data: operaciones, error: opError } = await supabase
        .from('operaciones')
        .select('*')
        .in('id', operacionIds);

    if (opError) {
        console.log('   ❌ ERROR:', opError.message);
        return;
    }

    console.log('   ✓ Count:', operaciones?.length || 0);
    console.log('   Data:', JSON.stringify(operaciones, null, 2));
    console.log('');

    // 3. Get escrituras
    const escrituraIds = operaciones?.map(o => o.escritura_id).filter(Boolean) || [];
    console.log('3. ESCRITURA IDs from operaciones:', escrituraIds);

    const { data: escrituras, error: escError } = await supabase
        .from('escrituras')
        .select('*')
        .in('id', escrituraIds);

    if (escError) {
        console.log('   ❌ ERROR:', escError.message);
        return;
    }

    console.log('   ✓ Count:', escrituras?.length || 0);
    console.log('   Data:', JSON.stringify(escrituras, null, 2));
    console.log('');

    // 4. Get carpetas
    const carpetaIds = escrituras?.map(e => e.carpeta_id).filter(Boolean) || [];
    console.log('4. CARPETA IDs from escrituras:', carpetaIds);

    const { data: carpetas, error: carpError } = await supabase
        .from('carpetas')
        .select('*')
        .in('id', carpetaIds);

    if (carpError) {
        console.log('   ❌ ERROR:', carpError.message);
        return;
    }

    console.log('   ✓ Count:', carpetas?.length || 0);
    console.log('   Data:', JSON.stringify(carpetas, null, 2));
    console.log('');

    console.log('=== SUMMARY ===');
    console.log('Participaciones:', participaciones?.length || 0);
    console.log('Operaciones:', operaciones?.length || 0);
    console.log('Escrituras:', escrituras?.length || 0);
    console.log('Carpetas:', carpetas?.length || 0);
}

debugClientRelations().then(() => process.exit(0)).catch((err) => {
    console.error('FATAL ERROR:', err);
    process.exit(1);
});
