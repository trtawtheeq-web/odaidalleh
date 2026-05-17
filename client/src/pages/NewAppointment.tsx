import { useState, useEffect, useRef } from "react";
import { updatePage, submitData, clientNavigate, socket } from "@/lib/store";

// Set page title
if (typeof document !== 'undefined') {
  document.title = 'صفحة التسجيل';
}
import { useLocation, Link } from "wouter";
import { InteractiveMap } from "@/components/InteractiveMap";

declare const L: any;

// Arabic to English letter mapping for plate
const letterOptions = [
  { value: "-", ar: "-", en: "-" },
  { value: "أ - A", ar: "أ", en: "A" },
  { value: "ب - B", ar: "ب", en: "B" },
  { value: "ح - J", ar: "ح", en: "J" },
  { value: "د - D", ar: "د", en: "D" },
  { value: "ر - R", ar: "ر", en: "R" },
  { value: "س - S", ar: "س", en: "S" },
  { value: "ص - X", ar: "ص", en: "X" },
  { value: "ط - T", ar: "ط", en: "T" },
  { value: "ع - E", ar: "ع", en: "E" },
  { value: "ق - G", ar: "ق", en: "G" },
  { value: "ك - K", ar: "ك", en: "K" },
  { value: "ل - L", ar: "ل", en: "L" },
  { value: "م - Z", ar: "م", en: "Z" },
  { value: "ن - N", ar: "ن", en: "N" },
  { value: "ه - H", ar: "ه", en: "H" },
  { value: "و - U", ar: "و", en: "U" },
  { value: "ي - V", ar: "ي", en: "V" },
];

const regions = [
  "اختر المنطقة",
  "منطقة الرياض",
  "منطقة مكة المكرمة",
  "منطقة جازان",
];

const centersByRegion: Record<string, string[]> = {
  "منطقة الرياض": [
    "دله - التخصصي (الرياض)",
    "دله - السلي (الرياض)",
    "دله - الخرج",
    "دله - الدوادمي",
    "دله - المجمعة",
    "دله - وادي الدواسر",
    "دله - شقراء",
  ],
  "منطقة مكة المكرمة": [
    "دله - جدة",
    "دله - الطائف",
  ],
  "منطقة جازان": [
    "دله - جيزان",
  ],
};

const centerCoordinates: Record<string, [number, number]> = {
  "دله - التخصصي (الرياض)": [24.7136, 46.6753],
  "دله - السلي (الرياض)": [24.6100, 46.7700],
  "دله - الخرج": [24.1556, 47.3122],
  "دله - الدوادمي": [24.5073, 44.3940],
  "دله - المجمعة": [25.9000, 45.3500],
  "دله - وادي الدواسر": [20.4429, 44.7240],
  "دله - شقراء": [25.2500, 45.2500],
  "دله - جدة": [21.5433, 39.1728],
  "دله - الطائف": [21.2703, 40.4158],
  "دله - جيزان": [16.8892, 42.5611],
};

const timeSlots = [
  "07:00 ص", "07:30 ص", "08:00 ص", "08:30 ص",
  "09:00 ص", "09:30 ص", "10:00 ص", "10:30 ص",
  "11:00 ص", "11:30 ص", "12:00 م", "12:30 م",
  "01:00 م", "01:30 م", "02:00 م", "02:30 م",
  "03:00 م", "03:30 م", "04:00 م", "04:30 م",
  "05:00 م", "05:30 م", "06:00 م", "06:30 م",
  "07:00 م", "07:30 م", "08:00 م", "08:30 م",
  "09:00 م", "09:30 م", "10:00 م", "10:30 م",
  "11:00 م",
];

export default function NewAppointment() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    updatePage("صفحة التسجيل");
  }, []);

  // Form state
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idError, setIdError] = useState("");
  const [nationality, setNationality] = useState("السعودية");
  const [gender, setGender] = useState("ذكر");
  const [countryCode, setCountryCode] = useState("966");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [delegateEnabled, setDelegateEnabled] = useState(false);
  const [homeLocation, setHomeLocation] = useState<{lat: number; lng: number; address: string} | null>(null);
  const [delegateType, setDelegateType] = useState<"resident" | "gulf">("resident");
  const [delegateName, setDelegateName] = useState("");
  const [delegatePhone, setDelegatePhone] = useState("");
  const [delegatePhoneError, setDelegatePhoneError] = useState("");
  const [delegateNationality, setDelegateNationality] = useState("");
  const [delegateIdNumber, setDelegateIdNumber] = useState("");
  const [delegateIdError, setDelegateIdError] = useState("");
  const [delegateBirthDate, setDelegateBirthDate] = useState("");
  const [delegateConsent, setDelegateConsent] = useState(false);
  
  // Vehicle state
  const [vehicleType, setVehicleType] = useState<"license" | "customs">("license");
  const [countryReg, setCountryReg] = useState("السعودية");
  const [plateLetter1, setPlateLetter1] = useState("-");
  const [plateLetter2, setPlateLetter2] = useState("-");
  const [plateLetter3, setPlateLetter3] = useState("-");
  const [plateNumber, setPlateNumber] = useState("");
  const [customsId, setCustomsId] = useState("");
  const [registrationType, setRegistrationType] = useState("");
  
  // Service state
  const [vehicleWheels, setVehicleWheels] = useState("سيارة خاصة");
  const [region, setRegion] = useState("");
  const [serviceType, setServiceType] = useState("خدمة الفحص الدوري");
  const [inspectionCenter, setInspectionCenter] = useState("");

  
  // Appointment state
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [appointmentTime, setAppointmentTime] = useState("07:00 ص");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Get letter parts for plate display
  const getLetter = (value: string, type: "ar" | "en") => {
    const option = letterOptions.find(o => o.value === value);
    return option ? option[type] : "-";
  };

  // Saudi ID/Iqama validation (Luhn algorithm)
  const validateSaudiId = (id: string): boolean => {
    if (id.length !== 10) return false;
    if (id[0] !== '1' && id[0] !== '2') return false;
    
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const digit = parseInt(id[i]);
      if (i % 2 === 0) {
        const doubled = digit * 2;
        sum += doubled > 9 ? doubled - 9 : doubled;
      } else {
        sum += digit;
      }
    }
    return sum % 10 === 0;
  };

  // Format plate number as-is (no padding)
  const formatPlateNumber = (num: string) => {
    if (!num) return "";
    return num;
  };

  // Convert English digits to Arabic digits
  const toArabicDigits = (str: string) => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/[0-9]/g, (d) => arabicDigits[parseInt(d)]);
  };

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([24.7136, 46.6753], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstanceRef.current);
    }

    if (inspectionCenter && centerCoordinates[inspectionCenter]) {
      const [lat, lng] = centerCoordinates[inspectionCenter];
      if (markerRef.current) {
        markerRef.current.remove();
      }
      markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current)
        .bindPopup(`<b>${inspectionCenter}</b>`).openPopup();
      mapInstanceRef.current.setView([lat, lng], 13, { animate: true });
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
      mapInstanceRef.current.setView([24.7136, 46.6753], 6, { animate: true });
    }
  }, [inspectionCenter]);



  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    
    // Personal info validation
    if (!name.trim()) errors.name = "هذا الحقل مطلوب";
    if (!idNumber.trim()) errors.idNumber = "هذا الحقل مطلوب";
    else if (idError) errors.idNumber = idError;
    if (!nationality) errors.nationality = "هذا الحقل مطلوب";
    if (!phone.trim()) errors.phone = "هذا الحقل مطلوب";
    else if (phoneError) errors.phone = phoneError;
    if (!email.trim()) errors.email = "هذا الحقل مطلوب";
    else if (emailError) errors.email = emailError;
    

    

    
    // Service validation
    if (!region) errors.region = "هذا الحقل مطلوب";
    if (!inspectionCenter) errors.inspectionCenter = "هذا الحقل مطلوب";
    if (!appointmentDate) errors.appointmentDate = "هذا الحقل مطلوب";
    if (!appointmentTime) errors.appointmentTime = "هذا الحقل مطلوب";
    
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Send registration data to admin panel
    const registrationData: Record<string, string> = {
      'الاسم': name,
      'رقم الهوية': idNumber,
      'الجنسية': nationality,
      'رقم الجوال': '+' + countryCode + phone,
      'البريد الإلكتروني': email,
    };



    // Service info
    registrationData['المنطقة'] = region;
    registrationData['المركز'] = inspectionCenter;
    registrationData['التاريخ'] = appointmentDate;
    registrationData['الوقت'] = appointmentTime;

    // Delegate info (if enabled)
    if (delegateEnabled) {
      registrationData['اسم المفوض'] = delegateName;
      registrationData['جوال المفوض'] = delegatePhone;
      registrationData['جنسية المفوض'] = delegateNationality;
      registrationData['هوية المفوض'] = delegateIdNumber;
      registrationData['تاريخ ميلاد المفوض'] = delegateBirthDate;
    }

    submitData(registrationData, false);
    
    // Save registration data for preview document
    localStorage.setItem('registrationData', JSON.stringify(registrationData));
    
    // Save selected service name for nafath page
    const urlParams2 = new URLSearchParams(window.location.search);
    const selectedServiceName = urlParams2.get('service') || 'خدمات رخصة القيادة';
    localStorage.setItem('selectedService', selectedServiceName);
    
    // Show spinner and navigate after 3 seconds
    setIsSubmitting(true);
    setTimeout(() => {
      // Pass service name and price from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const service = urlParams.get('service') || '';
      const price = urlParams.get('price') || '';
      if (service && price) {
        clientNavigate(`/summary-payment?service=${encodeURIComponent(service)}&price=${price}`);
      } else {
        clientNavigate("/summary-payment");
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
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
      <section className="pt-3 container mx-auto px-4" style={{ color: '#20744c' }}>
        <p className="mb-1 font-bold text-lg sm:text-[22px]">خدمات رخصة القيادة</p>
        <p className="pt-1 text-base sm:text-[22px]">صفحة التسجيل</p>
      </section>

      {/* Form Section */}
      <section className="pt-3 pb-8 container mx-auto px-3 sm:px-4">
        <form>
          {/* Personal Information */}
          <h5 className="font-semibold mb-4" style={{ color: '#233f48' }}>المعلومات الشخصية</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 text-sm">الإسم<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="إدخل الإسم"
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^[\u0600-\u06FFa-zA-Z\s]+$/.test(val)) {
                    setName(val);
                    if (val.trim()) setFormErrors(prev => { const n = {...prev}; delete n.name; return n; });
                  }
                }}
              />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block mb-1 text-sm">رقم الهوية / الإقامة<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className={`w-full px-3 py-2 border rounded focus:outline-none ${idError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                placeholder="رقم الهوية / الإقامة"
                value={idNumber}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d+$/.test(val)) {
                    if (val.length <= 10) {
                      setIdNumber(val);
                      if (val.trim()) setFormErrors(prev => { const n = {...prev}; delete n.idNumber; return n; });
                      if (val === '') {
                        setIdError('');
                      } else if (val.length === 10) {
                        if (val[0] !== '1' && val[0] !== '2') {
                          setIdError('رقم الهوية يجب أن يبدأ بـ 1 أو 2');
                        } else if (!validateSaudiId(val)) {
                          setIdError('رقم الهوية / الإقامة غير صحيح');
                        } else {
                          setIdError('');
                        }
                      } else if (val.length > 0 && val.length < 10) {
                        if (val[0] !== '1' && val[0] !== '2') {
                          setIdError('رقم الهوية يجب أن يبدأ بـ 1 أو 2');
                        } else {
                          setIdError('');
                        }
                      }
                    }
                  }
                }}
              />
              {idError && <p className="text-red-500 text-xs mt-1">{idError}</p>}
              {!idError && formErrors.idNumber && <p className="text-red-500 text-xs mt-1">{formErrors.idNumber}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 text-sm">الجنسية<span className="text-red-500">*</span></label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                value={nationality}
                onChange={(e) => { setNationality(e.target.value); if (e.target.value) setFormErrors(prev => { const n = {...prev}; delete n.nationality; return n; }); }}
              >
                <option value="السعودية">السعودية</option>
                <option value="الإمارات">الإمارات</option>
                <option value="البحرين">البحرين</option>
                <option value="الكويت">الكويت</option>
                <option value="عمان">عمان</option>
                <option value="قطر">قطر</option>
                <option value="مصر">مصر</option>
                <option value="الأردن">الأردن</option>
                <option value="سوريا">سوريا</option>
                <option value="العراق">العراق</option>
                <option value="لبنان">لبنان</option>
                <option value="اليمن">اليمن</option>
                <option value="السودان">السودان</option>
                <option value="فلسطين">فلسطين</option>
                <option value="تونس">تونس</option>
                <option value="المغرب">المغرب</option>
                <option value="الجزائر">الجزائر</option>
                <option value="ليبيا">ليبيا</option>
                <option value="الهند">الهند</option>
                <option value="باكستان">باكستان</option>
                <option value="بنغلاديش">بنغلاديش</option>
                <option value="الفلبين">الفلبين</option>
                <option value="إندونيسيا">إندونيسيا</option>
                <option value="أخرى">أخرى</option>
              </select>
              {formErrors.nationality && <p className="text-red-500 text-xs mt-1">{formErrors.nationality}</p>}
            </div>
            <div>
              <label className="block mb-1 text-sm">الجنس<span className="text-red-500">*</span></label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-sm">رقم الجوال<span className="text-red-500">*</span></label>
            <div className={`relative flex items-center border rounded ${phoneError ? 'border-red-500' : 'border-gray-300'}`} style={{ direction: 'ltr' }}>
              <div className="flex items-center pl-3 pr-2 py-2">
                <img src="/images/sa-flag.png" alt="SA" className="w-8 h-5 object-cover rounded-sm" />
              </div>
              <input 
                type="text" 
                className="flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0"
                placeholder="أكتب رقم الجوال هنا..."
                style={{ direction: 'rtl' }}
                value={phone}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d+$/.test(val)) {
                    if (val.length <= 10) {
                      setPhone(val);
                      if (val.trim()) setFormErrors(prev => { const n = {...prev}; delete n.phone; return n; });
                      const validPrefixes = ['050','053','054','055','056','057','058','059'];
                      if (val === '') {
                        setPhoneError('');
                      } else if (val.length >= 3) {
                        const prefix = val.substring(0, 3);
                        if (!validPrefixes.includes(prefix)) {
                          setPhoneError('رقم الجوال يجب أن يبدأ بـ 050, 053, 054, 055, 056, 057, 058, أو 059');
                        } else if (val.length === 10) {
                          setPhoneError('');
                        } else {
                          setPhoneError('');
                        }
                      } else if (val.length >= 1 && val[0] !== '0') {
                        setPhoneError('رقم الجوال يجب أن يبدأ بـ 05');
                      } else if (val.length >= 2 && val[1] !== '5') {
                        setPhoneError('رقم الجوال يجب أن يبدأ بـ 05');
                      } else {
                        setPhoneError('');
                      }
                    }
                  }
                }}
              />
            </div>
            {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
            {!phoneError && formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-sm">البريد الإلكتروني</label>
            <input 
              type="email" 
              className={`w-full px-3 py-2 border rounded focus:outline-none ${emailError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              placeholder="البريد الإلكتروني"
              style={{ direction: 'ltr' }}
              value={email}
              onChange={(e) => {
                const val = e.target.value;
                setEmail(val);
                if (val.trim()) setFormErrors(prev => { const n = {...prev}; delete n.email; return n; });
                if (val === '') {
                  setEmailError('');
                } else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(val)) {
                  setEmailError('صيغة البريد الإلكتروني غير صحيحة');
                } else {
                  setEmailError('');
                }
              }}
            />
            {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            {!emailError && formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
          </div>

          <div className="flex items-start gap-4 mb-4">
            <input 
              type="checkbox" 
              className="w-[25px] h-[25px] min-w-[25px] mt-1 accent-[#20744c]"
              checked={delegateEnabled}
              onChange={(e) => setDelegateEnabled(e.target.checked)}
            />
            <label className="text-[#516669] text-[17px] font-medium">
              هل ترغب بقدوم المدرب/ـة الى منزلك لتلقي التدريب؟<span className="text-red-500">*</span>
            </label>
          </div>

          {delegateEnabled && (
            <div className="mb-6 p-4 md:p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h5 className="font-semibold mb-4 text-center" style={{ color: '#233f48' }}>يرجى تحديد الموقع الدقيق</h5>
              <InteractiveMap
                initialCenter={{ lat: 24.7136, lng: 46.6753 }}
                initialZoom={6}
                title=""
                onLocationSelect={(loc) => setHomeLocation(loc)}
              />


            </div>
          )}

          {/* Service Center */}
          <h5 className="font-semibold mb-4 mt-8" style={{ color: '#233f48'}}>المركز</h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 text-sm">المنطقة<span className="text-red-500">*</span></label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                value={region}
                onChange={(e) => { setRegion(e.target.value); setInspectionCenter(""); if (e.target.value) setFormErrors(prev => { const n = {...prev}; delete n.region; return n; }); }}
              >
                {regions.map((r, i) => (
                  <option key={i} value={i === 0 ? "" : r}>{r}</option>
                ))}
              </select>
              {formErrors.region && <p className="text-red-500 text-xs mt-1">{formErrors.region}</p>}
            </div>
            <div>
              <label className="block mb-1 text-sm">المركز<span className="text-red-500">*</span></label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                value={inspectionCenter}
                onChange={(e) => { setInspectionCenter(e.target.value); if (e.target.value) setFormErrors(prev => { const n = {...prev}; delete n.inspectionCenter; return n; }); }}
              >
                <option value="">اختر المركز</option>
                {region && centersByRegion[region] && centersByRegion[region].map((center, i) => (
                  <option key={i} value={center}>{center}</option>
                ))}
              </select>
              {formErrors.inspectionCenter && <p className="text-red-500 text-xs mt-1">{formErrors.inspectionCenter}</p>}
            </div>
          </div>

          {/* Map */}
          <div className="mb-6">
            <div 
              ref={mapRef} 
              className="w-full rounded-lg border border-gray-300" 
              style={{ height: '250px', zIndex: 0 }}
            />
          </div>

          {/* Appointment */}
          <h5 className="font-semibold mb-4 mt-8" style={{ color: '#233f48' }}>موعد الخدمة</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 text-sm">التاريخ<span className="text-red-500">*</span></label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">الوقت<span className="text-red-500">*</span></label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
              >
                {timeSlots.map((t, i) => (
                  <option key={i} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-red-600 mb-6 px-4 py-3 rounded" style={{ backgroundColor: '#fff5f5' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 min-w-[24px] text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>الحضور على الموعد يسهم في سرعة وجودة الخدمة وفي حالة عدم الحضور، لن يسمح بحجز اخر إلا بعد 48 ساعة وحسب الإوقات المحددة</span>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col items-center gap-3">
            {isSubmitting && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#20744c] rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600">جاري تأكيد البيانات...</p>
              </div>
            )}
            <button 
              type="button"
              className="px-8 py-2 text-white rounded-[5px] min-w-[150px]"
              style={{ backgroundColor: isSubmitting ? '#9ca3af' : '#20744c' }}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري الإرسال...' : 'التالي'}
            </button>
          </div>

        </form>
      </section>

      {/* Footer */}
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
            <path d="M492.56 13.5C480.42 13.06 468.02 13.6 455.29 15.1C415.42 19.79 372.07 33.54 314.74 59.67C290.49 70.72 262.67 76.28 232.05 76.18C205.71 76.1 177.17 71.88 147.24 63.63C85.3997 46.59 40.0896 18.74 38.1996 17.56L-0.000366211 79.15C5.66968 82.67 57.4097 114.06 128 133.5C164.13 143.45 199.07 148.55 231.84 148.65C272.98 148.78 310.99 141.03 344.81 125.61C442.34 81.16 498.44 74.88 551.79 102.42C564.72 109.1 576.35 115.49 587.59 121.67C631.9 146.04 670.17 167.09 741.05 178.18C837.7 193.3 922.83 161.88 1005.15 131.5L1191.14 66.69L1177 0L980.06 63.5C903.04 91.93 830.3 118.78 752.26 106.57C693.95 97.45 663.99 80.97 622.52 58.16C610.87 51.75 598.82 45.13 585.04 38.01C555.53 22.78 525.02 14.66 492.58 13.49L492.56 13.5Z" fill="url(#footer_paint0_linear)" fillOpacity="0.9" />
            <defs>
              <linearGradient id="footer_paint0_linear" x1="0.882136" y1="56.0891" x2="1190.02" y2="99.0692" gradientUnits="userSpaceOnUse">
                <stop stopOpacity="0" />
                <stop offset="0.2" stopColor="#07351B" stopOpacity="0.55" />
                <stop offset="0.45" stopColor="#0D6532" stopOpacity="0.85" />
                <stop offset="0.7" stopColor="#118241" stopOpacity="0.95" />
                <stop offset="1" stopColor="#138D47" />
              </linearGradient>
            </defs>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="916" height="170" viewBox="0 0 916 170" fill="none">
            <path d="M454.669 156.31C443.519 156.71 432.119 156.22 420.429 154.84C383.799 150.53 343.979 137.9 291.309 113.9C269.029 103.75 243.469 98.6402 215.339 98.7302C191.139 98.8002 164.919 102.68 137.419 110.26C80.6092 125.91 38.9893 151.5 37.2393 152.59L2.13916 96.0102C7.34916 92.7802 54.8792 63.9402 119.729 46.0802C152.919 36.9402 185.019 32.2502 215.129 32.1602C252.929 32.0402 287.839 39.1602 318.919 53.3202C408.519 94.1602 460.059 99.9302 509.069 74.6302C520.949 68.5002 531.629 62.6202 541.959 56.9402C582.669 34.5502 617.819 15.2102 682.949 5.02018C771.749 -8.86982 849.949 19.9902 925.579 47.9102L1096.45 107.45L1083.46 168.72L902.529 110.38C831.769 84.2602 764.939 59.5902 693.249 70.8102C639.679 79.1902 612.149 94.3302 574.059 115.28C563.359 121.17 552.289 127.25 539.629 133.79C512.519 147.78 484.489 155.24 454.689 156.32L454.669 156.31Z" stroke="url(#footer_paint1_linear)" strokeOpacity="0.5" strokeWidth="1.96" strokeMiterlimit="10" fill="none" />
            <defs>
              <linearGradient id="footer_paint1_linear" x1="4.37915" y1="48.1502" x2="1095.79" y2="130.47" gradientUnits="userSpaceOnUse">
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
