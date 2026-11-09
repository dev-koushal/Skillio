/**
 * Phone Number Normalization and Validation Utilities.
 * Enforces E.164 standard formatting.
 */

/**
 * Normalizes phone number into strict E.164 format.
 * Defaults to India (+91) if a 10-digit number without country code is provided.
 *
 * @param {string} rawPhone - Raw phone number input from client
 * @param {string} [defaultCountryCode="+91"] - Default country code if missing
 * @returns {string} E.164 formatted phone number (e.g., "+919876543210")
 */
export const normalizePhoneNumber = (rawPhone, defaultCountryCode = "+91") => {
  if (!rawPhone || typeof rawPhone !== "string") {
    throw new Error("Phone number is required");
  }

  // Remove all whitespace, dashes, parentheses, dots
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");

  // If already starts with '+', validate digit characters
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.slice(1).replace(/\D/g, "");
    if (!digitsOnly || digitsOnly.length < 8 || digitsOnly.length > 15) {
      throw new Error("Invalid international phone number format");
    }
    return `+${digitsOnly}`;
  }

  // If starts with '00' (international prefix)
  if (cleaned.startsWith("00")) {
    const digitsOnly = cleaned.slice(2).replace(/\D/g, "");
    if (!digitsOnly || digitsOnly.length < 8 || digitsOnly.length > 15) {
      throw new Error("Invalid phone number format");
    }
    return `+${digitsOnly}`;
  }

  // If starts with leading 0 (trunk prefix in India/UK), strip it
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Standard 10-digit national number (e.g. India)
  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    const code = defaultCountryCode.startsWith("+")
      ? defaultCountryCode
      : `+${defaultCountryCode}`;
    return `${code}${digitsOnly}`;
  }

  // Standard 12-digit number starting with 91 (India)
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }

  // Fallback for valid lengths
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  throw new Error("Please enter a valid 10-digit mobile number");
};

/**
 * Validates whether a phone number strictly matches E.164 format.
 * E.164 format: + followed by 8 to 15 digits, starting with non-zero.
 *
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidE164 = (phone) => {
  if (!phone || typeof phone !== "string") return false;
  return /^\+[1-9]\d{7,14}$/.test(phone);
};

