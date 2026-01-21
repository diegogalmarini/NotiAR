const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qcqrcrpnnvvlitiidrlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjcXJjcnBubnZ2bGl0aWlkcmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MDk0MSwiZXhwIjoyMDgzODY2OTQxfQ.glvDtnzbolcUY5u2hrp2flTuLa3VNRFDNsapp1qOs44';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('=== CHECKING PARTICIPANTES_OPERACION SCHEMA ===\n');

    // Get a sample record to see the actual column names
    const { data, error } = await supabase
        .from('participantes_operacion')
        .select('*')
        .limit(1);

    if (error) {
        console.log('❌ ERROR:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No records found in participantes_operacion');
        return;
    }

    console.log('Sample record:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\nColumn names:', Object.keys(data[0]));
}

checkSchema().then(() => process.exit(0)).catch((err) => {
    console.error('FATAL ERROR:', err);
    process.exit(1);
});
