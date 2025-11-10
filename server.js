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

// ====== الردود الجاهزة ======
const responses = {
  "نور": "نظام نور: https://noor.moe.gov.sa",
  "راجحي": "مصرف الراجحي: https://www.alrajhibank.com.sa",
  "بلدي": "منصة بلدي: https://balady.gov.sa",
  "ضمان": "الضمان الاجتماعي: https://sbis.hrsd.gov.sa",
  "مساعدة": "اكتب اسم الجهة مثل: نور، راجحي، بلدي، ضمان.\nولو سؤالك مختلف، اكتبه لي وأحوّله للفريق.",
  "مرحبا": "أهلًا بك! أنا بوت الخدمات العامة.\nاكتب اسم الجهة مثل (نور، راجحي، بلدي).",
  // مفاتيح سريعة للتحية
  "السلام": "وعليكم السلام ورحمة الله، تقدر تكتب اسم الجهة مثل (نور/راجحي/بلدي/ضمان) أو كلمة “مساعدة”.",
  "عليكم": "وعليكم السلام ورحمة الله، كيف أقدر أخدمك؟ اكتب اسم الجهة أو “مساعدة”.",
};

// إنشاء مُرسِل بريد (مسبح + مهلات)
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

// ====== إنشاء البوت (Webhook) ======
const bot = new Telegraf(BOT_TOKEN);

// دالة مساعدة: إيجاد رد جاهز
function findReply(message = "") {
  const msg = String(message).toLowerCase().trim();
  for (const key in responses) {
    if (msg.includes(key)) return { reply: responses[key], matched: true };
  }
  return {
    reply:
      'عذرًا، ما فهمت.\nاكتب اسم الجهة مثل: نور، راجحي، بلدي، ضمان.\nأو اكتب “مساعدة” للإرشادات.\nتم تمرير رسالتك للفريق إذا احتجت متابعة.',
    matched: false,
  };
}

// رد تلقائي داخل تيليجرام (مع إرسال بريد في الخلفية بدون انتظار)
bot.on("text", async (ctx) => {
  const { reply, matched } = findReply(ctx.message.text);

  // ✅ رد فوري للمستخدم
  await ctx.reply(reply);

  // 📧 إرسال بريد في الخلفية فقط إذا ما لقي رد جاهز
  if (!matched && transporter && RECEIVER_EMAIL) {
    Promise.resolve()
      .then(() =>
        transporter.sendMail({
          from: `بوت الخدمات <${GMAIL_USER}>`,
          to: RECEIVER_EMAIL,
          subject: "استفسار جديد من تيليجرام",
          text: `الرسالة:\n${ctx.message.text}\nمن: @${ctx.from?.username || "غير معروف"} (ID: ${ctx.from?.id})`,
        })
      )
      .then(() => console.log("📧 تم إرسال إشعار بالبريد (Telegram)"))
      .catch((err) => console.error("❌ خطأ إرسال بريد (Telegram):", err.message));
  }
});

// إعداد Webhook
const WEBHOOK_PATH = `/${BOT_TOKEN}`;
const WEBHOOK_URL = `https://khdamat-saudia-bot.onrender.com${WEBHOOK_PATH}`;
bot.telegram
  .setWebhook(WEBHOOK_URL)
  .then(() => console.log(`Webhook مُعَد: ${WEBHOOK_URL}`))
  .catch((err) => console.error("فشل تعيين Webhook:", err.message));

// ====== إعداد السيرفر Express ======
const app = express();
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGIN ? [ALLOWED_ORIGIN] : "*" }));

// صحة Render
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/", (_req, res) => res.send("Bot Server يعمل بنجاح!"));

// استقبال تحديثات تيليجرام
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// نقطة استقبال من الموقع
app.post("/send", async (req, res) => {
  try {
    const { message } = req.body || {};
    const { reply, matched } = findReply(message);

    // نرجع الرد للموقع فورًا
    res.json({ reply });

    // إرسال بريد في الخلفية إذا لا يوجد رد جاهز
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
    res.status(500).json({ error: "حدث خطأ في السيرفر" });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`السيرفر يعمل على المنفذ ${PORT}`);
  console.log(`استقبال التحديثات على: ${WEBHOOK_PATH}`);
});
