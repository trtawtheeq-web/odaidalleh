import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { socket } from "@/lib/store";

const regions = [
  "المنطقة",
  "منطقة الرياض",
  "منطقة مكة المكرمة",
  "المنطقة الشرقية",
  "منطقة المدينة المنورة",
  "منطقة القصيم",
  "منطقة عسير",
  "منطقة تبوك",
  "منطقة حائل",
  "منطقة الحدود الشمالية",
  "منطقة جازان",
  "منطقة نجران",
  "منطقة الباحة",
  "منطقة الجوف",
];

const vehicleTypes = [
  "نوع المركبة",
  "سيارة خاصة",
  "سيارة نقل",
  "دراجة نارية",
  "حافلة",
  "شاحنة",
  "معدات ثقيلة",
];

const faqItems = [
  {
    question: "ماهي خدمة حجز مواعيد الفحص الفني الدوري؟",
    answer: "خدمة إلكترونية تتيح لأصحاب المركبات حجز مواعيد الفحص الفني الدوري لدى الجهات المرخصة."
  },
  {
    question: "هل يلزم حجز موعد للإجراء الفحص الفني الدوري؟",
    answer: "نعم، يلزم حجز موعد مسبق لإجراء الفحص الفني الدوري."
  },
  {
    question: "نجحت مركبتي بالفحص، ولكنني لم أجد معلومات الفحص بنظام أبشر.",
    answer: "يتم تحديث البيانات في نظام أبشر خلال 24 ساعة من إجراء الفحص."
  },
  {
    question: "ما هي الجهات المرخصة من المواصفات السعودية لممارسة نشاط الفحص الفني الدوري للمركبات؟",
    answer: "الجهات المرخصة هي: مركز سلامة المركبات، الكاملي للخدمات الفنية، Applus، مسار الجودة، DEKRA."
  }
];

export default function FahsHome() {
  const [selectedRegion, setSelectedRegion] = useState("المنطقة");
  const [selectedVehicle, setSelectedVehicle] = useState("نوع المركبة");
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    if (!socket.value) return;
    socket.value.on("whatsapp:update", (number: string) => {
      setWhatsappNumber(number);
    });
    socket.value.emit("whatsapp:get");
    return () => {
      if (socket.value) socket.value.off("whatsapp:update");
    };
  }, []);

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      sessionStorage.setItem('came_from_home', 'true');
      setLocation('/new-appointment');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 cursor-pointer">
              <img 
                src="/images/vsc-logo-icon.png" 
                alt="مركز سلامة المركبات" 
                className="w-10 h-10 md:w-12 md:h-12 object-contain"
              />
              <div className="text-right">
                <div className="text-xs md:text-sm font-bold text-gray-800">مركز سلامة المركبات</div>
                <div className="text-[10px] md:text-xs text-gray-500">Vehicles Safety Center</div>
              </div>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link to="/" className="px-4 py-2 text-white text-sm font-medium rounded" style={{ backgroundColor: '#18754d' }}>
                الرئيسية
              </Link>
              <a href="#" className="px-4 py-2 text-gray-700 text-sm font-medium hover:text-[#18754d]">
                استعلام عن حالة الفحص
              </a>
              <a href="#" className="px-4 py-2 text-gray-700 text-sm font-medium hover:text-[#18754d]">
                مواقع الفحص
              </a>
              <a href="#" className="px-4 py-2 text-gray-700 text-sm font-medium hover:text-[#18754d]">
                المقابل المالي للفحص
              </a>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-[#18754d]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                English
              </button>
              <Link to="/new-appointment" onClick={() => sessionStorage.setItem('came_from_home', 'true')} className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-[#18754d]">
                حجز موعد
              </Link>
              {/* Mobile Menu Button */}
              <button 
                className="lg:hidden p-2 text-gray-600"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 py-4 space-y-2">
              <Link to="/" className="block px-4 py-2 text-white text-sm font-medium rounded text-center" style={{ backgroundColor: '#18754d' }}>
                الرئيسية
              </Link>
              <a href="#" className="block px-4 py-2 text-gray-700 text-sm font-medium text-right hover:bg-gray-50 rounded">
                استعلام عن حالة الفحص
              </a>
              <a href="#" className="block px-4 py-2 text-gray-700 text-sm font-medium text-right hover:bg-gray-50 rounded">
                مواقع الفحص
              </a>
              <a href="#" className="block px-4 py-2 text-gray-700 text-sm font-medium text-right hover:bg-gray-50 rounded">
                المقابل المالي للفحص
              </a>
              <Link to="/new-appointment" onClick={() => sessionStorage.setItem('came_from_home', 'true')} className="block px-4 py-2 text-gray-700 text-sm font-medium text-right hover:bg-gray-50 rounded">
                حجز موعد
              </Link>
              <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                English
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 lg:py-12" style={{ backgroundColor: '#f4f4f4' }}>
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
            {/* Hero Content - Right Side */}
            <div className="w-full lg:w-2/5 text-center lg:text-right">
              <p className="text-lg md:text-xl lg:text-2xl font-semibold mb-3 md:mb-4" style={{ color: '#2e9e5e' }}>
                أحد منتجات مركز سلامة المركبات
              </p>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4 md:mb-6">
                المنصة الموحدة لمواعيد<br />
                الفحص الفني الدوري<br />
                للمركبات
              </h1>
              <p className="text-gray-600 text-sm md:text-base mb-6 md:mb-8 leading-relaxed px-4 lg:px-0">
                تتيح المنصة حجز وإدارة مواعيد الفحص الفني الدوري للمركبات لدى جميع الجهات المرخصة من المواصفات السعودية لتقديم الخدمة
              </p>
              <div className="flex gap-4 justify-center lg:justify-start">
                <Link 
                  to="/new-appointment"
                  onClick={() => sessionStorage.setItem('came_from_home', 'true')}
                  className="px-6 md:px-8 py-3 text-white font-medium rounded-lg text-center"
                  style={{ backgroundColor: '#18754d' }}
                >
                  حجز موعد
                </Link>
                <Link 
                  to="/new-appointment"
                  onClick={() => sessionStorage.setItem('came_from_home', 'true')}
                  className="px-6 md:px-8 py-3 text-white font-medium rounded-lg text-center"
                  style={{ backgroundColor: '#18754d' }}
                >
                  تعديل موعد
                </Link>
              </div>
            </div>

            {/* Hero Image - Left Side */}
            <div className="w-full lg:w-3/5 flex justify-center">
              <img 
                src="/images/hero-inspection.png" 
                alt="الفحص الفني الدوري" 
                className="w-full max-w-sm md:max-w-md lg:max-w-4xl"
                onError={(e) => {
                  e.currentTarget.src = 'https://pti.saso.gov.sa/apt/static/media/hero.png';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-right mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              البحث عن الحجوزات للفحص الفني الدوري
            </h2>
            <p className="text-gray-500 text-xs md:text-sm">
              اختر المنطقة والتاريخ والوقت المناسب للبحث عن المواقع المتاحة
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-end">
            {/* Region Select */}
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-2 text-right">المنطقة</label>
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right bg-white focus:outline-none focus:border-[#18754d] text-sm md:text-base"
              >
                {regions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            {/* Vehicle Type Select */}
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-2 text-right">نوع المركبة</label>
              <select 
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right bg-white focus:outline-none focus:border-[#18754d] text-sm md:text-base"
              >
                {vehicleTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            {/* Date Time Input */}
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-2 text-right">التاريخ والوقت</label>
              <div className="relative">
                <input 
                  type="datetime-local"
                  placeholder="التاريخ والوقت"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-right focus:outline-none focus:border-[#18754d] cursor-pointer text-sm md:text-base"
                />
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            {/* Search Button */}
            <button 
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full md:w-auto px-10 py-3 bg-[#18754d] text-white font-medium rounded-lg hover:bg-[#145f3e] flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-70"
            >
              {isSearching ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'بحث'
              )}
            </button>
          </div>
        </div>
      </section>

      {/* When to Inspect Section */}
      <section className="py-10 md:py-16" style={{ backgroundColor: '#fcfcfc' }}>
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-8 md:mb-12">
            متى يجب فحص المركبة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Card 1 */}
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 md:mb-6">
                <img src="/images/icon-calendar.png" alt="بشكل دوري" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg md:text-2xl mb-2 md:mb-3">بشكل دوري</h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed px-4 md:px-0">
                يجب فحص المركبة بشكل دوري قبل انتهاء صلاحية الفحص
              </p>
            </div>

            {/* Card 2 */}
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 md:mb-6">
                <img src="/images/icon-transfer.png" alt="عند نقل ملكية المركبة" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg md:text-2xl mb-2 md:mb-3">عند نقل ملكية المركبة</h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed px-4 md:px-0">
                في حال عدم وجود فحص فني دوري ساري للمركبة
              </p>
            </div>

            {/* Card 3 */}
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 md:mb-6">
                <img src="/images/icon-foreign.png" alt="المركبات الأجنبية" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg md:text-2xl mb-2 md:mb-3">المركبات الأجنبية</h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed px-4 md:px-0">
                خلال 15 يوم من تاريخ دخولها إلى المملكة في حال عدم وجود فحص فني ساري من خارج المملكة
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-10 md:py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-right mb-8 md:mb-12">
            خدمات منصة الفحص الفني الدوري
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-stretch">
            {/* Service 1 - حجز موعد الفحص */}
            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 text-right flex flex-col">
              <div className="w-full flex justify-start mb-4 md:mb-6">
                <img src="/images/icon-booking.png" alt="حجز موعد" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
              </div>
              <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2 md:mb-3">حجز موعد الفحص</h3>
              <p className="text-gray-600 text-xs md:text-sm mb-4 md:mb-6 leading-relaxed flex-grow">
                تتيح المنصة لأصحاب المركبات حجز ومتابعة مواعيد الفحص وإعادة الفحص للمركبات الخاصة بهم.
              </p>
              <div className="flex gap-0 mb-4 md:mb-6 justify-start">
                <span className="px-4 md:px-5 py-2 border border-gray-300 text-[#18754d] text-xs md:text-sm font-medium" style={{ borderRadius: '0 8px 8px 0' }}>أفراد</span>
                <span className="px-4 md:px-5 py-2 border border-gray-300 border-r-0 text-[#18754d] text-xs md:text-sm font-medium bg-[#e8f5f0]" style={{ borderRadius: '8px 0 0 8px' }}>أعمال</span>
              </div>
              <Link to="/new-appointment" onClick={() => sessionStorage.setItem('came_from_home', 'true')} className="block w-full px-4 py-3 bg-[#18754d] text-white font-medium text-center rounded-lg hover:bg-[#145f3e] mt-auto text-sm md:text-base">
                حجز موعد
              </Link>
            </div>

            {/* Service 2 - التحقق من حالة الفحص */}
            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 text-right flex flex-col">
              <div className="w-full flex justify-start mb-4 md:mb-6">
                <img src="/images/icon-verify.png" alt="التحقق" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
              </div>
              <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2 md:mb-3">التحقق من حالة الفحص</h3>
              <p className="text-gray-600 text-xs md:text-sm mb-4 md:mb-6 leading-relaxed flex-grow">
                تتيح للأفراد والمنشآت التحقق من سريان فحص المركبة عن طريق بيانات رخصة السير (الاستمارة) أو البطاقة الجمركية، وفي حال كانت المركبة غير سعودية يمكن الاستعلام عن طريق رقم الهيكل.
              </p>
              <div className="flex gap-0 mb-4 md:mb-6 justify-start">
                <span className="px-4 md:px-5 py-2 border border-gray-300 text-[#18754d] text-xs md:text-sm font-medium" style={{ borderRadius: '0 8px 8px 0' }}>أفراد</span>
                <span className="px-4 md:px-5 py-2 border border-gray-300 border-r-0 text-[#18754d] text-xs md:text-sm font-medium bg-[#e8f5f0]" style={{ borderRadius: '8px 0 0 8px' }}>أعمال</span>
              </div>
              <Link to="/new-appointment" onClick={() => sessionStorage.setItem('came_from_home', 'true')} className="block w-full px-4 py-3 bg-[#18754d] text-white font-medium text-center rounded-lg hover:bg-[#145f3e] mt-auto text-sm md:text-base">
                التحقق من حالة الفحص
              </Link>
            </div>

            {/* Service 3 - تحميل وثيقة الفحص */}
            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 text-right flex flex-col">
              <div className="w-full flex justify-start mb-4 md:mb-6">
                <img src="/images/icon-download.png" alt="تحميل" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
              </div>
              <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2 md:mb-3">تحميل وثيقة الفحص</h3>
              <p className="text-gray-600 text-xs md:text-sm mb-4 md:mb-6 leading-relaxed flex-grow">
                يمكن لأصحاب المركبات من أفراد ومؤسسات الاطلاع على وثيقة الفحص وتحميلها من خلال المنصة.
              </p>
              <div className="flex gap-0 mb-4 md:mb-6 justify-start">
                <span className="px-4 md:px-5 py-2 border border-gray-300 text-[#18754d] text-xs md:text-sm font-medium" style={{ borderRadius: '0 8px 8px 0' }}>أفراد</span>
                <span className="px-4 md:px-5 py-2 border border-gray-300 border-r-0 text-[#18754d] text-xs md:text-sm font-medium bg-[#e8f5f0]" style={{ borderRadius: '8px 0 0 8px' }}>أعمال</span>
              </div>
              <Link to="/new-appointment" onClick={() => sessionStorage.setItem('came_from_home', 'true')} className="block w-full px-4 py-3 bg-[#18754d] text-white font-medium text-center rounded-lg hover:bg-[#145f3e] mt-auto text-sm md:text-base">
                الدخول للمنصة
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* Steps Section */}
      <section className="py-10 md:py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-right mb-8 md:mb-12">
            خطوات ما قبل الفحص الفني الدوري
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 text-right">
              <div className="w-12 h-12 md:w-14 md:h-14 mb-4 md:mb-6 bg-[#e8f5f0] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-[#18754d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2 md:mb-3">حجز موعد الفحص</h3>
              <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                حجز وإدارة المواعيد عبر المنصة بكل سهولة.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 text-right">
              <div className="w-12 h-12 md:w-14 md:h-14 mb-4 md:mb-6 bg-[#e8f5f0] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-[#18754d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2 md:mb-3">فحص المركبة</h3>
              <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                بعد تأكيد حجز الموعد إلكترونياً، يتم التوجه إلى موقع الفحص ليتم فحص المركبة.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-200 text-right">
              <div className="w-12 h-12 md:w-14 md:h-14 mb-4 md:mb-6 bg-[#e8f5f0] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-[#18754d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2 md:mb-3">استلام نتيجة الفحص</h3>
              <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                ستصلك نتيجة الفحص فور الانتهاء عبر رسالة نصية SMS، إذا كانت النتيجة اجتياز المركبة للفحص سيتم وضع ملصق الفحص على الزجاج الأمامي، أما لو كانت النتيجة عدم اجتياز سيكون لديك فرصتين لإعادة الفحص خلال 14 يوم عمل بالسعر المخصص للإعادة مع التأكيد على ضرورة حجز موعد لإعادة الفحص
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Licensed Entities Section */}
      <section className="py-10 md:py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-2">
            الجهات المرخصة
          </h2>
          <p className="text-[#18754d] text-sm md:text-lg mb-8 md:mb-10 px-4">
            الجهات المرخصة من المواصفات السعودية لممارسة نشاط الفحص الفني الدوري
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
            <img src="/vsc-logo.png" alt="مركز سلامة المركبات" className="w-24 h-12 md:w-36 md:h-16 object-contain" />
            <img src="/salamah-logo.png" alt="الكاملي للخدمات الفنية" className="w-24 h-12 md:w-36 md:h-16 object-contain" />
            <img src="/applus-logo.png" alt="Applus" className="w-24 h-12 md:w-36 md:h-16 object-contain" />
            <img src="/masarat-logo.png" alt="مسار الجودة" className="w-24 h-12 md:w-36 md:h-16 object-contain" />
            <img src="/dekra-logo.png" alt="DEKRA" className="w-24 h-12 md:w-36 md:h-16 object-contain" />
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="pt-8 md:pt-10 pb-0 relative overflow-hidden" style={{ backgroundColor: '#f4f4f4' }}>
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row-reverse items-center lg:items-end justify-between gap-6 md:gap-8">
            {/* Text Content */}
            <div className="text-center lg:text-right flex-1 pb-6 md:pb-10">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#18754d] mb-3 md:mb-4">
                احجز موعد الفحص من جوالك
              </h2>
              <p className="text-gray-600 text-sm md:text-lg mb-6 md:mb-8 px-4 lg:px-0">
                بسهولة وبساطة يمكنك حجز موعد الفحص في أقرب مركز لموقعك من خلال تطبيق الجوال
              </p>
              <div className="flex gap-3 md:gap-4 flex-row-reverse justify-center lg:justify-end">
                <a href="#">
                  <img src="/googleplay-btn.png" alt="Get it on Google Play" className="h-[40px] md:h-[50px] object-contain" />
                </a>
                <a href="#">
                  <img src="/appstore-btn.png" alt="Download on App Store" className="h-[40px] md:h-[50px] object-contain" />
                </a>
              </div>
            </div>
            
            {/* Phone Mockup */}
            <div className="flex-shrink-0">
              <img 
                src="/phone-mockup.png" 
                alt="تطبيق الفحص الفني الدوري" 
                className="h-[250px] md:h-[350px] object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 md:py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4 md:gap-8 mb-6 md:mb-8">
            <div className="text-right">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                الأسئلة الشائعة
              </h2>
              <p className="text-gray-500 text-sm">
                الأسئلة الشائعة حول خدمة الفحص الفني الدوري
              </p>
            </div>
            <button className="px-4 md:px-6 py-2 border border-[#18754d] text-[#18754d] rounded-lg hover:bg-[#18754d] hover:text-white transition-colors text-sm md:text-base">
              المزيد من الأسئلة والأجوبة
            </button>
          </div>
          
          <div className="max-w-4xl">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b border-gray-200">
                <button 
                  className="w-full py-4 md:py-5 flex items-center justify-between text-right"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${openFaq === index ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="font-medium text-gray-900 text-right flex-1 mr-4 text-sm md:text-base">{item.question}</span>
                </button>
                {openFaq === index && (
                  <div className="pb-4 md:pb-5 text-right text-gray-600 pr-0 text-sm md:text-base">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white pt-8 md:pt-12 pb-6" style={{ backgroundColor: '#044c34' }}>
        <div className="container mx-auto px-4 lg:px-8">
          {/* Top Section - 3 Columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-10">
            {/* Column 1 - الفحص (Right) */}
            <div className="text-right">
              <h3 className="font-bold mb-4 md:mb-5 text-base md:text-lg">الفحص</h3>
              <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-white/80">
                <li><a href="#" className="hover:text-white hover:underline">الاستعلام عن الفحص</a></li>
                <li><a href="#" className="hover:text-white hover:underline">المقابل المالي للفحص</a></li>
                <li><a href="#" className="hover:text-white hover:underline">مواقع الفحص</a></li>
                <li><Link to="/new-appointment" onClick={() => sessionStorage.setItem('came_from_home', 'true')} className="hover:text-white hover:underline">حجز موعد</Link></li>
              </ul>
            </div>

            {/* Column 2 - الدعم والمساعدة (Middle) */}
            <div className="text-right">
              <h3 className="font-bold mb-4 md:mb-5 text-base md:text-lg">الدعم والمساعدة</h3>
              <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-white/80">
                <li><a href="#" className="hover:text-white hover:underline">الأسئلة الشائعة</a></li>
                <li><a href="#" className="hover:text-white hover:underline">تواصل معنا</a></li>
                <li><a href="#" className="hover:text-white hover:underline">English</a></li>
              </ul>
            </div>

            {/* Column 3 - حمل التطبيق + التواصل (Left) */}
            <div className="text-right col-span-2 md:col-span-1">
              <h3 className="font-bold mb-4 md:mb-5 text-xs md:text-sm">حمل تطبيق: سلامة المركبات | Vehicles Safety</h3>
              <div className="flex gap-3 flex-row-reverse justify-end mb-4 md:mb-6">
                <a href="#" className="bg-black/40 rounded-md px-3 py-1.5 flex items-center gap-1.5 hover:bg-black/50">
                  <div className="text-right">
                    <div className="text-[8px] text-white/70">احصل عليه من</div>
                    <div className="text-xs font-bold">Google Play</div>
                  </div>
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                </a>
                <a href="#" className="bg-black/40 rounded-md px-3 py-1.5 flex items-center gap-1.5 hover:bg-black/50">
                  <div className="text-right">
                    <div className="text-[8px] text-white/70">تنزيل من</div>
                    <div className="text-xs font-bold">App Store</div>
                  </div>
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                  </svg>
                </a>
              </div>
              
              <h4 className="font-bold mb-3 md:mb-4 text-xs md:text-sm">ابق على اتصال معنا عبر مواقع التواصل الإجتماعي</h4>
              <div className="flex gap-2 md:gap-3 flex-row-reverse justify-end">
                {/* WhatsApp */}
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 md:w-9 md:h-9 bg-[#25D366] rounded-full flex items-center justify-center hover:bg-[#20bd5a]"
                  >
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                )}
                {/* Facebook */}
                <a href="#" className="w-8 h-8 md:w-9 md:h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                {/* Instagram */}
                <a href="#" className="w-8 h-8 md:w-9 md:h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                {/* Snapchat */}
                <a href="#" className="w-8 h-8 md:w-9 md:h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.959-.289.089-.05.189-.1.279-.136a.977.977 0 0 1 .401-.064c.309 0 .57.137.72.354a.8.8 0 0 1 .073.721c-.189.443-.777.617-1.006.689l-.061.019c-.349.104-.689.209-.949.374-.195.124-.307.291-.307.464 0 .06.012.12.036.18.33.72.899 1.32 1.559 1.83.36.27.749.5 1.139.66.24.104.479.174.689.209.375.06.6.27.6.51 0 .12-.045.24-.134.36-.375.495-1.229.72-1.889.84-.09.015-.164.045-.224.09-.075.06-.12.15-.149.27-.03.12-.06.27-.089.42-.03.15-.09.3-.224.42-.18.165-.42.24-.674.24a2.7 2.7 0 0 1-.6-.075 4.46 4.46 0 0 0-.899-.12c-.195 0-.375.015-.539.045-.36.075-.689.225-1.049.405-.539.27-1.139.57-1.979.57h-.06c-.84 0-1.439-.3-1.979-.57-.36-.18-.689-.33-1.049-.405a3.03 3.03 0 0 0-.539-.045c-.33 0-.659.045-.899.12a2.7 2.7 0 0 1-.6.075c-.254 0-.494-.075-.674-.24-.134-.12-.194-.27-.224-.42-.03-.15-.06-.3-.089-.42-.03-.12-.075-.21-.149-.27-.06-.045-.134-.075-.224-.09-.66-.12-1.514-.345-1.889-.84a.6.6 0 0 1-.134-.36c0-.24.225-.45.6-.51.21-.035.449-.105.689-.209.39-.16.779-.39 1.139-.66.66-.51 1.229-1.11 1.559-1.83a.52.52 0 0 0 .036-.18c0-.173-.112-.34-.307-.464-.26-.165-.6-.27-.949-.374l-.061-.019c-.229-.072-.817-.246-1.006-.689a.8.8 0 0 1 .073-.721c.15-.217.411-.354.72-.354a.977.977 0 0 1 .401.064c.09.036.19.086.279.136.3.169.659.273.959.289.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793z"/></svg>
                </a>
                {/* YouTube */}
                <a href="#" className="w-8 h-8 md:w-9 md:h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                {/* X (Twitter) */}
                <a href="#" className="w-8 h-8 md:w-9 md:h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-white/20 pt-4 md:pt-6 mt-4">
            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4 md:gap-6">
              {/* Right: Logos - VSC + Thiqah + Registered */}
              <div className="flex items-center gap-3 md:gap-4">
                <img src="/images/vsc-footer-logo.png" alt="مركز سلامة المركبات" className="h-8 md:h-10 object-contain" />
                <img src="/images/thiqah-logo.png" alt="ثقة لخدمات الأعمال" className="h-8 md:h-10 object-contain" />
                <img src="/images/registered-badge.png" alt="Registered as" className="h-8 md:h-10 object-contain" />
              </div>

              {/* Left: Copyright */}
              <div className="text-center md:text-right">
                <p className="text-xs md:text-sm text-white/80 mb-1">جميع الحقوق محفوظة الهيئة السعودية للمواصفات والمقاييس والجودة © 2026</p>
                <p className="text-[10px] md:text-xs text-white/60">تم تطويره وصيانته بواسطة ثقة لخدمات الاعمال</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
