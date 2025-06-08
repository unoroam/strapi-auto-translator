/**
 * Auto-Translate Response Middleware
 *
 * Automatically translates API responses based on the Accept-Language header
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Continue with the request
    await next();

    // Only process successful GET requests with JSON responses
    if (
      ctx.method !== "GET" ||
      ctx.status !== 200 ||
      !ctx.body ||
      typeof ctx.body !== "object" ||
      !ctx.path.startsWith("/api/")
    ) {
      return;
    }

    // Check for Accept-Language header
    const acceptLanguage = ctx.headers["accept-language"];
    if (!acceptLanguage || acceptLanguage.startsWith("en")) {
      return;
    }

    // Extract the primary language code
    const targetLanguage = acceptLanguage
      .split(",")[0]
      .split("-")[0]
      .toLowerCase();

    // Get supported languages from plugin config
    const pluginConfig = strapi.plugin("auto-translate").config;
    if (!pluginConfig.targetLanguages.includes(targetLanguage)) {
      return;
    }

    try {
      const translationService = strapi
        .plugin("auto-translate")
        .service("translation");

      // Helper function to translate response data
      const translateResponseData = async (data) => {
        if (Array.isArray(data)) {
          return Promise.all(data.map((item) => translateResponseData(item)));
        }

        if (data && typeof data === "object") {
          // Handle Strapi v4/v5 response format
          if (data.data) {
            data.data = await translateResponseData(data.data);
            return data;
          }

          // Get the content type from the response
          const contentType =
            ctx.state?.route?.config?.auth?.scope?.[0] ||
            ctx.path.split("/")[2]; // Extract from path as fallback

          if (contentType && data.id) {
            // This looks like a content entry, try to translate it
            try {
              const fullContentType = `api::${contentType}.${contentType}`;
              const translated = await translationService.translateEntry(
                data,
                fullContentType,
                targetLanguage,
              );
              return { ...data, ...translated };
            } catch (error) {
              // If translation fails, return original
              strapi.log.warn(
                `Failed to translate ${contentType}:`,
                error.message,
              );
              return data;
            }
          }

          // Recursively translate nested objects
          const translated = {};
          for (const [key, value] of Object.entries(data)) {
            if (
              typeof value === "string" &&
              value.length > 0 &&
              key !== "id" &&
              key !== "createdAt" &&
              key !== "updatedAt"
            ) {
              translated[key] = await translationService.translateText(
                value,
                targetLanguage,
              );
            } else if (typeof value === "object" && value !== null) {
              translated[key] = await translateResponseData(value);
            } else {
              translated[key] = value;
            }
          }
          return translated;
        }

        return data;
      };

      // Translate the response body
      ctx.body = await translateResponseData(ctx.body);

      // Add a header to indicate the response was translated
      ctx.set("X-Translated-To", targetLanguage);
      ctx.set("X-Original-Language", "en");
    } catch (error) {
      strapi.log.error("Auto-translate middleware error:", error);
      // On error, return the original response
    }
  };
};
