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
  console.error("❌ BOT_TOKEN غير موجود. أضفه في إعدادات Render لاحقًا.");
  process.exit(1);
}

// ====== الردود الجاهزة ======
const responses = {
  "نور": "🔗 نظام نور: https://noor.moe.gov.sa",
  "راجحي": "🏦 مصرف الراجحي: https://www.alrajhibank.com.sa",
  "بلدي": "🏙️ منصة بلدي: https://balady.gov.sa",
  "ضمان": "🟢 الضمان الاجتماعي: https://sbis.hrsd.gov.sa",
  "مساعدة": "اكتب اسم الجهة مثل: نور، راجحي، بلدي، ضمان.\nولو سؤالك مختلف، اكتبه لي وأحوّله للفريق.",
  "مرحبا": "أهلًا بك! أنا بوت الخدمات العامة 🤖\nاكتب اسم الجهة مثل (نور، راجحي، بلدي)."
};

// ====== إنشاء البوت ======
const bot = new Telegraf(BOT_TOKEN);

// رد تلقائي داخل تيليجرام
bot.on("text", async (ctx) => {
  const msg = ctx.message.text.trim();
  let reply = 'عذرًا، ما فهمت 🤔\nقل "مساعدة" للإرشادات أو صف استفسارك لأحوله للفريق.';
  let found = false;

  for (const key in responses) {
    if (msg.includes(key)) {
      reply = responses[key];
      found = true;
    }
  }

  // إذا مافي رد جاهز، أرسل بالبريد للفريق
  if (!found && GMAIL_USER && GMAIL_APP_PASS && RECEIVER_EMAIL) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
      });

      await transporter.sendMail({
        from: `موقع الخدمات العامة <${GMAIL_USER}>`,
        to: RECEIVER_EMAIL,
        subject: "🟢 استفسار جديد من تيليجرام",
        text: `الرسالة:\n${msg}\nمن المستخدم: @${ctx.from?.username || "غير معروف"}`
      });

      console.log("📧 تم إرسال إشعار بالبريد من تيليجرام");
    } catch (err) {
      console.error("❌ خطأ أثناء الإرسال:", err.message);
    }
  }

  ctx.reply(reply);
});

bot.launch().then(() => console.log("✅ البوت يعمل الآن")).catch((e) => console.error("❌ فشل التشغيل:", e.message));

// ====== إعداد السيرفر Express ======
const app = express();
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGIN ? [ALLOWED_ORIGIN] : "*" }));

// نقطة اختبار Render لفحص الصحّة
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// نقطة الجذر
app.get("/", (req, res) => res.send("✅ Bot Server يعمل بنجاح!"));

// نقطة استقبال من الموقع
app.post("/send", async (req, res) => {
  try {
    const { message } = req.body;
    let reply = 'عذرًا، ما فهمت. قل "مساعدة" للإرشادات.';
    let found = false;

    for (const key in responses) {
      if (message.includes(key)) {
        reply = responses[key];
        found = true;
      }
    }

    if (!found && GMAIL_USER && GMAIL_APP_PASS && RECEIVER_EMAIL) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
      });

      await transporter.sendMail({
        from: `موقع الخدمات العامة <${GMAIL_USER}>`,
        to: RECEIVER_EMAIL,
        subject: "🟢 استفسار جديد من الموقع",
        text: `الزائر كتب:\n${message}`
      });
      console.log("📧 تم إرسال رسالة إلى البريد من الموقع");
    }

    res.json({ reply });
  } catch (err) {
    console.error("❌ خطأ:", err.message);
    res.status(500).json({ error: "حدث خطأ في السيرفر" });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 السيرفر شغّال على المنفذ ${PORT}`));
