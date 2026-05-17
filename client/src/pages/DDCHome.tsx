import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { socket } from "@/lib/store";

const DDC_CDN = 'https://www.ddc.sa/themes/ddc/assets/images';
const DDC_UPLOADS = 'https://www.ddc.sa/uploads/image';

const DDCHome = () => {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [licenseIndex, setLicenseIndex] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [programsDropdown, setProgramsDropdown] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({ stat1: 0, stat2: 0, stat3: 0 });
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const track1Ref = useRef<HTMLDivElement>(null);
  const track2Ref = useRef<HTMLDivElement>(null);

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

  // Marquee animation using requestAnimationFrame - guaranteed continuous loop
  useEffect(() => {
    let animId: number;
    let pos1 = 0;
    let pos2 = 0;
    const speed = 0.5; // pixels per frame

    const animate = () => {
      if (track1Ref.current && track2Ref.current) {
        const singleSetWidth = 256 * 6; // width of one set of 6 partners (240px + 16px margin)
        
        pos1 -= speed;
        pos2 += speed;
        
        // Reset position when one full set has scrolled
        if (pos1 <= -singleSetWidth) pos1 += singleSetWidth;
        if (pos2 >= 0) pos2 -= singleSetWidth;
        
        track1Ref.current.style.transform = `translateX(${pos1}px)`;
        track2Ref.current.style.transform = `translateX(${pos2}px)`;
      }
      animId = requestAnimationFrame(animate);
    };
    
    pos2 = -256 * 6; // start track2 offset
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const heroSlides = [
    {
      image: `${DDC_UPLOADS}/sliders/18_1761022781.jpg`,
      title: 'خطوتك الأولى للقيادة بثقة',
      subtitle: 'مدرسة القيادة الأولى في السعودية، تجمع بين أحدث التجهيزات وخبرة المدربين.',
      cta: 'احصل على رخصتك اليوم'
    },
    {
      image: `${DDC_UPLOADS}/sliders/22_1761022783_1761572058.jpg`,
      title: 'طريقك للقيادة بثقة',
      subtitle: 'مدرسة القيادة الأولى في السعودية، تجمع بين أحدث التجهيزات وخبرة المدربين.',
      cta: 'احصل على الترخيص الخاص'
    }
  ];

  const licenseTypes = [
    { name: 'حافلة صغيرة', tabId: 'small-bus', image: `${DDC_UPLOADS}/courses/690ca2ce1aed6.jpg` },
    { name: 'نقل ثقيل', tabId: 'heavy-transport', image: `${DDC_UPLOADS}/courses/695a21d4d6bfa.jpg` },
    { name: 'حافلة كبيرة', tabId: 'big-bus', image: `${DDC_UPLOADS}/courses/68ee5bada0ea8.png` },
    { name: 'اليات طرق', tabId: 'road-machines', image: `${DDC_UPLOADS}/courses/690ca24b7050a.jpg` },
    { name: 'تصريح مؤقت', tabId: 'temporary-permit', image: `${DDC_UPLOADS}/courses/690ca20634db0.jpg` },
    { name: 'خصوصي', tabId: 'private', image: `${DDC_UPLOADS}/courses/690ca2229faf9.jpg` },
    { name: 'دراجة نارية', tabId: 'motorcycle', image: `${DDC_UPLOADS}/courses/690ca1cd900da.jpg` },
    { name: 'أجرة', tabId: 'taxi', image: `${DDC_UPLOADS}/courses/696ca4857a398.jpg` },
    { name: 'نقل خفيف', tabId: 'light-transport', image: `${DDC_UPLOADS}/courses/692fee600dd52.jpg` },
  ];

  const tickerItems = [
    { name: 'حافلة صغيرة', icon: `${DDC_UPLOADS}/courses/6902ff17c878b.svg` },
    { name: 'نقل ثقيل', icon: `${DDC_UPLOADS}/courses/68fb1da417517.svg` },
    { name: 'حافلة كبيرة', icon: `${DDC_UPLOADS}/courses/68fb1d5fb516f.svg` },
    { name: 'اليات طرق', icon: `${DDC_UPLOADS}/courses/68d3edf547829.svg` },
    { name: 'تصريح مؤقت', icon: `${DDC_UPLOADS}/courses/68fb1d9673dd1.svg` },
    { name: 'خصوصي', icon: `${DDC_UPLOADS}/courses/68d66ed27f4d6.svg` },
    { name: 'دراجة نارية', icon: `${DDC_UPLOADS}/courses/68fb1d885f0b4.svg` },
    { name: 'أجرة', icon: `${DDC_UPLOADS}/courses/68d66e89beea6.svg` },
    { name: 'نقل خفيف', icon: `${DDC_UPLOADS}/courses/68f8cf412fedc.svg` },
  ];

  const partners = [
    '/images/partner-tga.png',
    '/images/partner-orig-01.png',
    '/images/partner-orig-02.png',
    '/images/partner-orig-03.png',
    '/images/partner-orig-04.png',
    '/images/partner-orig-05.png',
  ];



  useEffect(() => {
    if (socket.value) {
      socket.value.emit("page:visit", { page: "ddc-home", timestamp: new Date().toISOString() });
    }
  }, []);

  // Hero slider auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll events
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      setNavScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stats counter animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !statsVisible) {
          setStatsVisible(true);
          const duration = 2000;
          const steps = 60;
          const targets = { stat1: 1000000, stat2: 500, stat3: 400 };
          let step = 0;
          const interval = setInterval(() => {
            step++;
            const progress = step / steps;
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedStats({
              stat1: Math.floor(targets.stat1 * eased),
              stat2: Math.floor(targets.stat2 * eased),
              stat3: Math.floor(targets.stat3 * eased),
            });
            if (step >= steps) clearInterval(interval);
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [statsVisible]);

  const nextLicense = () => setLicenseIndex((prev) => (prev + 1) % licenseTypes.length);
  const prevLicense = () => setLicenseIndex((prev) => (prev - 1 + licenseTypes.length) % licenseTypes.length);

  // Auto-scroll license carousel to the right every 3 seconds
  useEffect(() => {
    const autoScroll = setInterval(() => {
      setLicenseIndex((prev) => (prev + 1) % licenseTypes.length);
    }, 3000);
    return () => clearInterval(autoScroll);
  }, []);
  const handleRegister = () => setLocation('/driving-courses');
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const visibleLicenses = () => {
    const items = [];
    for (let i = 0; i < 4; i++) {
      items.push(licenseTypes[(licenseIndex + i) % licenseTypes.length]);
    }
    return items;
  };

  const formatNumber = (num: number) => num.toLocaleString('en-US');

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

        /* HERO */
        .ddc-hero { position: relative; width: 100%; height: 100vh; min-height: 700px; overflow: hidden; }
        .ddc-hero-slide { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0; transition: opacity 1s ease-in-out; }
        .ddc-hero-slide.active { opacity: 1; }
        .ddc-hero-slide::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to left, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 60%, transparent 100%); }
        .ddc-hero-content { position: absolute; top: 50%; transform: translateY(-50%); width: 100%; max-width: 1200px; padding: 0 15px; right: 0; left: 0; margin: 0 auto; z-index: 5; }
        .ddc-hero-text { max-width: 650px; }
        .ddc-hero-text h2 { font-size: 72px; font-weight: 600; color: white; margin: 0 0 15px; line-height: 1.18; text-align: right; }
        .ddc-hero-text p { font-size: 20px; font-weight: 400; color: white; margin: 0 0 34px; line-height: 1.6; text-align: right; }
        .ddc-hero-cta { display: inline-block; background: #f7be15; color: #1b1b1b; font-size: 16px; font-weight: 600; padding: 0 24px; border-radius: 58px; line-height: 42px; font-family: "Readex Pro", sans-serif; transition: all 0.3s; cursor: pointer; border: none; }
        .ddc-hero-cta:hover { background: #e5ad0e; transform: translateY(-2px); }
        .ddc-hero-waves { position: absolute; bottom: 60px; left: 0; width: 60%; height: 200px; z-index: 4; pointer-events: none; overflow: visible; display: flex; justify-content: flex-end; flex-wrap: wrap; transform: scaleX(-1); }
        .ddc-hero-waves svg:first-child { position: absolute; width: 943px; height: 183px; }
        .ddc-hero-waves svg:last-child { position: static; width: 100%; height: 150px; }
        .ddc-hero-waves svg:last-child path { stroke-dasharray: 1180, 1180; stroke-dashoffset: 0; animation: snakeAnimate 10s linear infinite; }
        .ddc-hero-dashed { display: none; }
        .ddc-hero-nav { position: absolute; bottom: 40px; left: 40px; display: flex; align-items: center; gap: 16px; z-index: 10; direction: ltr; }
        .ddc-hero-nav-btn { width: 44px; height: 44px; border-radius: 50%; border: 2px solid #f7be15; background: transparent; color: #f7be15; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; font-size: 22px; }
        .ddc-hero-nav-btn:hover { background: #f7be15; color: #1b1b1b; }
        .ddc-hero-counter { display: flex; align-items: center; gap: 12px; color: white; font-size: 16px; font-weight: 500; direction: ltr; }
        .ddc-hero-counter-line { width: 60px; height: 2px; background: rgba(255,255,255,0.3); position: relative; overflow: hidden; }
        .ddc-hero-counter-line::after { content: ''; position: absolute; top: 0; left: 0; height: 100%; background: #f7be15; transition: width 5s linear; }
        .ddc-hero-counter-line.slide-0::after { width: 50%; }
        .ddc-hero-counter-line.slide-1::after { width: 100%; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .ddc-hero-slide.active .ddc-hero-text h2 { animation: fadeInUp 0.8s ease forwards; }
        .ddc-hero-slide.active .ddc-hero-text p { animation: fadeInUp 0.8s ease 0.15s forwards; opacity: 0; }
        .ddc-hero-slide.active .ddc-hero-cta { animation: fadeInUp 0.8s ease 0.3s forwards; opacity: 0; }

        /* TICKER */
        .ddc-ticker { background: white; padding: 20px 0; overflow: hidden; border-bottom: 1px solid #eee; }
        .ddc-ticker-track { display: flex; animation: tickerScroll 30s linear infinite; width: max-content; direction: rtl; }
        .ddc-ticker-item { display: flex; align-items: center; gap: 10px; padding: 0 30px; white-space: nowrap; color: #333; font-size: 15px; font-weight: 500; }
        .ddc-ticker-item img { width: 28px; height: 28px; }
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(50%); } }

        /* ABOUT */
        .ddc-about { padding: 120px 0; background: white; position: relative; overflow: hidden; }
        .ddc-about-top { max-width: 1089px; margin-bottom: 0; }
        .ddc-section-subtitle { font-size: 22px; font-weight: 500; color: #138d47; margin: 0 0 10px; line-height: 1.2; text-transform: uppercase; }
        .ddc-section-title { font-size: 32px; font-weight: 600; color: #141414; margin: 0 0 6px; line-height: 1.3; }
        .ddc-about-desc { font-size: 18px; font-weight: 400; color: #4f4f4f; line-height: 1.77; margin: 0 0 69px; }
        .ddc-about-row { display: flex; align-items: center; max-width: 1089px; gap: 60px; direction: rtl; }
        .ddc-about-image { flex: 0 0 50%; max-width: 50%; }
        .ddc-about-image-wrap { overflow: hidden; border-radius: 20px; }
        .ddc-about-image-wrap img { width: 100%; max-width: 100%; transition: 0.6s ease-in-out; display: block; }
        .ddc-about-image-wrap img:hover { transform: scale(1.1); }
        .ddc-about-stats-col { flex: 0 0 50%; max-width: 50%; }
        .ddc-stats { display: flex; flex-direction: column; gap: 0; }
        .ddc-stat-item { display: flex; align-items: center; gap: 26px; margin-bottom: 62px; direction: rtl; }
        .ddc-stat-item:last-child { margin-bottom: 0; }
        .ddc-stat-icon { width: 89px; height: 89px; min-width: 89px; background: rgba(137, 198, 163, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: 1s ease-in-out; position: relative; z-index: 1; }
        .ddc-stat-icon:hover { background: #f7be15; }
        .ddc-stat-icon img { width: 89px; height: 89px; }
        .ddc-stat-info { text-align: start; }
        .ddc-stat-number { font-size: 32px; font-weight: 700; color: rgb(33, 37, 41); line-height: 38px; }
        .ddc-stat-label { font-size: 19px; color: rgb(33, 37, 41); margin-top: 4px; }
        .ddc-about-waves { position: absolute; bottom: 13%; left: 0; right: auto; width: 632px; height: 204px; pointer-events: none; overflow: hidden; display: flex; justify-content: flex-end; flex-wrap: wrap; transform: rotate(180deg); }
        .ddc-about-waves svg { position: relative; }
        .ddc-about-waves svg:first-child { position: absolute; }
        @keyframes snakeAnimate { 0% { stroke-dashoffset: 2500; } 100% { stroke-dashoffset: -2500; } }
        .ddc-about-waves svg:last-child path { stroke-dasharray: 1180, 1180; stroke-dashoffset: 0; animation: snakeAnimate 10s linear infinite; }

        /* LICENSE */
        .ddc-license { padding: 80px 0; background: #f9f8f8; }
        .ddc-license-header { position: relative; text-align: right; margin-bottom: 0; }
        .ddc-license-header .ddc-section-subtitle { font-size: 20px; font-weight: 500; color: #138d47; text-align: right; }
        .ddc-license-header .ddc-section-title { font-size: 32px; font-weight: 600; color: #141414; margin: 8px 0; text-align: right; }
        .ddc-license-header p { font-size: 16px; color: #4f4f4f; margin: 10px 0 0; text-align: right; }
        .ddc-license-arrows { position: absolute; top: 0; left: 0; display: flex; gap: 20px; align-items: center; }
        .ddc-license-arrow-btn { background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.3s; }
        .ddc-license-arrow-btn:hover { opacity: 1; }
        .ddc-license-carousel { position: relative; margin-top: 50px; }
        .ddc-license-grid { display: flex; gap: 20px; overflow: hidden; transition: transform 0.5s ease; }
        .ddc-license-card { flex: 0 0 calc(25% - 15px); background: white; border-radius: 15px; cursor: pointer; transition: all 0.3s; padding: 12px; position: relative; overflow: hidden; }
        .ddc-license-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: #f5c518; border-radius: 0 0 15px 15px; opacity: 0; transition: opacity 0.3s; z-index: 0; }
        .ddc-license-card:hover::after { opacity: 1; }
        .ddc-license-card:hover { transform: scale(1.05); box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 2; }
        .ddc-license-card img { width: 100%; height: 285px; object-fit: cover; border-radius: 15px; display: block; position: relative; z-index: 1; }
        .ddc-license-card-content { padding: 12px 4px 4px; display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
        .ddc-license-card h5 { font-size: 16px; font-weight: 600; color: #4f4f4f; margin: 0; }
        .ddc-license-card .card-arrow { color: #138d47; font-size: 20px; display: flex; align-items: center; }

        /* PROCESS */
        .ddc-process { padding: 80px 0; background: #fafaf5; }
        .ddc-process-header { text-align: right; margin-bottom: 40px; }
        .ddc-process-header .ddc-section-subtitle, .ddc-process-header .ddc-section-title, .ddc-process-header p { text-align: right; }
        .ddc-process-header p { font-size: 16px; color: #4f4f4f; margin: 10px 0 0; max-width: 700px; line-height: 1.77; }
        .ddc-process-content { display: flex; gap: 40px; align-items: stretch; direction: rtl; }
        .ddc-process-cards { flex: 1; display: flex; flex-direction: column; gap: 16px; order: 1; }
        .ddc-process-image { flex: 0 0 45%; position: relative; order: 2; }
        .ddc-process-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
        .ddc-process-card { background: white; border-radius: 12px; padding: 24px 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .ddc-process-card.green { background: #138d47; color: white; }
        .ddc-process-card h4 { font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #141414; }
        .ddc-process-card.green h4 { color: white; }
        .ddc-process-card p, .ddc-process-card li { font-size: 15px; line-height: 1.8; color: #4f4f4f; }
        .ddc-process-card.green p, .ddc-process-card.green li { color: rgba(255,255,255,0.9); }
        .ddc-process-card ul { list-style: disc; padding-right: 20px; }
        .ddc-process-card { cursor: pointer; transition: all 0.3s ease; }
        .ddc-process-card:hover { background: #138d47; color: white; }
        .ddc-process-card:hover h4 { color: white; }
        .ddc-process-card:hover p, .ddc-process-card:hover li { color: rgba(255,255,255,0.9); }

        /* PARTNERS */
        .ddc-partners { padding: 80px 0; background: #f9f9f9; overflow: hidden; }
        .ddc-partners-header { text-align: center; margin-bottom: 40px; }
        .ddc-partners-header .ddc-section-subtitle, .ddc-partners-header .ddc-section-title, .ddc-partners-header p { text-align: center; }
        .ddc-partners-header p { font-size: 16px; color: #4f4f4f; margin: 10px 0 0; }
        .ddc-partners-carousel { width: 100vw; position: relative; left: 50%; right: 50%; margin-left: -50vw; margin-right: -50vw; overflow: hidden; padding: 10px 0; direction: ltr; }
        .ddc-partners-track { display: flex; margin-bottom: 16px; width: max-content; will-change: transform; }
        .ddc-partner-logo { flex-shrink: 0; width: 280px; height: 160px; margin-right: 16px; display: inline-flex; align-items: center; justify-content: center; padding: 8px; background: #ffffff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .ddc-partner-logo img { max-width: 95%; max-height: 95%; object-fit: contain; display: block; }

        /* FOOTER */
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
        .ddc-whatsapp { position: fixed; bottom: 24px; left: 24px; width: 56px; height: 56px; background: #25d366; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(37,211,102,0.4); z-index: 999; transition: transform 0.3s; }
        .ddc-whatsapp:hover { transform: scale(1.1); }
        .ddc-whatsapp svg { width: 30px; height: 30px; fill: white; }
        .ddc-back-to-top { position: fixed; bottom: 90px; left: 24px; width: 44px; height: 44px; background: #f7be15; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 999; opacity: 0; transform: translateY(20px); transition: all 0.3s; box-shadow: 0 4px 12px rgba(247,190,21,0.3); }
        .ddc-back-to-top.show { opacity: 1; transform: translateY(0); }
        .ddc-back-to-top:hover { transform: translateY(-3px); }

        @media (max-width: 768px) {
          .ddc-hero-text h2 { font-size: 36px; }
          .ddc-hero-text p { font-size: 16px; }
          .ddc-about-row { flex-direction: column; gap: 40px; }
          .ddc-about-image { flex: 1; max-width: 100%; }
          .ddc-about-stats-col { flex: 1; max-width: 100%; }
          .ddc-stats { flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 20px; }
          .ddc-stat-item { flex-direction: column; text-align: center; gap: 10px; margin-bottom: 0; flex: 0 0 calc(33% - 15px); }
          .ddc-stat-icon { width: 60px; height: 60px; min-width: 60px; }
          .ddc-stat-icon img { width: 60px; height: 60px; }
          .ddc-stat-info { text-align: center; }
          .ddc-stat-number { font-size: 18px; line-height: 24px; min-width: 90px; font-variant-numeric: tabular-nums; }
          .ddc-stat-label { font-size: 13px; }
          .ddc-license-grid { flex-wrap: wrap; }
          .ddc-license-card { flex: 0 0 calc(50% - 10px); }
          .ddc-process-content { flex-direction: column; }
          .ddc-process-cards { order: 1; }
          .ddc-process-image { order: 2; flex: 1; }
          .ddc-footer-inner { flex-direction: column; }
          .ddc-nav-menu { display: none; }
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
          <a className="ddc-navbar-brand" onClick={scrollToTop}>
            <img src={`${DDC_CDN}/white-logo.svg`} alt="شركة دله لتعليم قيادة السيارات" />
          </a>

          <ul className="ddc-nav-menu">
            <li className="ddc-nav-item">
              <a className="ddc-nav-link" href="#about">من نحن</a>
            </li>
            <li className="ddc-nav-item"
                onMouseEnter={() => setProgramsDropdown(true)}
                onMouseLeave={() => setProgramsDropdown(false)}>
              <a className="ddc-nav-link" href="#license">
                البرامج
                <svg viewBox="0 0 14 9"><path d="M1 1.5L7 7.5L13 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              <div className={`ddc-dropdown-menu ${programsDropdown ? 'show' : ''}`}>
                <div className="ddc-dropdown-title">برامجنا</div>
                <div className="ddc-dropdown-grid">
                  <a className="ddc-dropdown-item" onClick={() => setLocation('/driving-courses#temporary-permit')}><img src="/images/program-temp-permit.svg" alt="" /><span>تصريح مؤقت</span></a>
                  <a className="ddc-dropdown-item" onClick={() => setLocation('/driving-courses#private')}><img src="/images/program-private.svg" alt="" /><span>خصوصي</span></a>
                  <a className="ddc-dropdown-item" onClick={() => setLocation('/driving-courses#motorcycle')}><img src="/images/program-motorcycle.svg" alt="" /><span>دراجة نارية</span></a>
                  <a className="ddc-dropdown-item" onClick={() => setLocation('/driving-courses#taxi')}><img src="/images/program-car.svg" alt="" /><span>أجرة</span></a>
                  <a className="ddc-dropdown-item" onClick={() => setLocation('/driving-courses#light-transport')}><img src="/images/program-light-transport.svg" alt="" /><span>نقل خفيف</span></a>
                  <a className="ddc-dropdown-item" onClick={() => setLocation('/driving-courses#small-bus')}><img src="/images/program-bus-small.svg" alt="" /><span>حافلة صغيرة</span></a>
                  <a className="ddc-dropdown-item" onClick={() => setLocation('/driving-courses#heavy-transport')}><img src="/images/program-heavy-transport.svg" alt="" /><span>نقل ثقيل</span></a>
                  <a className="ddc-dropdown-item" onClick={() => setLocation('/driving-courses#big-bus')}><img src="/images/program-bus-big.svg" alt="" /><span>حافلة كبيرة</span></a>
                  <a className="ddc-dropdown-item" onClick={() => setLocation('/driving-courses#road-machines')}><img src="/images/program-road-machines.svg" alt="" /><span>اليات طرق</span></a>
                </div>
              </div>
            </li>
            <li className="ddc-nav-item">
              <a className="ddc-nav-link" href="#process">المرافق</a>
            </li>
            <li className="ddc-nav-item">
              <a className="ddc-nav-link" href="#partners">الموارد</a>
            </li>
            <li className="ddc-nav-item">
              <a className="ddc-nav-link" href="#footer">الأخبار</a>
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

      {/* HERO */}
      <section className="ddc-hero">

        {heroSlides.map((slide, index) => (
          <div key={index} className={`ddc-hero-slide ${index === currentSlide ? 'active' : ''}`} style={{ backgroundImage: `url(${slide.image})` }}>
            <div className="ddc-hero-content ddc-container">
              <div className="ddc-hero-text">
                <h2>{slide.title}</h2>
                <p>{slide.subtitle}</p>
                <a className="ddc-hero-cta" onClick={handleRegister}>{slide.cta}</a>
              </div>
            </div>
          </div>
        ))}
        {/* Animated waves - same as footer */}
        <div className="ddc-hero-waves">
          <svg xmlns="http://www.w3.org/2000/svg" width="1012" height="183" viewBox="0 0 1012 183" fill="none">
            <path d="M492.56 13.5C480.42 13.06 468.02 13.6 455.29 15.1C415.42 19.79 372.07 33.54 314.74 59.67C290.49 70.72 262.67 76.28 232.05 76.18C205.71 76.1 177.17 71.88 147.24 63.63C85.3997 46.59 40.0896 18.74 38.1996 17.56L-0.000366211 79.15C5.66968 82.67 57.4097 114.06 128 133.5C164.13 143.45 199.07 148.55 231.84 148.65C272.98 148.78 310.99 141.03 344.81 125.61C442.34 81.16 498.44 74.88 551.79 102.42C564.72 109.1 576.35 115.49 587.59 121.67C631.9 146.04 670.17 167.09 741.05 178.18C837.7 193.3 922.83 161.88 1005.15 131.5L1191.14 66.69L1177 0L980.06 63.5C903.04 91.93 830.3 118.78 752.26 106.57C693.95 97.45 663.99 80.97 622.52 58.16C610.87 51.75 598.82 45.13 585.04 38.01C555.53 22.78 525.02 14.66 492.58 13.49L492.56 13.5Z" fill="url(#hero_paint0_linear)" fillOpacity="0.4" />
            <defs>
              <linearGradient id="hero_paint0_linear" x1="0.882136" y1="56.0891" x2="1190.02" y2="99.0692" gradientUnits="userSpaceOnUse">
                <stop stopOpacity="0" />
                <stop offset="0.2" stopColor="#07351B" stopOpacity="0.55" />
                <stop offset="0.45" stopColor="#0D6532" stopOpacity="0.85" />
                <stop offset="0.7" stopColor="#118241" stopOpacity="0.95" />
                <stop offset="1" stopColor="#138D47" />
              </linearGradient>
            </defs>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="916" height="170" viewBox="0 0 916 170" fill="none">
            <path d="M454.669 156.31C443.519 156.71 432.119 156.22 420.429 154.84C383.799 150.53 343.979 137.9 291.309 113.9C269.029 103.75 243.469 98.6402 215.339 98.7302C191.139 98.8002 164.919 102.68 137.419 110.26C80.6092 125.91 38.9893 151.5 37.2393 152.59L2.13916 96.0102C7.34916 92.7802 54.8792 63.9402 119.729 46.0802C152.919 36.9402 185.019 32.2502 215.129 32.1602C252.929 32.0402 287.839 39.1602 318.919 53.3202C408.519 94.1602 460.059 99.9302 509.069 74.6302C520.949 68.5002 531.629 62.6202 541.959 56.9402C582.669 34.5502 617.819 15.2102 682.949 5.02018C771.749 -8.86982 849.949 19.9902 925.579 47.9102L1096.45 107.45L1083.46 168.72L902.529 110.38C831.769 84.2602 764.939 59.5902 693.249 70.8102C639.679 79.1902 612.149 94.3302 574.059 115.28C563.359 121.17 552.289 127.25 539.629 133.79C512.519 147.78 484.489 155.24 454.689 156.32L454.669 156.31Z" stroke="url(#hero_paint1_linear)" strokeOpacity="0.5" strokeWidth="1.96" strokeMiterlimit="10" fill="none" />
            <defs>
              <linearGradient id="hero_paint1_linear" x1="4.37915" y1="48.1502" x2="1095.79" y2="130.47" gradientUnits="userSpaceOnUse">
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

        <div className="ddc-hero-nav">
          <button className="ddc-hero-nav-btn" onClick={() => setCurrentSlide(prev => (prev - 1 + heroSlides.length) % heroSlides.length)}>&#8249;</button>
          <button className="ddc-hero-nav-btn" onClick={() => setCurrentSlide(prev => (prev + 1) % heroSlides.length)}>&#8250;</button>
          <div className="ddc-hero-counter">
            <span>{String(currentSlide + 1).padStart(2, '0')}</span>
            <div className={`ddc-hero-counter-line slide-${currentSlide}`} />
            <span>{String(heroSlides.length).padStart(2, '0')}</span>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ddc-ticker">
        <div className="ddc-ticker-track">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, i) => (
            <div key={i} className="ddc-ticker-item">
              <img src={item.icon} alt="" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ABOUT */}
      <section className="ddc-about" id="about">
        <div className="ddc-container">
          <div className="ddc-about-top">
            <h4 className="ddc-section-subtitle">من نحن</h4>
            <p className="ddc-about-desc">
              DDC, خبرة تمتد لأكثر من خمسين عامًا في تقديم برامج تدريب السائقين بكفاءة وموثوقية.
            </p>
          </div>
          <div className="ddc-about-row">
            <div className="ddc-about-image">
              <div className="ddc-about-image-wrap">
                <img src={`${DDC_UPLOADS}/blockimages/ABOUTUS-FINAL-02%20(2)_20251106141410.jpg`} alt="DDC Training" />
              </div>
            </div>
            <div className="ddc-about-stats-col">
              <div className="ddc-stats" ref={statsRef}>
                <div className="ddc-stat-item">
                  <div className="ddc-stat-icon">
                    <img src="/images/icon-license.svg" alt="" />
                  </div>
                  <div className="ddc-stat-info">
                    <div className="ddc-stat-number">+{formatNumber(animatedStats.stat1)}</div>
                    <div className="ddc-stat-label">رخصة قيادة</div>
                  </div>
                </div>
                <div className="ddc-stat-item">
                  <div className="ddc-stat-icon">
                    <img src="/images/icon-employees.svg" alt="" />
                  </div>
                  <div className="ddc-stat-info">
                    <div className="ddc-stat-number">{formatNumber(animatedStats.stat2)}+</div>
                    <div className="ddc-stat-label">موظف</div>
                  </div>
                </div>
                <div className="ddc-stat-item">
                  <div className="ddc-stat-icon">
                    <img src="/images/icon-vehicles.svg" alt="" />
                  </div>
                  <div className="ddc-stat-info">
                    <div className="ddc-stat-number">{formatNumber(animatedStats.stat3)}+</div>
                    <div className="ddc-stat-label">مركبة تدريب</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Animated Snake Lines */}
        <div className="ddc-about-waves">
          <svg xmlns="http://www.w3.org/2000/svg" width="943" height="183" viewBox="0 0 943 183" fill="none">
            <path d="M493.422 13.5732C481.281 13.1332 468.881 13.6732 456.151 15.1732C416.281 19.8632 372.931 33.6132 315.601 59.7432C291.351 70.7932 263.531 76.3532 232.911 76.2532C206.571 76.1732 178.031 71.9532 148.101 63.7031C86.2615 46.6631 40.9514 18.8131 39.0614 17.6331L0.861443 79.2231C6.53149 82.7431 58.2715 114.133 128.861 133.573C164.991 143.523 199.931 148.623 232.701 148.723C273.841 148.853 311.851 141.103 345.671 125.683C443.202 81.2332 499.301 74.9532 552.651 102.493C565.581 109.173 577.211 115.563 588.451 121.743C632.761 146.113 671.031 167.163 741.911 178.253C838.561 193.373 923.691 161.953 1006.01 131.573L1192 66.7632L1177.86 0.073241L980.921 63.5732C903.901 92.0032 831.161 118.853 753.121 106.643C694.811 97.5232 664.851 81.0432 623.381 58.2332C611.731 51.8232 599.681 45.2032 585.901 38.0832C556.391 22.8532 525.881 14.7332 493.441 13.5632L493.422 13.5732Z" fill="url(#paint0_linear_7277_3565)" fillOpacity="0.5" />
            <defs>
              <linearGradient id="paint0_linear_7277_3565" x1="1.74395" y1="56.1623" x2="1190.88" y2="99.1425" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0" />
                <stop offset="0.202294" stopColor="white" stopOpacity="0.38" />
                <stop offset="0.63" stopColor="#0D6532" stopOpacity="0.72" />
                <stop offset="0.86" stopColor="#118241" stopOpacity="0.92" />
                <stop offset="1" stopColor="#138D47" />
              </linearGradient>
            </defs>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="840" height="171" viewBox="0 0 840 171" fill="none">
            <path d="M454.601 156.383C443.451 156.783 432.051 156.293 420.361 154.913C383.731 150.603 343.911 137.973 291.241 113.973C268.961 103.823 243.401 98.7132 215.271 98.8032C191.071 98.8732 164.851 102.753 137.351 110.333C80.5414 125.983 38.9215 151.573 37.1715 152.663L2.0714 96.0832C7.2814 92.8532 54.8115 64.0132 119.661 46.1532C152.851 37.0132 184.951 32.3232 215.061 32.2332C252.861 32.1132 287.771 39.2332 318.851 53.3932C408.451 94.2332 459.991 100.003 509.001 74.7032C520.881 68.5732 531.561 62.6932 541.891 57.0132C582.601 34.6232 617.752 15.2833 682.881 5.09326C771.682 -8.79673 849.882 20.0633 925.512 47.9833L1096.38 107.523L1083.39 168.793L902.461 110.453C831.701 84.3333 764.871 59.6633 693.181 70.8833C639.611 79.2633 612.081 94.4033 573.991 115.353C563.291 121.243 552.222 127.323 539.562 133.863C512.452 147.853 484.421 155.313 454.621 156.393L454.601 156.383Z" stroke="url(#paint0_linear_7277_3564)" strokeOpacity="0.5" strokeWidth="1.96" strokeMiterlimit="10" fill="none" />
            <defs>
              <linearGradient id="paint0_linear_7277_3564" x1="4.31139" y1="48.2232" x2="1095.72" y2="130.543" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0" />
                <stop offset="0.139323" stopColor="white" stopOpacity="0.18" />
                <stop offset="0.289108" stopColor="#624B08" stopOpacity="0.4" />
                <stop offset="0.400695" stopColor="#8F6E0C" stopOpacity="0.58" />
                <stop offset="0.49" stopColor="#B48B0F" stopOpacity="0.73" />
                <stop offset="0.62" stopColor="#D1A111" stopOpacity="0.85" />
                <stop offset="0.75" stopColor="#E6B113" stopOpacity="0.93" />
                <stop offset="0.88" stopColor="#F2BA14" stopOpacity="0.98" />
                <stop offset="1" stopColor="#F7BE15" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </section>

      {/* LICENSE */}
      <section className="ddc-license" id="license">
        <div className="ddc-container">
          <div className="ddc-license-header">
            <h4 className="ddc-section-subtitle">أختر نوع الرخصة</h4>
            <h3 className="ddc-section-title">خطوة واحدة تفصلك عن رخصة قيادتك</h3>
            <p>اختر نوع الرخصة التي تناسبك، وسنوجهك بكل احترافية واهتمام</p>
            <div className="ddc-license-arrows">
              <button className="ddc-license-arrow-btn" onClick={prevLicense} aria-label="Previous">
                <svg width="28" height="23" viewBox="0 0 28 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M27 11.5H1M1 11.5L11.5 1M1 11.5L11.5 22" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="ddc-license-arrow-btn" onClick={nextLicense} aria-label="Next">
                <svg width="28" height="23" viewBox="0 0 28 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 11.5H27M27 11.5L16.5 1M27 11.5L16.5 22" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="ddc-license-carousel">
            <div className="ddc-license-grid">
              {visibleLicenses().map((lic, i) => (
                <div key={i} className="ddc-license-card" onClick={() => setLocation(`/driving-courses#${lic.tabId}`)}>
                  <img src={lic.image} alt={lic.name} />
                  <div className="ddc-license-card-content">
                    <h5>{lic.name}</h5>
                    <span className="card-arrow">
                      <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 7H19M19 7L13 1M19 7L13 13" stroke="#138d47" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="ddc-process" id="process">
        <div className="ddc-container">
          <div className="ddc-process-header">
            <h4 className="ddc-section-subtitle">خطوات استخراج الرخصة</h4>
            <h3 className="ddc-section-title">خطوات سهلة، قيادة أمنه</h3>
            <p>ابدأ رحلتك نحو رخصة القيادة بخطوات ميسّرة تبدأ بتقييم بسيط، تليه دروس نظرية وتدريب عملي شامل، استعداداً للاختبار الرسمي للقيادة.</p>
          </div>
          <div className="ddc-process-content">
            <div className="ddc-process-cards">
              <div className={`ddc-process-card ${activeCard === 0 ? 'green' : ''}`} onMouseEnter={() => setActiveCard(0)}>
                <h4>شروط استخراج الرخص</h4>
                <ul>
                  <li>تصريح القيادة : 17 عام</li>
                  <li>رخصة القيادة : 18 عام</li>
                  <li>رخصة القيادة الخصوصي والمركبات الثقيلة : 21 عام</li>
                </ul>
              </div>
              <div className={`ddc-process-card ${activeCard === 1 ? 'green' : ''}`} onMouseEnter={() => setActiveCard(1)}>
                <h4>المستندات المطلوبة</h4>
                <p>المواطنون السعوديون: نسخة من بطاقة الهوية الوطنية سارية المفعول</p>
                <p style={{marginTop: '8px'}}>المقيمون: نسخة من إقامة سارية المفعول.</p>
              </div>
              <div className={`ddc-process-card ${activeCard === 2 ? 'green' : ''}`} onMouseEnter={() => setActiveCard(2)}>
                <h4>استلام الرخصة</h4>
                <p>بعد اجتياز الاختبار، يتم إصدار الرخصة واستلامها من إدارة المرور</p>
              </div>
            </div>
            <div className="ddc-process-image">
              <img src={`${DDC_UPLOADS}/blockimages/DDC%20_%20WEP%20EDIT%20PHOTO-05_20260104122646.jpg`} alt="License Process" />
            </div>
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="ddc-partners" id="partners">
        <div className="ddc-container">
          <div className="ddc-partners-header">
            <h4 className="ddc-section-subtitle">شركاء النجاح</h4>
            <h3 className="ddc-section-title">شراكات استراتيجية، أثر وطني</h3>
            <p>نتعاون مع جهات حكومية رائدة لدعم مسيرة التطوير والتنمية الوطنية.</p>
          </div>
          <div className="ddc-partners-carousel">
            <div className="ddc-partners-track" ref={track1Ref}>
              {[...partners, ...partners, ...partners, ...partners, ...partners, ...partners, ...partners, ...partners].map((p, i) => (
                <div key={`r1-${i}`} className="ddc-partner-logo">
                  <img src={p} alt="Partner" />
                </div>
              ))}
            </div>
            <div className="ddc-partners-track" ref={track2Ref}>
              {[...partners, ...partners, ...partners, ...partners, ...partners, ...partners, ...partners, ...partners].map((p, i) => (
                <div key={`r2-${i}`} className="ddc-partner-logo">
                  <img src={p} alt="Partner" />
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
                  <li><a href="#about">من نحن</a></li>
                  <li><a href="#process">السلامة على الطرق</a></li>
                  <li><a href="#footer">الأخبار</a></li>
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

export default DDCHome;
