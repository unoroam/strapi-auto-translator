/**
 * Script to fix all localization issues in the database
 * Run with: node scripts/fix-all-localizations.js
 */

const strapiUrl = "http://localhost:1337";
const adminToken =
  process.env.ADMIN_TOKEN ||
  "d1de169b18f2933a3e25d1b5783fb12f2297b1dce66fa9ab4e9274ace43c706ab08bee4cd5e6aa051861449eb12ea1ead55094f73a4a7c831cac96c30cd0fc28050545f38c7f66a14536cee04e6032d3a2270871db14da6fc54dd80d33495cfea6c686ba237ff8b84686b391a33f24f82a4f48aff9c7619bc98bc0f6912e7a4d"; // Replace with your actual admin token

async function fixAllLocalizations() {
  console.log("Starting localization fix process...\n");

  console.log("Admin token:", adminToken);
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
