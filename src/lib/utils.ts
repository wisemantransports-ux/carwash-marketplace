import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes and validates a phone number string.
 * Enforces the inclusion of the '+' prefix and length constraints for international format.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  
  if (!trimmed.startsWith('+')) {
    throw new Error("WhatsApp number must start with a '+' followed by the country code (e.g., +26777123456).");
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 15) {
    throw new Error("Invalid WhatsApp number length. Please include the full country code and digits (10-15 digits total).");
  }

  return `+${digits}`;
}
