// // import { PlaceData } from "./types.js";
// console.log("CONTENT SCRIPT ACTIVE");
// function getPlaceId(): string | null {
//   const url = window.location.href;
//   const match = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
//   return match ? match[1] : null;
// }

// function getText(selector: string): string | undefined {
//   const el = document.querySelector(selector);
//   return el?.textContent?.trim();
// }
// function getAllText(selector: string): string[] {
//   return Array.from(document.querySelectorAll(selector))
//     .map(el => el.textContent?.trim() || "")
//     .filter(Boolean);
// }

// async function cidToPlaceId(cid: string): Promise<string | null> {
//   const url = `https://www.google.com/maps?cid=${cid}`;

//   const res = await fetch(url, {
//     credentials: "omit",
//   });
//   const text = await res.text();
//   console.log("Place", text)
//   // return text;
//   // Look for "place_id":"ChIJ..."
//   const match = text.match(/"place_id":"(ChIJ[^"]+)"/);

//   return match ? match[1] : null;
// }
// function getImages(): string[] {
//   return Array.from(document.querySelectorAll("img"))
//     .map(img => (img as HTMLImageElement).src)
//     .filter(src => src.includes("googleusercontent"));
// }
// function getPhone(): string | null {
//   // Best case: Google Maps uses data-item-id="phone"
//   const el =
//     document.querySelector('[data-item-id^="phone"] a') ||
//     document.querySelector('a[href^="tel:"]');

//   const raw = (el as HTMLAnchorElement | null)?.href || el?.textContent || null;

//   if (!raw) return null;

//   // clean "tel:+60123456789" → "+60123456789"
//   return raw.replace("tel:", "").trim();
// }

// // Get heeader block where h1 located
// function getHeaderBlock(): Element | null {
//   const main = document.querySelector('[role="main"]');
//   if (!main) return null;

//   const h1 = main.querySelector("h1");
//   if (!h1) return null;

//   // climb up to a stable container
//   return h1.closest('[role="main"] > *') || h1.parentElement;
// }

// function getRating(): string | undefined {
//   const header = getHeaderBlock();
//   if (!header) return "No data";

//   const el = header.querySelector('[role="img"][aria-label*="star"]');
//   const aria = el?.getAttribute("aria-label");

//   if (!aria) return "No data";

//   const match = aria.match(/([0-9]+(\.[0-9]+)?)/);
//   return match ? match[1] : "No data";
// }

// function getReviewCount(): string | undefined {
//   const header = getHeaderBlock();
//   if (!header) return "No data";

//   const el = header.querySelector('[aria-label*="reviews"]');
//   if (!el) return "No data";

//   const text = el.textContent?.trim();
//   if (!text) return "No data";

//   const match = text.match(/(\d[\d,]*)/);
//   return match ? match[1] : "No data";
// }

// function getTopReviews(): string[] {
//   // 1. Always start from MAIN panel only
//   const main = document.querySelector('[role="main"]');
//   if (!main) return [];

//   // 2. Find elements that look like reviews using aria-label patterns
//   const candidates = main.querySelectorAll('div[aria-label]');

//   const reviews: string[] = [];

//   candidates.forEach(el => {
//     const aria = el.getAttribute("aria-label") || "";

//     // Heuristic: real reviews usually contain star + text content pattern
//     const isReview =
//       /\d(\.\d)?\s*star/i.test(aria) ||   // rating pattern
//       /\bago\b/i.test(aria);              // time indicator ("2 weeks ago")

//     if (!isReview) return;

//     const text = el.textContent?.trim();

//     if (text && text.length > 20) {
//       reviews.push(text);
//     }
//   });

//   return reviews;
// }
// async function scrapePlace(){
//   const cid = getPlaceId();
//   if (!cid) return null;

//   const placeId = await cidToPlaceId(cid)
//   console.log(placeId)
//   const data = {
//     placeId,
//     cid: cid,
//     name: getText("h1"),
//     phone: getPhone(),
//     rating: getRating(),
//     reviewsCount: getReviewCount(), // getText('[aria-label*="reviews"]'),
//     address: getText('[data-item-id="address"]'),
//     website: (document.querySelector('[data-item-id="authority"] a') as HTMLAnchorElement)?.href,
//     businessType: getText('button[jsaction*="pane.rating.category"]'),
//     openingHours: getAllText('[aria-label*="Hours"]'),
//     photos: getImages().slice(0, 10),
//     topReviews: getTopReviews(), // getAllText('.jftiEf')
//   };

//   return data;
// }

// // chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
// //   if (msg.type === "SCRAPE") {
// //     const result = scrapePlace();
// //     sendResponse(result);
// //   }
// // });

// // Create Floating Widget
// function createWidget() {
//   if (document.getElementById("gmaps-recorder-widget")) return;

//   const container = document.createElement("div");
//   container.id = "gmaps-recorder-widget";
//   container.innerHTML = `
//     <div class="header">Google Map Recorder</div>
    
//     <div class="body">
//       <button id="record">Record</button>
//       <button id="download">Download</button>
//       <button id="clear">Clear</button>
//     </div>

//     <div class="footer">Powered by GoLearn</div>
//   `;

//   const style = document.createElement("style");
//   style.textContent = `
//     #gmaps-recorder-widget {
//       position: fixed;
//       top: 12px;
//       right: 12px;
//       width: 180px;
//       background: white;
//       border-radius: 10px;
//       box-shadow: 0 4px 12px rgba(0,0,0,0.25);
//       z-index: 9999;
//       font-family: Arial, sans-serif;
//       overflow: hidden;
//     }

//     #gmaps-recorder-widget .header {
//       font-weight: bold;
//       padding: 10px;
//       background: #4285f4;
//       color: white;
//       font-size: 14px;
//     }

//     #gmaps-recorder-widget .body {
//       padding: 10px;
//       display: flex;
//       flex-direction: column;
//       gap: 8px;
//     }

//     #gmaps-recorder-widget button {
//       padding: 6px;
//       border: none;
//       border-radius: 6px;
//       cursor: pointer;
//       background: #f1f3f4;
//       transition: background 0.2s;
//     }

//     #gmaps-recorder-widget button:hover {
//       background: #e0e0e0;
//     }

//     #gmaps-recorder-widget .footer {
//       padding: 6px;
//       font-size: 11px;
//       text-align: center;
//       color: #777;
//       border-top: 1px solid #eee;
//     }
//   `;

//   document.head.appendChild(style);
//   document.body.appendChild(container);

//   attachEvents();
// }

// // Handle events
// function attachEvents() {
//   document.getElementById("record")?.addEventListener("click", async() => {
//     console.log("Recording...");
//     const place = scrapePlace();
//     if (!place) {
//       alert("Please select a place on Google Maps first.");
//       return;
//     }

//     const res = await chrome.runtime.sendMessage({
//       type: "SAVE_PLACE",
//       data: place
//     });

//     if (res.status === "duplicate") {
//       alert("Place already recorded.");
//     } else {
//       alert("Saved!");
//     }
//   });

//   document.getElementById("download")?.addEventListener("click", () => {
//     console.log("Downloading...");
//   });

//   document.getElementById("clear")?.addEventListener("click", () => {
//     console.log("Clearing...");
//   });
// }

// // handle SPA behavior
// const observer = new MutationObserver(() => {
//   createWidget();
// });

// observer.observe(document.body, {
//   childList: true,
//   subtree: true
// });

// createWidget();