const twilio = require('twilio');

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

const client = twilio(accountSid, authToken);

async function checkAlerts() {
  console.log("Fetching the last 5 security/networking alerts from Twilio...");
  try {
    const alerts = await client.monitor.v1.alerts.list({ limit: 5 });
    if (alerts.length === 0) {
      console.log("✅ No Twilio Alerts found. This means LiveKit is literally not even reaching Twilio.");
      console.log("Check LiveKit Cloud SIP Outbound Trunk settings -> Verify the Twilio SIP URI is correct.");
    } else {
      for (const alert of alerts) {
        console.log(`\n🚨 Alert [${alert.errorCode}]: ${alert.alertText}`);
        console.log(`   Time: ${alert.dateCreated}`);
      }
    }
  } catch (error) {
    console.error("Error fetching alerts:", error.message);
  }
}

checkAlerts();
