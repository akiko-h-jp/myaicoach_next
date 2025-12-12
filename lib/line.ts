const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const lineUserId = process.env.LINE_USER_ID;
const lineEndpoint =
  process.env.LINE_PUSH_ENDPOINT ?? "https://api.line.me/v2/bot/message/push";

export async function sendLineNotification(message: string) {
  if (!lineToken) {
    return { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN is not set." };
  }
  if (!lineUserId) {
    return { ok: false, error: "LINE_USER_ID is not set." };
  }
  if (!message) {
    return { ok: false, error: "Message is empty." };
  }

  const payload = {
    to: lineUserId,
    messages: [
      {
        type: "text",
        text: message,
      },
    ],
  };

  try {
    const res = await fetch(lineEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineToken.trim()}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `LINE push failed: ${res.status} ${text}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e) };
  }
}

