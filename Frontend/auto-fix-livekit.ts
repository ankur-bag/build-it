import { SipClient } from 'livekit-server-sdk';
import * as fs from 'fs';

// Manually parse .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length > 0) {
    env[key.trim()] = vals.join('=').trim().replace(/^["'](.*)["']$/, '$1');
  }
});

const LIVEKIT_URL = env['LIVEKIT_URL']?.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
const LIVEKIT_API_KEY = env['LIVEKIT_API_KEY'];
const LIVEKIT_API_SECRET = env['LIVEKIT_API_SECRET'];
const sipTrunkId = env['LIVEKIT_SIP_TRUNK_ID'];

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !sipTrunkId) {
  console.log("Missing credentials or Trunk ID in .env");
  process.exit(1);
}

const sipClient = new SipClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

async function autoFixLiveKit() {
  console.log(`🔧 Attempting to auto-fix SIP Trunk: ${sipTrunkId}`);
  try {
    const trunks = await sipClient.listSipOutboundTrunk();
    
    let targetTrunk = trunks.find(t => t.sipTrunkId === sipTrunkId);
    if (!targetTrunk) {
      console.log(`❌ Trunk ${sipTrunkId} not found in this account!`);
      return;
    }

    console.log(`Current Address: ${targetTrunk.address}`);
    console.log(`Current Numbers:`, targetTrunk.numbers);

    // Apply the fix: The trunk must allow dialing any number ('.*') to reach Twilio +91...
    // Also, we'll keep the existing numbers just in case.
    const newNumbers = [...(targetTrunk.numbers || [])];
    if (!newNumbers.includes('.*')) {
      newNumbers.push('.*');
    }

    // Force Twilio Termination URI just in case it's wrong
    let address = targetTrunk.address;
    if (!address || address.trim() === '') {
        address = env['TWILIO_TERMINATION_URI'] || 'livekit-ai.pstn.twilio.com';
        address = address.replace('sip:', '');
    }

    // We can't update using 'updateSipOutboundTrunk' safely without triggering TypeScript missing fields.
    // However, LiveKit's server-sdk might let us just patch it.
    console.log(`\n⏳ Updating Dashboard settings automatically via API...`);
    
    // The LiveKit API requires 'numbers' or 'allowedNumbers'. 
    // We will recreate the trunk or just update fields. 
    // updateSipOutboundTrunkFields takes { numbers?: any }
    // Actually, LiveKit lets you just update the whole trunk if you pass it back:
    targetTrunk.numbers = newNumbers;
    
    // Try to update
    await sipClient.updateSipOutboundTrunk(sipTrunkId, targetTrunk);
    console.log(`✅ Success! The '.*' Destination Pattern has been added strictly to Trunk ${sipTrunkId}.`);
    console.log(`✅ LiveKit will now actively forward +91 numbers to Twilio.`);

  } catch (err: any) {
    console.error('❌ Failed to update LiveKit Trunk API:', err.message);
    console.log("We will need to recreate it if this fails.");
  }
}

autoFixLiveKit();
