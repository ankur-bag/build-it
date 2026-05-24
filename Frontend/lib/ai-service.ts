import { GoogleGenerativeAI } from "@google/generative-ai";
import { OnboardingProfile } from "@/lib/schemas";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function refineDescription(
  originalDescription: string,
  selectedTextOptions: string[],
  wordLimit: number,
  onboardingProfile?: OnboardingProfile
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel(
      { model: process.env.GEMINI_MODEL || "gemini-2.5-flash-tts" },
      { apiVersion: "v1beta" }
    );

    // Build context from onboarding profile
    let onboardingContext = "";
    if (onboardingProfile) {
      onboardingContext = `

Brand Context (from user profile):
- Business Type: ${onboardingProfile.businessType}
- Target Audience: ${onboardingProfile.targetAudience}
- Brand Style: ${onboardingProfile.brandStyle.join(", ")}
- Response Preference: ${onboardingProfile.responsePreference}`;
    }

    const prompt = `You are a professional copywriter. Refine the following campaign description to be more compelling and effective.${onboardingContext}

Original Description: "${originalDescription}"

Selected Text Options: ${selectedTextOptions.join(", ")}
Word Limit: ${wordLimit} words

Guidelines:
- Keep the message concise and within the word limit
- Make it engaging and action-oriented
- Align with the selected tone/style and user's brand voice
- Maintain the core message
- Match the response preference (${onboardingProfile?.responsePreference || "balanced"})
- Output ONLY the refined description, nothing else

Refined Description:`;

    const result = await model.generateContent(prompt);
    const refinedText = result.response.text().trim();

    // Ensure word limit is respected
    const words = refinedText.split(/\s+/);
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(" ") + "...";
    }

    return refinedText;
  } catch (error) {
    console.error("AI refinement error:", error);
    return originalDescription;
  }
}

export async function generateTextVariations(
  baseText: string,
  toneOfVoice: string,
  count: number = 3,
  onboardingProfile?: OnboardingProfile
): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel(
      { model: process.env.GEMINI_MODEL || "gemini-2.5-flash" },
      { apiVersion: "v1beta" }
    );

    let brandContext = "";
    if (onboardingProfile) {
      brandContext = `

Additional Context:
- Business: ${onboardingProfile.businessType}
- Target: ${onboardingProfile.targetAudience}
- Brand Style: ${onboardingProfile.brandStyle.join(", ")}
- Response Level: ${onboardingProfile.responsePreference}`;
    }

    const prompt = `Generate ${count} variations of the following message with a ${toneOfVoice} tone${brandContext}

Base Message: "${baseText}"

Requirements:
- Each variation should be unique but convey the same core message
- Maintain the ${toneOfVoice} tone throughout and user's brand voice
- Keep variations concise (under 160 characters each)
- Output format: Return ONLY the variations, one per line, without numbering or bullet points

Variations:`;

    const result = await model.generateContent(prompt);
    const variations = result.response
      .text()
      .trim()
      .split("\n")
      .filter((v) => v.trim().length > 0)
      .slice(0, count);

    return variations.length > 0 ? variations : [baseText];
  } catch (error) {
    console.error("Text variation generation error:", error);
    return [baseText];
  }
}

export async function validateAndEnhanceMessage(
  message: string,
  campaignType: string
): Promise<{ isValid: boolean; enhanced: string; suggestions: string[] }> {
  try {
    const model = genAI.getGenerativeModel(
      { model: process.env.GEMINI_MODEL || "gemini-2.5-flash" },
      { apiVersion: "v1beta" }
    );

    const prompt = `Analyze this ${campaignType} message and provide validation and enhancement suggestions:

Message: "${message}"

Provide response in JSON format (ONLY JSON, no other text):
{
  "isValid": boolean (true if message is appropriate for ${campaignType}),
  "enhanced": "improved version of message",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;

    const result = await model.generateContent(prompt);
    const jsonStr = result.response.text().trim();

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        isValid: true,
        enhanced: message,
        suggestions: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      isValid: parsed.isValid ?? true,
      enhanced: parsed.enhanced ?? message,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (error) {
    console.error("Message validation error:", error);
    return {
      isValid: true,
      enhanced: message,
      suggestions: [],
    };
  }
}
