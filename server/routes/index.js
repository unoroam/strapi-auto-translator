module.exports = [
  {
    method: "POST",
    path: "/translate-entry",
    handler: "translation.translateEntry",
    config: {
      policies: [],
      auth: {
        scope: ["admin"],
      },
    },
  },
  {
    method: "GET",
    path: "/languages",
    handler: "translation.getLanguages",
    config: {
      policies: [],
      auth: {
        scope: ["admin"],
      },
    },
  },
  {
    method: "GET",
    path: "/locales",
    handler: "translation.getLocales",
    config: {
      policies: [],
      auth: {
        scope: ["admin"],
      },
    },
  },
  {
    method: "POST",
    path: "/translate-bulk",
    handler: "translation.translateBulk",
    config: {
      policies: [],
      auth: {
        scope: ["admin"],
      },
    },
  },
  {
    method: "GET",
    path: "/config",
    handler: "translation.getConfig",
    config: {
      policies: [],
      auth: {
        scope: ["admin"],
      },
    },
  },
  {
    method: "POST",
    path: "/translate-all-published",
    handler: "translation.translateAllPublished",
    config: {
      policies: [],
      auth: {
        scope: ["admin"],
      },
    },
  },
  {
    method: "POST",
    path: "/fix-localization-issues",
    handler: "translation.fixLocalizationIssues",
    config: {
      policies: [],
      auth: {
        scope: ["admin"],
      },
    },
  },
];
