# theme-deepseek

ثيم **نيون** لـ DeepSeek Harness + استوديو التخصيص **Mishkat**.

| المجلد | الوصف |
|---|---|
| [`theme/`](theme/) | ثيم نيون الكامل: CSS + البلجن + الأيقونات + حلقات الاستخدام + المعاينات |
| [`studio/`](studio/) | استوديو الثيم (مولّد أحادي الملف) + نسخة السكيل + المصدر + اللقطات |

---

## تثبيت الثيم كبلجن (الأسهل)

البلجن الجاهز في [`theme/dsh-theme-neon/`](theme/dsh-theme-neon/).

1. انسخ الريبو:
   ```sh
   git clone https://github.com/Sabra7/theme-deepseek.git
   ```
2. ثبّت البلجن على البروفايل اللي تبيه (`desktop` أو `web`):
   ```sh
   dsh plugin --profile desktop add "C:\Users\moham\workspace\theme-deepseek\theme\dsh-theme-neon"
   ```
   (غيّر المسار إلى مكان النسخ عندك، وغيّر `desktop` إلى اسم بروفايلك.)
3. أعد تشغيل DSH ثم حدّث الصفحة.

البلجن يطبّق تلقائيًا: ألوان نيون، خلفية الشات السوداء، أسماء الملفات/الفولدرات، الأيقونات، حلقات السياق/الحصة، والشفافية والبلور.

### طريقة CSS فقط (اختياري)
الصق [`theme/neon-dsh.css`](theme/neon-dsh.css) في **الإعدادات → عام → CSS مخصص** (يعطي الألوان والشكل، بدون الأيقونات وحلقات الاستخدام).

---

## الثيم (Neon)

- [`theme/README.md`](theme/README.md) — تفاصيل الثيم والاختيارات والرجوع الآمن (`?dsh-neon=off`).
- [`theme/dsh-theme-neon/`](theme/dsh-theme-neon/) — حزمة البلجن الكاملة.

## الاستوديو (Mishkat)

- افتح [`studio/index.html`](studio/index.html) في المتصفح لتصميم الثيم مباشرة.
- المصدر في [`studio/studio-src/`](studio/studio-src/).
- نسخة السكيل في [`studio/skill/`](studio/skill/).

## الرخصة

MIT.
