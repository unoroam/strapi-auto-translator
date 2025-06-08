module.exports = {
  register({ strapi }) {
    // Register plugin
  },
  bootstrap({ strapi }) {
    // Bootstrap plugin
  },
  config: {
    default: ({ env }) => ({
      googleApiKey: env("GOOGLE_TRANSLATE_API_KEY", ""),
      sourceLanguage: "en",
      targetLanguages: ["es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar"],
    }),
    validator: (config) => {
      console.log("Validating config:", config); // Debug log
      if (!config.googleApiKey) {
        console.warn(
          "Google Translate API key is not set. Please set GOOGLE_TRANSLATE_API_KEY environment variable."
        );
      }
    },
  },
  services: require("./server/services"),
  controllers: require("./server/controllers"),
  routes: require("./server/routes"),
};
