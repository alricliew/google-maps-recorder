"use strict";
// // import { toCSV } from "./utils.js";
// function toCSV(data: any[]): string {
//   if (!data.length) return "";
//   const headers = Object.keys(data[0]);
//   const rows = data.map(row =>
//     headers.map(h => JSON.stringify(row[h] ?? "")).join(",")
//   );
//   return [headers.join(","), ...rows].join("\n");
// }
// async function getActiveTab() {
//   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   return tab.id!;
// }
// document.getElementById("record")!.addEventListener("click", async () => {
//   alert("Hiiii");
//   const tabId = await getActiveTab();
//   const place = await chrome.tabs.sendMessage(tabId, { type: "SCRAPE" });
//   alert("Hi" + JSON.stringify(place) )
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
// document.getElementById("download")!.addEventListener("click", async () => {
//   const data = await chrome.runtime.sendMessage({ type: "GET_ALL" });
//   const csv = toCSV(data);
//   const blob = new Blob([csv], { type: "text/csv" });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = "places.csv";
//   a.click();
// });
// document.getElementById("clear")!.addEventListener("click", async () => {
//   await chrome.runtime.sendMessage({ type: "CLEAR" });
//   alert("Data cleared.");
// });
