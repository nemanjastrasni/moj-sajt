"use server"

import { saveBranding } from "@/lib/branding/server"
import { BrandingError } from "@/lib/branding/model"
import { SubmissionError } from "@/lib/submissions/validation"

export async function saveBrandingAction(input: unknown) {
  try { return { ok: true as const, ...await saveBranding(input) } }
  catch (error) {
    return { ok: false as const, error: error instanceof BrandingError || error instanceof SubmissionError ? error.message : "Slogani nisu sačuvani. Pokušaj ponovo; ako je ishod nejasan, prvo osveži stranicu." }
  }
}
