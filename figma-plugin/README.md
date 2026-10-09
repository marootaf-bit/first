# Spec Designer — پلاگین فیگما

این پلاگین یک spec ساده‌ی JSON را به لایه‌های واقعی فیگما تبدیل می‌کند:
فریم، کامپوننت، متن، مستطیل، بیضی، خط — با Auto Layout، padding، رنگ،
گردی گوشه، استروک و سایه.

> چرا پلاگین و نه اسکریپت ساده؟
> چون **REST API فیگما فقط خواندنی است** و هیچ endpointای برای ساخت لایه ندارد.
> تنها راهِ واقعیِ «دیزاین کردن با کد» در فیگما، Plugin API (که داخل خود فیگما
> اجرا می‌شود) یا سرور MCP دسکتاپ است. این پلاگین از Plugin API استفاده می‌کند و
> روی همه‌ی پلن‌ها کار می‌کند (نیازی به Dev seat ندارد).

## نصب و اجرا (بدون نیاز به build)

۱. اپلیکیشن **Figma desktop** را باز کنید (نسخه‌ی وب پلاگین محلی را اجرا نمی‌کند).
۲. منوی اصلی → **Plugins → Development → Import plugin from manifest…**
۳. فایل `figma-plugin/manifest.json` این ریپازیتوری را انتخاب کنید.
۴. روی یک فایل/صفحه‌ی خالی بروید → **Plugins → Development → Spec Designer**.
۵. در پنجره‌ی پلاگین یک نمونه را بارگذاری کنید (یا JSON خودتان را بچسبانید) و
   **بساز** را بزنید.

هیچ وابستگی و کامپایلری لازم نیست؛ `code.js` جاوااسکریپت خام است.

## قالب spec

```json
{
  "type": "frame",
  "name": "Login / Mobile",
  "width": 390,
  "height": 844,
  "fills": "#FFFFFF",
  "layoutMode": "VERTICAL",
  "padding": 32,
  "itemSpacing": 24,
  "children": [
    {
      "type": "text",
      "characters": "خوش آمدید",
      "fontSize": 28,
      "fontName": { "family": "Inter", "style": "Bold" },
      "layoutAlign": "STRETCH"
    },
    {
      "type": "frame",
      "name": "CTA",
      "layoutMode": "HORIZONTAL",
      "padding": 14,
      "cornerRadius": 12,
      "fills": "#111827",
      "primaryAxisAlignItems": "CENTER",
      "counterAxisAlignItems": "CENTER",
      "layoutAlign": "STRETCH",
      "children": [
        { "type": "text", "characters": "ورود", "fontSize": 15, "fills": "#FFFFFF" }
      ]
    }
  ]
}
```

فهرست کامل فیلدهای پشتیبانی‌شده در بالای فایل `code.js` نوشته شده است. خلاصه:

| گروه | فیلدها |
| --- | --- |
| هندسه | `width`, `height`, `cornerRadius` (عدد یا چهارگوشه), `opacity`, `visible` |
| ظاهر | `fills`, `strokes`, `strokeWeight`, `strokeAlign`, `effects`, `blendMode` |
| Auto Layout | `layoutMode`, `padding`, `itemSpacing`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `primaryAxisSizingMode`, `counterAxisSizingMode`, `clipsContent` |
| رفتار فرزند | `layoutAlign` (`STRETCH`), `layoutGrow` |
| متن | `characters`, `fontName`, `fontSize`, `lineHeight`, `letterSpacing`, `textAlignHorizontal`, `textAutoResize`, `textCase`, `textDecoration` |

رنگ‌ها را می‌توانید به صورت هگز ۶ یا ۸ رقمی (`#4F46E5`, `#0000001A`) یا شیء
`{ "r": 0..1, "g": 0..1, "b": 0..1, "a": 0..1 }` بدهید.

## نکات

- فونت‌ها باید در فیگما/سیستم در دسترس باشند؛ در غیر این صورت پلاگین به
  `Inter Regular` برمی‌گردد. قبل از ساخت، فونت دلخواه را در فایل بارگذاری کنید.
- اگر `width`/`height` ندهید، فریم‌های Auto Layout به صورت خودکار اندازه‌ی
  محتوا (`AUTO`) می‌گیرند.
- تیک «پاک کردن صفحه قبل از ساخت» تمام لایه‌های صفحه‌ی فعلی را حذف می‌کند؛
  با احتیاط استفاده کنید.
