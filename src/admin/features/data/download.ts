"use client";

import { API_URL } from "../../store/base-api";

function saveBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // give the browser a moment to start the download before the URL goes away
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Saves text the screen already has (a report table, a validation report) as a file.
export function saveTextFile(fileName: string, text: string, type = "text/csv;charset=utf-8") {
  saveBlob(fileName, new Blob([text], { type }));
}

// Fetches a file from the API with the staff session (the same cookies RTK Query sends) and
// saves it. A 401 means the access token just expired: `refreshSession` runs any request
// through RTK Query's re-authenticating base query (one refresh for the whole app), then the
// download is tried once more.
export async function downloadFromApi(path: string, fileName: string, refreshSession: () => Promise<unknown>) {
  const get = () => fetch(`${API_URL}${path}`, { credentials: "include" });
  let res = await get();
  if (res.status === 401) {
    await refreshSession();
    res = await get();
  }
  if (!res.ok) {
    let message = "The file couldn't be downloaded.";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // not a JSON error body
    }
    throw new Error(message);
  }
  saveBlob(fileName, await res.blob());
}
