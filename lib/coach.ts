import { TaskPriority } from "@prisma/client";
import { OpenAI } from "openai";

export type CoachingEntry = {
  task_name: string;
  category?: string | null;
  estimated_hours?: number | null;
  priority?: TaskPriority | null;
};

export async function generateCoachingMessage(
  entries: CoachingEntry[],
  targetDate: Date,
  apiKey?: string
): Promise<{ message: string; warnings: string[] }> {
  const warnings: string[] = [];
  const dateStr = targetDate.toISOString().slice(0, 10);

  if (!entries || entries.length === 0) {
    return {
      message: `今日 ${dateStr} は特に予定がないみたい。余裕のある時間を活かして、新しい挑戦やリフレッシュをしてみよう！`,
      warnings,
    };
  }

  const tasksText = entries
    .map((e, idx) => {
      const parts: string[] = [`${idx + 1}. ${e.task_name}`];
      const details: string[] = [];
      if (e.category) details.push(`カテゴリ: ${e.category}`);
      if (e.estimated_hours) details.push(`目安: ${e.estimated_hours}h`);
      if (e.priority && e.priority !== "NONE")
        details.push(`優先度: ${priorityLabel(e.priority)}`);
      if (details.length > 0) parts[0] += `（${details.join(", ")}）`;
      return parts.join(" ");
    })
    .join("\n");

  if (apiKey && apiKey.trim()) {
    try {
      const client = new OpenAI({ apiKey: apiKey.trim() });
      // 現在時刻を取得（JST）
      const now = new Date();
      const jstHour = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getHours();
      let timeGreeting = "適切な挨拶";
      if (jstHour >= 5 && jstHour < 11) {
        timeGreeting = "「おはよう！」などの朝の挨拶";
      } else if (jstHour >= 11 && jstHour < 17) {
        timeGreeting = "「こんにちは！」などの昼の挨拶";
      } else {
        timeGreeting = "「こんばんは！」などの夜の挨拶";
      }
      
      const prompt = `あなたは「明るく励ます相棒タイプ」のAIコーチです。トーンは明るく前向き、優しく支援的にしてください。
日付: ${dateStr}
現在時刻: ${jstHour}時（日本時間）
今日のタスク:
${tasksText}

以下の方針でLINE通知として送る文面を日本語で作成してください。
- あいさつは${timeGreeting}から始める（現在時刻に適した挨拶を使用）
- 今日のタスクを簡潔にまとめて提示する
- 応援や励ましの一言を添える
- 全体で200文字以内
- 箇条書きがあってもOK（改行はそのまま反映されます）`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "あなたは明るく励ます相棒タイプのAIコーチです。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
      });
      const message = response.choices[0].message?.content?.trim();
      if (message) return { message, warnings };
    } catch (e: any) {
      const msg = String(e);
      warnings.push(`AI利用でエラーがありました（${msg.slice(0, 80)}…）。ルールベースにフォールバックします。`);
    }
  } else {
    warnings.push("AI未設定のため、ルールベースメッセージを使用します。");
  }

  // fallback
  const fallback = `今日 ${dateStr} のタスクだよ。\n${tasksText}\n\nムリせず一歩ずつ進めていこう！`;
  return { message: fallback, warnings };
}

function priorityLabel(p: TaskPriority) {
  switch (p) {
    case "HIGH":
      return "高";
    case "MEDIUM":
      return "中";
    case "LOW":
      return "低";
    default:
      return "なし";
  }
}

