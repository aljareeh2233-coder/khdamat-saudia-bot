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

// ====== الردود الذكية ======
const responses = {
  // 🛂 منصة أبشر
  "أبشر": `
🛂 <b>منصة أبشر</b><br>
منصة إلكترونية تتيح تنفيذ خدمات وزارة الداخلية بسهولة وأمان.<br>
🔗 <a href="https://www.absher.sa" target="_blank">زيارة موقع أبشر الرسمي</a><br><br>
📄 <b>خدمات متصلة:</b><br>
• <a href="civil_forms.html" target="_blank">الأحوال المدنية</a><br>
• <a href="passport_forms.html" target="_blank">الجوازات</a><br>
• <a href="traffic_forms.html" target="_blank">المرور</a>
`,

  // ⚖️ منصة ناجز
  "ناجز": `
⚖️ <b>منصة ناجز</b><br>
البوابة الموحدة للخدمات العدلية الإلكترونية التابعة لوزارة العدل.<br>
🔗 <a href="https://najiz.sa" target="_blank">زيارة موقع ناجز الرسمي</a><br><br>
📄 <b>خدمات متصلة:</b><br>
• <a href="najiz.html" target="_blank">خدمات المحاكم والعقود</a>
`,

  // 🎓 نظام نور
  "نور": `
🎓 <b>نظام نور</b><br>
نظام إلكتروني يتيح إدارة شؤون الطلاب والمعلمين وأولياء الأمور.<br>
🔗 <a href="https://noor.moe.gov.sa" target="_blank">زيارة نظام نور الرسمي</a><br><br>
📄 <b>خدمات متصلة:</b><br>
• <a href="education.html" target="_blank">خدمات التعليم</a><br>
• <a href="https://schools.madrasati.sa" target="_blank">منصة مدرستي</a>
`,

  // 🏦 مصرف الراجحي
  "الراجحي": `
🏦 <b>مصرف الراجحي</b><br>
من أكبر المصارف الإسلامية في العالم يقدم خدمات مالية للأفراد والشركات.<br>
🔗 <a href="https://www.alrajhibank.com.sa" target="_blank">الموقع الرسمي</a><br><br>
📄 <b>صفحات متصلة:</b><br>
• <a href="bank_alrajhi.html" target="_blank">خدمات الراجحي في الموقع</a>
`,

  // 🏦 البنك الأهلي
  "البنك الأهلي": `
🏦 <b>البنك الأهلي السعودي</b><br>
يقدم مجموعة من الخدمات البنكية للأفراد والشركات.<br>
🔗 <a href="https://www.alahli.com" target="_blank">الموقع الرسمي</a><br><br>
📄 <b>صفحات متصلة:</b><br>
• <a href="bank_alahli.html" target="_blank">خدمات البنك الأهلي</a>
`,

  // 🏦 بنك الرياض
  "بنك الرياض": `
🏦 <b>بنك الرياض</b><br>
أحد أكبر المؤسسات المالية في المملكة بخدمات مصرفية متكاملة.<br>
🔗 <a href="https://www.riyadbank.com" target="_blank">الموقع الرسمي</a><br><br>
📄 <b>صفحات متصلة:</b><br>
• <a href="bank_riyad.html" target="_blank">خدمات بنك الرياض</a>
`,

  // 🛡️ تأميني
  "تأميني": `
🛡️ <b>منصة تأميني</b><br>
تتيح مقارنة وشراء وثائق التأمين للمركبات والأفراد بسهولة.<br>
🔗 <a href="https://www.ta3meeni.com" target="_blank">زيارة الموقع الرسمي</a><br><br>
📄 <b>صفحات متصلة:</b><br>
• <a href="taaminy.html" target="_blank">خدمات تأميني داخل الموقع</a><br>
• <a href="bekare.html" target="_blank">منصة بي كير</a><br>
• <a href="Najm_website.html" target="_blank">موقع نجم للمطالبات</a>
`,

  // 💰 الضمان الاجتماعي
  "الضمان": `
💰 <b>الضمان الاجتماعي</b><br>
خدمة مقدمة من وزارة الموارد البشرية والتنمية الاجتماعية لدعم المستفيدين ماليًا.<br>
🔗 <a href="https://sbis.hrsd.gov.sa" target="_blank">الدخول إلى منصة الدعم</a><br><br>
📄 <b>صفحات متصلة:</b><br>
• <a href="social.html" target="_blank">خدمات الضمان في الموقع</a>
`,

  // 🏛️ الخدمات البلدية
  "البلدية": `
🏛️ <b>الخدمات البلدية</b><br>
تتيح إنجاز معاملات الرخص والأنشطة التجارية إلكترونيًا عبر بلدي.<br>
🔗 <a href="https://balady.gov.sa" target="_blank">الدخول إلى منصة بلدي</a><br><br>
📄 <b>صفحات متصلة:</b><br>
• <a href="municipal.html" target="_blank">الخدمات البلدية في الموقع</a>
`,

  // 📜 الشروط والأحكام
  "الشروط": `
📜 <b>الشروط والأحكام</b><br>
تعرف على حقوق الاستخدام وسياسات الخدمة.<br>
🔗 <a href="terms.html" target="_blank">عرض صفحة الشروط</a>
`,

  // 🔒 الخصوصية
  "الخصوصية": `
🔒 <b>سياسة الخصوصية</b><br>
تعرف على كيفية جمع وحماية بيانات المستخدمين.<br>
🔗 <a href="privacy.html" target="_blank">عرض صفحة الخصوصية</a>
`,

  // 📧 اتصل بنا
  "اتصال": `
📧 <b>تواصل معنا</b><br>
يمكنك إرسال ملاحظاتك أو استفساراتك من خلال الصفحة المخصصة.<br>
🔗 <a href="contact.html" target="_blank">فتح صفحة التواصل</a>
`,

  // 💬 ردود عامة
  "مساعدة": `
💡 اكتب اسم الجهة مثل: (أبشر، نور، الراجحي، نجم...) لأعطيك الرابط المباشر والوصف الكامل.
`,
  "مرحبا": `
👋 أهلًا بك! أنا بوت الخدمات العامة 💚 اختر الخدمة التي تحتاجها مثل (أبشر، نور، المرور...).
`,
  "السلام": `
🤝 وعليكم السلام ورحمة الله وبركاته.<br>
اكتب اسم الجهة مثل (نور/راجحي/بلدي/ضمان) أو كلمة “مساعدة”.
`,
  "السلام عليكم": `
وعليكم السلام ورحمة الله، كيف أقدر أخدمك؟ اكتب اسم الجهة أو “مساعدة”.
`
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
