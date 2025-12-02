// ================== server.js (محدث ثنائي اللغة) ==================
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { Telegraf } from "telegraf";

// ====== المتغيرات البيئية ======
const {
  BOT_TOKEN,
  GMAIL_USER,
  GMAIL_APP_PASS,
  RECEIVER_EMAIL,
  ALLOWED_ORIGIN
} = process.env;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN غير موجود. أضفه في إعدادات Render.");
  process.exit(1);
}

// ====== الردود الذكية (AR & EN) ======
const responses = {
  // --- Arabic Keywords ---
  "أبشر": `🛂 <b>منصة أبشر</b><br>منصة إلكترونية تتيح تنفيذ خدمات وزارة الداخلية بسهولة وأمان.<br>🔗 <a href="https://www.absher.sa" target="_blank">زيارة الموقع الرسمي</a><br><br>📄 <b>خدمات متصلة:</b><br>• <a href="civil_forms.html" target="_blank">الأحوال المدنية</a><br>• <a href="passport_forms.html" target="_blank">الجوازات</a>`,
  
  "ناجز": `⚖️ <b>منصة ناجز</b><br>البوابة الموحدة للخدمات العدلية الإلكترونية.<br>🔗 <a href="https://najiz.sa" target="_blank">زيارة الموقع</a><br><br>📄 <a href="najiz.html" target="_blank">شرح خدمات ناجز</a>`,
  
  "نور": `🎓 <b>نظام نور</b><br>نظام إلكتروني لإدارة شؤون الطلاب.<br>🔗 <a href="https://noor.moe.gov.sa" target="_blank">الدخول للنظام</a><br><br>📄 <a href="education.html" target="_blank">دليل الاستخدام</a>`,
  
  "الراجحي": `🏦 <b>مصرف الراجحي</b><br>خدمات الأفراد والشركات.<br>🔗 <a href="https://www.alrajhibank.com.sa" target="_blank">الموقع الرسمي</a><br><br>📄 <a href="bank_alrajhi.html" target="_blank">شرح الخدمات</a>`,
  
  "بلدي": `🏛️ <b>منصة بلدي</b><br>الرخص التجارية والإنشائية.<br>🔗 <a href="https://balady.gov.sa" target="_blank">زيارة المنصة</a><br><br>📄 <a href="municipal.html" target="_blank">دليل الخدمات البلدية</a>`,

  "قوى": `👷 <b>منصة قوى</b><br>خدمات العمل والعمال (نقل كفالة، عقود).<br>🔗 <a href="https://qiwa.sa" target="_blank">زيارة قوى</a><br><br>📄 <a href="qiwa.html" target="_blank">الشرح الكامل</a>`,

  "حساب المواطن": `💰 <b>حساب المواطن</b><br>برنامج الدعم الحكومي للأسر.<br>🔗 <a href="https://portal.ca.gov.sa" target="_blank">البوابة الإلكترونية</a><br><br>📄 <a href="citizen.html" target="_blank">طريقة التسجيل والاعتراض</a>`,

  // --- English Keywords ---
  "absher": `🛂 <b>Absher Platform</b><br>The official platform for MOI services.<br>🔗 <a href="https://www.absher.sa" target="_blank">Official Website</a><br><br>📄 <b>Related:</b><br>• <a href="passport_forms.html" target="_blank">Passports</a><br>• <a href="traffic_forms.html" target="_blank">Traffic</a>`,

  "najiz": `⚖️ <b>Najiz Portal</b><br>Unified portal for MOJ judicial services.<br>🔗 <a href="https://najiz.sa" target="_blank">Visit Najiz</a><br><br>📄 <a href="najiz.html" target="_blank">Service Guide</a>`,

  "noor": `🎓 <b>Noor System</b><br>Student management system for grades and registration.<br>🔗 <a href="https://noor.moe.gov.sa" target="_blank">Login</a><br><br>📄 <a href="education.html" target="_blank">User Guide</a>`,

  "rajhi": `🏦 <b>Al Rajhi Bank</b><br>Personal and corporate banking services.<br>🔗 <a href="https://www.alrajhibank.com.sa" target="_blank">Official Site</a><br><br>📄 <a href="bank_alrajhi.html" target="_blank">Our Guide</a>`,

  "balady": `🏛️ <b>Balady Platform</b><br>Commercial and construction licenses.<br>🔗 <a href="https://balady.gov.sa" target="_blank">Visit Balady</a><br><br>📄 <a href="municipal.html" target="_blank">Municipal Guide</a>`,

  "qiwa": `👷 <b>Qiwa Platform</b><br>Labor services (Transfer, Contracts).<br>🔗 <a href="https://qiwa.sa" target="_blank">Visit Qiwa</a><br><br>📄 <a href="qiwa.html" target="_blank">Full Guide</a>`,

  "citizen account": `💰 <b>Citizen Account</b><br>Government support program for families.<br>🔗 <a href="https://portal.ca.gov.sa" target="_blank">Official Portal</a><br><br>📄 <a href="citizen.html" target="_blank">Registration Guide</a>`,

  // --- General (Generic) ---
  "help": `💡 Type entity name like: (Absher, Noor, Rajhi, Qiwa...) to get the direct link and guide.`,
  "hello": `👋 Welcome! I am Public Services Bot 💚. Please choose a service (e.g., Absher, Noor, Balady).`,
  "hi": `👋 Hi there! How can I help you today? Type a service name.`,
  
  "مساعدة": `💡 اكتب اسم الجهة مثل: (أبشر، نور، الراجحي، نجم...) لأعطيك الرابط المباشر والوصف الكامل.`,
  "مرحبا": `👋 أهلًا بك! أنا بوت الخدمات العامة 💚 اختر الخدمة التي تحتاجها مثل (أبشر، نور، المرور...).`,
};


// ====== إعداد البريد ======
let transporter = null;
if (GMAIL_USER && GMAIL_APP_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
    pool: true,
    maxConnections: 1,
    maxMessages: 5,
    rateDelta: 20000,
    rateLimit: 5,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// ====== إنشاء البوت تيليجرام ======
const bot = new Telegraf(BOT_TOKEN);

// دالة البحث عن الرد (محدثة)
function findReply(message = "") {
  const msg = String(message).toLowerCase().trim();
  
  // البحث عن تطابق جزئي في الكلمات المفتاحية
  for (const key in responses) {
    if (msg.includes(key)) return { reply: responses[key], matched: true };
  }

  // رسالة الخطأ (افتراضية بالعربي، ويمكن تحسينها لتخمين اللغة)
  // لكن بما أن الطلب يأتي نصاً، سنرد برسالة مزدوجة
  const defaultReply = `
    عذرًا، ما فهمت 💬<br>اكتب اسم الجهة مثل: <b>نور، الراجحي...</b><br>
    <hr>
    Sorry, I didn't understand 💬<br>Type entity name like: <b>Noor, Rajhi...</b>
  `;
  
  return {
    reply: defaultReply,
    matched: false,
  };
}

// استقبال رسائل تيليجرام
bot.on("text", async (ctx) => {
  const { reply, matched } = findReply(ctx.message.text);
  await ctx.replyWithHTML(reply);

  if (!matched && transporter && RECEIVER_EMAIL) {
    transporter
      .sendMail({
        from: `بوت الخدمات <${GMAIL_USER}>`,
        to: RECEIVER_EMAIL,
        subject: "استفسار جديد من تيليجرام",
        text: `الرسالة:\n${ctx.message.text}\nمن: @${ctx.from?.username || "غير معروف"} (ID: ${ctx.from?.id})`,
      })
      .then(() => console.log("📧 تم إرسال إشعار بالبريد (Telegram)"))
      .catch((err) => console.error("❌ خطأ إرسال بريد:", err.message));
  }
});

// ====== إعداد Webhook ======
const WEBHOOK_PATH = `/${BOT_TOKEN}`;
// ملاحظة: تأكد أن رابط Render صحيح هنا
const WEBHOOK_URL = `https://khdamat-saudia-bot.onrender.com${WEBHOOK_PATH}`;

// محاولة ضبط الويب هوك (اختياري عند كل تشغيل لتفادي التكرار)
// bot.telegram.setWebhook(WEBHOOK_URL)...

// ====== إعداد السيرفر Express ======
const app = express();
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGIN ? [ALLOWED_ORIGIN] : "*" }));

app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/", (_req, res) => res.send("Bot Server is Running! 🚀"));

app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// ✅ نقطة استقبال من الموقع
app.post("/send", async (req, res) => {
  try {
    const { message } = req.body || {};
    const { reply, matched } = findReply(message);

    res.json({ reply: reply.replace(/\n/g, "<br>") });

    if (!matched && transporter && RECEIVER_EMAIL) {
      transporter
        .sendMail({
          from: `موقع الخدمات <${GMAIL_USER}>`,
          to: RECEIVER_EMAIL,
          subject: "استفسار جديد من الموقع",
          text: `الزائر كتب:\n${message}`,
        })
        .then(() => console.log("📧 تم إرسال رسالة من الموقع"))
        .catch((err) => console.error("❌ خطأ إرسال بريد (الموقع):", err.message));
    }
  } catch (err) {
    console.error("❌ خطأ في /send:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ====== تشغيل السيرفر ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});