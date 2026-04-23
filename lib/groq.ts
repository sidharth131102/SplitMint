import Groq from "groq-sdk";

export function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";
