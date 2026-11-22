import {
  ProviderApiError,
  ProviderResponseError,
  ProviderTransportError,
} from "./providerErrors.js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

export async function askGemini({ systemPrompt, input }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  let response;
  try {
    response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
        system_instruction: systemPrompt,
        input,
      }),
    });
  } catch {
    throw new ProviderTransportError("Gemini");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Do not include provider response bodies in logs.
  }

  if (!response.ok) {
    throw new ProviderApiError("Gemini", response.status, data?.error);
  }

  if (!data) {
    throw new ProviderResponseError("Gemini", response.status);
  }

  const text =
    data?.steps
      ?.filter((step) => step.type === "model_output")
      ?.flatMap((step) => step.content || [])
      ?.filter((item) => item.type === "text")
      ?.map((item) => item.text)
      ?.join("\n") || "";

  if (!text.trim()) {
    throw new ProviderResponseError("Gemini", response.status);
  }

  return text.trim();
}
