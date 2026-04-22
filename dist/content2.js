"use strict";
function toCSV(data) {
    const headers = [
        "cid",
        "placeId",
        "name",
        "category",
        "address",
        "rating",
        "reviews",
        "phone",
        "website",
        "isOpen",
        "sponsored"
    ];
    const rows = data.map((p) => [
        p.cid,
        p.placeId,
        p.name,
        p.category ?? "",
        p.address ?? "",
        p.rating ?? "",
        p.reviews ?? "",
        p.phone ?? "",
        p.website ?? "",
        p.isOpen ?? "",
        p.sponsored
    ]);
    return [
        headers.join(","),
        ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
}
function parseNumber(text) {
    if (!text)
        return undefined;
    const match = text.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : undefined;
}
// Extrac ids from url
function extractIds(url) {
    const decoded = decodeURIComponent(url);
    const cid = decoded.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1] || "No data";
    const placeId = decoded.match(/!19s(ChIJ[0-9A-Za-z_-]+)/)?.[1] || "No data";
    return { cid, placeId };
}
function extractPremise(card) {
    const text = card.textContent || "";
    // ─────────────────────────────────────────────
    // 1. MAIN LINK (MOST STABLE ANCHOR)
    // ─────────────────────────────────────────────
    const mainLink = Array.from(card.querySelectorAll("a"))
        .find(a => a.href?.includes("/maps/place/"));
    const href = mainLink?.href || "";
    const { cid, placeId } = extractIds(href);
    // ─────────────────────────────────────────────
    // 2. NAME (use aria-label fallback first)
    // ─────────────────────────────────────────────
    const name = mainLink?.getAttribute("aria-label") ||
        card.querySelector('[aria-label]')
            ?.getAttribute("aria-label") ||
        undefined;
    if (!name)
        return null;
    // ─────────────────────────────────────────────
    // 3. RATING (find number near star glyph context)
    // ─────────────────────────────────────────────
    const rating = Array.from(card.querySelectorAll("span"))
        .map(el => el.textContent?.trim())
        .find(t => /^\d\.\d$/.test(t || "")) ?? undefined;
    // ─────────────────────────────────────────────
    // 4. REVIEWS (look for parentheses number like (148))
    // ─────────────────────────────────────────────
    const reviews = text.match(/\((\d+)\)/)?.[1] ?? undefined;
    // ─────────────────────────────────────────────
    // 5. CATEGORY (first clean text block after name area)
    // ─────────────────────────────────────────────
    const IGNORE_TEXT = new Set([
        "No reviews",
        "New",
        "Sponsored",
        "",
    ]);
    function isNoiseText(t) {
        return (IGNORE_TEXT.has(t) ||
            t.includes("Open") ||
            t.includes("Closed") ||
            t.includes("·") ||
            t.startsWith("(") || // ratings like (123)
            /^\d/.test(t) // numbers
        );
    }
    const isGarbageText = (t) => {
        if (!t)
            return true;
        const cleaned = t.trim();
        return (cleaned.length <= 1 || // single glyph like 
            /^[]+$/.test(cleaned) || // icon-only spans
            /Sponsored|Ad|Why this ad/i.test(cleaned));
    };
    const category = Array.from(card.querySelectorAll("span"))
        .map(s => s.textContent?.trim())
        .find(t => t && !isNoiseText(t));
    // ─────────────────────────────────────────────
    // 6. ADDRESS (heuristic: contains street / block / number)
    // ─────────────────────────────────────────────
    const spans = Array.from(card.querySelectorAll("span"))
        .map(s => s.textContent?.trim())
        .filter(Boolean);
    // status markers
    const statusIdx = spans.findIndex(t => {
        const s = t.toLowerCase();
        return (/^open(\s24\s?hours)?/.test(s) || // Open / Open 24 hours
            /^closed/.test(s) || // Closed / Closed · Opens ...
            /^opens\s/.test(s) || // Opens 3 pm
            /^closes\s/.test(s) // Closes 5 pm
        );
    });
    let address;
    if (statusIdx > -1) {
        address = spans[statusIdx - 1]; // hard coded assumption. Might break 
    }
    else {
        console.log("No staus found");
    }
    // ─────────────────────────────────────────────
    // 7. PHONE (detect + country code pattern)
    // ─────────────────────────────────────────────
    const phoneRaw = Array.from(card.querySelectorAll("span"))
        .map(el => el.textContent?.trim())
        .find(t => !!t &&
        /(\+\d|\d)/.test(t) && t.replace(/\D/g, "").length >= 7);
    const phone = phoneRaw
        ? normalizePhone(phoneRaw)
        : undefined;
    function normalizePhone(input) {
        // keep + only if it exists at start
        let cleaned = input.trim();
        // remove everything except digits and +
        cleaned = cleaned.replace(/[^\d+]/g, "");
        if (cleaned.includes("+")) {
            cleaned = "+" + cleaned.replace(/\+/g, "");
        }
        // fallback: if no +, assume it's already full number
        return cleaned;
    }
    // ─────────────────────────────────────────────
    // 8. WEBSITE (any external http link)
    // ─────────────────────────────────────────────
    const website = Array.from(card.querySelectorAll("a[href^='http']"))
        .map(a => a.href)
        .find(href => !href.includes("google.com"));
    // ─────────────────────────────────────────────
    // 9. OPEN / CLOSED STATUS (text-based)
    // ─────────────────────────────────────────────
    let isOpen;
    if (text.includes("Open") && text.includes("Closed")) {
        isOpen = text.includes("Closed") ? "Closed" : "Open";
    }
    else if (text.includes("Open")) {
        isOpen = "Open";
    }
    else if (text.includes("Closed")) {
        isOpen = "Closed";
    }
    // ─────────────────────────────────────────────
    // 10. SPONSORED (ONLY RELY ON LABEL TEXT)
    // ─────────────────────────────────────────────
    const sponsored = text.includes("Sponsored") ||
        Array.from(card.querySelectorAll("span"))
            .some(s => s.textContent?.trim() === "Sponsored");
    // Raw text
    const textList = [
        ...new Set(Array.from(card.querySelectorAll("span, div"))
            .map(el => {
            // get only direct text (exclude nested spans)
            return Array.from(el.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent?.trim() || "")
                .join(" ");
        })
            .map(t => t
            .replace(/\s*·\s*/g, " ")
            .replace(/[\p{Extended_Pictographic}]/gu, "")
            .replace(/[]/g, "")
            .replace(/\s+/g, " ")
            .trim())
            .filter(Boolean))
    ];
    // ─────────────────────────────────────────────
    // 11. Review Text (if any)
    // ─────────────────────────────────────────────
    let reviewText = "";
    const allDivs = Array.from(card.querySelectorAll("div"));
    for (const div of allDivs) {
        const img = div.querySelector("img");
        const isDefaultAvatar = img?.src?.includes("default_user.png");
        if (!isDefaultAvatar)
            continue;
        // Find nearby text content inside same block
        const text = div.textContent?.trim();
        if (!text)
            continue;
        // Heuristic: review snippets are usually quoted or long enough
        const looksLikeReview = text.length > 20 &&
            (text.includes('"') || text.includes(" "));
        if (looksLikeReview) {
            reviewText = text.replace(/^"|"$/g, "").trim();
        }
    }
    // ─────────────────────────────────────────────
    // RESULT
    // ─────────────────────────────────────────────
    return {
        cid,
        placeId,
        name,
        category,
        address,
        rating: rating ? parseFloat(rating) : undefined,
        reviews: reviews ? parseInt(reviews) : undefined,
        phone,
        website,
        isOpen,
        sponsored,
        reviewText,
        rawTextList: textList,
        rawText: text
    };
}
function scrapeFeed() {
    const feed = document.querySelector('[role="feed"]');
    if (!feed)
        return [];
    const cards = feed.querySelectorAll('[role="article"]');
    const results = [];
    cards.forEach((card) => {
        const data = extractPremise(card);
        if (data)
            results.push(data);
    });
    return results;
}
let EXTRACTED_FEEDS = [];
// Render preview
function renderPreview() {
    const preview = document.getElementById("preview");
    const count = document.getElementById("count");
    if (!preview || !count)
        return;
    if (!EXTRACTED_FEEDS.length) {
        count.innerHTML = "No results";
        preview.innerHTML = `<div style="color:#999;font-size:8px">No data extracted</div>`;
        return;
    }
    count.innerHTML = `Results (${EXTRACTED_FEEDS.length.toString()})`;
    preview.innerHTML = EXTRACTED_FEEDS
        .map((p) => `
      <div class="item">
        <div class="row">
          <div class="name">${p.name ?? "-"}</div>
          <div class="meta">
            ⭐${p.rating ?? "-"}(${p.reviews ?? "-"})
            ${p.sponsored ? "⚡" : ""}
          </div>
        </div>
      </div>
    `)
        .join("");
}
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
// Create Floating Widget
function createWidget() {
    if (document.getElementById("gmaps-recorder-widget"))
        return;
    const container = document.createElement("div");
    container.id = "gmaps-recorder-widget";
    container.innerHTML = `
    <div class="header">Google Map Recorder</div>
    
    <div class="body">
      <button style="display: none;" id="record">Record</button> 
      <button id="extractFeed">Extract Feed</button>
      <span>How to use</span>
      <span>(1) At "Search Google Maps", find your keywords.</span>
      <span>(2) Scroll down (3 - 5 times) the to load more suggestions.</span>
      <span>(3) Run "Extract Feed" to get the data. Finally, download the results.</span>
      <a id="downloadCsv" href="#">Download as CSV</a>
      <a id="download" href="#">Download as JSON</a>  
      <a id="clear" href="#">Clear</a>
      <div id="count"></div>
      <div id="preview"></div>
    </div>

    <div class="footer">Powered by GoLearn</div>
    <div class="footer">Contact Alric for Support</div>
  `;
    const style = document.createElement("style");
    style.textContent = `
    #gmaps-recorder-widget {
      position: fixed;
      top: 12px;
      right: 12px;
      width: 180px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      z-index: 9999;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }

    #gmaps-recorder-widget .header {
      font-weight: bold;
      padding: 10px;
      background: #4285f4;
      color: white;
      font-size: 14px;
    }

    #gmaps-recorder-widget .body {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 80vh;
      overflow: hidden;
    }

    #gmaps-recorder-widget button {
      padding: 6px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: #f1f3f4;
      font-size: 12px;
      transition: background 0.2s;
    }

    #gmaps-recorder-widget button:hover {
      background: #e0e0e0;
    }

    #gmaps-recorder-widget a {
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    #gmaps-recorder-widget span {
      font-size: 8px;
    }
    #gmaps-recorder-widget .footer {
      padding: 6px;
      font-size: 11px;
      text-align: center;
      color: #777;
      border-top: 1px solid #eee;
    }

    #gmaps-recorder-widget button {
      padding: 6px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: #f1f3f4;
      font-size: 12px;
      transition: background 0.2s;
    }
    #count {
      font-size: 12px;
    }

    #preview {
      max-height: 240px; /* fallback for small widgets */
      max-height: 60vh;  /* safety cap */
      overflow-y: auto;
      padding-right: 4px; /* avoid scrollbar overlap */
    }

    #preview .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    #preview .name {
      font-size: 12px;
      font-weight: 600;
      color: #222;

      /* key for ellipsis in flex */
      min-width: 0;
      flex: 1;

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #preview .meta {
      font-size: 11px;
      color: #666;
      white-space: nowrap;
      flex-shrink: 0;
    }
  `;
    document.head.appendChild(style);
    document.body.appendChild(container);
    attachEvents();
}
// Handle events
function attachEvents() {
    const btnExtractFeed = document.getElementById("extractFeed");
    const btnDownload = document.getElementById("download");
    const btnDownloadCsv = document.getElementById("downloadCsv");
    const btnClear = document.getElementById("clear");
    // document.getElementById("record")?.addEventListener("click", async() => {
    //   console.log("Recording...");
    //   const place = scrapePlace();
    //   if (!place) {
    //     alert("Please select a place on Google Maps first.");
    //     return;
    //   }
    //   const res = await chrome.runtime.sendMessage({
    //     type: "SAVE_PLACE",
    //     data: place
    //   });
    //   if (res.status === "duplicate") {
    //     alert("Place already recorded.");
    //   } else {
    //     alert("Saved!");
    //   }
    // });
    btnExtractFeed?.addEventListener("click", async () => {
        console.log("Extracting feed...");
        const data = scrapeFeed();
        if (!data || data.length === 0) {
            alert("No feed found or nothing extracted.");
            return;
        }
        console.log(data);
        // Deduplicate by cid or placeId
        const seen = new Set();
        EXTRACTED_FEEDS = data.filter((item) => {
            const key = item.cid || item.placeId;
            if (!key)
                return true; // keep if no identifier exists
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
        renderPreview();
    });
    btnDownload?.addEventListener("click", () => {
        console.log("Downloading JSON...");
        if (!EXTRACTED_FEEDS.length)
            return alert("No data to download");
        const blob = new Blob([JSON.stringify(EXTRACTED_FEEDS, null, 2)], { type: "application/json" });
        downloadFile(blob, "google-maps-feeds.json");
    });
    btnDownloadCsv?.addEventListener("click", () => {
        console.log("Downloading CSV...");
        if (!EXTRACTED_FEEDS.length)
            return alert("No data to download");
        const csv = toCSV(EXTRACTED_FEEDS);
        const blob = new Blob([csv], { type: "text/csv" });
        downloadFile(blob, "google-maps-feeds.csv");
    });
    btnClear?.addEventListener("click", () => {
        console.log("Clearing...");
        EXTRACTED_FEEDS = [];
        renderPreview();
    });
}
// handle SPA behavior
const observer = new MutationObserver(() => {
    createWidget();
});
observer.observe(document.body, {
    childList: true,
    subtree: true
});
createWidget();
