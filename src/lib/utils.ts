import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes and validates a phone number string.
 * Enforces length constraints and ensures international format.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 15) {
    throw new Error("Invalid WhatsApp number. Please include your country code (e.g., 26777123456)");
  }

  return `+${digits}`;
}
