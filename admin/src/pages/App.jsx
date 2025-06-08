import React, { useState, useEffect } from "react";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [availableLocales, setAvailableLocales] = useState([]);
  const client = useFetchClient();
  const toggleNotification = useNotification();

  useEffect(() => {
    fetchConfig();
    fetchLocales();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await client.get("/auto-translate/config");
      setHasApiKey(data.data.hasApiKey);
    } catch (error) {
      toggleNotification({
        type: "warning",
        message: "Failed to load plugin configuration",
      });
    }
  };

  const fetchLocales = async () => {
    try {
      const { data } = await client.get("/auto-translate/locales");
      setAvailableLocales(data.data || []);
    } catch (error) {
      console.error("Failed to fetch locales:", error);
      // Don't set any fallback locales - only show what's configured in Strapi
      setAvailableLocales([]);
      toggleNotification({
        type: "warning",
        message:
          "Failed to fetch available locales. Please check your i18n configuration.",
      });
    }
  };

  const handleTranslateBulk = async () => {
    if (!selectedLanguage) {
      toggleNotification({
        type: "warning",
        message: "Please select a target language",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await client.post("/auto-translate/translate-bulk", {
        texts: ["Hello World", "Welcome to Strapi"],
        targetLanguage: selectedLanguage,
      });

      toggleNotification({
        type: "success",
        message: "Content translated successfully!",
      });

      console.log("Translation result:", response.data);
    } catch (error) {
      toggleNotification({
        type: "warning",
        message: "Translation failed: " + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslateAllPublished = async () => {
    if (!selectedLanguage) {
      toggleNotification({
        type: "warning",
        message: "Please select a target language",
      });
      return;
    }

    const confirmed = window.confirm(
      `This will translate ALL published content to ${selectedLanguage} and create new locale entries. This process may take a while. Continue?`
    );

    if (!confirmed) return;

    setIsBulkTranslating(true);
    try {
      const response = await client.post(
        "/auto-translate/translate-all-published",
        {
          targetLanguage: selectedLanguage,
        }
      );

      const { data, message } = response.data;

      if (data) {
        if (data.success > 0) {
          toggleNotification({
            type: "success",
            message:
              message || `Successfully translated ${data.success} entries!`,
          });
        } else if (
          data.success === 0 &&
          data.failed === 0 &&
          data.skipped === 0
        ) {
          toggleNotification({
            type: "info",
            message:
              "No published content found to translate. Make sure you have content types with i18n enabled and published content.",
          });
        } else if (data.skipped > 0 && data.success === 0) {
          toggleNotification({
            type: "info",
            message: `All ${data.skipped} entries were skipped (already translated or i18n not enabled).`,
          });
        } else {
          toggleNotification({
            type: "warning",
            message: `Translation completed: ${data.success} succeeded, ${data.failed} failed, ${data.skipped} skipped.`,
          });
        }

        // Log detailed results
        console.log("Translation results:", data);

        // Log errors if any
        if (data.errors && data.errors.length > 0) {
          console.error("Translation errors:", data.errors);
        }
      }
    } catch (error) {
      toggleNotification({
        type: "warning",
        message: "Failed to complete bulk translation: " + error.message,
      });
    } finally {
      setIsBulkTranslating(false);
    }
  };

  const containerStyle = {
    padding: "20px",
    maxWidth: "800px",
    margin: "0 auto",
  };

  const headerStyle = {
    marginBottom: "30px",
  };

  const sectionStyle = {
    marginBottom: "30px",
    padding: "20px",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
  };

  const selectStyle = {
    width: "100%",
    padding: "10px",
    fontSize: "16px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    marginBottom: "20px",
  };

  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#4945ff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    opacity: isLoading ? 0.6 : 1,
    marginRight: "10px",
  };

  const bulkButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#ff4945",
    opacity: isBulkTranslating ? 0.6 : 1,
  };

  const alertStyle = {
    padding: "20px",
    backgroundColor: "#fee",
    border: "1px solid #fcc",
    borderRadius: "4px",
    color: "#c00",
  };

  const infoStyle = {
    padding: "15px",
    backgroundColor: "#e3f2fd",
    border: "1px solid #90caf9",
    borderRadius: "4px",
    color: "#1565c0",
    marginTop: "20px",
  };

  if (!hasApiKey) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1>Auto Translate</h1>
          <p>Automatically translate your content using Google Translate</p>
        </div>
        <div style={alertStyle}>
          <h3>Google Translate API Key Required</h3>
          <p>
            Please set the GOOGLE_TRANSLATE_API_KEY environment variable to use
            this plugin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1>Auto Translate</h1>
        <p>Automatically translate your content using Google Translate</p>
      </div>

      <div style={sectionStyle}>
        <h2>Translation Settings</h2>
        <label htmlFor="language-select">Target Language:</label>
        <select
          id="language-select"
          style={selectStyle}
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          <option value="">Select a language</option>
          {availableLocales.length === 0 ? (
            <option value="" disabled>
              No target locales available
            </option>
          ) : (
            availableLocales.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.name || locale.code}
              </option>
            ))
          )}
        </select>

        {availableLocales.length === 0 && (
          <div style={{ ...alertStyle, marginBottom: "20px" }}>
            <p>
              <strong>No target locales available.</strong>
            </p>
            <p>
              Please go to Settings → Internationalization and add at least one
              locale besides the default (English) to enable translations.
            </p>
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <button
            style={buttonStyle}
            onClick={handleTranslateBulk}
            disabled={isLoading || availableLocales.length === 0}
          >
            {isLoading ? "Translating..." : "Test Translation"}
          </button>

          <button
            style={bulkButtonStyle}
            onClick={handleTranslateAllPublished}
            disabled={
              isBulkTranslating ||
              !selectedLanguage ||
              availableLocales.length === 0
            }
          >
            {isBulkTranslating
              ? "Starting Translation..."
              : "Translate All Published Content"}
          </button>
        </div>

        <div style={infoStyle}>
          <strong>Note:</strong> The "Translate All Published Content" button
          will:
          <ul style={{ marginTop: "10px", marginBottom: "0" }}>
            <li>
              Find all published content across all content types with i18n
              enabled
            </li>
            <li>Translate each piece of content to the selected language</li>
            <li>Create new locale entries for the translated content</li>
            <li>
              Skip content that already has translations in the target language
            </li>
          </ul>
          <br />
          <strong>Important:</strong> Only locales configured in Settings →
          Internationalization are shown above. To add more languages, go to
          Settings → Internationalization and add the desired locales first.
        </div>
      </div>

      <div style={sectionStyle}>
        <h2>How to Use</h2>
        <ol>
          <li>
            Set your Google Translate API key in the environment variable
            GOOGLE_TRANSLATE_API_KEY
          </li>
          <li>Select a target language from the dropdown above</li>
          <li>
            Use the "Test Translation" button to test with sample text, or use
            "Translate All Published Content" to translate all your content
          </li>
        </ol>

        <h3>API Endpoints:</h3>
        <ul>
          <li>
            POST /api/auto-translate/translate-entry - Translate a single entry
          </li>
          <li>
            POST /api/auto-translate/translate-bulk - Translate multiple texts
          </li>
          <li>
            POST /api/auto-translate/translate-all-published - Translate all
            published content
          </li>
          <li>GET /api/auto-translate/languages - Get available languages</li>
        </ul>
      </div>
    </div>
  );
};

export { App };
