import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
    ClockIcon, 
    MegaphoneIcon, 
    ArrowRightIcon,
    DocumentTextIcon,
    HeartIcon,
    DocumentCheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import Tooltip from './Tooltip';

const TRANSLATIONS = {
    en: {
        dynamicWords: [
            'PRESERVING.',
            'PROTECTING.',
            'ARCHIVING.',
            'HONORING.',
            'SAFEGUARDING.',
            'AUTHENTICATING.'
        ],
        eyebrowOffice: 'Office of the Municipal Civil Registrar',
        eyebrowTown: 'Naic, Cavite',
        headlineTop: 'RECORDING.',
        headlineBottom: 'SERVING.',
        heroSubtitle: 'The centralized hub for authenticating and managing civil events — Births, Marriages, and Deaths — for the Municipality of Naic.',
        onlineRequestBtn: 'Online Request',
        onlineRequestTooltip: 'Start a new civil registry request online',
        announcementLabel: 'Active Announcement',
        announcementNotice: 'Notice',
        hoursLabel: 'Operating Hours',
        hoursLocation: 'Municipal Civil Registrar • Naic Hall',
        hoursTooltip: 'Official office schedule and release counter',
        pathwayBadge: 'Citizen Guide',
        pathwayTitle: 'Citizen Request Pathway',
        pathwaySubtitle: 'How civic records are requested, verified, and officially released.',
        steps: [
            {
                number: '01',
                title: 'Submit Online Request',
                desc: 'Select certificate type, enter registrant details, and receive an instant digital reference ticket with tracking QR code.'
            },
            {
                number: '02',
                title: 'Registry Verification',
                desc: 'Municipal staff examine civil registry books, authenticate document entries, and prepare official certifications.'
            },
            {
                number: '03',
                title: 'In-Person Issuance',
                desc: 'Present ticket code at the Municipal Civil Registrar counter for fee settlement and release of the certified document.'
            }
        ],
        docsBadge: 'Registry Services',
        docsTitle: 'Civil Registry Documents',
        docsSubtitle: 'Official statutory civil documents recorded and issued pursuant to Act No. 3753.',
        birthForm: 'LCR Form 102',
        birthTitle: 'Certificate of Live Birth',
        birthDesc: 'Official documentation of vital birth events within municipal jurisdiction. Supports regular registration, certified true copies, legitimation, and supplemental reports.',
        birthBtn: 'Request Birth Record',
        marriageForm: 'LCR Form 101',
        marriageTitle: 'Certificate of Marriage',
        marriageDesc: 'Certified records of marriage solemnized in Naic, marriage license endorsements, and legal civil registry transcriptions.',
        marriageBtn: 'Request Marriage Record',
        deathForm: 'LCR Form 103 • Certificate of Death',
        deathTitle: 'Vital Death Registry and Burial Endorsements',
        deathDesc: 'Immediate processing for death records, permits for transfer of cadaver, and legal archival certification.',
        deathBtn: 'Request Death Record',
        prevAnnouncement: 'Previous announcement',
        nextAnnouncement: 'Next announcement',
        langSwitchTooltip: 'Switch language between English and Filipino'
    },
    fil: {
        dynamicWords: [
            'NAGTATALA.',
            'NAG-IINGAT.',
            'NAGPOPROTEKTA.',
            'NAG-AARKIBO.',
            'NAGPAPAHALAGA.',
            'NAGLILINGKOD.'
        ],
        eyebrowOffice: 'Tanggapan ng Civil Registrar',
        eyebrowTown: 'Naic, Cavite',
        headlineTop: 'PAGTATALA.',
        headlineBottom: 'PAGLILINGKOD.',
        heroSubtitle: 'Opisyal na tanggapan para sa pagkuha at pagproseso ng Birth Certificate, Marriage Contract, at Death Certificate sa Bayan ng Naic.',
        onlineRequestBtn: 'Mag-request Online',
        onlineRequestTooltip: 'Mag-request ng dokumento online',
        announcementLabel: 'Mga Anunsyo',
        announcementNotice: 'Pabatid',
        hoursLabel: 'Oras ng Serbisyo',
        hoursLocation: 'Civil Registrar Office • Munisipyo ng Naic',
        hoursTooltip: 'Iskedyul ng opisina at pagkuha ng dokumento',
        pathwayBadge: 'Gabay sa Pag-request',
        pathwayTitle: 'Paano Kumuha ng Dokumento',
        pathwaySubtitle: 'Simpleng hakbang para mag-request, magpa-verify, at kumuha ng inyong mga dokumento.',
        steps: [
            {
                number: '01',
                title: 'Mag-fill out Online',
                desc: 'Piliin ang dokumentong kailangan, ilagay ang inyong detalye, at kunin ang digital ticket na may QR code.'
            },
            {
                number: '02',
                title: 'Pag-check ng Records',
                desc: 'Hahanapin at iche-check ng mga kawani ng munisipyo ang inyong rekord para ihanda ang opisyal na kopya.'
            },
            {
                number: '03',
                title: 'Pagkuha sa Munisipyo',
                desc: 'Ipakita ang ticket QR code sa Civil Registrar counter para magbayad at kunin ang inyong dokumento.'
            }
        ],
        docsBadge: 'Mga Serbisyo',
        docsTitle: 'Mga Dokumentong Makukuha',
        docsSubtitle: 'Mga opisyal na dokumentong sibil na inilalabas ng tanggapan.',
        birthForm: 'LCR Form 102',
        birthTitle: 'Birth Certificate (Kapanganakan)',
        birthDesc: 'Para sa kopya ng Certificate of Live Birth, certified true copy, legitimation, at late registration.',
        birthBtn: 'Kumuha ng Birth Certificate',
        marriageForm: 'LCR Form 101',
        marriageTitle: 'Marriage Contract (Kasal)',
        marriageDesc: 'Para sa kopya ng Certificate of Marriage, lisensya sa kasal, at rehistro ng kasal na ginanap sa Naic.',
        marriageBtn: 'Kumuha ng Marriage Contract',
        deathForm: 'LCR Form 103 • Death Certificate',
        deathTitle: 'Death Certificate (Kamatayan)',
        deathDesc: 'Para sa kopya ng Death Certificate, permit sa pagpapalibing, at paglilipat ng labi.',
        deathBtn: 'Kumuha ng Death Certificate',
        prevAnnouncement: 'Nakaraang anunsyo',
        nextAnnouncement: 'Susunod na anunsyo',
        langSwitchTooltip: 'Palitan ang wika sa English o Filipino'
    }
};

/** Renders the public portal landing page, announcement carousel, and service entry points. */
export default function Landing() {
    const navigate = useNavigate();

    // Bilingual Language State with LocalStorage persistence
    const [lang, setLang] = useState(() => {
        try {
            return localStorage.getItem('civicore_lang') === 'fil' ? 'fil' : 'en';
        } catch {
            return 'en';
        }
    });

    const handleLanguageChange = (newLang) => {
        setLang(newLang);
        try {
            localStorage.setItem('civicore_lang', newLang);
        } catch (e) {
            console.warn('Could not save language preference:', e);
        }
    };

    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

    const [config, setConfig] = useState(null);
    const [wordIndex, setWordIndex] = useState(0);

    // Dynamic rotating words
    useEffect(() => {
        const timer = setInterval(() => {
            setWordIndex((prev) => (prev + 1) % t.dynamicWords.length);
        }, 2800);
        return () => clearInterval(timer);
    }, [t.dynamicWords.length]);

    useEffect(() => {
        axios.get('/api/public/config')
            .then(res => setConfig(res.data))
            .catch(err => console.error(err));
    }, []);

    // Announcements Carousel State
    const [activeAnnIndex, setActiveAnnIndex] = useState(0);
    const [isAnnPaused, setIsAnnPaused] = useState(false);
    const announcements = config?.announcements || [];

    // Auto-advance carousel every 6 seconds when not hovered and multiple exist
    useEffect(() => {
        if (announcements.length <= 1 || isAnnPaused) return;

        const interval = setInterval(() => {
            setActiveAnnIndex((prev) => (prev + 1) % announcements.length);
        }, 6000);

        return () => clearInterval(interval);
    }, [announcements.length, isAnnPaused]);

    const handlePrevAnn = () => {
        setActiveAnnIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
    };

    const handleNextAnn = () => {
        setActiveAnnIndex((prev) => (prev + 1) % announcements.length);
    };

    // Animation Variants for staggered, smooth entrance
    const containerVars = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.18, delayChildren: 0.2 }
        }
    };

    const itemVars = {
        hidden: { opacity: 0, y: 22 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
        }
    };

    // Sanitize opening hours to remove raw em-dashes
    const sanitizedHours = config?.opening_hours 
        ? config.opening_hours.replace(/[\u2014\u2013]/g, '-') 
        : (lang === 'fil' ? 'Lunes - Biyernes: 8:00 AM - 5:00 PM' : 'Monday - Friday: 8:00 AM - 5:00 PM');

    const currentAnnouncement = announcements[activeAnnIndex];

    // Auto-hide bottom-right translation pill when scrolling down, show when scrolling up
    const [isLangPillVisible, setIsLangPillVisible] = useState(true);
    const lastScrollYRef = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY || window.pageYOffset || 0;
            const diff = currentScrollY - lastScrollYRef.current;

            // Only trigger if scroll delta is noticeable
            if (Math.abs(diff) > 8) {
                if (diff > 0 && currentScrollY > 60) {
                    // Scrolling down -> hide
                    setIsLangPillVisible(false);
                } else {
                    // Scrolling up -> show
                    setIsLangPillVisible(true);
                }
                lastScrollYRef.current = currentScrollY;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="relative overflow-visible pb-12 sm:pb-16 text-slate-100">
            {/* Ambient Background Lighting FX (GPU Accelerated Radial Gradients) */}
            <div className="absolute top-0 right-[-5%] w-[60%] h-[70%] bg-[radial-gradient(ellipse_at_center,rgba(212,165,116,0.12)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute top-[20%] right-[10%] w-[40%] h-[45%] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />

            {/* Hero Section */}
            <section className="pt-2 sm:pt-4 md:pt-6 pb-12 sm:pb-16 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20 z-10 relative">
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 items-center">
                    
                    {/* Left Column: Hero Title, Subtitle, and CTAs */}
                    <motion.div
                        variants={containerVars}
                        initial="hidden"
                        animate="visible"
                        className="lg:col-span-7 xl:col-span-7 w-full"
                    >
                        {/* Official Institutional Eyebrow */}
                        <motion.div variants={itemVars} className="mb-4 sm:mb-5 flex flex-wrap items-center gap-3">
                            <div className="w-1 h-5 bg-[#d4a574] rounded-full shadow-[0_0_8px_rgba(212,165,116,0.6)]" />
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm font-semibold tracking-wider uppercase">
                                <span className="text-[#d4a574]">{t.eyebrowOffice}</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-300 font-medium">{t.eyebrowTown}</span>
                            </div>
                        </motion.div>

                        {/* Main Headline with Dynamic Flip Animated Word */}
                        <motion.h1
                            variants={itemVars}
                            className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black text-white leading-[1.05] tracking-tight mb-4 sm:mb-6"
                        >
                            {t.headlineTop}<br />
                            <div className="relative block overflow-hidden h-[1.1em] my-0.5 leading-none drop-shadow-md">
                                <AnimatePresence initial={false} mode="wait">
                                    <motion.div
                                        key={t.dynamicWords[wordIndex % t.dynamicWords.length]}
                                        initial={{ y: '60%', opacity: 0 }}
                                        animate={{ y: '0%', opacity: 1 }}
                                        exit={{ y: '-60%', opacity: 0 }}
                                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                        className="absolute inset-0 flex items-center text-transparent bg-clip-text bg-gradient-to-r from-[#d4a574] via-[#f3d0a2] to-[#d4a574] font-black whitespace-nowrap"
                                    >
                                        {t.dynamicWords[wordIndex % t.dynamicWords.length]}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                            {t.headlineBottom}
                        </motion.h1>

                        <motion.div variants={itemVars} className="space-y-4 sm:space-y-6">
                            <p className="text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed font-light">
                                {t.heroSubtitle}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1 sm:pt-2">
                                <Tooltip content={t.onlineRequestTooltip} position="top">
                                    <motion.button
                                        whileHover={{ scale: 1.02, translateY: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate('/ticket-request')}
                                        className="bg-gradient-to-r from-[#d4a574] to-[#c49a67] hover:from-[#dfb17e] hover:to-[#ce9f6b] text-[#0f172a] px-8 py-4 rounded-2xl font-black shadow-xl shadow-[#d4a574]/20 transition-all uppercase tracking-[0.15em] text-xs sm:text-sm flex items-center justify-center gap-2.5 group cursor-pointer"
                                        aria-label={t.onlineRequestBtn}
                                    >
                                        <span className="leading-none">{t.onlineRequestBtn}</span>
                                        <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform stroke-[2.5] shrink-0" />
                                    </motion.button>
                                </Tooltip>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right Column: Dynamic Ambient Colors + Operating Hours & Announcements Carousel */}
                    <motion.div
                        variants={containerVars}
                        initial="hidden"
                        animate="visible"
                        className="lg:col-span-5 xl:col-span-5 w-full flex flex-col justify-center relative mt-8 lg:mt-0"
                    >
                        {/* Dynamic Ambient Color Radial Orbs */}
                        <div className="absolute -top-16 -right-8 w-72 h-72 bg-[radial-gradient(ellipse_at_center,rgba(212,165,116,0.18)_0%,transparent_70%)] pointer-events-none" />
                        <div className="absolute top-1/2 -left-12 w-64 h-64 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12)_0%,transparent_70%)] pointer-events-none" />
                        <div className="absolute -bottom-10 right-10 w-60 h-60 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08)_0%,transparent_70%)] pointer-events-none" />

                        {/* Content Container */}
                        <div className="relative z-10 space-y-4 max-w-md w-full ml-auto lg:mr-0 mr-auto">
                            
                            {/* Announcements Carousel (Top) - Translucent Rose Glass */}
                            {config === null ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl">
                                        <div className="h-2.5 w-28 bg-white/10 rounded-full mb-2.5" />
                                        <div className="h-3.5 w-full bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            ) : announcements.length > 0 ? (
                                <motion.div
                                    variants={itemVars}
                                    onMouseEnter={() => setIsAnnPaused(true)}
                                    onMouseLeave={() => setIsAnnPaused(false)}
                                    className="bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 hover:border-rose-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-xl shadow-xl shadow-rose-950/20 transition-all group"
                                >
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-400 to-rose-600" />
                                    
                                    {/* Header with Counter and Navigation Controls */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <MegaphoneIcon className="w-4 h-4 text-rose-400 shrink-0" />
                                            <span className="text-[10px] text-rose-300 font-bold uppercase tracking-widest">
                                                {t.announcementLabel}
                                            </span>
                                            {announcements.length > 1 && (
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-200 font-mono font-bold">
                                                    {activeAnnIndex + 1} / {announcements.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Carousel Controls (if multiple) */}
                                        {announcements.length > 1 && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={handlePrevAnn}
                                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-rose-300 hover:text-white transition-colors cursor-pointer"
                                                    aria-label={t.prevAnnouncement}
                                                >
                                                    <ChevronLeftIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleNextAnn}
                                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-rose-300 hover:text-white transition-colors cursor-pointer"
                                                    aria-label={t.nextAnnouncement}
                                                >
                                                    <ChevronRightIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Slide Content with AnimatePresence */}
                                    <div className="min-h-[56px] flex items-center">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={currentAnnouncement?.id || activeAnnIndex}
                                                initial={{ opacity: 0, x: 12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -12 }}
                                                transition={{ duration: 0.28, ease: 'easeOut' }}
                                                className="w-full"
                                            >
                                                <p className="text-white font-medium text-sm sm:text-base leading-relaxed break-words">
                                                    {currentAnnouncement?.message}
                                                </p>
                                                <div className="text-[10px] text-rose-300/80 mt-1.5 font-medium">
                                                    {currentAnnouncement?.created_at
                                                        ? new Date(currentAnnouncement.created_at).toLocaleDateString(lang === 'fil' ? 'fil-PH' : 'en-US', {
                                                              month: 'short',
                                                              day: 'numeric',
                                                              year: 'numeric'
                                                          })
                                                        : t.announcementNotice}
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>

                                    {/* Carousel Pagination Dots */}
                                    {announcements.length > 1 && (
                                        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-rose-500/15">
                                            {announcements.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setActiveAnnIndex(idx)}
                                                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                                        activeAnnIndex === idx
                                                            ? 'w-5 bg-rose-400'
                                                            : 'w-1.5 bg-rose-300/30 hover:bg-rose-300/60'
                                                    }`}
                                                    aria-label={`Jump to announcement ${idx + 1}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            ) : null}

                            {/* Operating Hours Card (Below) - Translucent Gold Glass */}
                            {config === null ? (
                                <div className="animate-pulse">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 backdrop-blur-xl">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-2.5 w-24 bg-white/10 rounded-full" />
                                            <div className="h-4 w-48 bg-white/10 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            ) : config?.opening_hours ? (
                                <Tooltip content={t.hoursTooltip} position="top" className="w-full">
                                    <motion.div
                                        variants={itemVars}
                                        whileHover={{ y: -2, borderColor: 'rgba(212,165,116,0.3)' }}
                                        className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/20 transition-all group relative overflow-hidden text-left"
                                    >
                                        <div className="absolute top-0 right-0 w-28 h-28 bg-[#d4a574]/10 rounded-full blur-2xl pointer-events-none" />
                                        <div className="flex items-start gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-[#d4a574]/10 border border-[#d4a574]/25 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                                <ClockIcon className="w-5 h-5 text-[#d4a574]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] text-[#d4a574] font-black uppercase tracking-[0.2em] leading-none mb-1.5">
                                                    {t.hoursLabel}
                                                </div>
                                                <div className="text-white font-semibold text-sm sm:text-base leading-snug">
                                                    {sanitizedHours}
                                                </div>
                                                <div className="text-slate-400 text-xs mt-1 font-normal">
                                                    {t.hoursLocation}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Tooltip>
                            ) : null}

                        </div>
                    </motion.div>

                </div>
            </section>

            {/* Section 2: Citizen Request Pathway (Bilingual) */}
            <section className="pt-12 pb-20 sm:pt-16 sm:pb-24 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20 relative z-10">
                <div className="absolute top-1/2 -right-12 w-64 h-64 bg-[radial-gradient(ellipse_at_center,rgba(212,165,116,0.1)_0%,transparent_70%)] pointer-events-none" />
                <div className="w-full space-y-10 relative">
                    
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25, margin: "0px 0px -40px 0px" }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-2"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-1 h-4 bg-[#d4a574] rounded-full shadow-[0_0_8px_rgba(212,165,116,0.6)]" />
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#d4a574]">
                                {t.pathwayBadge}
                            </span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                            {t.pathwayTitle}
                        </h2>
                        <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
                            {t.pathwaySubtitle}
                        </p>
                    </motion.div>

                    {/* Step Cards with Scroll Reveal */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {t.steps.map((st, sIdx) => (
                            <motion.div
                                key={st.number}
                                initial={{ opacity: 0, y: 35 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.2 }}
                                transition={{ duration: 0.65, delay: 0.1 * (sIdx + 1), ease: [0.16, 1, 0.3, 1] }}
                                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                                className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 hover:border-[#d4a574]/30 rounded-2xl p-6 sm:p-7 space-y-3 backdrop-blur-xl shadow-xl transition-all cursor-default"
                            >
                                <span className="text-xs font-mono font-bold text-[#d4a574] px-2.5 py-1 rounded-lg bg-[#d4a574]/10 border border-[#d4a574]/20 inline-block">
                                    {st.number}
                                </span>
                                <h3 className="text-lg font-bold text-white tracking-tight">
                                    {st.title}
                                </h3>
                                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                                    {st.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 3: Civil Registry Documents (Bilingual) */}
            <section className="pt-20 pb-28 sm:pt-28 sm:pb-36 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20 relative z-10">
                <div className="w-full space-y-10 relative">
                    
                    {/* Section Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25, margin: "0px 0px -40px 0px" }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-2"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-1 h-4 bg-[#d4a574] rounded-full shadow-[0_0_8px_rgba(212,165,116,0.6)]" />
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#d4a574]">
                                {t.docsBadge}
                            </span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                            {t.docsTitle}
                        </h2>
                        <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
                            {t.docsSubtitle}
                        </p>
                    </motion.div>

                    {/* Asymmetric Bento Grid matching original translucent glass cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
                        
                        {/* Birth Certificate (Featured Wide Tile: 7 cols) */}
                        <motion.div
                            initial={{ opacity: 0, y: 35 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -3, transition: { duration: 0.2 } }}
                            className="lg:col-span-7 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 hover:border-[#d4a574]/40 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all backdrop-blur-xl shadow-xl group cursor-default"
                        >
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-bold text-[#d4a574] uppercase tracking-wider block mb-1">
                                        {t.birthForm}
                                    </span>
                                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                        {t.birthTitle}
                                    </h3>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                                    {t.birthDesc}
                                </p>
                            </div>
                            <div className="pt-6">
                                <Tooltip content={t.birthBtn} position="top">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/ticket-request')}
                                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d4a574] hover:text-[#e4be95] group-hover:translate-x-1 transition-all cursor-pointer"
                                    >
                                        <span>{t.birthBtn}</span>
                                        <ArrowRightIcon className="w-3.5 h-3.5" />
                                    </button>
                                </Tooltip>
                            </div>
                        </motion.div>

                        {/* Marriage Certificate (Compact Tile: 5 cols) */}
                        <motion.div
                            initial={{ opacity: 0, y: 35 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -3, transition: { duration: 0.2 } }}
                            className="lg:col-span-5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 hover:border-[#d4a574]/40 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all backdrop-blur-xl shadow-xl group cursor-default"
                        >
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-bold text-[#d4a574] uppercase tracking-wider block mb-1">
                                        {t.marriageForm}
                                    </span>
                                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                        {t.marriageTitle}
                                    </h3>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {t.marriageDesc}
                                </p>
                            </div>
                            <div className="pt-6">
                                <Tooltip content={t.marriageBtn} position="top">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/ticket-request')}
                                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d4a574] hover:text-[#e4be95] group-hover:translate-x-1 transition-all cursor-pointer"
                                    >
                                        <span>{t.marriageBtn}</span>
                                        <ArrowRightIcon className="w-3.5 h-3.5" />
                                    </button>
                                </Tooltip>
                            </div>
                        </motion.div>

                        {/* Death Certificate (Full Width Tile: 12 cols) */}
                        <motion.div
                            initial={{ opacity: 0, y: 35 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -2, transition: { duration: 0.2 } }}
                            className="lg:col-span-12 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-[#d4a574]/30 rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all backdrop-blur-xl shadow-xl cursor-default"
                        >
                            <div className="flex items-start gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-[#d4a574] uppercase tracking-wider block">
                                        {t.deathForm}
                                    </span>
                                    <h4 className="text-lg font-bold text-white tracking-tight">
                                        {t.deathTitle}
                                    </h4>
                                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-2xl">
                                        {t.deathDesc}
                                    </p>
                                </div>
                            </div>
                            <Tooltip content={t.deathBtn} position="top">
                                <button
                                    type="button"
                                    onClick={() => navigate('/ticket-request')}
                                    className="px-5 py-2.5 rounded-xl border border-[#d4a574]/40 hover:bg-[#d4a574]/10 text-[#d4a574] text-xs font-bold uppercase tracking-wider transition-all self-start md:self-center shrink-0 cursor-pointer"
                                >
                                    {t.deathBtn}
                                </button>
                            </Tooltip>
                        </motion.div>

                    </div>
                </div>
            </section>

            {/* Subtle, Translucent Floating Language Switch (Scroll-reactive: hides on scroll down, shows on scroll up) */}
            <aside aria-label="Language selection" className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
                <div
                    className={`transition-all duration-300 transform ${
                        isLangPillVisible 
                            ? 'translate-y-0 opacity-100 pointer-events-auto' 
                            : 'translate-y-8 opacity-0 pointer-events-none'
                    }`}
                >
                    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg shadow-black/20 text-xs">
                        <div className="pl-2 pr-1 flex items-center gap-1.5 text-slate-400">
                            <GlobeAltIcon className="w-3.5 h-3.5 text-[#d4a574]" />
                        </div>
                        <button
                            type="button"
                            onClick={() => handleLanguageChange('en')}
                            className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                                lang === 'en'
                                    ? 'bg-[#d4a574] text-slate-950 shadow-sm'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                            aria-pressed={lang === 'en'}
                            title="English"
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            onClick={() => handleLanguageChange('fil')}
                            className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                                lang === 'fil'
                                    ? 'bg-[#d4a574] text-slate-950 shadow-sm'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                            aria-pressed={lang === 'fil'}
                            title="Filipino"
                        >
                            FIL
                        </button>
                    </div>
                </div>
            </aside>

        </div>
    );
}
