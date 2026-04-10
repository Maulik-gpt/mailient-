import { DatabaseService } from './lib/supabase.js';
import { GmailService } from './lib/gmail.js';
import { decrypt } from './lib/crypto.js';

async function test() {
  const email = "maulikbuilder@gmail.com";
  const db = new DatabaseService();
  const userTokens = await db.getUserTokens(email);
  const accessToken = decrypt(userTokens.encrypted_access_token);
  const refreshToken = decrypt(userTokens.encrypted_refresh_token);
  
  const gmail = new GmailService(accessToken, refreshToken);
  // Fetch messages
  const msgs = await gmail.getEmails(10, "16personalities");
  if (msgs.messages && msgs.messages.length > 0) {
    const id = msgs.messages[0].id;
    console.log("Found message ID:", id);
    const details = await gmail.getEmailDetails(id);
    const parsed = gmail.parseEmailData(details);
    console.log("Parsed isHtml:", parsed.isHtml);
    console.log("Parsed snippet:", parsed.snippet);
    console.log("Parsed body first 200 chars:", parsed.body.substring(0, 200));
  } else {
    console.log("No messages found");
  }
}
test().catch(console.error);
