/**
 * Script to check for missing documentIds in entries
 * Run with: node scripts/check-document-ids.js
 */

const strapiUrl = "http://localhost:1337";
const adminToken = process.env.ADMIN_TOKEN || "YOUR_ADMIN_TOKEN";

async function checkDocumentIds() {
  console.log("Checking for missing documentIds...\n");

  const contentTypes = [
    "api::article.article",
    "api::global.global",
    "api::home.home",
    "api::nav-menu.nav-menu",
  ];

  for (const contentType of contentTypes) {
    console.log(`\nChecking ${contentType}...`);

    try {
      // Get all entries
      const response = await fetch(
        `${strapiUrl}/api/${contentType.split(".").pop()}s?pagination[limit]=100&locale=all`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      const entries = data.data || [];

      console.log(`Found ${entries.length} entries`);

      let missingCount = 0;
      for (const entry of entries) {
        if (!entry.documentId) {
          console.error(`❌ Entry ID ${entry.id} is missing documentId!`);
          console.log(`   Locale: ${entry.locale || "not set"}`);
          console.log(`   Title: ${entry.title || entry.name || "N/A"}`);
          missingCount++;
        }
      }

      if (missingCount === 0) {
        console.log(`✓ All entries have documentIds`);
      } else {
        console.error(`❌ ${missingCount} entries are missing documentIds`);
      }
    } catch (error) {
      console.error(`Error checking ${contentType}:`, error.message);
    }
  }

  console.log("\n\nDocumentId check complete!");
  console.log(
    "\nIf you have entries without documentIds, this is causing the editing error."
  );
  console.log("You may need to:");
  console.log("1. Delete and recreate the affected entries");
  console.log("2. Or manually add documentIds in the database");
}

checkDocumentIds().catch(console.error);
