import fs from 'fs';
import path from 'path';

/**
 * SMOKE TEST: THE "FRANKENSTEIN" DEED
 * Verify the Hybrid Agentic Pipeline (Semantic + Deterministic)
 */

// 1. Manually load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key) {
            const value = valueParts.join('=').trim();
            process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
    });
}

async function runSmokeTest() {
    const { SkillExecutor } = await import('../src/lib/agent/SkillExecutor');
    const { classifyDocument } = await import('../src/lib/skills/routing/documentClassifier');

    console.log("------------------------------------------");
    console.log("🧪 SMOKE TEST: THE FRANKENSTEIN DEED");
    console.log("------------------------------------------");

    // MOCK DATA: A dirty text representing a deed
    const mockText = `
        ESCRITURA NUMERO QUINIENTOS. En Bahia Blanca, 23 de Enero de 2026.
        OBJETO: COMPRAVENTA INMOBILIARIA.
        VENDEDOR: PEREZ, Juan (DNI 10.000.001).
        COMPRADOR: Pedro El Escamoso (DNI 20.000.002), quien declara ser PERSONA EXPUESTA POLITICAMENTE (PEP).
        PRECIO: La suma de CIENTO CINCUENTA MIL DOLARES ESTADOUNIDENSES (USD 150.000).
        INMUEBLE: Estomba 450. Valuacion Fiscal: $50.000.000.
        FECHA ADQUISICION VENDEDOR: 10 de Marzo de 2010.
    `;

    const mockFileData = {
        buffer: Buffer.from(mockText),
        mimeType: 'text/plain'
    };

    try {
        // STEP 1: CLASSIFICATION
        console.log("[TEST] Step 1: Classification...");
        const classification = await classifyDocument(mockFileData, mockText);
        console.log(`[TEST] Result: ${classification.document_type} (Conf: ${classification.confidence})`);

        if (classification.document_type !== 'ESCRITURA') {
            console.error("❌ FAILED: Did not identify as ESCRITURA");
        }

        // STEP 2: SEMANTIC EXTRACTION (Entity Extractor)
        console.log("\n[TEST] Step 2: Semantic Extraction...");
        const entities = await SkillExecutor.execute('notary-entity-extractor', { text: mockText }, mockFileData);

        // STEP 3: DETERMINISTIC CALCULATION (Tax Calculator)
        console.log("\n[TEST] Step 3: Deterministic Calculation...");
        const taxes = await SkillExecutor.execute('notary-tax-calculator', {
            price: 150000,
            currency: 'USD',
            exchangeRate: 1150,
            acquisitionDate: '2010-03-10',
            isUniqueHome: true,
            fiscalValuation: 50000000
        });

        // STEP 4: SEMANTIC COMPLIANCE (UIF Audit)
        console.log("\n[TEST] Step 4: Semantic Compliance Audit...");
        const complianceContext = {
            price: 150000,
            moneda: 'USD',
            parties: [
                { name: "Juan Perez", is_pep: false },
                { name: "Pedro El Escamoso", is_pep: true } // MOCKED PEP STATUS
            ]
        };
        const compliance = await SkillExecutor.execute('notary-uif-compliance', complianceContext);

        // FINAL CONSOLIDATED RESULT
        const finalResult = {
            classification,
            extraction: {
                vendedor: entities.clientes?.find((c: any) => c.rol?.includes('VENDEDOR'))?.nombre_completo,
                comprador: entities.clientes?.find((c: any) => c.rol?.includes('COMPRADOR'))?.nombre_completo,
            },
            taxes: {
                total_ars: taxes.totalExpensesArs,
                sellos: taxes.detail.sellosPba,
                iti: taxes.detail.itiAfip
            },
            compliance_alert: compliance.risk_level,
            compliance_details: compliance.alerts
        };

        console.log("\n------------------------------------------");
        console.log("📊 FINAL SMOKE TEST JSON OUTPUT:");
        console.log(JSON.stringify(finalResult, null, 2));
        console.log("------------------------------------------");

    } catch (error) {
        console.error("❌ TEST CRASHED:", error);
    }
}

runSmokeTest();
