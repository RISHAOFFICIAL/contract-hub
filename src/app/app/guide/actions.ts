"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  answerQuestion,
  getGuideContext,
  type GuideAnswer,
} from "@/lib/guide";
import { toggleLesson } from "@/lib/foundations";

export interface ChatMessage {
  question: string;
  answer: GuideAnswer;
}

export interface ChatState {
  messages: ChatMessage[];
}

export async function askGuide(
  prevState: ChatState,
  formData: FormData
): Promise<ChatState> {
  const question = String(formData.get("question") ?? "").trim();
  if (!question) return prevState;

  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) {
    return {
      messages: [
        ...prevState.messages,
        {
          question,
          answer: {
            title: "Sign in required",
            body: ["Please sign in to use the Guide."],
          },
        },
      ],
    };
  }

  const ctx = await getGuideContext(supabase, businessId);
  const answer = answerQuestion(ctx, question);
  return { messages: [...prevState.messages, { question, answer }] };
}

export async function toggleLessonAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "").trim();
  if (!key) return;
  const completed = formData.get("completed") === "true";

  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) return;

  await toggleLesson(supabase, businessId, key, completed);
  revalidatePath("/app/guide");
}
