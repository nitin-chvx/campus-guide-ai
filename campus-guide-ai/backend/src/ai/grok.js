import {
  ProviderApiError,
  ProviderResponseError,
  ProviderTransportError,
} from "./providerErrors.js";

const XAI_URL = "https://api.x.ai/v1/responses";

export async function askGrok({ systemPrompt, input }) {
  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured.");
  }

  let response;
  try {
    response = await fetch(XAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROK_MODEL || "grok-4.7",
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: input,
          },
        ],
        temperature: 0.7,
        top_p: 0.95,
        max_output_tokens: 1000,
      }),
    });
  } catch {
    throw new ProviderTransportError("Grok");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Do not include provider response bodies in logs.
  }

  if (!response.ok) {
    throw new ProviderApiError("Grok", response.status, data?.error);
  }

  if (!data) {
    throw new ProviderResponseError("Grok", response.status);
  }

  const text =
    data?.output
      ?.filter((item) => item.type === "message")
      ?.flatMap((item) => item.content || [])
      ?.filter((item) => item.type === "output_text")
      ?.map((item) => item.text)
      ?.join("\n") || "";

  if (!text.trim()) {
    throw new ProviderResponseError("Grok", response.status);
  }

  return text.trim();
}
