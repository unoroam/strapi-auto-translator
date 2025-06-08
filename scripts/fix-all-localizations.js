/**
 * Script to fix all localization issues in the database
 * Run with: node scripts/fix-all-localizations.js
 */

const strapiUrl = "http://localhost:1337";
const adminToken = process.env.ADMIN_TOKEN || "YOUR_ADMIN_TOKEN"; // Replace with your actual admin token

async function fixAllLocalizations() {
  console.log("Starting localization fix process...\n");

  // Content types that have i18n enabled based on the logs
  const contentTypesToFix = [
    { type: "api::article.article", ids: [27, 35, 39] },
    { type: "api::global.global", ids: [1] },
    { type: "api::home.home", ids: [3] },
    { type: "api::nav-menu.nav-menu", ids: [3] },
    // Add more content types and IDs as needed
  ];

  for (const content of contentTypesToFix) {
    console.log(`\nFixing ${content.type}...`);

    for (const id of content.ids) {
      try {
        const response = await fetch(
          `${strapiUrl}/auto-translate/fix-localization-issues`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contentType: content.type,
              entryId: id,
            }),
          }
        );

        const result = await response.json();

        if (response.ok) {
          console.log(`✓ Fixed ${content.type} ID ${id}`);
        } else {
          console.error(
            `✗ Failed to fix ${content.type} ID ${id}:`,
            result.error || result.message
          );
        }
      } catch (error) {
        console.error(
          `✗ Error fixing ${content.type} ID ${id}:`,
          error.message
        );
      }
    }
  }

  console.log("\n\nLocalization fix process completed!");
  console.log("Try editing your content again in Strapi admin.");
}

// Run the fix
fixAllLocalizations().catch(console.error);
