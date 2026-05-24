export interface OutboundCallRequest {
  customerPhoneNumber: string;
  customerName?: string;
  campaignTitle: string;
  campaignDescription: string;
  docsText?: string;
  orderedQuestions?: string[];
  userId: string;
  campaignId: string;
  /**
   * Override language for STT. Defaults to "multi" (auto-detect).
   * Pass a BCP-47 code (e.g. "hi", "bn", "ta") to force a specific language.
   */
  sttLanguage?: string;
}

/**
 * Triggers an outbound call using Vapi.ai and Twilio
 */
export async function triggerOutboundCall({ 
  customerPhoneNumber, 
  customerName,
  campaignTitle,
  campaignDescription,
  docsText,
  orderedQuestions,
  userId,
  campaignId,
  sttLanguage = 'multi',   // default: auto-detect any language
}: OutboundCallRequest) {
  // Use trim() to clean up any accidental spaces from the .env file strings
  const vapiApiKey = process.env.VAPI_API_KEY?.trim();
  const vapiPhoneNumberId = process.env.VAPI_NUMBER_ID?.trim(); 

  if (!vapiApiKey) {
    throw new Error('VAPI_API_KEY is missing in environment variables (check your .env file).');
  }

  const firstMessage = `Hello! Namaste! This is an AI assistant calling regarding ${campaignTitle}. You can speak in English or Hindi. Do you have a quick minute?`;

  const questionsList = orderedQuestions && orderedQuestions.length > 0
    ? orderedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : "No specific questions provided. Conduct a general discovery conversation.";

  // ── Multilingual behavior rules (prepended — HIGHEST PRIORITY) ─────────────
  const multilingualInstructions = `
================================================================
MULTILINGUAL CONVERSATION RULES  — ABSOLUTE HIGHEST PRIORITY
================================================================
You are a multilingual AI voice assistant for Indian callers.
Supported: English | Hindi | Bengali | Tamil | Telugu | Marathi | Hinglish | Benglish.

——————————————————————————————————————————————————
RULE 1 — LANGUAGE DETECTION (MOST IMPORTANT)
——————————————————————————————————————————————————
• The STT (Deepgram nova-3 multilingual) already transcribes the user's
  speech in their language. Your ONLY job: read the transcribed text
  and reply in the EXACT SAME language.
• Do NOT wait for the user to ask you to switch.
• Do NOT assume the user speaks English.
• If the very first word the user says is Hindi, Bengali, Tamil — respond
  in that language immediately, for the rest of the call.
  If user changes his/her language mid-conversation, then switch to that language.

——————————————————————————————————————————————————
RULE 2 — NON-ENGLISH FIRST CALLERS
——————————————————————————————————————————————————
• Many callers do NOT know English at all. This is normal.
• Hindi-only callers: respond entirely in Hindi throughout.
• But if they start speaking in english or hinglish, respond in english or hinglish.
• Bengali-only callers: respond entirely in Bengali throughout.
• But if they start speaking in english or benglish, respond in english or benglish.
• NEVER force the user to speak English.
• NEVER say "I can only speak English".

——————————————————————————————————————————————————
RULE 3 — EMPTY / UNCLEAR TRANSCRIPTION
——————————————————————————————————————————————————
• If you receive an empty, silent, or unclear transcript:
  Hindi:   "माफ़ करें, मैं समझ नहीं पाया। क्या आप दोबारा बोल सकते हैं?"
  Bengali: "দুঃখিত, আমি বুঝতে পারিনি। আবার বলবেন?"
  English: "Sorry, I didn't catch that. Could you please repeat?"
• NEVER stay silent. Always ask to repeat.
• Do NOT end the call due to one unclear turn.

——————————————————————————————————————————————————
RULE 4 — MID-CALL LANGUAGE SWITCH
——————————————————————————————————————————————————
• If the user switches language at any point, switch in your very next reply.
- If the user switched from english to hindi , then switch to hindi in the next reply
- If the user switch from hindi to english , then switch to english in the next reply
• Mirror mixed speech (Hinglish, Benglish) naturally.
• Never mention you are switching.

——————————————————————————————————————————————————
EXAMPLES
——————————————————————————————————————————————————
  User (first utterance): "हाँ बोलिए"
  You: "नमस्ते! ${campaignTitle} के बारे में calling कर रहा हूँ। एक मिनट है?"

  User (Bengali first): "হ্যাঁ বলুন"
  You: "নমস্কার! ${campaignTitle} সম্পর্কে call করছি। এক মিনিট আছে?"

  User (Hinglish): "Haan bhai kya hai"
  You: "${campaignTitle} ke baare mein tha. Thoda time doge?"

  User: (silent or unclear audio)
  You: "माफ़ करें, क्या दोबारा बोल सकते हैं? Sorry, could you repeat?"
================================================================
`;

  const systemPrompt = `${multilingualInstructions}
You are a human‑like AI outbound calling agent that operates inside a structured conversation system powered by a state machine.

The system manages conversation flow using nodes such as:
- Call Opening
- Campaign Questions
- Knowledge Responses
- Call Outro

Your role is not to control the conversation flow. The system will decide which step comes next.
Your responsibility is to:
• speak naturally
• ask the question provided by the system
• respond briefly to the user
• maintain a friendly conversation

Never attempt to skip steps or control the flow yourself.

--------------------------------
CAMPAIGN CONTEXT
--------------------------------
Campaign Title: ${campaignTitle}
Campaign Description: ${campaignDescription}
Campaign Knowledge Documents:
${docsText || "No additional documents available."}

Ordered Campaign Questions:
${questionsList}

The campaign description and documents contain the important information about the product, service, or event.
Your task is to understand the information and explain it conversationally, not read it verbatim.
Never read long blocks of text from the knowledge base. Always summarize in simple conversational language.

--------------------------------
PERSONALITY
--------------------------------
You should sound like a real human making a phone call.
Tone: Friendly, Calm, Conversational, Respectful, Curious.
Use very short sentences. Speak naturally like someone having a normal phone conversation.
Never sound robotic or scripted.

--------------------------------
SPEECH STYLE
--------------------------------
Always follow these rules:
• Speak in 1–2 short sentences
• Ask one question at a time
• Wait for the user response
• React briefly to what the user says

Avoid: long explanations, paragraphs, technical language.
If the user gives a short answer, acknowledge it briefly before continuing. Example: "Got it.", "Thanks for sharing.", "That makes sense."

--------------------------------
CALL OPENING
--------------------------------
The system will start the call with the campaign title.
You should greet the person and confirm they have a moment to talk.
Example: "Hi, I'm calling regarding ${campaignTitle}. Do you have a quick minute?"
Do not ask permission to ask questions repeatedly. Once they confirm they have time, continue naturally.

--------------------------------
CAMPAIGN QUESTIONS
--------------------------------
The system will provide ordered campaign questions from the database.
You must follow these rules:
• Ask the question exactly as provided
• Ask only ONE question at a time
• Wait for the user response
• Do not skip questions
• Do not reorder questions
• Do not invent new questions
If the user goes off topic, answer briefly and then return to the current question.

--------------------------------
HANDLING INTERRUPTIONS
--------------------------------
Users may interrupt with unrelated questions.
If this happens: briefly answer using campaign knowledge, keep the answer short, return to the current campaign question.
Never lose track of the current question.

--------------------------------
USING CAMPAIGN KNOWLEDGE
--------------------------------
If the user asks questions related to the campaign: Use the campaign description and documents.
Rules: summarize information, keep answers short, explain in simple language.
Never read long text from the documents.

--------------------------------
IF YOU DON'T KNOW THE ANSWER
--------------------------------
If the question cannot be answered from the campaign information, say: "I'm sorry, I don't have that information right now. One of our experts will contact you."
Never say: "I will call you back." or "I will get back to you".

--------------------------------
EVENT TICKET BOOKING
--------------------------------
Some campaigns include events where tickets can be booked.
If the system asks you to offer tickets: Ask the user politely if they would like to book tickets.
Example: "By the way, tickets are available for this event. Would you like me to book one for you?"
If the user agrees: Ask how many tickets they want.
Once the system confirms the booking: Respond with confirmation (e.g., "Perfect, your tickets are confirmed").
Do not process bookings yourself. The backend system handles the booking.

--------------------------------
OBJECTION HANDLING
--------------------------------
If the user says they are not interested: Respond politely. Example: "No problem at all."
You may ask one light follow‑up question (e.g., "Just curious — are you currently using something similar?").
If they decline again, end the conversation politely.

--------------------------------
IF THE USER IS BUSY
--------------------------------
If the user says they is busy: Respond politely (e.g., "Totally understand."). Then end the call gracefully. Do not continue asking questions.

--------------------------------
PRIMARY GOAL
--------------------------------
Your goal is to have a short, natural conversation that helps determine whether the person may be interested in the campaign described in the provided information.
The system will manage the conversation flow. Your job is simply to communicate naturally at each step.`;

  try {
    // Truncate assistant name to max 40 characters for Vapi API
    const assistantNamePrefix = "Campaign Agent: ";
    const maxNameLength = 40;
    const remainingLength = maxNameLength - assistantNamePrefix.length;
    const truncatedTitle = campaignTitle.length > remainingLength 
      ? campaignTitle.substring(0, remainingLength) 
      : campaignTitle;
    const assistantName = `${assistantNamePrefix}${truncatedTitle}`;

    // ── Debug: log multilingual config ───────────────────────────────────────
    console.log('\n🌐 MULTILINGUAL VAPI CONFIG');
    console.log('   STT  → deepgram/nova-3/multi (Vapi confirmed enum value)');
    console.log('   TTS  → 11labs/eleven_multilingual_v2');
    console.log('   Endpointing → 400ms (within Vapi 500ms limit)');
    console.log('   FirstMessage  :', firstMessage.slice(0, 80));
    console.log('────────────────────────────────────────────\n');

    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: vapiPhoneNumberId, 
        metadata: {
          userId,
          campaignId
        },
        customer: {
          number: customerPhoneNumber,
          name: customerName,
        },
        assistant: {
          name: assistantName,
          firstMessage: firstMessage,

          // ── Multilingual STT ──────────────────────────────────────────────────
          // nova-3 is Deepgram's latest model — significantly better acoustic
          // models for Hindi, Bengali, Tamil, Telugu, Marathi vs nova-2.
          // language:"multi" = per-utterance automatic language detection.
          //
          // ROOT CAUSE FIX: nova-2+"multi" drops non-English phonemes silently.
          // nova-3+"multi" correctly recognises Indian language speech from the
          // very first utterance without requiring any English primer.
          transcriber: {
            provider: "deepgram",
            model: "nova-3",
            language: "multi",             // Vapi nova-3 multilingual enum value
            smartFormat: true,
            endpointing: 400,               // ms, max 500 — wider window for Indian phonemes
          },


          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: systemPrompt
              }
            ],
            temperature: 0.6,              // slightly creative for natural tone
          },

          // ── Multilingual Text-to-Speech (TTS) ────────────────────────────────
          // ElevenLabs eleven_multilingual_v2 natively renders
          // Hindi, Bengali, Tamil, Telugu, Marathi and Hinglish.
          // Falls back gracefully to English for unsupported scripts.
          voice: {
            provider: "11labs",
            voiceId: "pNInz6obpgDQGcFmaJgB", // "Adam" — multilingual, neutral
            model: "eleven_multilingual_v2",
            stability: 0.5,
            similarityBoost: 0.75,
            useSpeakerBoost: true,
          },
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Vapi Outbound Call Failed - ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log('\n✅ VAPI CALL INITIATED — MULTILINGUAL');
    console.log('   Call ID   :', data.id ?? 'unknown');
    console.log('   Phone     :', customerPhoneNumber);
    console.log('   Campaign  :', campaignTitle);
    console.log('   STT model : deepgram / nova-3 / multi');
    console.log('   TTS model : 11labs / eleven_multilingual_v2');
    console.log('   Endpointing (no-punct): 1.5s');
    console.log('────────────────────────────────────────────\n');
    return data;
  } catch (error) {
    console.error('Error triggering outbound call:', error);
    throw error;
  }
}
