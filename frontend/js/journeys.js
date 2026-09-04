const gasEstimatorConfig = {
    apartmentKwhPerSquareMeter: 130,
    houseKwhPerSquareMeter: 155,
    gasHotWaterPerPerson: 600,
    rangePercent: 15,
    roundingStep: 100
};

let gasEstimate = null;
let gasConsumptionEstimated = false;
let internetData = null;

function journeyLanguage() {
    return document.documentElement.lang === "tr" ? "tr" : "de";
}

function updateJourneyCopy(language = journeyLanguage()) {
    document.querySelectorAll("[data-de][data-tr]").forEach((element) => {
        element.textContent = element.dataset[language];
    });
    if (gasEstimate) renderGasEstimate();
    if (internetData && !document.querySelector("[data-summary-section]")?.hidden) renderInternetSummary(internetData);
    renderGasCost();
}

document.addEventListener("feelyng:languagechange", (event) => updateJourneyCopy(event.detail.language));

function localizedNumber(value, decimals = 0) {
    return new Intl.NumberFormat(journeyLanguage() === "tr" ? "tr-TR" : "de-DE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

function roundGas(value) {
    return Math.round(value / gasEstimatorConfig.roundingStep) * gasEstimatorConfig.roundingStep;
}

function buildMailto(subject, body) {
    return `mailto:info@feelyng.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const gasForm = document.querySelector("#gas-form");
const gasEstimator = document.querySelector("#gas-estimator");
const gasEstimatorForm = document.querySelector("#gas-estimator-form");
const gasConsumption = document.querySelector("#gas-consumption");
const gasPayment = document.querySelector("#gas-payment");

document.querySelector("[data-gas-toggle]")?.addEventListener("click", (event) => {
    gasEstimator.hidden = !gasEstimator.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!gasEstimator.hidden));
    if (!gasEstimator.hidden) gasEstimator.scrollIntoView({ behavior: "smooth" });
});

function calculateGasEstimate(data) {
    const area = Number(data.get("area"));
    const people = Number(data.get("people"));
    const rate = data.get("building") === "house"
        ? gasEstimatorConfig.houseKwhPerSquareMeter
        : gasEstimatorConfig.apartmentKwhPerSquareMeter;
    const hotWater = data.get("hotWater") === "yes"
        ? gasEstimatorConfig.gasHotWaterPerPerson * people
        : 0;
    const center = roundGas((area * rate) + hotWater);
    const margin = center * gasEstimatorConfig.rangePercent / 100;
    return { center, minimum: roundGas(center - margin), maximum: roundGas(center + margin) };
}

function renderGasEstimate() {
    const prefix = journeyLanguage() === "tr" ? "yaklaşık" : "ca.";
    const unit = journeyLanguage() === "tr" ? "kWh/yıl" : "kWh/Jahr";
    document.querySelector("[data-gas-range]").textContent =
        `${prefix} ${localizedNumber(gasEstimate.minimum)}–${localizedNumber(gasEstimate.maximum)} ${unit}`;
}

gasEstimatorForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!gasEstimatorForm.reportValidity()) return;
    const data = new FormData(gasEstimatorForm);
    const result = document.querySelector("[data-gas-result]");
    const warning = document.querySelector("[data-gas-warning]");
    if (data.get("heating") === "no") {
        gasEstimate = null;
        result.hidden = true;
        warning.hidden = false;
        warning.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
    }
    warning.hidden = true;
    gasEstimate = calculateGasEstimate(data);
    renderGasEstimate();
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("[data-gas-apply]")?.addEventListener("click", () => {
    if (!gasEstimate) return;
    gasConsumption.value = gasEstimate.center;
    gasConsumptionEstimated = true;
    document.querySelector("[data-gas-estimated]").hidden = false;
    gasEstimator.hidden = true;
    gasForm.scrollIntoView({ behavior: "smooth", block: "center" });
    renderGasCost();
});

gasConsumption?.addEventListener("input", () => {
    gasConsumptionEstimated = false;
    document.querySelector("[data-gas-estimated]").hidden = true;
    renderGasCost();
});
gasPayment?.addEventListener("input", renderGasCost);
document.querySelector("#gas-postal")?.addEventListener("input", (event) => event.currentTarget.setCustomValidity(""));

function renderGasCost() {
    const costBox = document.querySelector("[data-gas-cost]");
    if (!costBox) return;
    const consumption = Number(gasConsumption.value);
    const payment = Number(gasPayment.value);
    if (!(consumption > 0 && payment > 0)) {
        costBox.hidden = true;
        return;
    }
    const annual = payment * 12;
    const centsPerKwh = annual / consumption * 100;
    const prefix = journeyLanguage() === "tr" ? "yaklaşık" : "ca.";
    document.querySelector("[data-gas-annual]").textContent = `${prefix} ${localizedNumber(annual, 2)} € / ${journeyLanguage() === "tr" ? "yıl" : "Jahr"}`;
    document.querySelector("[data-gas-kwh]").textContent = `${prefix} ${localizedNumber(centsPerKwh, 2)} ct/kWh`;
    costBox.hidden = false;
}

gasForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!gasForm.reportValidity()) return;
    const data = new FormData(gasForm);
    if (!/^[0-9]{5}$/.test(data.get("postalCode"))) {
        document.querySelector("#gas-postal").setCustomValidity(journeyLanguage() === "tr" ? "5 rakamlı geçerli bir posta kodu girin." : "Bitte geben Sie eine gültige 5-stellige Postleitzahl ein.");
        gasForm.reportValidity();
        return;
    }
    document.querySelector("#gas-postal").setCustomValidity("");
    const paymentLine = data.get("payment")
        ? (journeyLanguage() === "tr" ? `\nGüncel aylık ödeme: ${data.get("payment")} EUR/ay` : `\nAktueller Abschlag: ${data.get("payment")} EUR/Monat`)
        : "";
    const subject = journeyLanguage() === "tr" ? "Doğal gaz tarifesi kontrol talebi" : "Anfrage zur Gastarifprüfung";
    const body = journeyLanguage() === "tr"
        ? `Merhaba Feelyng,\n\ndoğal gaz tarifemi kontrol ettirmek istiyorum.\n\nE-posta: ${data.get("email")}\nPosta kodu: ${data.get("postalCode")}\nYıllık tüketim: ${gasConsumptionEstimated ? "yaklaşık " : ""}${localizedNumber(Number(data.get("consumption")))} kWh\nTüketim değeri: ${gasConsumptionEstimated ? "tahmini" : "kullanıcı tarafından girildi"}${paymentLine}\n\nBenimle iletişime geçebilir misiniz?`
        : `Hallo Feelyng,\n\nich möchte meinen Gastarif prüfen lassen.\n\nE-Mail: ${data.get("email")}\nPLZ: ${data.get("postalCode")}\nJahresverbrauch: ${gasConsumptionEstimated ? "ca. " : ""}${localizedNumber(Number(data.get("consumption")))} kWh\nVerbrauchswert: ${gasConsumptionEstimated ? "geschätzt" : "vom Kunden angegeben"}${paymentLine}\n\nBitte melden Sie sich bei mir.`;
    window.location.href = buildMailto(subject, body);
});

const internetForm = document.querySelector("#internet-form");
const dataVolumeField = document.querySelector("[data-volume-field]");
document.querySelector("#internet-postal")?.addEventListener("input", (event) => event.currentTarget.setCustomValidity(""));

document.querySelectorAll('input[name="dataLimit"]').forEach((input) => {
    input.addEventListener("change", () => {
        const show = input.checked && input.value === "yes";
        dataVolumeField.hidden = !show;
        document.querySelector("#data-volume").required = show;
    });
});

function internetLabel(value, type) {
    const tr = journeyLanguage() === "tr";
    const labels = {
        unknown: tr ? "Bilmiyorum" : "Weiß ich nicht",
        unlimited: tr ? "Sınırsız" : "unbegrenzt",
        unsure: tr ? "Emin değilim" : "Ich bin unsicher",
        Kabel: tr ? "Kablo" : "Kabel",
        Glasfaser: tr ? "Fiber" : "Glasfaser"
    };
    if (type === "payment" && value) return `${localizedNumber(Number(value), 2)} €/${tr ? "ay" : "Monat"}`;
    return labels[value] || value || "–";
}

function renderInternetSummary(data) {
    const tr = journeyLanguage() === "tr";
    const rows = [
        [tr ? "E-posta adresi" : "E-Mail-Adresse", data.email],
        [tr ? "Posta kodu" : "PLZ", data.postalCode],
        [tr ? "Mevcut sağlayıcı" : "Aktueller Anbieter", data.provider],
        [tr ? "Şu anki hız" : "Aktuelle Geschwindigkeit", internetLabel(data.currentSpeed)],
        [tr ? "Bağlantı" : "Anschluss", internetLabel(data.connection)],
        [tr ? "Kullanım sınırı" : "Datenvolumen", data.dataLimit === "yes" ? `${data.dataVolume} GB/Monat` : internetLabel(data.dataLimit)],
        [tr ? "Güncel fiyat" : "Aktueller Preis", internetLabel(data.payment, "payment")],
        [tr ? "İstenen hız" : "Gewünschte Geschwindigkeit", internetLabel(data.desiredSpeed)]
    ];
    const list = document.querySelector("[data-internet-summary-list]");
    list.replaceChildren(...rows.flatMap(([term, value]) => {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = term;
        dd.textContent = value;
        return [dt, dd];
    }));
}

document.querySelector("[data-internet-summary]")?.addEventListener("click", () => {
    if (!internetForm.reportValidity()) return;
    const data = Object.fromEntries(new FormData(internetForm));
    if (!/^[0-9]{5}$/.test(data.postalCode)) {
        document.querySelector("#internet-postal").setCustomValidity(journeyLanguage() === "tr" ? "5 rakamlı geçerli bir posta kodu girin." : "Bitte geben Sie eine gültige 5-stellige Postleitzahl ein.");
        internetForm.reportValidity();
        return;
    }
    document.querySelector("#internet-postal").setCustomValidity("");
    internetData = data;
    renderInternetSummary(data);
    const section = document.querySelector("[data-summary-section]");
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth" });
});

document.querySelector("[data-edit-internet]")?.addEventListener("click", () => {
    document.querySelector("[data-summary-section]").hidden = true;
    internetForm.scrollIntoView({ behavior: "smooth" });
});

document.querySelector("[data-send-internet]")?.addEventListener("click", () => {
    if (!internetData) return;
    const tr = journeyLanguage() === "tr";
    const subject = tr ? "İnternet tarifesi kontrol talebi" : "Anfrage zur Internettarifprüfung";
    const lines = tr
        ? ["Merhaba Feelyng,", "", "internet tarifemi kontrol ettirmek istiyorum.", "", `E-posta: ${internetData.email}`, `Posta kodu: ${internetData.postalCode}`, `Mevcut sağlayıcı: ${internetData.provider}`, `Şu anki hız: ${internetLabel(internetData.currentSpeed)}`]
        : ["Hallo Feelyng,", "", "ich möchte meinen Internettarif prüfen lassen.", "", `E-Mail: ${internetData.email}`, `PLZ: ${internetData.postalCode}`, `Aktueller Anbieter: ${internetData.provider}`, `Aktuelle Geschwindigkeit: ${internetLabel(internetData.currentSpeed)}`];
    if (internetData.connection) lines.push(`${tr ? "Bağlantı türü" : "Anschlussart"}: ${internetLabel(internetData.connection)}`);
    lines.push(`${tr ? "Kullanım sınırı" : "Datenvolumen"}: ${internetData.dataLimit === "yes" ? internetData.dataVolume + (tr ? " GB/ay" : " GB/Monat") : internetLabel(internetData.dataLimit)}`);
    if (internetData.payment) lines.push(`${tr ? "Güncel aylık fiyat" : "Aktueller monatlicher Preis"}: ${internetLabel(internetData.payment, "payment")}`);
    if (internetData.desiredSpeed) lines.push(`${tr ? "İstenen hız" : "Gewünschte Geschwindigkeit"}: ${internetLabel(internetData.desiredSpeed)}`);
    lines.push("", tr ? "Benimle iletişime geçebilir misiniz?" : "Bitte melden Sie sich bei mir.");
    const body = lines.join("\n");
    window.location.href = buildMailto(subject, body);
});

const kfzSupportForm = document.querySelector("#kfz-support-form");

kfzSupportForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!kfzSupportForm.reportValidity()) return;

    const email = new FormData(kfzSupportForm).get("email");
    const tr = journeyLanguage() === "tr";
    const subject = tr
        ? "Araç sigortası teknik destek talebi"
        : "Anfrage zur technischen Unterstützung bei Kfz-Versicherung";
    const body = tr
        ? `Merhaba Feelyng,\n\naraç sigortası karşılaştırması için bağlantıya veya teknik desteğe ihtiyacım var.\n\nE-posta: ${email}\n\nBenimle iletişime geçebilir misiniz?`
        : `Hallo Feelyng,\n\nich benötige einen Link bzw. technische Unterstützung bei einem Kfz-Versicherungsvergleich.\n\nE-Mail: ${email}\n\nBitte melden Sie sich bei mir.`;

    window.location.href = buildMailto(subject, body);
});

updateJourneyCopy();
