import dotenv from "dotenv";
dotenv.config();

/**
 * Pluggable SMS Provider Service Architecture.
 * Supports Twilio, Fast2SMS, AWS SNS, and development Mock/Console dispatch.
 */

class SmsProvider {
  /**
   * @param {string} phoneNumber - E.164 phone number
   * @param {string} otp - 6-digit verification code
   * @param {string} institutionName - Institution/Academy name
   * @returns {Promise<{ success: boolean, delivered: boolean, messageId?: string, error?: string, provider: string }>}
   */
  async send(phoneNumber, otp, institutionName = "Skillio") {
    throw new Error("send() must be implemented by provider");
  }
}

/**
 * Twilio SMS Gateway Provider
 */
class TwilioProvider extends SmsProvider {
  constructor() {
    super();
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async send(phoneNumber, otp, institutionName = "Skillio") {
    try {
      // Dynamic import to avoid hard dependency crash if twilio isn't installed
      const twilio = (await import("twilio")).default;
      const client = twilio(this.accountSid, this.authToken);

      const message = await client.messages.create({
        body: `Your ${institutionName} verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
        from: this.fromNumber,
        to: phoneNumber,
      });

      return {
        success: true,
        delivered: true,
        messageId: message.sid,
        provider: "twilio",
      };
    } catch (err) {
      console.error("[Twilio Error]", err.message);
      return {
        success: false,
        delivered: false,
        error: err.message,
        provider: "twilio",
      };
    }
  }
}

/**
 * Fast2SMS Gateway Provider (Popular for India SMS)
 */
class Fast2SmsProvider extends SmsProvider {
  constructor() {
    super();
    this.apiKey = process.env.FAST2SMS_API_KEY;
  }

  async send(phoneNumber, otp, institutionName = "Skillio") {
    try {
      // Fast2SMS expects 10 digit Indian number without +91
      const nationalNumber = phoneNumber.replace(/^\+91/, "");

      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variables_values: otp,
          route: "otp",
          numbers: nationalNumber,
        }),
      });

      const data = await response.json();
      if (data && data.return === true) {
        return {
          success: true,
          delivered: true,
          messageId: data.request_id,
          provider: "fast2sms",
        };
      }

      return {
        success: false,
        delivered: false,
        error: data.message ? data.message[0] : "Fast2SMS delivery error",
        provider: "fast2sms",
      };
    } catch (err) {
      console.error("[Fast2SMS Error]", err.message);
      return {
        success: false,
        delivered: false,
        error: err.message,
        provider: "fast2sms",
      };
    }
  }
}

/**
 * Mock / Console Provider
 * Used in local development and automated testing environments.
 */
class MockSmsProvider extends SmsProvider {
  async send(phoneNumber, otp, institutionName = "Skillio") {
    console.log(`\n========================================================================`);
    console.log(`[SKILLIO SMS GATEWAY - DEV/MOCK DISPATCH]`);
    console.log(`To: ${phoneNumber}`);
    console.log(`Verification Code: ${otp}`);
    console.log(`Academy: ${institutionName}`);
    console.log(`Expires: 5 minutes`);
    console.log(`========================================================================\n`);

    return {
      success: true,
      delivered: true,
      messageId: `mock-sms-${Date.now()}`,
      provider: "mock",
    };
  }
}

/**
 * Factory to resolve active SMS Provider from environment configuration.
 */
export const getSmsProvider = () => {
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    return new TwilioProvider();
  }

  if (process.env.FAST2SMS_API_KEY) {
    return new Fast2SmsProvider();
  }

  return new MockSmsProvider();
};

/**
 * High-level abstracted API to send SMS OTP.
 *
 * @param {string} phoneNumber - E.164 formatted phone number
 * @param {string} otp - 6-digit verification code
 * @param {string} [institutionName="Skillio Academy"]
 * @returns {Promise<{ success: boolean, delivered: boolean, messageId?: string, error?: string, provider: string }>}
 */
export const sendOtp = async (phoneNumber, otp, institutionName = "Skillio Academy") => {
  const provider = getSmsProvider();
  return provider.send(phoneNumber, otp, institutionName);
};

export default {
  sendOtp,
  getSmsProvider,
};
