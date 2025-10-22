// npm install bcryptjs
import bcrypt from "bcryptjs";

async function makeHash() {
  const plaintext = "Abcd@1234";
  const saltRounds = 12; // recommended: 10-14 depending on your server CPU
  const hash = await bcrypt.hash(plaintext, saltRounds);
  console.log("bcrypt hash:", hash);
}
makeHash().catch(console.error);
