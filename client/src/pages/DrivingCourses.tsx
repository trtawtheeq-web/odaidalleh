import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { socket } from "@/lib/store";

const DDC_CDN = 'https://www.ddc.sa/themes/ddc/assets/images';
const DDC_UPLOADS = 'https://www.ddc.sa/uploads/image';

const DrivingCourses = () => {
  const [, setLocation] = useLocation();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [programsDropdown, setProgramsDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [tabOffset, setTabOffset] = useState(0);
  const [modalCourse, setModalCourse] = useState<any>(null);
  const [modalTab, setModalTab] = useState(0);

  const tabs = [
    { id: 'temporary-permit', name: 'تصريح مؤقت', icon: `${DDC_UPLOADS}/courses/6902ff17c878b.svg` },
    { id: 'private', name: 'خصوصي', icon: `${DDC_UPLOADS}/courses/68fb1da417517.svg` },
    { id: 'motorcycle', name: 'دراجة نارية', icon: `${DDC_UPLOADS}/courses/68fb1d5fb516f.svg` },
    { id: 'taxi', name: 'أجرة', icon: `${DDC_UPLOADS}/courses/68d3edf547829.svg` },
    { id: 'light-transport', name: 'نقل خفيف', icon: `${DDC_UPLOADS}/courses/68fb1d9673dd1.svg` },
    { id: 'small-bus', name: 'حافلة صغيرة', icon: `${DDC_UPLOADS}/courses/68d66ed27f4d6.svg` },
    { id: 'heavy-transport', name: 'نقل ثقيل', icon: `${DDC_UPLOADS}/courses/68fb1d885f0b4.svg` },
    { id: 'big-bus', name: 'حافلة كبيرة', icon: `${DDC_UPLOADS}/courses/68d66e89beea6.svg` },
    { id: 'road-machines', name: 'اليات طرق', icon: `${DDC_UPLOADS}/courses/68f8cf412fedc.svg` },
  ];

  // Fetch whatsapp number from API (works without socket connection)
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || '';
    fetch(`${API_URL}/api/whatsapp`)
      .then(res => res.json())
      .then(data => { if (data.number) setWhatsappNumber(data.number); })
      .catch(() => {});
    // Also listen via socket if connected
    if (socket.value) {
      socket.value.on("whatsapp:update", (number: string) => {
        setWhatsappNumber(number);
      });
    }
    return () => {
      if (socket.value) socket.value.off("whatsapp:update");
    };
  }, []);

  // Read hash from URL to set active tab
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const tabIndex = tabs.findIndex(t => t.id === hash);
        if (tabIndex !== -1) {
          setActiveTab(tabIndex);
          const visibleCount = 5;
          if (tabIndex >= visibleCount) {
            setTabOffset(tabIndex - visibleCount + 1);
          }
        }
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // Course detail data for modal popup
  const courseDetails: Record<string, Record<string, {
    overviewImage: string;
    overviewTitle: string;
    overviewDesc: string;
    detailsImage: string;
    detailsDesc: string;
    courseType: string;
    courseDuration: string;
    coursePricing: string;
  }>> = {
    'temporary-permit': {
      'برنامج 30 ساعات تدريبية': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/690c648d55380.jpg',
        overviewTitle: 'رحلة تدريبية متكاملة تجمع بين الجانب النظري والمحاكاة والتطبيق العملي، لتأهيل المتدرب للقيادة بثقة وأمان.',
        overviewDesc: 'تم تصميم برنامج التدريب ليمنح المتدربين تجربة تعليمية متكاملة تزوّدهم بالمعرفة والمهارات والثقة اللازمة للقيادة الآمنة والمسؤولة. يشمل البرنامج دروسًا نظرية حول أنظمة المرور ومفاهيم السلامة، وتمارين محاكاة تحاكي الواقع، وتدريبًا عمليًا على الطرق بإشراف مدربين معتمدين. تم تنظيم كل مرحلة بدقة لضمان التعلم التدريجي ورفع مستوى الكفاءة، مما يؤهل المتدرب لاجتياز الاختبار بثقة واحترافية.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/690c648d5581d.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '30 ساعة',
        coursePricing: 'SAR 2,760.00',
      },
      'برنامج 15 ساعات تدريبية': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/690c6558cb0ca.jpg',
        overviewTitle: 'رحلة تدريبية متكاملة تجمع بين الجانب النظري والمحاكاة والتطبيق العملي، لتأهيل المتدرب للقيادة بثقة وأمان.',
        overviewDesc: 'تم تصميم برنامج التدريب ليمنح المتدربين تجربة تعليمية متكاملة تزوّدهم بالمعرفة والمهارات والثقة اللازمة للقيادة الآمنة والمسؤولة. يشمل البرنامج دروسًا نظرية حول أنظمة المرور ومفاهيم السلامة، وتمارين محاكاة تحاكي الواقع، وتدريبًا عمليًا على الطرق بإشراف مدربين معتمدين. تم تنظيم كل مرحلة بدقة لضمان التعلم التدريجي ورفع مستوى الكفاءة، مما يؤهل المتدرب لاجتياز الاختبار بثقة واحترافية.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/690c6558ce511.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'متوسط',
        courseDuration: '15 ساعة',
        coursePricing: 'SAR 1,466.25',
      },
      'برنامج 6 ساعات تدريبية': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/690c667a87412.jpg',
        overviewTitle: 'رحلة تدريبية متكاملة تجمع بين الجانب النظري والمحاكاة والتطبيق العملي، لتأهيل المتدرب للقيادة بثقة وأمان.',
        overviewDesc: 'تم تصميم برنامج التدريب ليمنح المتدربين تجربة تعليمية متكاملة تزوّدهم بالمعرفة والمهارات والثقة اللازمة للقيادة الآمنة والمسؤولة. يشمل البرنامج دروسًا نظرية حول أنظمة المرور ومفاهيم السلامة، وتمارين محاكاة تحاكي الواقع، وتدريبًا عمليًا على الطرق بإشراف مدربين معتمدين. تم تنظيم كل مرحلة بدقة لضمان التعلم التدريجي ورفع مستوى الكفاءة، مما يؤهل المتدرب لاجتياز الاختبار بثقة واحترافية.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/690c667a877f2.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'متقدم',
        courseDuration: '6 ساعات',
        coursePricing: 'SAR 690.00',
      },
    },
    'private': {
      'برنامج 30 ساعات تدريبية': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/690c667a87412.jpg',
        overviewTitle: 'رحلة تدريبية متكاملة تجمع بين الجانب النظري والمحاكاة والتطبيق العملي، لتأهيل المتدرب للقيادة بثقة وأمان.',
        overviewDesc: 'تم تصميم برنامج التدريب ليمنح المتدربين تجربة تعليمية متكاملة تزوّدهم بالمعرفة والمهارات والثقة اللازمة للقيادة الآمنة والمسؤولة. يشمل البرنامج دروسًا نظرية حول أنظمة المرور ومفاهيم السلامة، وتمارين محاكاة تحاكي الواقع، وتدريبًا عمليًا على الطرق بإشراف مدربين معتمدين. تم تنظيم كل مرحلة بدقة لضمان التعلم التدريجي ورفع مستوى الكفاءة، مما يؤهل المتدرب لاجتياز الاختبار بثقة واحترافية.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/690c667a877f2.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '30 ساعة',
        coursePricing: 'SAR 2,760.00',
      },
      'برنامج 15 ساعات تدريبية': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/690c667a87412.jpg',
        overviewTitle: 'رحلة تدريبية متكاملة تجمع بين الجانب النظري والمحاكاة والتطبيق العملي، لتأهيل المتدرب للقيادة بثقة وأمان.',
        overviewDesc: 'تم تصميم برنامج التدريب ليمنح المتدربين تجربة تعليمية متكاملة تزوّدهم بالمعرفة والمهارات والثقة اللازمة للقيادة الآمنة والمسؤولة. يشمل البرنامج دروسًا نظرية حول أنظمة المرور ومفاهيم السلامة، وتمارين محاكاة تحاكي الواقع، وتدريبًا عمليًا على الطرق بإشراف مدربين معتمدين. تم تنظيم كل مرحلة بدقة لضمان التعلم التدريجي ورفع مستوى الكفاءة، مما يؤهل المتدرب لاجتياز الاختبار بثقة واحترافية.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/690c667a877f2.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'متوسط',
        courseDuration: '15 ساعة',
        coursePricing: 'SAR 1,466.25',
      },
      'برنامج 6 ساعات تدريبية': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/690c667a87412.jpg',
        overviewTitle: 'مصممة للسائقين ذوي الخبرة الذين يرغبون في صقل مهاراتهم.',
        overviewDesc: 'تركز الدورة على التحكم المتقدم في المركبة، التعامل مع المواقف المفاجئة على الطرق، وتطبيق قوانين المرور بشكل احترافي خلال فترة زمنية قصيرة.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/690c667a877f2.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'متقدم',
        courseDuration: '6 ساعات',
        coursePricing: 'SAR 690.00',
      },
    },
    'motorcycle': {
      'برنامج 30 ساعات تدريبية': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/690c699c73b1c.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتعليم الأفراد المهارات الأساسية المطلوبة لقيادة الدراجة النارية بأمان.',
        overviewDesc: 'تشمل الدورة التحكم في المركبة، وقوانين المرور، وبروتوكولات السلامة الخاصة بالدراجات النارية. كما سيتعلمون كيفية المناورة الدراجة النارية في ظروف مختلفة، وإدارة حركة المرور، وضمان سلامتهم الشخصية وسلامة الآخرين. كما تركز الدورة على تقنيات القيادة الدفاعية وكيفية التعامل مع حالات الطوارئ. بنهاية الدورة، سيكون المشاركون مستعدين جيدًا للحصول على رخصة قيادة الدراجة النارية والقيادة بثقة على الطريق.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/690c699c73f8d.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '30 ساعة',
        coursePricing: 'SAR 2,760.00',
      },
      'برنامج 15 ساعات تدريبية': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/690c69c436c9b.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتعليم الأفراد المهارات الأساسية المطلوبة لقيادة الدراجة النارية بأمان.',
        overviewDesc: 'تشمل الدورة التحكم في المركبة، وقوانين المرور، وبروتوكولات السلامة الخاصة بالدراجات النارية. كما سيتعلمون كيفية المناورة الدراجة النارية في ظروف مختلفة، وإدارة حركة المرور، وضمان سلامتهم الشخصية وسلامة الآخرين. كما تركز الدورة على تقنيات القيادة الدفاعية وكيفية التعامل مع حالات الطوارئ. بنهاية الدورة، سيكون المشاركون مستعدين جيدًا للحصول على رخصة قيادة الدراجة النارية والقيادة بثقة على الطريق.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/690c69c436f4e.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'متوسط',
        courseDuration: '15 ساعة',
        coursePricing: 'SAR 1,466.25',
      },
      'برنامج 6 ساعات تدريبية': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/690c69b146559.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتعليم الأفراد المهارات الأساسية المطلوبة لقيادة الدراجة النارية بأمان.',
        overviewDesc: 'تشمل الدورة التحكم في المركبة، وقوانين المرور، وبروتوكولات السلامة الخاصة بالدراجات النارية. كما سيتعلمون كيفية المناورة الدراجة النارية في ظروف مختلفة، وإدارة حركة المرور، وضمان سلامتهم الشخصية وسلامة الآخرين. كما تركز الدورة على تقنيات القيادة الدفاعية وكيفية التعامل مع حالات الطوارئ. بنهاية الدورة، سيكون المشاركون مستعدين جيدًا للحصول على رخصة قيادة الدراجة النارية والقيادة بثقة على الطريق.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/690c69b146a0e.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'متقدم',
        courseDuration: '6 ساعات',
        coursePricing: 'SAR 690.00',
      },
    },
    'taxi': {
      'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/696dd6add8dd4.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتزويد السائقين بالمهارات اللازمة لقيادة سيارات الأجرة بأمان.',
        overviewDesc: 'تشمل الدورة تدريبًا أساسيًا على كيفية التعامل مع المركبة، وقوانين المرور المحلية، وخدمة العملاء. سيتعلم السائقون كيفية التنقل في البيئات المزدحمة، وإدارة سلامة الركاب، والتعامل مع ظروف الطرق المختلفة بالإضافة خدمة ممتازة. تضمن هذه الدورة أن يكون السائقون مستعدين جيدًا للحصول على رخصة قيادة التاكسي وتقديم خدمة فعالة للركاب.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/696dd765382fc.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '4 أيام',
        coursePricing: 'SAR 500.25',
      },
      'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/696dd66155644.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتزويد السائقين بالمهارات اللازمة لقيادة سيارات الأجرة بأمان.',
        overviewDesc: 'تشمل الدورة تدريبًا أساسيًا على كيفية التعامل مع المركبة، وقوانين المرور المحلية، وخدمة العملاء. سيتعلم السائقون كيفية التنقل في البيئات المزدحمة، وإدارة سلامة الركاب، والتعامل مع ظروف الطرق المختلفة بالإضافة خدمة ممتازة. تضمن هذه الدورة أن يكون السائقون مستعدين جيدًا للحصول على رخصة قيادة التاكسي وتقديم خدمة فعالة للركاب.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/696dd744a7a82.jpg',
        detailsDesc: 'يقدّم برنامجنا التدريبي معرفة شاملة نظرية وعملية تساعدك على إتقان قواعد المرور وتقنيات القيادة وبناء الثقة خلف المقود، مما يُعدّك لاجتياز اختبار القيادة والقيادة اليومية بثقة وكفاءة.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '10 أيام',
        coursePricing: 'SAR 644.00',
      },
    },
    'light-transport': {
      'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/695a394a84f8a.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتعليم السائقين كيفية قيادة الشاحنات الخفيفة بأمان وكفاءة.',
        overviewDesc: 'حيث تشمل تدريباً عملياً ونظرياً على التحكم بالمركبة واستخدام المكابح والتسارع بشكل صحيح، كما يتعلم المتدربون قوانين المرور الخاصة بالشاحنات الخفيفة وأساليب القيادة الدفاعية وكيفية التعامل مع حركة المرور داخل المدن والطرق السريعة، إضافة إلى التدريب على تغيير المسارات والالتفاف والوقوف والانطلاق بطريقة سليمة، وتهدف الدورة إلى تجهيز المتدربين للتعامل مع ظروف القيادة المختلفة والمواقف المتنوعة وضمان جاهزيتهم لاجتياز اختبار رخصة قيادة الشاحنات الخفيفة.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/696dd81d7d9c8.jpg',
        detailsDesc: 'تم إعداد هذه الدورة للراغبين في الحصول على رخصة نقل عام، حيث تركّز على أساليب القيادة الآمنة، والتعامل مع الحمولة، والالتزام بأنظمة النقل.',
        courseType: 'متقدم',
        courseDuration: '4 أيام',
        coursePricing: 'SAR 500.25',
      },
      'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/695a394a84f8a.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتعليم السائقين كيفية قيادة الشاحنات الخفيفة بأمان وكفاءة.',
        overviewDesc: 'حيث تشمل تدريباً عملياً ونظرياً على التحكم بالمركبة واستخدام المكابح والتسارع بشكل صحيح، كما يتعلم المتدربون قوانين المرور الخاصة بالشاحنات الخفيفة وأساليب القيادة الدفاعية وكيفية التعامل مع حركة المرور داخل المدن والطرق السريعة، إضافة إلى التدريب على تغيير المسارات والالتفاف والوقوف والانطلاق بطريقة سليمة، وتهدف الدورة إلى تجهيز المتدربين للتعامل مع ظروف القيادة المختلفة والمواقف المتنوعة وضمان جاهزيتهم لاجتياز اختبار رخصة قيادة الشاحنات الخفيفة.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/696dd81d7d9c8.jpg',
        detailsDesc: 'تم إعداد هذه الدورة للراغبين في الحصول على رخصة نقل عام، حيث تركّز على أساليب القيادة الآمنة، والتعامل مع الحمولة، والالتزام بأنظمة النقل.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '10 أيام',
        coursePricing: 'SAR 644.00',
      },
    },
    'small-bus': {
      'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/696dd8d3ee925.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتعليم السائقين كيفية تشغيل الحافلات الصغيرة بأمان وكفاءة.',
        overviewDesc: 'تشمل الدورة تدريباً على التحكم في المركبة، وقوانين المرور، وسلامة الركاب. لضمان تعليم كيفية إدارة الحمولة الصغيرة من الركاب، والتنقل عبر المناطق الحضرية، وضمان راحة وسلامة الركاب. تهدف الدورة إلى تجهيز السائقين للتعامل مع ظروف القيادة المختلفة والمواقف المتنوعة، مما يضمن استعدادهم للحصول على رخصة قيادة الحافلات الصغيرة',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/696dd9933ba62.jpg',
        detailsDesc: 'تم تصميم هذه الدورة للراغبين في الحصول على رخصة قيادة حافلة عامة، وتركّز على سلامة الركاب، وإدارة المسارات، والالتزام بأنظمة المرور، والتعامل مع الحالات الطارئة، لضمان قيادة مسؤولة وآمنة للحافلات الكبيرة.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '4 أيام',
        coursePricing: 'SAR 500.25',
      },
      'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/696dd8d3ee925.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتعليم السائقين كيفية تشغيل الحافلات الصغيرة بأمان وكفاءة.',
        overviewDesc: 'تشمل الدورة تدريباً على التحكم في المركبة، وقوانين المرور، وسلامة الركاب. لضمان تعليم كيفية إدارة الحمولة الصغيرة من الركاب، والتنقل عبر المناطق الحضرية، وضمان راحة وسلامة الركاب. تهدف الدورة إلى تجهيز السائقين للتعامل مع ظروف القيادة المختلفة والمواقف المتنوعة، مما يضمن استعدادهم للحصول على رخصة قيادة الحافلات الصغيرة',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/696dd9933ba62.jpg',
        detailsDesc: 'تم تصميم هذه الدورة للراغبين في الحصول على رخصة قيادة حافلة عامة، وتركّز على سلامة الركاب، وإدارة المسارات، والالتزام بأنظمة المرور، والتعامل مع الحالات الطارئة، لضمان قيادة مسؤولة وآمنة للحافلات الكبيرة.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '10 أيام',
        coursePricing: 'SAR 644.00',
      },
    },
    'heavy-transport': {
      'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/698c4220afbdc.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتوفير تدريب شامل للسائقين الذين يرغبون في قيادة الشاحنات الثقيلة.',
        overviewDesc: 'تشمل الدورة مجالات أساسية مثل التحكم في المركبة، وتقنيات القيادة المتقدمة، وفهم قوانين المرور الخاصة بالشاحنات الثقيلة. سيتعلم السائقون كيفية مناورة المركبات الكبيرة بأمان، وإدارة الحمولة الثقيلة، والتنقل عبر ظروف الطرق المختلفة، بما في ذلك الطرق السريعة والمناطق الريفية. كما تركز الدورة على بروتوكولات السلامة، وتأمين الحمولة، وأفضل الممارسات للقيادة لمسافات طويلة. بنهاية الدورة، سيكون السائقون مستعدين تمامًا للحصول على رخصة قيادة الشاحنات الثقيلة وتشغيل هذه المركبات بثقة ومسؤولية.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/695a3893de30b.jpg',
        detailsDesc: 'تم إعداد هذه الدورة للراغبين في الحصول على رخصة نقل عامة، حيث تركّز على أساليب القيادة الآمنة، والتعامل مع الحمولة، والالتزام بأنظمة النقل والسلامة. وتهدف إلى تمكين السائقين من أداء مهامهم بكفاءة ومسؤولية عالية.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '4 أيام',
        coursePricing: 'SAR 500.25',
      },
      'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/698c4220afbdc.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتوفير تدريب شامل للسائقين الذين يرغبون في قيادة الشاحنات الثقيلة.',
        overviewDesc: 'تشمل الدورة مجالات أساسية مثل التحكم في المركبة، وتقنيات القيادة المتقدمة، وفهم قوانين المرور الخاصة بالشاحنات الثقيلة. سيتعلم السائقون كيفية مناورة المركبات الكبيرة بأمان، وإدارة الحمولة الثقيلة، والتنقل عبر ظروف الطرق المختلفة، بما في ذلك الطرق السريعة والمناطق الريفية. كما تركز الدورة على بروتوكولات السلامة، وتأمين الحمولة، وأفضل الممارسات للقيادة لمسافات طويلة. بنهاية الدورة، سيكون السائقون مستعدين تمامًا للحصول على رخصة قيادة الشاحنات الثقيلة وتشغيل هذه المركبات بثقة ومسؤولية.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/695a3893de30b.jpg',
        detailsDesc: 'تم إعداد هذه الدورة للراغبين في الحصول على رخصة نقل عامة، حيث تركّز على أساليب القيادة الآمنة، والتعامل مع الحمولة، والالتزام بأنظمة النقل والسلامة. وتهدف إلى تمكين السائقين من أداء مهامهم بكفاءة ومسؤولية عالية.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '10 أيام',
        coursePricing: 'SAR 644.00',
      },
    },
    'big-bus': {
      'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/696ddb0eb40e1.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتدريب السائقين على تشغيل الحافلات الكبيرة بأمان وكفاءة.',
        overviewDesc: 'تشمل الدورة المهارات الأساسية للحصول على رخصة قيادة الحافلات الكبيرة، بما في ذلك التحكم في المركبة، بروتوكولات السلامة، وفهم قوانين المرور الخاصة بالحافلات. سيتم تدريب السائقين أيضًا على كيفية إدارة حمولة الركاب الكبيرة، والتنقل عبر الطرق المزدحمة، وضمان سلامة الركاب أثناء القيادة في ظروف متنوعة. تهدف الدورة إلى تجهيز السائقين للتعامل مع الطرق الحضرية والطويلة بثقة ومسؤولية.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/696ddb0eb4683.jpg',
        detailsDesc: 'تم تصميم هذه الدورة للراغبين في الحصول على رخصة قيادة حافلة عامة، وتركّز على سلامة الركاب، وإدارة المسارات، والالتزام بأنظمة المرور، والتعامل مع الحالات الطارئة، لضمان قيادة مسؤولة وآمنة للحافلات الكبيرة.',
        courseType: 'متقدم',
        courseDuration: '4 أيام',
        coursePricing: 'SAR 500.25',
      },
      'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/696ddb51784f0.jpg',
        overviewTitle: 'تم تصميم هذه الدورة لتدريب السائقين على تشغيل الحافلات الكبيرة بأمان وكفاءة.',
        overviewDesc: 'تشمل الدورة المهارات الأساسية للحصول على رخصة قيادة الحافلات الكبيرة، بما في ذلك التحكم في المركبة، بروتوكولات السلامة، وفهم قوانين المرور الخاصة بالحافلات. سيتم تدريب السائقين أيضًا على كيفية إدارة حمولة الركاب الكبيرة، والتنقل عبر الطرق المزدحمة، وضمان سلامة الركاب أثناء القيادة في ظروف متنوعة. تهدف الدورة إلى تجهيز السائقين للتعامل مع الطرق الحضرية والطويلة بثقة ومسؤولية.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/696ddb5178a0d.jpg',
        detailsDesc: 'تم تصميم هذه الدورة للراغبين في الحصول على رخصة قيادة حافلة عامة، وتركّز على سلامة الركاب، وإدارة المسارات، والالتزام بأنظمة المرور، والتعامل مع الحالات الطارئة، لضمان قيادة مسؤولة وآمنة للحافلات الكبيرة.',
        courseType: 'مستوى المبتدئين',
        courseDuration: '10 أيام',
        coursePricing: 'SAR 644.00',
      },
    },
    'road-machines': {
      'برنامج تدريبي لمدة 1 أيام': {
        overviewImage: 'https://www.ddc.sa/uploads/image/courses/696dd51401554.jpg',
        overviewTitle: 'رحلة تدريبية متكاملة تجمع بين الجانب النظري والمحاكاة والتطبيق العملي، لتأهيل المتدرب للقيادة بثقة وأمان.',
        overviewDesc: 'تم تصميم برنامج التدريب ليمنح المتدربين تجربة تعليمية متكاملة تزوّدهم بالمعرفة والمهارات والثقة اللازمة للقيادة الآمنة والمسؤولة. يشمل البرنامج دروسًا نظرية حول أنظمة المرور ومفاهيم السلامة، وتمارين محاكاة تحاكي الواقع، وتدريبًا عمليًا على الطرق بإشراف مدربين معتمدين.',
        detailsImage: 'https://www.ddc.sa/uploads/image/courses/695a3a911a56d.jpg',
        detailsDesc: 'تم إعداد هذه الدورة للراغبين في الحصول على رخصة عامة لآليات أعمال الطرق، وتركّز على إجراءات السلامة، وآلية تشغيل المعدات، والالتزام بأنظمة النقل والطرق. وتهدف إلى تأهيل السائقين والمشغلين لأداء مهامهم في مشاريع الطرق بكفاءة ووعي ومسؤولية عالية.',
        courseType: 'مستوى المبتدئين',
        courseDuration: 'يوم واحد',
        coursePricing: 'SAR 500.25',
      },
    },
  };

  const coursesData: Record<string, Array<{title: string; includes: string[]; price: string}>> = {
    'temporary-permit': [
      { title: 'برنامج 30 ساعات تدريبية', includes: ['6 ساعات تدريب نظري', 'ساعتان محاكاة', 'اختبار نظري', '22 ساعة تدريب عملي', 'اختبار عملي'], price: '2,760.00' },
      { title: 'برنامج 15 ساعات تدريبية', includes: ['4 ساعات تدريب نظري', 'ساعة محاكاة', 'اختبار نظري', '10 ساعات تدريب عملي', 'اختبار عملي'], price: '1,466.25' },
      { title: 'برنامج 6 ساعات تدريبية', includes: ['4 ساعات تدريب نظري', 'اختبار نظري', '2 ساعة تدريب عملي', 'اختبار عملي'], price: '690.00' },
    ],
    'private': [
      { title: 'برنامج 30 ساعات تدريبية', includes: ['6 ساعات تدريب نظري', 'ساعتان محاكاة', 'اختبار نظري', '22 ساعة تدريب عملي', 'اختبار عملي'], price: '2,760.00' },
      { title: 'برنامج 15 ساعات تدريبية', includes: ['4 ساعات تدريب نظري', 'ساعة محاكاة', 'اختبار نظري', '10 ساعات تدريب عملي', 'اختبار عملي'], price: '1,466.25' },
      { title: 'برنامج 6 ساعات تدريبية', includes: ['4 ساعات تدريب نظري', 'اختبار نظري', '2 ساعة تدريب عملي', 'اختبار عملي'], price: '690.00' },
    ],
    'motorcycle': [
      { title: 'برنامج 30 ساعات تدريبية', includes: ['6 ساعات تدريب نظري', 'ساعتان محاكاة', 'اختبار نظري', '22 ساعة تدريب عملي', 'اختبار عملي'], price: '2,760.00' },
      { title: 'برنامج 15 ساعات تدريبية', includes: ['4 ساعات تدريب نظري', 'ساعة محاكاة', 'اختبار نظري', '10 ساعات تدريب عملي', 'اختبار عملي'], price: '1,466.25' },
      { title: 'برنامج 6 ساعات تدريبية', includes: ['4 ساعات تدريب نظري', 'اختبار نظري', '2 ساعة تدريب عملي', 'اختبار عملي'], price: '690.00' },
    ],
    'taxi': [
      { title: 'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '500.25' },
      { title: 'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '644.00' },
    ],
    'light-transport': [
      { title: 'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '500.25' },
      { title: 'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '644.00' },
    ],
    'small-bus': [
      { title: 'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '500.25' },
      { title: 'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '644.00' },
    ],
    'heavy-transport': [
      { title: 'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '500.25' },
      { title: 'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '644.00' },
    ],
    'big-bus': [
      { title: 'برنامج تدريبي لمدة 4 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '500.25' },
      { title: 'برنامج تدريبي لمدة 10 أيام (بدون ترخيص)', includes: ['التدريب النظري', 'الاختبار النظري', 'التدريب العملي', 'الاختبار العملي'], price: '644.00' },
    ],
    'road-machines': [
      { title: 'برنامج تدريبي لمدة 1 أيام', includes: ['الاختبار النظري', 'الاختبار العملي'], price: '500.25' },
    ],
  };

  useEffect(() => {
    if (socket.value) {
      socket.value.emit("page:visit", { page: "driving-courses", timestamp: new Date().toISOString() });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      setNavScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRegister = (courseName?: string, coursePrice?: string) => {
    if (courseName && coursePrice) {
      setLocation(`/new-appointment?service=${encodeURIComponent(courseName)}&price=${coursePrice}`);
    } else {
      setLocation('/new-appointment');
    }
  };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const visibleCount = 5;
  const tabWidth = 199 + 30; // tab width + gap
  const maxOffset = Math.max(0, tabs.length - visibleCount);
  const nextTab = () => setTabOffset((prev) => prev >= maxOffset ? 0 : prev + 1);
  const prevTab = () => setTabOffset((prev) => prev <= 0 ? maxOffset : prev - 1);

  const currentCourses = coursesData[tabs[activeTab].id] || [];

  return (
    <div className="ddc-home" dir="rtl">
      <link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />
      
      <style>{`
        .ddc-home { font-family: "Readex Pro", sans-serif; overflow-x: hidden; margin: 0; padding: 0; direction: rtl; text-align: right; -webkit-font-smoothing: antialiased; }
        .ddc-home * { box-sizing: border-box; margin: 0; padding: 0; }
        .ddc-home a { text-decoration: none; color: inherit; cursor: pointer; }
        .ddc-home ul { list-style: none; }
        .ddc-container { max-width: 1200px; margin: 0 auto; padding: 0 15px; width: 100%; }

        /* TOP BAR */
        .ddc-top-bar { background: rgba(0,0,0,0.5); padding: 13px 0; position: fixed; top: 0; left: 0; right: 0; z-index: 1001; transition: transform 0.3s ease; }
        .ddc-top-bar.hidden { transform: translateY(-100%); }
        .ddc-top-bar .ddc-container { display: flex; justify-content: flex-end; align-items: center; }
        .ddc-lang-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 16px; border-radius: 4px; cursor: pointer; font-family: "Readex Pro", sans-serif; font-size: 14px; direction: ltr; }
        .ddc-lang-btn svg { width: 18px; height: 18px; }

        /* NAVBAR */
        .ddc-navbar { position: fixed; top: 50px; left: 0; right: 0; z-index: 1000; padding: 16px 0 0; transition: all 0.3s ease; }
        .ddc-navbar.scrolled { top: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); padding: 20px 0; }
        .ddc-navbar .ddc-container { display: flex; align-items: center; justify-content: space-between; }
        .ddc-navbar-brand { cursor: pointer; display: flex; align-items: center; }
        .ddc-navbar-brand img { height: 80px; }
        .ddc-nav-menu { display: flex; align-items: center; gap: 0; }
        .ddc-nav-item { position: relative; }
        .ddc-nav-link { color: #ffffff !important; font-size: 16px; font-weight: 400; padding: 10px 18px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: color 0.3s; white-space: nowrap; }
        .ddc-nav-link:hover { color: #f7be15 !important; }
        .ddc-nav-link svg { width: 12px; height: 8px; fill: none; }
        .ddc-dropdown-menu { position: fixed; top: 100px; left: 50%; transform: translateX(-50%); background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); padding: 40px 50px; width: 850px; display: none; z-index: 1100; }
        .ddc-dropdown-menu.show { display: block; }
        .ddc-dropdown-title { font-size: 24px; font-weight: 700; color: #1b1b1b; text-align: right; margin-bottom: 30px; }
        .ddc-dropdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 60px; direction: rtl; }
        .ddc-dropdown-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; color: #333; font-size: 16px; font-weight: 500; transition: all 0.2s; cursor: pointer; border-radius: 8px; direction: rtl; }
        .ddc-dropdown-item:hover { background: #f0f9f4; color: #138d47; }
        .ddc-dropdown-item img { width: 50px; height: 50px; background: rgba(137, 198, 163, 0.15); border-radius: 10px; padding: 8px; }
        .ddc-nav-actions { display: flex; align-items: center; gap: 16px; }
        .ddc-search-btn { background: none; border: none; color: white; cursor: pointer; padding: 8px; display: flex; align-items: center; }
        .ddc-register-btn { background: #f7be15; color: #1b1b1b; font-size: 16px; font-weight: 600; padding: 0 24px; border-radius: 58px; line-height: 42px; height: 42px; border: none; cursor: pointer; font-family: "Readex Pro", sans-serif; transition: all 0.3s; white-space: nowrap; }
        .ddc-register-btn:hover { background: #e5ad0e; transform: translateY(-1px); }

        /* COURSES HERO */
        .courses-hero { position: relative; width: 100%; height: 750px; background-image: url(${DDC_UPLOADS}/pages/69818cbeead46.jpg); background-size: cover; background-position: center; background-repeat: no-repeat; }
        .courses-hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to left, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 60%, transparent 100%); }
        .courses-hero-content { position: absolute; top: 50%; transform: translateY(-50%); right: 0; left: 0; margin: 0 auto; max-width: 1200px; padding: 0 15px; z-index: 5; }
        .courses-hero-content h2 { font-size: 72px; font-weight: 600; color: white; margin: 0 0 15px; line-height: 1.18; text-align: right; }
        .courses-hero-content p { font-size: 20px; font-weight: 400; color: white; margin: 0; line-height: 1.6; text-align: right; }

        /* COURSES TABS SECTION */
        .courses-section { background: #f6f5f5; padding: 0 0 80px; }
        .courses-tabs-wrapper { position: relative; margin-top: -100px; z-index: 10; }
        .courses-tabs-header { position: relative; display: flex; align-items: center; gap: 10px; overflow: hidden; padding: 0 50px; }
        .courses-tab-nav-btn { width: 38px; height: 38px; border-radius: 50%; border: 1px solid #138d47; background: #efefef; display: flex; align-items: center; justify-content: center; cursor: pointer; position: absolute; top: 50%; transform: translateY(-50%); z-index: 5; }
        .courses-tab-nav-btn.prev { left: 5px; }
        .courses-tab-nav-btn.next { right: 5px; }
        .courses-tab-nav-btn img { width: 14px; height: 14px; }
        .courses-tabs-carousel { display: flex; gap: 30px; transition: transform 0.3s ease; direction: rtl; }
        .courses-tab-item { min-width: 199px; height: 240px; background: white; border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; padding: 40px 15px; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .courses-tab-item.active { background: #138d47; }
        .courses-tab-item.active .tab-icon-wrap { background: white; }
        .courses-tab-item.active h6 { color: white; }
        .tab-icon-wrap { width: 75px; height: 75px; background: #f0f9f4; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .tab-icon-wrap img { width: 43px; height: 43px; }
        .courses-tab-item h6 { font-size: 16px; font-weight: 500; color: #333; margin: 0; text-align: center; }

        /* COURSE CARDS */
        .courses-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 60px; padding: 0 20px; animation: cardsSlideIn 0.5s ease forwards; }
        @keyframes cardsSlideIn { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        .course-card { background: white; border-radius: 20px; padding: 30px 25px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
        .course-card h4 { font-size: 26px; font-weight: 600; color: #000; margin-bottom: 26px; text-align: right; }
        .course-card-includes { font-size: 16px; color: #212529; line-height: 2; text-align: right; }
        .course-card-includes .check-icon { color: #138d47; margin-left: 8px; }
        .course-card-body { border-top: 1px dashed rgba(0,0,0,0.3); padding-top: 58px; margin-top: auto; }
        .course-card-price { font-size: 36px; font-weight: 600; color: #138d47; margin-bottom: 20px; direction: ltr; text-align: center; }
        .course-card-btn { display: block; width: fit-content; background: #f7be15; color: #1b1b1b; font-size: 16px; font-weight: 600; padding: 7px 24px; border-radius: 58px; border: none; cursor: pointer; font-family: "Readex Pro", sans-serif; transition: all 0.3s; margin: 0 auto; }
        .course-card-btn:hover { background: #e5ad0e; transform: translateY(-2px); }

        /* FOOTER */
        .ddc-footer { background: #000000; padding: 100px 0 180px; color: rgba(255,255,255,0.6); position: relative; overflow: hidden; }
        .ddc-footer-waves { position: absolute; bottom: 30px; left: 0; right: auto; width: 50%; height: 183px; pointer-events: none; overflow: hidden; display: flex; justify-content: flex-end; flex-wrap: wrap; transform: scaleX(-1); }
        .ddc-footer-waves svg:first-child { position: absolute; width: 1012px; height: 183px; }
        .ddc-footer-waves svg:last-child { position: static; width: 100%; height: 170px; }
        .ddc-footer-waves svg:last-child path { stroke-dasharray: 1180, 1180; stroke-dashoffset: 0; animation: snakeAnimate 10s linear infinite; }
        @keyframes snakeAnimate { 0% { stroke-dashoffset: 2500; } 100% { stroke-dashoffset: -2500; } }
        .ddc-footer-inner { display: flex; justify-content: space-between; align-items: flex-start; direction: rtl; }
        .ddc-footer-left { flex: 0 0 58%; max-width: 58%; display: flex; gap: 20px; justify-content: space-between; }
        .ddc-footer-right { flex: 0 0 42%; max-width: 42%; display: flex; justify-content: flex-end; align-items: center; }
        .ddc-footer-brand { flex: 0 0 auto; }
        .ddc-footer-brand > img { width: 292px; height: auto; margin-bottom: 0; }
        .ddc-footer-brand .ddc-footer-contact { margin-top: 10px; }
        .ddc-footer-brand .ddc-footer-contact p { color: white; font-size: 12px; font-weight: 600; margin-bottom: 8px; }
        .ddc-footer-social { display: flex; gap: 8px; }
        .ddc-footer-social li a { width: 42px; height: 42px; border-radius: 50%; background: #191919; border: none; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
        .ddc-footer-social li a:hover { background: #f7be15; }
        .ddc-footer-social li a img { width: 21px; height: 21px; }
        .ddc-footer-links { flex: 0 0 auto; }
        .ddc-footer-links h4 { color: white; font-size: 20px; font-weight: 600; margin-bottom: 0; }
        .ddc-footer-links ul { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
        .ddc-footer-links li a { color: rgba(255,255,255,0.6); font-size: 16px; line-height: 22px; transition: color 0.3s; }
        .ddc-footer-links li a:hover { color: #f7be15; }
        .ddc-footer-vision { flex: 0 0 auto; display: flex; align-items: flex-start; }
        .ddc-footer-vision img { width: 200px; height: auto; }
        .ddc-footer-bottom { border-top: 1px solid rgba(255,255,255,0.1); margin-top: 40px; padding-top: 20px; text-align: center; font-size: 13px; color: rgba(255,255,255,0.4); }

        /* FLOATING */
        .ddc-whatsapp { position: fixed; bottom: 30px; left: 30px; z-index: 999; width: 56px; height: 56px; background: #25d366; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.3s; }
        .ddc-whatsapp:hover { transform: scale(1.1); }
        .ddc-whatsapp svg { width: 28px; height: 28px; fill: white; }
        .ddc-back-to-top { position: fixed; bottom: 100px; left: 30px; z-index: 999; width: 50px; height: 50px; background: #f7be15; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; visibility: hidden; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .ddc-back-to-top.show { opacity: 1; visibility: visible; }
        .ddc-back-to-top:hover { transform: translateY(-3px); }

        /* MODAL POPUP */
        .course-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; animation: modalFadeIn 0.3s ease; }
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .course-modal { background: #f6f5f5; border-radius: 20px; width: 90%; max-width: 1000px; max-height: 90vh; overflow-y: auto; position: relative; animation: modalSlideIn 0.3s ease; direction: rtl; }
        @keyframes modalSlideIn { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .course-modal-close { position: absolute; top: 16px; left: 16px; width: 40px; height: 40px; border-radius: 50%; background: white; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; font-size: 20px; color: #333; transition: all 0.3s; }
        .course-modal-close:hover { background: #f0f0f0; }
        .course-modal-tabs { display: flex; border-bottom: 2px solid #e0e0e0; background: white; border-radius: 20px 20px 0 0; overflow: hidden; }
        .course-modal-tab { flex: 1; padding: 18px 20px; text-align: center; font-size: 16px; font-weight: 500; color: #666; cursor: pointer; transition: all 0.3s; border-bottom: 3px solid transparent; background: white; }
        .course-modal-tab.active { color: #138d47; border-bottom-color: #138d47; font-weight: 600; background: #f0f9f4; }
        .course-modal-tab:hover { color: #138d47; }
        .course-modal-content { padding: 40px; }
        .course-modal-overview { display: flex; gap: 40px; align-items: flex-start; }
        .course-modal-image { flex: 0 0 45%; max-width: 45%; border-radius: 16px; overflow: hidden; }
        .course-modal-image img { width: 100%; height: auto; display: block; border-radius: 16px; }
        .course-modal-text { flex: 1; }
        .course-modal-label { color: #138d47; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; }
        .course-modal-title { font-size: 22px; font-weight: 700; color: #1b1b1b; line-height: 1.5; margin-bottom: 16px; }
        .course-modal-desc { font-size: 15px; color: #555; line-height: 1.8; }
        .course-modal-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
        .course-modal-detail-item { background: white; border-radius: 12px; padding: 16px 20px; }
        .course-modal-detail-item label { font-size: 13px; color: #999; display: block; margin-bottom: 4px; }
        .course-modal-detail-item span { font-size: 18px; font-weight: 600; color: #1b1b1b; }
        .course-modal-book-btn { display: block; width: fit-content; margin: 30px auto 0; background: #138d47; color: white; font-size: 18px; font-weight: 600; padding: 12px 50px; border-radius: 58px; border: none; cursor: pointer; font-family: "Readex Pro", sans-serif; transition: all 0.3s; }
        .course-modal-book-btn:hover { background: #0f7a3c; transform: translateY(-2px); }
        @media (max-width: 768px) {
          .ddc-top-bar { display: none; }
          .ddc-navbar { top: 0 !important; padding: 10px 0 !important; background: rgba(0,0,0,0.95) !important; }
          .ddc-navbar.scrolled { padding: 10px 0 !important; }
          .ddc-navbar-brand img { height: 45px !important; }
          .ddc-nav-menu { display: none !important; }
          .ddc-nav-actions { gap: 8px !important; }
          .ddc-register-btn { font-size: 13px !important; padding: 0 14px !important; height: 36px !important; line-height: 36px !important; }
          .ddc-dropdown-menu { width: 95% !important; padding: 20px !important; top: 60px !important; }
          .ddc-dropdown-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .ddc-dropdown-item img { width: 36px !important; height: 36px !important; }
          .courses-hero { height: 350px !important; }
          .courses-hero-content h2 { font-size: 28px !important; }
          .courses-hero-content p { font-size: 14px !important; }
          .courses-tabs-wrapper { margin-top: -60px !important; }
          .courses-tabs-header { padding: 0 35px !important; }
          .courses-tabs-carousel { gap: 12px !important; }
          .courses-tab-item { min-width: 130px !important; height: 160px !important; padding: 20px 10px !important; border-radius: 14px !important; }
          .tab-icon-wrap { width: 50px !important; height: 50px !important; }
          .tab-icon-wrap img { width: 28px !important; height: 28px !important; }
          .courses-tab-item h6 { font-size: 13px !important; }
          .courses-cards { grid-template-columns: 1fr !important; gap: 16px !important; margin-top: 30px !important; padding: 0 10px !important; }
          .course-card { padding: 20px 16px !important; border-radius: 14px !important; }
          .course-card h4 { font-size: 20px !important; margin-bottom: 16px !important; }
          .course-card-includes { font-size: 14px !important; }
          .course-card-body { padding-top: 30px !important; }
          .course-card-price { font-size: 28px !important; }
          .course-modal { width: 95% !important; max-height: 95vh !important; border-radius: 14px !important; }
          .course-modal-overview { flex-direction: column !important; gap: 20px !important; }
          .course-modal-image { flex: none !important; max-width: 100% !important; }
          .course-modal-content { padding: 16px !important; }
          .course-modal-details-grid { grid-template-columns: 1fr !important; }
          .course-modal-tabs { overflow-x: auto !important; }
          .course-modal-tab { padding: 12px 10px !important; font-size: 13px !important; white-space: nowrap !important; }
          .course-modal-title { font-size: 18px !important; }
          .course-modal-desc { font-size: 14px !important; }
          .course-modal-book-btn { font-size: 16px !important; padding: 10px 30px !important; }
          .ddc-footer { padding: 40px 0 80px !important; }
          .ddc-footer-inner { flex-direction: column !important; gap: 25px !important; }
          .ddc-footer-left { flex: 1 !important; max-width: 100% !important; flex-direction: column !important; gap: 20px !important; }
          .ddc-footer-right { flex: 1 !important; max-width: 100% !important; justify-content: center !important; margin-top: 15px !important; }
          .ddc-footer-brand > img { width: 180px !important; }
          .ddc-footer-vision img { width: 130px !important; }
          .ddc-footer-waves { display: none !important; }
          .ddc-whatsapp { bottom: 20px !important; left: 15px !important; width: 48px !important; height: 48px !important; }
          .ddc-back-to-top { bottom: 80px !important; left: 15px !important; width: 42px !important; height: 42px !important; }
        }
      `}</style>

      {/* TOP BAR */}
      <div className={`ddc-top-bar ${navScrolled ? 'hidden' : ''}`}>
        <div className="ddc-container">
          <button className="ddc-lang-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            English
          </button>
        </div>
      </div>

      {/* NAVBAR */}
      <nav className={`ddc-navbar ${navScrolled ? 'scrolled' : ''}`}>
        <div className="ddc-container">
          <a className="ddc-navbar-brand" onClick={() => setLocation('/')}>
            <img src={`${DDC_CDN}/white-logo.svg`} alt="شركة دله لتعليم قيادة السيارات" />
          </a>

          <ul className="ddc-nav-menu">
            <li className="ddc-nav-item">
              <a className="ddc-nav-link" onClick={() => setLocation('/')}>من نحن</a>
            </li>
            <li className="ddc-nav-item"
                onMouseEnter={() => setProgramsDropdown(true)}
                onMouseLeave={() => setProgramsDropdown(false)}>
              <a className="ddc-nav-link">
                البرامج
                <svg viewBox="0 0 14 9"><path d="M1 1.5L7 7.5L13 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              <div className={`ddc-dropdown-menu ${programsDropdown ? 'show' : ''}`}>
                <div className="ddc-dropdown-title">برامجنا</div>
                <div className="ddc-dropdown-grid">
                  <a className="ddc-dropdown-item" onClick={() => { setActiveTab(0); setTabOffset(0); setProgramsDropdown(false); }}><img src="/images/program-temp-permit.svg" alt="" /><span>تصريح مؤقت</span></a>
                  <a className="ddc-dropdown-item" onClick={() => { setActiveTab(1); setTabOffset(0); setProgramsDropdown(false); }}><img src="/images/program-private.svg" alt="" /><span>خصوصي</span></a>
                  <a className="ddc-dropdown-item" onClick={() => { setActiveTab(2); setTabOffset(0); setProgramsDropdown(false); }}><img src="/images/program-motorcycle.svg" alt="" /><span>دراجة نارية</span></a>
                  <a className="ddc-dropdown-item" onClick={() => { setActiveTab(3); setTabOffset(0); setProgramsDropdown(false); }}><img src="/images/program-car.svg" alt="" /><span>أجرة</span></a>
                  <a className="ddc-dropdown-item" onClick={() => { setActiveTab(4); setTabOffset(0); setProgramsDropdown(false); }}><img src="/images/program-light-transport.svg" alt="" /><span>نقل خفيف</span></a>
                  <a className="ddc-dropdown-item" onClick={() => { setActiveTab(5); setTabOffset(1); setProgramsDropdown(false); }}><img src="/images/program-bus-small.svg" alt="" /><span>حافلة صغيرة</span></a>
                  <a className="ddc-dropdown-item" onClick={() => { setActiveTab(6); setTabOffset(2); setProgramsDropdown(false); }}><img src="/images/program-heavy-transport.svg" alt="" /><span>نقل ثقيل</span></a>
                  <a className="ddc-dropdown-item" onClick={() => { setActiveTab(7); setTabOffset(3); setProgramsDropdown(false); }}><img src="/images/program-bus-big.svg" alt="" /><span>حافلة كبيرة</span></a>
                  <a className="ddc-dropdown-item" onClick={() => { setActiveTab(8); setTabOffset(4); setProgramsDropdown(false); }}><img src="/images/program-road-machines.svg" alt="" /><span>اليات طرق</span></a>
                </div>
              </div>
            </li>
            <li className="ddc-nav-item">
              <a className="ddc-nav-link" onClick={() => setLocation('/')}>المرافق</a>
            </li>
            <li className="ddc-nav-item">
              <a className="ddc-nav-link" onClick={() => setLocation('/')}>الموارد</a>
            </li>
            <li className="ddc-nav-item">
              <a className="ddc-nav-link" onClick={() => setLocation('/')}>الأخبار</a>
            </li>
          </ul>

          <div className="ddc-nav-actions">
            <button className="ddc-search-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <button className="ddc-register-btn" onClick={handleRegister}>سجل الآن</button>
          </div>
        </div>
      </nav>

      {/* COURSES HERO */}
      <section className="courses-hero">
        <div className="courses-hero-content">
          <h2>دورات القيادة</h2>
          <p>برامج تدريبية شاملة تهدف لبناء الثقة وتطوير المهارات وضمان قيادة آمنة للجميع.</p>
        </div>
      </section>

      {/* COURSES TABS & CARDS */}
      <section className="courses-section">
        <div className="ddc-container">
          <div className="courses-tabs-wrapper">
            <div className="courses-tabs-header">
              <button className="courses-tab-nav-btn prev" onClick={prevTab}>
                <img src={`${DDC_CDN}/driving_left_arrow.svg`} alt="Previous" />
              </button>
              <div className="courses-tabs-carousel" style={{ transform: `translateX(${tabOffset * 229}px)` , minWidth: `${tabs.length * 229}px`}}>
                {tabs.map((tab, index) => (
                  <div key={tab.id} className={`courses-tab-item ${index === activeTab ? 'active' : ''}`} onClick={() => setActiveTab(index)}>
                    <div className="tab-icon-wrap">
                      <img src={tab.icon} alt={tab.name} />
                    </div>
                    <h6>{tab.name}</h6>
                  </div>
                ))}
              </div>
              <button className="courses-tab-nav-btn next" onClick={nextTab}>
                <img src={`${DDC_CDN}/driving_right_arrow.svg`} alt="Next" />
              </button>
            </div>

            <div className="courses-cards" key={activeTab}>
              {currentCourses.map((course, index) => (
                <div key={index} className="course-card">
                  <h4>{course.title}</h4>
                  <div className="course-card-includes">
                    <p><span className="check-icon">✓</span> يشمل:</p>
                    {course.includes.map((item, i) => (
                      <p key={i}>• {item}</p>
                    ))}
                  </div>
                  <div className="course-card-body">
                    <p className="course-card-price">SAR {course.price}</p>
                    <button className="course-card-btn" onClick={() => { const tabId = tabs[activeTab].id; const detail = courseDetails[tabId]?.[course.title]; if (detail) { setModalCourse({ ...detail, title: course.title, price: course.price }); setModalTab(0); } }}>المزيد</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ddc-footer" id="footer">
        {/* Footer Snake Animation */}
        <div className="ddc-footer-waves">
          <svg xmlns="http://www.w3.org/2000/svg" width="1012" height="183" viewBox="0 0 1012 183" fill="none">
            <path d="M492.56 13.5C480.42 13.06 468.02 13.6 455.29 15.1C415.42 19.79 372.07 33.54 314.74 59.67C290.49 70.72 262.67 76.28 232.05 76.18C205.71 76.1 177.17 71.88 147.24 63.63C85.3997 46.59 40.0896 18.74 38.1996 17.56L-0.000366211 79.15C5.66968 82.67 57.4097 114.06 128 133.5C164.13 143.45 199.07 148.55 231.84 148.65C272.98 148.78 310.99 141.03 344.81 125.61C442.34 81.16 498.44 74.88 551.79 102.42C564.72 109.1 576.35 115.49 587.59 121.67C631.9 146.04 670.17 167.09 741.05 178.18C837.7 193.3 922.83 161.88 1005.15 131.5L1191.14 66.69L1177 0L980.06 63.5C903.04 91.93 830.3 118.78 752.26 106.57C693.95 97.45 663.99 80.97 622.52 58.16C610.87 51.75 598.82 45.13 585.04 38.01C555.53 22.78 525.02 14.66 492.58 13.49L492.56 13.5Z" fill="url(#courses_footer_paint0)" fillOpacity="0.9" />
            <defs>
              <linearGradient id="courses_footer_paint0" x1="0.882136" y1="56.0891" x2="1190.02" y2="99.0692" gradientUnits="userSpaceOnUse">
                <stop stopOpacity="0" />
                <stop offset="0.2" stopColor="#07351B" stopOpacity="0.55" />
                <stop offset="0.45" stopColor="#0D6532" stopOpacity="0.85" />
                <stop offset="0.7" stopColor="#118241" stopOpacity="0.95" />
                <stop offset="1" stopColor="#138D47" />
              </linearGradient>
            </defs>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="916" height="170" viewBox="0 0 916 170" fill="none">
            <path d="M454.669 156.31C443.519 156.71 432.119 156.22 420.429 154.84C383.799 150.53 343.979 137.9 291.309 113.9C269.029 103.75 243.469 98.6402 215.339 98.7302C191.139 98.8002 164.919 102.68 137.419 110.26C80.6092 125.91 38.9893 151.5 37.2393 152.59L2.13916 96.0102C7.34916 92.7802 54.8792 63.9402 119.729 46.0802C152.919 36.9402 185.019 32.2502 215.129 32.1602C252.929 32.0402 287.839 39.1602 318.919 53.3202C408.519 94.1602 460.059 99.9302 509.069 74.6302C520.949 68.5002 531.629 62.6202 541.959 56.9402C582.669 34.5502 617.819 15.2102 682.949 5.02018C771.749 -8.86982 849.949 19.9902 925.579 47.9102L1096.45 107.45L1083.46 168.72L902.529 110.38C831.769 84.2602 764.939 59.5902 693.249 70.8102C639.679 79.1902 612.149 94.3302 574.059 115.28C563.359 121.17 552.289 127.25 539.629 133.79C512.519 147.78 484.489 155.24 454.689 156.32L454.669 156.31Z" stroke="url(#courses_footer_paint1)" strokeOpacity="0.5" strokeWidth="1.96" strokeMiterlimit="10" fill="none" />
            <defs>
              <linearGradient id="courses_footer_paint1" x1="4.37915" y1="48.1502" x2="1095.79" y2="130.47" gradientUnits="userSpaceOnUse">
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
                  <li><a onClick={() => setLocation('/')}>من نحن</a></li>
                  <li><a onClick={() => setLocation('/')}>السلامة على الطرق</a></li>
                  <li><a onClick={() => setLocation('/')}>الأخبار</a></li>
                  <li><a>الخصوصية وملفات تعريف الارتباط</a></li>
                  <li><a>الأسئلة الشائعة</a></li>
                  <li><a>الشروط والأحكام</a></li>
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

      {/* COURSE MODAL */}
      {modalCourse && (
        <div className="course-modal-overlay" onClick={() => setModalCourse(null)}>
          <div className="course-modal" onClick={(e) => e.stopPropagation()}>
            <button className="course-modal-close" onClick={() => setModalCourse(null)}>✕</button>
            <div className="course-modal-tabs">
              <div className={`course-modal-tab ${modalTab === 0 ? 'active' : ''}`} onClick={() => setModalTab(0)}>نبذة عن الدورة</div>
              <div className={`course-modal-tab ${modalTab === 1 ? 'active' : ''}`} onClick={() => setModalTab(1)}>تفاصيل الدورة</div>
            </div>
            <div className="course-modal-content">
              {modalTab === 0 ? (
                <div className="course-modal-overview">
                  <div className="course-modal-image">
                    <img src={modalCourse.overviewImage} alt="نبذة عن الدورة" />
                  </div>
                  <div className="course-modal-text">
                    <div className="course-modal-label">نبذة عن الدورة</div>
                    <h3 className="course-modal-title">{modalCourse.overviewTitle}</h3>
                    <p className="course-modal-desc">{modalCourse.overviewDesc}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="course-modal-overview">
                    <div className="course-modal-image">
                      <img src={modalCourse.detailsImage} alt="تفاصيل الدورة" />
                    </div>
                    <div className="course-modal-text">
                      <div className="course-modal-label">تفاصيل الدورة</div>
                      <p className="course-modal-desc">{modalCourse.detailsDesc}</p>
                      <div className="course-modal-details-grid">
                        <div className="course-modal-detail-item">
                          <label>نوع الدورة</label>
                          <span>{modalCourse.courseType}</span>
                        </div>
                        <div className="course-modal-detail-item">
                          <label>مدة الدورة</label>
                          <span>{modalCourse.courseDuration}</span>
                        </div>
                        <div className="course-modal-detail-item">
                          <label>سعر الدورة</label>
                          <span>{modalCourse.coursePricing}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <button className="course-modal-book-btn" onClick={() => { const name = modalCourse?.title || ''; const price = modalCourse?.price || modalCourse?.coursePricing?.replace(/[^0-9.]/g, '') || ''; setModalCourse(null); handleRegister(name, price); }}>احجز الآن</button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING */}
      <a className="ddc-whatsapp" href={`https://wa.me/${whatsappNumber.replace(/\D/g, '') || '966'}`} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
      <div className={`ddc-back-to-top ${showBackToTop ? 'show' : ''}`} onClick={scrollToTop}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
      </div>
    </div>
  );
};

export default DrivingCourses;
