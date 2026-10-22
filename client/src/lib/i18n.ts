export type Lang = "ar" | "en";

export const AR_EN: Record<string, string> = {
  "موقع حكومي رسمي تابع لحكومة المملكة العربية السعودية": "An official government website of the Kingdom of Saudi Arabia",
  "كيف تتحقق": "How to verify",
  "هذا الموقع الحكومي آمن": "This government website is secure",
  "عن المملكة": "About the Kingdom",
  "الجهات": "Entities",
  "الخدمات": "Services",
  "المشاركة": "Participation",
  "نهتم بكم": "We care for you",
  "عن المنصة": "About the platform",
  "البحث": "Search",
  "بحث...": "Search...",
  "الرئيسية": "Home",
  "English": "العربية",
  "روابط سريعة": "Quick Links",
  "تواصل معنا": "Contact us",
  "جميع الحقوق محفوظة": "All rights reserved",
  "الأسئلة الشائعة": "FAQ",
  "سياسة الخصوصية": "Privacy Policy",
  "شروط الاستخدام": "Terms of Use",
  "التالي": "Next",
  "السابق": "Previous",
  "تأكيد": "Confirm",
  "إلغاء": "Cancel",
  "حفظ": "Save",
  "تحميل": "Download",
  "جاري التحميل...": "Loading...",
  "الخطوات": "Steps",
  "الشروط": "Requirements",
  "الرسوم": "Fees",
};

export const translate = (s: string, lang: Lang): string =>
  lang === "ar" ? s : (AR_EN[s] ?? s);
