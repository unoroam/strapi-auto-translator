const { Translate } = require("@google-cloud/translate").v2;

module.exports = ({ strapi }) => ({
  /**
   * Initialize Google Translate client
   */
  getTranslateClient() {
    const config = strapi.config.get("plugin::auto-translate");
    return new Translate({ key: config.googleApiKey });
  },

  /**
   * Translate text from source language to target language
   */
  async translateText(text, targetLanguage, sourceLanguage = "en") {
    if (!text || !targetLanguage) {
      return text;
    }

    try {
      const translate = this.getTranslateClient();
      const [translation] = await translate.translate(text, {
        from: sourceLanguage,
        to: targetLanguage,
      });
      return translation;
    } catch (error) {
      strapi.log.error(`Translation error: ${error.message}`);
      return text; // Return original text if translation fails
    }
  },

  /**
   * Translate an object's fields recursively
   */
  async translateObject(
    obj,
    targetLanguage,
    fieldsToTranslate = [],
    sourceLanguage = "en"
  ) {
    const translated = { ...obj };

    for (const field of fieldsToTranslate) {
      if (obj[field]) {
        if (typeof obj[field] === "string") {
          translated[field] = await this.translateText(
            obj[field],
            targetLanguage,
            sourceLanguage
          );
        } else if (
          typeof obj[field] === "object" &&
          !Array.isArray(obj[field])
        ) {
          // Handle nested objects (like rich text)
          translated[field] = await this.translateObject(
            obj[field],
            targetLanguage,
            Object.keys(obj[field]),
            sourceLanguage
          );
        }
      }
    }

    return translated;
  },

  /**
   * Get available languages for translation
   */
  async getAvailableLanguages() {
    try {
      const translate = this.getTranslateClient();
      const [languages] = await translate.getLanguages();
      return languages;
    } catch (error) {
      strapi.log.error(`Error fetching languages: ${error.message}`);
      return [];
    }
  },

  /**
   * Get available locales from Strapi i18n
   */
  async getAvailableLocales() {
    try {
      // Get all configured locales from i18n plugin
      const locales = await strapi.plugin("i18n").service("locales").find();
      strapi.log.info(
        `Raw locales from i18n plugin: ${JSON.stringify(locales)}`
      );

      const localeCodes = locales.map((locale) => locale.code);
      strapi.log.info(`Available locale codes: ${localeCodes.join(", ")}`);

      return localeCodes;
    } catch (error) {
      strapi.log.warn(`Could not fetch i18n locales: ${error.message}`);
      // Return empty array - only show what's actually configured
      return [];
    }
  },

  /**
   * Translate content entry
   */
  async translateEntry(
    entry,
    contentType,
    targetLanguage,
    sourceLanguage = "en"
  ) {
    const model = strapi.contentType(contentType);
    if (!model) {
      throw new Error(`Content type ${contentType} not found`);
    }

    // Get translatable fields (string and richtext)
    const translatableFields = Object.entries(model.attributes)
      .filter(([, attr]) => ["string", "text", "richtext"].includes(attr.type))
      .map(([name]) => name);

    return await this.translateObject(
      entry,
      targetLanguage,
      translatableFields,
      sourceLanguage
    );
  },

  /**
   * Get all published content from all content types
   */
  async getAllPublishedContent() {
    // Get all API content types
    const contentTypes = Object.keys(strapi.contentTypes).filter((key) =>
      key.startsWith("api::")
    );

    strapi.log.info(`Found ${contentTypes.length} content types to check`);
    strapi.log.info(`Content types: ${contentTypes.join(", ")}`);

    const allContent = [];

    for (const contentType of contentTypes) {
      try {
        const model = strapi.contentType(contentType);
        const hasDraftPublish = model.options?.draftAndPublish === true;

        strapi.log.info(
          `Checking ${contentType} - Draft & Publish: ${hasDraftPublish}`
        );

        // Build query - fetch all if draft & publish is not enabled
        const query = {
          populate: {
            localizations: {
              fields: ["id", "locale"],
            },
          },
          fields: ["*"], // Include all fields including publishedAt
        };

        if (hasDraftPublish) {
          // Use publicationState to get only published entries
          query.publicationState = "live";
          // Also add explicit filter for publishedAt field as extra safety
          query.filters = {
            publishedAt: {
              $notNull: true,
            },
          };
        }

        strapi.log.info(
          `Query for ${contentType}: ${JSON.stringify(query, null, 2)}`
        );

        const entries = await strapi.entityService.findMany(contentType, query);

        strapi.log.info(
          `Raw query result for ${contentType}: ${JSON.stringify(entries, null, 2)}`
        );

        // If we got no results with publicationState, try alternative approaches
        if (
          hasDraftPublish &&
          (!entries || (Array.isArray(entries) && entries.length === 0))
        ) {
          strapi.log.warn(
            `No results with publicationState for ${contentType}, trying alternative query...`
          );

          // Try without publicationState but with explicit publishedAt filter
          const alternativeQuery = {
            populate: {
              localizations: {
                fields: ["id", "locale"],
              },
            },
            fields: ["*"],
            filters: {
              publishedAt: {
                $notNull: true,
              },
            },
          };

          strapi.log.info(
            `Alternative query for ${contentType}: ${JSON.stringify(alternativeQuery, null, 2)}`
          );

          const alternativeEntries = await strapi.entityService.findMany(
            contentType,
            alternativeQuery
          );

          strapi.log.info(
            `Alternative query result for ${contentType}: ${JSON.stringify(alternativeEntries, null, 2)}`
          );

          if (
            alternativeEntries &&
            (Array.isArray(alternativeEntries)
              ? alternativeEntries.length > 0
              : alternativeEntries.id)
          ) {
            strapi.log.info(
              `Using alternative query results for ${contentType}`
            );
            // Use alternative results
            const finalEntries = alternativeEntries;

            // Continue with processing...
            // Handle different response formats
            let entriesArray = [];
            if (finalEntries) {
              if (finalEntries.results && Array.isArray(finalEntries.results)) {
                // Paginated response format
                entriesArray = finalEntries.results;
                strapi.log.info(
                  `Paginated response: ${entriesArray.length} entries`
                );
              } else if (Array.isArray(finalEntries)) {
                // Direct array response
                entriesArray = finalEntries;
              } else if (finalEntries.id) {
                // Single entry response
                entriesArray = [finalEntries];
              } else if (finalEntries.data) {
                // Wrapped response format
                if (Array.isArray(finalEntries.data)) {
                  entriesArray = finalEntries.data;
                } else if (finalEntries.data.id) {
                  entriesArray = [finalEntries.data];
                }
              }
            }

            strapi.log.info(
              `Found ${entriesArray.length} entries in ${contentType} using alternative query`
            );

            if (entriesArray.length > 0) {
              // Filter out null/undefined entries and ensure only published entries
              const validEntries = entriesArray.filter(
                (entry) => entry && entry.id && entry.publishedAt
              );

              if (validEntries.length > 0) {
                strapi.log.info(
                  `Found ${validEntries.length} valid published entries in ${contentType}`
                );

                // Log if any entries were filtered out for being unpublished
                const unpublishedCount =
                  entriesArray.length - validEntries.length;
                if (unpublishedCount > 0) {
                  strapi.log.info(
                    `Filtered out ${unpublishedCount} unpublished entries from ${contentType}`
                  );
                }

                allContent.push({
                  contentType,
                  entries: validEntries,
                });
              }
            }

            continue; // Skip the normal processing for this content type
          }
        }

        // Final fallback: try to get all entries and filter by publishedAt
        if (
          hasDraftPublish &&
          (!entries || (Array.isArray(entries) && entries.length === 0))
        ) {
          strapi.log.warn(
            `Both queries failed for ${contentType}, trying final fallback (fetch all and filter)...`
          );

          try {
            const fallbackQuery = {
              populate: {
                localizations: {
                  fields: ["id", "locale"],
                },
              },
              fields: ["*"],
              // No filters - get everything
            };

            strapi.log.info(
              `Fallback query for ${contentType}: ${JSON.stringify(fallbackQuery, null, 2)}`
            );

            const fallbackEntries = await strapi.entityService.findMany(
              contentType,
              fallbackQuery
            );

            strapi.log.info(
              `Fallback query result for ${contentType}: Found ${
                Array.isArray(fallbackEntries)
                  ? fallbackEntries.length
                  : fallbackEntries
                    ? 1
                    : 0
              } total entries`
            );

            if (fallbackEntries) {
              // Process fallback results
              let fallbackArray = [];
              if (
                fallbackEntries.results &&
                Array.isArray(fallbackEntries.results)
              ) {
                fallbackArray = fallbackEntries.results;
              } else if (Array.isArray(fallbackEntries)) {
                fallbackArray = fallbackEntries;
              } else if (fallbackEntries.id) {
                fallbackArray = [fallbackEntries];
              } else if (fallbackEntries.data) {
                if (Array.isArray(fallbackEntries.data)) {
                  fallbackArray = fallbackEntries.data;
                } else if (fallbackEntries.data.id) {
                  fallbackArray = [fallbackEntries.data];
                }
              }

              strapi.log.info(
                `Fallback processed ${fallbackArray.length} total entries for ${contentType}`
              );

              // Log details of each entry for debugging
              fallbackArray.forEach((entry, index) => {
                strapi.log.info(
                  `Entry ${index + 1}: ID=${entry?.id}, publishedAt=${entry?.publishedAt}, published=${entry?.published}, status=${entry?.status}, locale=${entry?.locale}`
                );
              });

              // Filter to only published entries
              const publishedEntries = fallbackArray.filter(
                (entry) => entry && entry.id && entry.publishedAt
              );

              strapi.log.info(
                `Fallback found ${publishedEntries.length} published entries out of ${fallbackArray.length} total for ${contentType}`
              );

              if (publishedEntries.length > 0) {
                allContent.push({
                  contentType,
                  entries: publishedEntries,
                });
                continue; // Skip normal processing
              } else if (fallbackArray.length > 0) {
                // Try alternative published field checks
                strapi.log.info(
                  `Trying alternative published field checks for ${contentType}...`
                );

                // Try different ways to identify published content
                const altPublishedEntries = fallbackArray.filter((entry) => {
                  if (!entry || !entry.id) return false;

                  // Check various possible published indicators
                  return (
                    entry.publishedAt ||
                    entry.published === true ||
                    entry.status === "published" ||
                    entry.publicationState === "live" ||
                    (entry.publishedAt === null && entry.published !== false) // Some versions might use null for published
                  );
                });

                strapi.log.info(
                  `Alternative published check found ${altPublishedEntries.length} entries for ${contentType}`
                );

                if (altPublishedEntries.length > 0) {
                  allContent.push({
                    contentType,
                    entries: altPublishedEntries,
                  });
                  continue; // Skip normal processing
                }
              }
            } else {
              // Try one more approach with direct database query
              strapi.log.warn(
                `Trying direct database query for ${contentType}...`
              );

              try {
                const dbEntries = await strapi.db.query(contentType).findMany({
                  populate: {
                    localizations: {
                      fields: ["id", "locale"],
                    },
                  },
                });

                strapi.log.info(
                  `Direct DB query found ${dbEntries?.length || 0} entries for ${contentType}`
                );

                if (dbEntries && dbEntries.length > 0) {
                  // Log details of each DB entry
                  dbEntries.forEach((entry, index) => {
                    strapi.log.info(
                      `DB Entry ${index + 1}: ID=${entry?.id}, publishedAt=${entry?.publishedAt}, published=${entry?.published}, status=${entry?.status}, locale=${entry?.locale}`
                    );
                  });

                  // Filter for published entries
                  const dbPublishedEntries = dbEntries.filter(
                    (entry) =>
                      entry &&
                      entry.id &&
                      (entry.publishedAt ||
                        entry.published === true ||
                        entry.status === "published")
                  );

                  strapi.log.info(
                    `DB query found ${dbPublishedEntries.length} published entries for ${contentType}`
                  );

                  if (dbPublishedEntries.length > 0) {
                    allContent.push({
                      contentType,
                      entries: dbPublishedEntries,
                    });
                    continue; // Skip normal processing
                  }
                }
              } catch (dbError) {
                strapi.log.error(
                  `Direct DB query failed for ${contentType}: ${dbError.message}`
                );
              }
            }
          } catch (fallbackError) {
            strapi.log.error(
              `Fallback query failed for ${contentType}: ${fallbackError.message}`
            );
          }
        }

        // Handle different response formats
        let entriesArray = [];
        if (entries) {
          if (entries.results && Array.isArray(entries.results)) {
            // Paginated response format
            entriesArray = entries.results;
            strapi.log.info(
              `Paginated response: ${entriesArray.length} entries`
            );
          } else if (Array.isArray(entries)) {
            // Direct array response
            entriesArray = entries;
          } else if (entries.id) {
            // Single entry response
            entriesArray = [entries];
          } else if (entries.data) {
            // Wrapped response format
            if (Array.isArray(entries.data)) {
              entriesArray = entries.data;
            } else if (entries.data.id) {
              entriesArray = [entries.data];
            }
          }
        }

        strapi.log.info(
          `Found ${entriesArray.length} entries in ${contentType}`
        );

        if (entriesArray.length > 0) {
          // Filter out null/undefined entries and ensure only published entries
          const validEntries = entriesArray.filter(
            (entry) => entry && entry.id && entry.publishedAt
          );

          if (validEntries.length > 0) {
            strapi.log.info(
              `Found ${validEntries.length} valid published entries in ${contentType}`
            );

            // Log if any entries were filtered out for being unpublished
            const unpublishedCount = entriesArray.length - validEntries.length;
            if (unpublishedCount > 0) {
              strapi.log.info(
                `Filtered out ${unpublishedCount} unpublished entries from ${contentType}`
              );
            }

            allContent.push({
              contentType,
              entries: validEntries,
            });
          }
        }
      } catch (error) {
        strapi.log.warn(
          `Failed to fetch content for ${contentType}: ${error.message}`
        );
      }
    }

    strapi.log.info(`Total content collections found: ${allContent.length}`);
    return allContent;
  },

  /**
   * Translate all published content and create new locale entries
   */
  async translateAllPublishedContent(targetLanguage, sourceLanguage = "en") {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      skipped: 0,
    };

    try {
      // First, check if the target locale is available
      const availableLocales = await this.getAvailableLocales();
      strapi.log.info(`Available locales: ${availableLocales.join(", ")}`);

      if (!availableLocales.includes(targetLanguage)) {
        strapi.log.error(
          `Target locale '${targetLanguage}' is not configured in Strapi i18n. Available locales: ${availableLocales.join(", ")}`
        );
        throw new Error(
          `Locale '${targetLanguage}' is not available. Please add it in Settings > Internationalization.`
        );
      }

      // Get all published content
      const allContent = await this.getAllPublishedContent();

      strapi.log.info(
        `getAllPublishedContent returned ${allContent.length} content collections`
      );

      // Log details of what was found
      allContent.forEach((contentCollection, index) => {
        strapi.log.info(
          `Collection ${index + 1}: ${contentCollection.contentType} with ${contentCollection.entries.length} entries`
        );
        contentCollection.entries.forEach((entry, entryIndex) => {
          strapi.log.info(
            `  Entry ${entryIndex + 1}: ID=${entry.id}, locale=${entry.locale}, publishedAt=${entry.publishedAt}, documentId=${entry.documentId}`
          );
        });
      });

      if (allContent.length === 0) {
        strapi.log.warn("No published content found to translate");
        return results;
      }

      for (const { contentType, entries } of allContent) {
        strapi.log.info(
          `🔄 Starting to process ${contentType} with ${entries.length} entries`
        );

        const model = strapi.contentType(contentType);

        // Check if the content type has i18n enabled
        const hasI18n = model.pluginOptions?.i18n?.localized === true;

        strapi.log.info(`${contentType} - i18n enabled: ${hasI18n}`);

        if (!hasI18n) {
          strapi.log.info(`Skipping ${contentType} - i18n not enabled`);
          results.skipped += entries.length;
          continue;
        }

        strapi.log.info(
          `Processing ${entries.length} entries from ${contentType} for translation to ${targetLanguage}`
        );

        for (const entry of entries) {
          strapi.log.info(
            `📝 Processing entry ID ${entry.id} from ${contentType}`
          );

          try {
            // Skip if this entry is already a localization (not the main entry)
            if (entry.locale && entry.locale !== sourceLanguage) {
              strapi.log.info(
                `Skipping ${contentType} ID ${entry.id} - not source language (${entry.locale})`
              );
              results.skipped++;
              continue;
            }

            // Only translate PUBLISHED content - use same logic as alternative published check
            const isPublished =
              entry.publishedAt ||
              entry.published === true ||
              entry.status === "published" ||
              entry.publicationState === "live" ||
              (entry.publishedAt === null && entry.published !== false);

            if (!isPublished) {
              strapi.log.info(
                `Skipping ${contentType} ID ${entry.id} - not published (publishedAt=${entry.publishedAt}, published=${entry.published}, status=${entry.status})`
              );
              results.skipped++;
              continue;
            }

            strapi.log.info(
              `✅ Entry ${entry.id} is published - proceeding with translation`
            );

            // Check if locale variant already exists for this document
            if (!entry.documentId) {
              strapi.log.error(
                `Entry ${entry.id} is missing documentId - cannot create locale variant`
              );
              results.failed++;
              results.errors.push({
                contentType,
                entryId: entry.id,
                error: "Missing documentId",
              });
              continue;
            }

            // Check if translation already exists for this document and locale
            const existingVariant = await strapi.entityService.findMany(
              contentType,
              {
                filters: {
                  documentId: entry.documentId,
                  locale: targetLanguage,
                },
                limit: 1,
              }
            );

            // Handle different response formats
            let existingArray = [];
            if (existingVariant) {
              if (Array.isArray(existingVariant)) {
                existingArray = existingVariant;
              } else if (
                existingVariant.results &&
                Array.isArray(existingVariant.results)
              ) {
                existingArray = existingVariant.results;
              } else if (
                existingVariant.data &&
                Array.isArray(existingVariant.data)
              ) {
                existingArray = existingVariant.data;
              }
            }

            if (existingArray.length > 0) {
              strapi.log.info(
                `Locale variant already exists for ${contentType} documentId ${entry.documentId} in ${targetLanguage} - skipping`
              );
              results.skipped++;
              continue;
            }

            // Translate the entry
            const translatedData = await this.translateEntry(
              entry,
              contentType,
              targetLanguage,
              sourceLanguage
            );

            // Remove fields that shouldn't be duplicated, but keep documentId
            delete translatedData.id;
            delete translatedData.createdAt;
            delete translatedData.updatedAt;
            delete translatedData.publishedAt;
            delete translatedData.locale;
            delete translatedData.localizations;

            // Create locale variant with the same documentId
            const createData = {
              ...translatedData,
              documentId: entry.documentId, // Keep the same documentId for locale variant
              locale: targetLanguage,
            };

            // Set publishedAt based on our consistent published logic
            if (isPublished) {
              createData.publishedAt = new Date();
            }

            strapi.log.info(
              `Creating ${targetLanguage} locale variant for ${contentType} documentId ${entry.documentId} (original isPublished: ${isPublished})`
            );

            try {
              let newEntry;

              // Try Documents API first (recommended for Strapi v5)
              const documentsService = strapi.documents(contentType);
              if (documentsService) {
                strapi.log.info(`Using Documents API to create locale variant`);

                newEntry = await documentsService.create({
                  data: createData,
                  locale: targetLanguage,
                  status: isPublished ? "published" : "draft",
                });

                if (newEntry && newEntry.id) {
                  strapi.log.info(
                    `SUCCESS: Created ${targetLanguage} locale variant using Documents API - ID: ${newEntry.id}, DocumentID: ${newEntry.documentId}, Locale: ${newEntry.locale}, Status: ${isPublished ? "published" : "draft"}`
                  );
                } else {
                  throw new Error(
                    "Documents API creation failed - no ID returned"
                  );
                }
              } else {
                // Fallback to Entity Service
                strapi.log.info(
                  `Using Entity Service to create locale variant`
                );

                const createParams = {
                  data: createData,
                  locale: targetLanguage,
                  publicationState: isPublished ? "live" : "preview",
                };

                newEntry = await strapi.entityService.create(
                  contentType,
                  createParams
                );

                if (newEntry && newEntry.id) {
                  strapi.log.info(
                    `SUCCESS: Created ${targetLanguage} locale variant using Entity Service - ID: ${newEntry.id}, DocumentID: ${newEntry.documentId}, Locale: ${newEntry.locale}, PublicationState: ${isPublished ? "live" : "preview"}`
                  );
                } else {
                  throw new Error(
                    "Entity Service creation failed - no ID returned"
                  );
                }
              }

              // Verify the locale variant was created correctly
              if (newEntry.documentId !== entry.documentId) {
                strapi.log.error(
                  `❌ CRITICAL: Locale variant has wrong documentId! Expected: ${entry.documentId}, Got: ${newEntry.documentId}`
                );
              } else if (newEntry.locale !== targetLanguage) {
                strapi.log.error(
                  `❌ CRITICAL: Locale variant has wrong locale! Expected: ${targetLanguage}, Got: ${newEntry.locale}`
                );
              } else {
                strapi.log.info(
                  `✅ Locale variant created successfully with correct documentId and locale`
                );
              }

              // Ensure the original entry remains published if it was published
              if (isPublished && !entry.publishedAt) {
                strapi.log.info(
                  `🔧 Ensuring original entry ${entry.id} remains published...`
                );

                try {
                  // Try to update the original entry to ensure it stays published
                  if (documentsService) {
                    await documentsService.update({
                      documentId: entry.documentId,
                      locale: entry.locale || sourceLanguage,
                      data: {},
                      status: "published",
                    });
                    strapi.log.info(
                      `✅ Updated original entry ${entry.id} to published status using Documents API`
                    );
                  } else {
                    await strapi.entityService.update(contentType, entry.id, {
                      data: {
                        publishedAt: new Date(),
                      },
                      publicationState: "live",
                    });
                    strapi.log.info(
                      `✅ Updated original entry ${entry.id} to published status using Entity Service`
                    );
                  }
                } catch (updateError) {
                  strapi.log.warn(
                    `⚠️ Could not update original entry publication status: ${updateError.message}`
                  );
                }
              }

              results.success++;
            } catch (createError) {
              strapi.log.error(
                `Failed to create locale variant: ${createError.message}`
              );
              results.failed++;
              results.errors.push({
                contentType,
                entryId: entry.id,
                error: createError.message,
              });
            }
          } catch (error) {
            strapi.log.error(
              `Failed to process ${contentType} ID ${entry.id}: ${error.message}`
            );
            results.failed++;
            results.errors.push({
              contentType,
              entryId: entry.id,
              error: error.message,
            });
          }
        }
      }

      strapi.log.info(
        `Translation complete: ${results.success} succeeded, ${results.failed} failed, ${results.skipped} skipped`
      );
    } catch (error) {
      strapi.log.error(`Bulk translation failed: ${error.message}`);
      throw error;
    }

    return results;
  },

  /**
   * Diagnose and fix localization issues
   */
  async fixLocalizationIssues(contentType, entryId) {
    try {
      strapi.log.info(
        `Diagnosing localization issues for ${contentType} ID ${entryId}`
      );

      const entry = await strapi.entityService.findOne(contentType, entryId, {
        populate: ["localizations"],
      });

      if (!entry) {
        strapi.log.warn(`Entry ${entryId} not found`);
        return;
      }

      strapi.log.info(`Entry ${entryId} locale: ${entry.locale}`);
      strapi.log.info(`Entry ${entryId} documentId: ${entry.documentId}`);
      strapi.log.info(
        `Entry ${entryId} localizations: ${JSON.stringify(entry.localizations)}`
      );

      // Check if entry has documentId
      if (!entry.documentId) {
        strapi.log.error(`Entry ${entryId} is missing documentId!`);
      }

      // Check for self-references
      const localizations = (entry.localizations || []).map(
        (loc) => loc.id || loc
      );
      if (localizations.includes(entryId)) {
        strapi.log.warn(
          `Entry ${entryId} has self-reference in localizations!`
        );

        // Remove self-reference
        const cleanLocalizations = localizations.filter((id) => id !== entryId);

        strapi.log.info(
          `Cleaning localizations for ${entryId}: ${cleanLocalizations.join(", ")}`
        );

        await strapi.db.query(contentType).update({
          where: { id: entryId },
          data: {
            localizations: cleanLocalizations,
          },
        });

        strapi.log.info(`Fixed self-reference for entry ${entryId}`);
      }

      // Check each linked localization
      for (const locId of localizations) {
        if (locId === entryId) continue; // Skip self

        try {
          const linkedEntry = await strapi.entityService.findOne(
            contentType,
            locId,
            {
              populate: ["localizations"],
            }
          );

          if (!linkedEntry) {
            strapi.log.warn(
              `Linked entry ${locId} not found - removing from localizations`
            );
            const cleanLocalizations = localizations.filter(
              (id) => id !== locId
            );

            await strapi.db.query(contentType).update({
              where: { id: entryId },
              data: {
                localizations: cleanLocalizations,
              },
            });
          } else {
            // Check if linked entry has documentId
            if (!linkedEntry.documentId) {
              strapi.log.error(`Linked entry ${locId} is missing documentId!`);
            }
          }
        } catch (error) {
          strapi.log.error(
            `Failed to check linked entry ${locId}: ${error.message}`
          );
        }
      }
    } catch (error) {
      strapi.log.error(
        `Failed to diagnose localization issues: ${error.message}`
      );
    }
  },
});
