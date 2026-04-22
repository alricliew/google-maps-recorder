"use strict";
async function getStored() {
    const res = await chrome.storage.local.get("places");
    return res.places || [];
}
async function saveStored(data) {
    await chrome.storage.local.set({ places: data });
}
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.type === "SAVE_PLACE") {
        const existing = await getStored();
        if (existing.some(p => p.placeId === msg.data.placeId)) {
            sendResponse({ status: "duplicate" });
            return;
        }
        existing.push(msg.data);
        await saveStored(existing);
        sendResponse({ status: "saved" });
    }
    if (msg.type === "GET_ALL") {
        const data = await getStored();
        sendResponse(data);
    }
    if (msg.type === "CLEAR") {
        await chrome.storage.local.set({ places: [] });
        sendResponse({ status: "cleared" });
    }
    // For content2
    if (msg.type === "EXPORT_DATA") {
        console.log("Exporting data:", msg.payload);
        const existing = await getStored();
        if (existing.some(p => p.placeId === msg.data.placeId)) {
            sendResponse({ status: "duplicate" });
            return;
        }
        existing.push(msg.data);
        await saveStored(existing);
        sendResponse({ status: "saved" });
    }
    return true;
});
// 
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});
