// Wait request from chome runtime and handle it.
interface PlaceData {
  placeId: string;
  name?: string;
  rating?: string;
  reviewsCount?: string;
  address?: string;
  website?: string;
  openingHours?: string[];
  businessType?: string;
  photos?: string[];
  topReviews?: string[];
}
async function getStored(): Promise<PlaceData[]> {
  const res = await chrome.storage.local.get("places") as { places?: PlaceData[] };
  return res.places || [];
}

async function saveStored(data: PlaceData[]) {
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
