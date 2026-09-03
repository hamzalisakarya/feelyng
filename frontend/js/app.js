const translations = {
    de: {
        pageTitle: "Feelyng – Strom, Gas & Internet",
        languageNavigation: "Sprachauswahl",
        headline: "Strom, Gas & Internet einfach vergleichen",
        supportLanguages: "Persönliche Unterstützung auf Deutsch und Türkisch.",
        supportDescription: "Wir helfen dir bei Fragen rund um Strom, Gas und Internet und begleiten dich beim Tarifwechsel.",
        whatsAppButton: "WhatsApp kontaktieren",
        imprintLink: "Impressum",
        privacyLink: "Datenschutz"
    },
    tr: {
        pageTitle: "Feelyng – Elektrik, Doğal Gaz ve İnternet",
        languageNavigation: "Dil seçimi",
        headline: "Elektrik, doğal gaz ve internet tarifelerini kolayca karşılaştırın",
        supportLanguages: "Almanca ve Türkçe kişisel destek.",
        supportDescription: "Elektrik, doğal gaz ve internetle ilgili sorularınızda size yardımcı oluyor ve tarife değişikliği sürecinde yanınızda oluyoruz.",
        whatsAppButton: "WhatsApp ile iletişime geç",
        imprintLink: "Yasal Bilgiler",
        privacyLink: "Gizlilik"
    }
};

const storageKey = "feelyng-language";

function setLanguage(language) {
    const selectedLanguage = translations[language] ? language : "de";

    document.documentElement.lang = selectedLanguage;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.dataset.i18n;
        element.textContent = translations[selectedLanguage][key];
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
        const key = element.dataset.i18nAriaLabel;
        element.setAttribute("aria-label", translations[selectedLanguage][key]);
    });

    document.querySelectorAll("[data-language]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.language === selectedLanguage));
    });

    try {
        localStorage.setItem(storageKey, selectedLanguage);
    } catch {
        // The page remains usable when browser storage is unavailable.
    }
}

document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
});

let savedLanguage = "de";

try {
    savedLanguage = localStorage.getItem(storageKey) || "de";
} catch {
    // German remains the default when browser storage is unavailable.
}

setLanguage(savedLanguage);
