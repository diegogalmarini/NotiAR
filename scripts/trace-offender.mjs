/**
 * trace-offender.mjs
 * 
 * Sequentially imports major dependencies to find which one 
 * triggers the window.location TypeError on the server.
 */

async function testImport(name, path) {
    console.log(`\n🧪 Testing: ${name}...`);
    try {
        await import(path);
        console.log(`✅ ${name} imported safely.`);
    } catch (e) {
        console.error(`❌ ${name} FAILED!`);
        console.error(e);
        process.exit(1);
    }
}

async function run() {
    console.log("🚀 Starting Dependency Trace...");

    // Test base libraries
    await testImport("Next Server", "next/server");
    await testImport("Next Cache", "next/cache");

    // Test Supabase Admin (Potential suspect)
    // Need to resolve the alias @ manualmente
    await testImport("Supabase Admin", "../src/lib/supabaseAdmin.ts");

    // Test Utility (TitleCase, etc)
    await testImport("Normalization Utils", "../src/lib/utils/normalization.ts");

    // Test Sentry (High suspect)
    await testImport("Sentry NextJS", "@sentry/nextjs");

    // Test Agent Core
    await testImport("Skill Executor", "../src/lib/agent/SkillExecutor.ts");

    console.log("\n🏁 All tested dependencies imported safely in Node environment.");
}

run();
