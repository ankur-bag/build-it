import twilio from 'twilio';
import path from 'path';

// Note: To run this script, use: node --env-file=.env check-twilio.ts
// Or ensure your environment variables are loaded.

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.log("Missing Twilio credentials in environment (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function checkRecentCalls() {
  console.log("Fetching the last 5 phone calls from Twilio's logs...");
  try {
    const calls = await client.calls.list({ limit: 5 });
    
    if (calls.length === 0) {
      console.log("\n❌ NO CALLS FOUND IN TWILIO LOGS.");
      console.log("Possible issues: LiveKit SIP Trunk didn't reach Twilio, IP blocked, or Authentication failed.");
    } else {
      for (const call of calls) {
        console.log(`\n📞 Call to: ${call.to}`);
        console.log(`   Status: ${call.status}`);
        console.log(`   Direction: ${call.direction}`);
        console.log(`   Start Time: ${call.startTime}`);
        
        // Fetch call details if it failed
        if (call.status === 'failed' || call.status === 'canceled') {
           const details: any = await client.calls(call.sid).fetch();
           console.log(`   ⚠️ Error Code: ${details.errorCode || 'None'}`);
           console.log(`   ⚠️ Error Message: ${details.errorMessage || 'None'}`);
        }
      }
    }
  } catch (error: any) {
    console.error("Error fetching Twilio logs:", error.message);
  }
}

checkRecentCalls();
