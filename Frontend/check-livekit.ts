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

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.log("Missing LiveKit credentials in .env");
  process.exit(1);
}

const sipClient = new SipClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

async function checkAndFixLiveKitTrunks() {
  console.log('🔍 Fetching all LiveKit Outbound SIP Trunks...\n');
  try {
    const trunks = await sipClient.listSipOutboundTrunk();
    
    if (trunks.length === 0) {
      console.log('❌ NO OUTBOUND TRUNKS FOUND IN YOUR LIVEKIT ACCOUNT.');
      console.log('You must create an Outbound Trunk in the LiveKit Dashboard pointing to Twilio.');
      return;
    }

    for (const trunk of trunks) {
      console.log(`📡 Trunk ID: ${trunk.sipTrunkId}`);
      console.log(`   Name: ${trunk.name}`);
      console.log(`   Address (Twilio URI): ${trunk.address}`);
      console.log(`   Allowed Phone Numbers (Destination Pattern):`);
      
      const numbers = trunk.numbers || [];
      if (numbers.length === 0) {
        console.log(`   ❌ ERROR: No destination pattern set. This trunk CANNOT make outbound calls.`);
      } else {
        numbers.forEach(num => console.log(`      - ${num}`));
        
        if (!numbers.includes('.*')) {
           console.log(`   ⚠️ WARNING: You do not have '.*' allowed. International numbers like +91 will be BLOCKED unless explicitly listed.`);
        } else {
           console.log(`   ✅ Valid Catch-all pattern (.*) found!`);
        }
      }
      
      console.log(`   Twilio Auth Username config: ${trunk.authUsername ? 'SET ✅' : 'MISSING ❌'}`);
      console.log('----------------------------------------------------');
    }

  } catch (err: any) {
    console.error('Error fetching LiveKit trunks:', err.message);
  }
}

checkAndFixLiveKitTrunks();
