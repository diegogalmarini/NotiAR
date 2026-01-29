const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const filePath = path.join(__dirname, '..', 'test-files', '24.pdf');
console.log("Reading file:", filePath);

if (!fs.existsSync(filePath)) {
    console.error("File does not exist!");
    process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);

pdf(dataBuffer).then(function (data) {
    const text = data.text;
    console.log("--- DOCUMENT TEXT START ---");
    // Print only first 2000 chars to avoid memory issues or truncation
    console.log(text.substring(0, 2000));
    console.log("--- DOCUMENT TEXT END ---");

    const searchStrCheck = "Carlos Alberto";
    const index = text.indexOf(searchStrCheck);
    if (index !== -1) {
        console.log("\nFOUND AT INDEX:", index);
        console.log("CONTEXT:", text.substring(index - 50, index + searchStrCheck.length + 50));
    } else {
        console.log("\nNOT FOUND");
    }
}).catch(err => {
    console.error("PDF PARSE ERROR:", err);
});
