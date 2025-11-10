// ================== server.js ==================
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
  // 🏦 البنوك
  "الراجحي": '🏦 <b>مصرف الراجحي</b>: <a href="bank_alrajhi.html" target="_blank">زيارة الصفحة</a>',
  "البنك الأهلي": '🏦 <b>البنك الأهلي السعودي</b>: <a href="bank_alahli.html" target="_blank">زيارة الصفحة</a>',
  "بنك الرياض": '🏦 <b>بنك الرياض</b>: <a href="bank_riyad.html" target="_blank">زيارة الصفحة</a>',

  // 🛂 الجوازات والأحوال والمرور
  "الأحوال": '👶 <b>نماذج الأحوال المدنية</b>: <a href="civil_forms.html" target="_blank">عرض الصفحة</a>',
  "المرور": '🚗 <b>نماذج المرور</b>: <a href="traffic_forms.html" target="_blank">عرض الصفحة</a>',
  "الجوازات": '🛂 <b>نماذج الجوازات</b>: <a href="passport_forms.html" target="_blank">عرض الصفحة</a>',
  "أبشر": '🛂 <b>منصة أبشر</b>: <a href="https://www.absher.sa" target="_blank">الدخول إلى المنصة</a>',

  // ⚖️ الخدمات العدلية
  "ناجز": '⚖️ <b>خدمات ناجز والمحاكم</b>: <a href="najiz.html" target="_blank">عرض الصفحة</a>',

  // 🏛️ البلدية
  "البلدية": '🏛️ <b>الخدمات البلدية</b>: <a href="municipal.html" target="_blank">عرض الصفحة</a>',

  // 🎓 التعليم
  "نور": '🎓 <b>نظام نور</b>: <a href="education.html" target="_blank">الدخول إلى الصفحة</a>',
  "مدرستي": '📚 <b>منصة مدرستي</b>: <a href="https://schools.madrasati.sa" target="_blank">الدخول إلى المنصة</a>',

  // 🛡️ التأمين
  "تأميني": '🛡️ <b>منصة تأميني</b>: <a href="taaminy.html" target="_blank">عرض الصفحة</a>',
  "بي كير": '🛡️ <b>منصة بي كير</b>: <a href="bekare.html" target="_blank">عرض الصفحة</a>',
  "نجم": '🚘 <b>موقع نجم للمطالبات</b>: <a href="Najm_website.html" target="_blank">عرض الصفحة</a>',

  // 💰 الضمان الاجتماعي
  "الضمان": '💰 <b>الضمان الاجتماعي</b>: <a href="social.html" target="_blank">عرض الصفحة</a>',

  // 📜 صفحات عامة
  "الشروط": '📜 <b>الشروط والأحكام</b>: <a href="terms.html" target="_blank">عرض الصفحة</a>',
  "الخصوصية": '🔒 <b>سياسة الخصوصية</b>: <a href="privacy.html" target="_blank">عرض الصفحة</a>',
  "اتصال": '📧 <b>تواصل معنا</b>: <a href="contact.html" target="_blank">عرض الصفحة</a>',

  // 🧭 مساعدة عامة
  "مساعدة": "💡 اكتب اسم الجهة مثل: (أبشر، نور، الراجحي، نجم...) لأعطيك الرابط المباشر.",
  "مرحبا": "أهلًا بك! أنا بوت الخدمات العامة 💚 اختر الخدمة التي تحتاجها مثل (أبشر، نور، المرور...).",
  "السلام": "وعليكم السلام ورحمة الله، تقدر تكتب اسم الجهة مثل (نور/راجحي/بلدي/ضمان) أو كلمة “مساعدة”.",
  "عليكم": "وعليكم السلام ورحمة الله، كيف أقدر أخدمك؟ اكتب اسم الجهة أو “مساعدة”."
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

// دالة البحث عن الرد
function findReply(message = "") {
  const msg = String(message).toLowerCase().trim();
  for (const key in responses) {
    if (msg.includes(key)) return { reply: responses[key], matched: true };
  }
  return {
    reply:
      'عذرًا، ما فهمت 💬<br>اكتب اسم الجهة مثل: <b>نور، الراجحي، أبشر، نجم...</b><br>أو اكتب “مساعدة” للإرشادات.',
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
const WEBHOOK_URL = `https://khdamat-saudia-bot.onrender.com${WEBHOOK_PATH}`;
bot.telegram
  .setWebhook(WEBHOOK_URL)
  .then(() => console.log(`✅ Webhook مُعَد: ${WEBHOOK_URL}`))
  .catch((err) => console.error("❌ فشل تعيين Webhook:", err.message));

// ====== إعداد السيرفر Express ======
const app = express();
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGIN ? [ALLOWED_ORIGIN] : "*" }));

app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/", (_req, res) => res.send("Bot Server يعمل بنجاح!"));

app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// ✅ نقطة استقبال من الموقع
app.post("/send", async (req, res) => {
  try {
    const { message } = req.body || {};
    const { reply, matched } = findReply(message);

    // نرجع الرد بـ HTML (حتى تعمل الروابط)
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
    res.status(500).json({ error: "حدث خطأ في السيرفر" });
  }
});

// ====== تشغيل السيرفر ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
  console.log(`📡 استقبال التحديثات على: ${WEBHOOK_PATH}`);
});
