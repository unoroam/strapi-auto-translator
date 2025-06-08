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
        }

        const entries = await strapi.entityService.findMany(contentType, query);

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
          // Filter out null/undefined entries
          const validEntries = entriesArray.filter(
            (entry) => entry && entry.id
          );

          if (validEntries.length > 0) {
            strapi.log.info(
              `Found ${validEntries.length} valid published entries in ${contentType}`
            );
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

      if (allContent.length === 0) {
        strapi.log.warn("No published content found to translate");
        return results;
      }

      for (const { contentType, entries } of allContent) {
        const model = strapi.contentType(contentType);

        // Check if the content type has i18n enabled
        const hasI18n = model.pluginOptions?.i18n?.localized === true;

        if (!hasI18n) {
          strapi.log.info(`Skipping ${contentType} - i18n not enabled`);
          results.skipped += entries.length;
          continue;
        }

        strapi.log.info(
          `Processing ${entries.length} entries from ${contentType} for translation to ${targetLanguage}`
        );

        for (const entry of entries) {
          try {
            // Make a copy of the entry to avoid modifying the original
            const originalEntry = { ...entry };

            // Skip if this entry is already a localization (not the main entry)
            if (entry.locale && entry.locale !== sourceLanguage) {
              strapi.log.info(
                `Skipping ${contentType} ID ${entry.id} - not source language (${entry.locale})`
              );
              results.skipped++;
              continue;
            }

            // Check if translation already exists for this locale
            let existingTranslation = false;

            // First, check if this entry already has localizations
            if (entry.localizations) {
              existingTranslation = entry.localizations.some(
                (loc) =>
                  loc.locale === targetLanguage ||
                  (loc.attributes && loc.attributes.locale === targetLanguage)
              );

              if (existingTranslation) {
                strapi.log.info(
                  `Translation already exists for ${contentType} ID ${entry.id} in ${targetLanguage}`
                );
                results.skipped++;
                continue;
              }
            }

            // Also check by searching for existing translations
            const searchResults = await strapi.entityService.findMany(
              contentType,
              {
                filters: {
                  locale: targetLanguage,
                  ...(entry.slug && { slug: entry.slug }),
                },
                limit: 1,
              }
            );

            if (searchResults && searchResults.length > 0) {
              strapi.log.info(
                `Translation already exists for ${contentType} ID ${entry.id} in ${targetLanguage}`
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

            // Remove fields that shouldn't be duplicated
            delete translatedData.id;
            delete translatedData.documentId; // IMPORTANT: Remove documentId so Strapi generates a new one
            delete translatedData.createdAt;
            delete translatedData.updatedAt;
            delete translatedData.publishedAt;
            delete translatedData.locale;
            delete translatedData.localizations;

            // Create localized version
            let createData = {
              ...translatedData,
            };

            // Only set publishedAt if the original was published
            if (originalEntry.publishedAt) {
              createData.publishedAt = new Date();
            }

            strapi.log.info(
              `Creating ${targetLanguage} localization for ${contentType} ID ${entry.id}`
            );

            try {
              // Create the localized entry with locale
              const createParams = {
                data: {
                  ...createData,
                  locale: targetLanguage,
                },
                publicationState: originalEntry.publishedAt
                  ? "live"
                  : "preview",
              };

              const newEntry = await strapi.entityService.create(
                contentType,
                createParams
              );

              if (newEntry && newEntry.id) {
                strapi.log.info(
                  `SUCCESS: Created ${targetLanguage} localization for ${contentType} - New ID: ${newEntry.id}`
                );

                // Link the entries together
                try {
                  // Get current localizations of the main entry
                  const mainEntry = await strapi.entityService.findOne(
                    contentType,
                    originalEntry.id,
                    {
                      populate: ["localizations"],
                    }
                  );

                  const currentLocalizations = (mainEntry.localizations || [])
                    .map((loc) => loc.id || loc)
                    .filter((id) => id && id !== originalEntry.id);

                  if (!currentLocalizations.includes(newEntry.id)) {
                    currentLocalizations.push(newEntry.id);

                    // Update the main entry with localizations
                    await strapi.db.query(contentType).update({
                      where: { id: originalEntry.id },
                      data: {
                        localizations: currentLocalizations,
                      },
                    });

                    // Update the new entry to link back
                    await strapi.db.query(contentType).update({
                      where: { id: newEntry.id },
                      data: {
                        localizations: [originalEntry.id],
                      },
                    });
                  }
                } catch (linkError) {
                  strapi.log.warn(
                    `Failed to link localizations: ${linkError.message}`
                  );
                }

                results.success++;
              } else {
                throw new Error("Entry creation failed - no ID returned");
              }
            } catch (createError) {
              strapi.log.error(
                `Failed to create localization: ${createError.message}`
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
        } catch (e) {
          strapi.log.error(
            `Error checking linked entry ${locId}: ${e.message}`
          );
        }
      }

      strapi.log.info(`Diagnosis complete for ${contentType} ID ${entryId}`);
    } catch (error) {
      strapi.log.error(
        `Failed to diagnose localization issues: ${error.message}`
      );
    }
  },
});
