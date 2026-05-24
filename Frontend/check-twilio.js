const twilio = require('twilio');

// Parse .env manually since dotenv isn't installed
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length > 0) {
    env[key.trim()] = vals.join('=').trim().replace(/^["'](.*)["']$/, '$1');
  }
});

const accountSid = env['TWILIO_ACCOUNT_SID'];
const authToken = env['TWILIO_AUTH_TOKEN'];

if (!accountSid || !authToken) {
  console.log("Missing Twilio credentials");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function checkRecentCalls() {
  console.log("Fetching the last 10 outbound phone calls from Twilio's logs...");
  try {
    const calls = await client.calls.list({ limit: 10 });
    
    if (calls.length === 0) {
      console.log("\n❌ NO CALLS FOUND IN TWILIO LOGS.");
      console.log("LiveKit's SIP Trunk didn't even reach Twilio, or the IP is blocked (Access Control List), or Authentication Failed.");
    } else {
      let foundOutbound = false;
      for (const call of calls) {
        if (call.direction !== 'outbound-api' && call.direction !== 'outbound-dial') {
           // We are looking for outbound
        }
        foundOutbound = true;
        
        console.log(`\n📞 Call to: ${call.to}`);
        console.log(`   Status:       ${call.status}`);
        console.log(`   Direction:    ${call.direction}`);
        console.log(`   Start Time:   ${call.startTime}`);
        console.log(`   Price:        ${call.price || '0'}`);
        
        // Fetch call details if it failed
        if (call.status === 'failed' || call.status === 'canceled' || call.status === 'no-answer') {
           console.log(`   ⚠️ This call failed to connect.`);
           try {
               const notifications = await client.calls(call.sid).notifications.list({ limit: 2 });
               for (const n of notifications) {
                   console.log(`   🛑 Twilio Warning/Error: [${n.errorCode}] ${n.messageText}`);
               }
           } catch(e) {}
        }
      }
      if (!foundOutbound) console.log("No outbound calls found recently.");
    }
  } catch (error) {
    console.error("Error fetching Twilio logs:", error.message);
  }
}

checkRecentCalls();
