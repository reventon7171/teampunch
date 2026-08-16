// One-time interactive script to obtain a Google OAuth refresh token for Drive photo sync.
// Run with: npm run drive:auth
// See README.md section "Google Drive photo sync" for the full setup walkthrough.
import "dotenv/config";
import http from "http";
import { URL } from "url";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("กรุณาตั้งค่า GOOGLE_OAUTH_CLIENT_ID และ GOOGLE_OAUTH_CLIENT_SECRET ใน backend/.env ก่อนรันสคริปต์นี้");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a fresh consent so Google actually issues a refresh_token
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });

  console.log("\n=== เปิดลิงก์นี้ในเบราว์เซอร์ แล้วล็อกอิน + กด Allow ===\n");
  console.log(authUrl);
  console.log("\n(อย่าปิดหน้าต่างเทอร์มินัลนี้ กำลังรอ...)\n");

  const code: string = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404);
        res.end();
        return;
      }
      const codeParam = url.searchParams.get("code");
      const errorParam = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (errorParam || !codeParam) {
        res.end("<h2>ยกเลิกการอนุญาตแล้ว ปิดหน้าต่างนี้แล้วลองใหม่ได้เลย</h2>");
        server.close();
        reject(new Error(errorParam || "no code returned"));
        return;
      }
      res.end("<h2>สำเร็จ! กลับไปที่เทอร์มินัลได้เลย ปิดหน้าต่างนี้ได้</h2>");
      server.close();
      resolve(codeParam);
    });
    server.listen(PORT);
  });

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    console.error(
      "\nไม่ได้รับ refresh token กลับมา — มักเกิดเพราะเคยอนุญาตแอพนี้ไปแล้วก่อนหน้า\n" +
        "ไปที่ https://myaccount.google.com/permissions เพิกถอนสิทธิ์แอพนี้ก่อน แล้วรันสคริปต์นี้ใหม่อีกครั้ง"
    );
    process.exit(1);
  }

  console.log("\n=== สำเร็จ! คัดลอกบรรทัดนี้ไปวางใน backend/.env ===\n");
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token}"`);
  console.log("");
}

main().catch((err) => {
  console.error("เกิดข้อผิดพลาด:", err instanceof Error ? err.message : err);
  process.exit(1);
});
