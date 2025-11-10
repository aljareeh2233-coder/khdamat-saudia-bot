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
  "مرحبا": "أهلًا بك! أنا بوت الخدمات العامة\nاكتب اسم الجهة مثل (نور، راجحي، بلدي)."
};

// ====== إنشاء البوت ======
const bot = new Telegraf(BOT_TOKEN);

// ====== رد تلقائي داخل تيليجرام ======
bot.on("text", async (ctx) => {
  const msg = ctx.message.text.trim();
  let reply = 'عذرًا، ما فهمت\nقل "مساعدة" للإرشادات أو صف استفسارك لأحوله للفريق.';
  let found = false;

  for (const key in responses) {
    if (msg.toLowerCase().includes(key)) {
      reply = responses[key];
      found = true;
      break;
    }
  }

  // إذا ما في رد جاهز → أرسل بريد للفريق
  if (!found && GMAIL_USER && GMAIL_APP_PASS && RECEIVER_EMAIL) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
      });

      await transporter.sendMail({
        from: `بوت الخدمات <${GMAIL_USER}>`,
        to: RECEIVER_EMAIL,
        subject: "استفسار جديد من تيليجرام",
        text: `الرسالة:\n${msg}\n\nمن المستخدم: @${ctx.from?.username || "غير معروف"} (ID: ${ctx.from?.id})`
      });

      console.log("تم إرسال إشعار بالبريد من تيليجرام");
      reply += "\n\nتم إرسال استفسارك للفريق، سيردون عليك قريبًا";
    } catch (err) {
      console.error("خطأ في إرسال البريد:", err.message);
    }
  }

  ctx.reply(reply);
});

// ====== إعداد Webhook (بدل Polling) ======
const WEBHOOK_PATH = `/${BOT_TOKEN}`;
const WEBHOOK_URL = `https://khdamat-saudia-bot.onrender.com${WEBHOOK_PATH}`;

bot.telegram.setWebhook(WEBHOOK_URL)
  .then(() => console.log(`Webhook مُعَد: ${WEBHOOK_URL}`))
  .catch(err => console.error("فشل تعيين Webhook:", err.message));

// ====== إعداد السيرفر Express ======
const app = express();
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGIN ? [ALLOWED_ORIGIN] : "*" }));

// نقطة فحص الصحة (لـ Render)
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// الصفحة الرئيسية
app.get("/", (req, res) => res.send("Bot Server يعمل بنجاح!"));

// استقبال تحديثات تليجرام عبر Webhook
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// نقطة استقبال من الموقع (إن وجد)
app.post("/send", async (req, res) => {
  try {
    const { message } = req.body;
    let reply = 'عذرًا، ما فهمت. قل "مساعدة" للإرشادات.';
    let found = false;

    for (const key in responses) {
      if (message.toLowerCase().includes(key)) {
        reply = responses[key];
        found = true;
        break;
      }
    }

    if (!found && GMAIL_USER && GMAIL_APP_PASS && RECEIVER_EMAIL) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
      });

      await transporter.sendMail({
        from: `موقع الخدمات <${GMAIL_USER}>`,
        to: RECEIVER_EMAIL,
        subject: "استفسار جديد من الموقع",
        text: `الزائر كتب:\n${message}`
      });
      console.log("تم إرسال رسالة من الموقع إلى البريد");
      reply += "\n\nتم إرسال استفسارك للفريق";
    }

    res.json({ reply });
  } catch (err) {
    console.error("خطأ في /send:", err.message);
    res.status(500).json({ error: "حدث خطأ في السيرفر" });
  }
});

// ====== تشغيل السيرفر ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`السيرفر يعمل على المنفذ ${PORT}`);
  console.log(`استقبال التحديثات على: ${WEBHOOK_PATH}`);
});