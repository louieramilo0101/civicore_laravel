import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    CheckCircleIcon, 
    ShieldCheckIcon, 
    UserIcon, 
    AcademicCapIcon, 
    CodeBracketIcon, 
    DocumentTextIcon 
} from '@heroicons/react/24/outline';

// Team member card with circular photo frame
function ProfileCard({ name, role, imagePath, icon: Icon = UserIcon }) {
    const [imgFailed, setImgFailed] = useState(false);

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#d4a574]/40 p-6 flex flex-col items-center text-center transition-all duration-300 shadow-lg shadow-black/20"
        >
            {/* Circular Photo Frame */}
            <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden bg-slate-900/60 border-2 border-[#d4a574]/30 mb-5 relative flex items-center justify-center shadow-lg group-hover:border-[#d4a574] transition-colors duration-300 shrink-0">
                {imagePath && !imgFailed ? (
                    <img
                        src={imagePath}
                        alt={name}
                        onError={() => setImgFailed(true)}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-4 text-slate-400">
                        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#d4a574]">
                            <Icon className="w-7 h-7" />
                        </div>
                        <span className="text-xs font-medium text-slate-400">Photo to be added</span>
                    </div>
                )}
            </div>

            <h4 className="text-white font-bold text-lg leading-snug">{name}</h4>
            <span className="text-[#d4a574] text-xs font-semibold uppercase tracking-wider mt-1.5">
                {role}
            </span>
        </motion.div>
    );
}

/** Renders the public portal overview and team information. */
export default function AboutPortal() {
    return (
        <div className="py-12 sm:py-16 md:py-20 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20 space-y-20 max-w-7xl mx-auto">
            
            {/* 1. Hero Section: Overview & Official Logo */}
            <section className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
                <div className="flex-1">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-6"
                    >
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
                            Preserving Naic's Local Heritage
                        </h1>
                        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                            The Municipal Civil Registrar's Office of Naic is dedicated to the proper registration, archival, and administration of the fundamental civic events of our citizens. We record the milestones of our local community—Births, Marriages, and Deaths—to ensure permanent, secure, and valid civil identification.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
                            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="text-white font-bold text-base mb-1.5 flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5 text-[#d4a574] shrink-0" />
                                    <span>Legal Integrity</span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    Ensuring the accuracy and validity of all municipal civil records.
                                </p>
                            </div>
                            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="text-white font-bold text-base mb-1.5 flex items-center gap-2">
                                    <ShieldCheckIcon className="w-5 h-5 text-[#d4a574] shrink-0" />
                                    <span>Civic Rights</span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    Protecting the identities and legal documents of every citizen.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Civil Registry Official Logo Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="w-full sm:w-auto flex-1 flex justify-center"
                >
                    <div className="w-full max-w-sm aspect-square bg-gradient-to-br from-[#d4a574]/15 via-white/[0.02] to-transparent rounded-[2.5rem] border border-[#d4a574]/30 relative overflow-hidden group shadow-2xl shadow-black/40 flex items-center justify-center p-8 backdrop-blur-sm">
                        <div className="absolute inset-0 bg-[#d4a574]/5 rounded-[2.5rem] pointer-events-none" />
                        <img
                            src="/images/Civil%20Registry/logo%20civil%20registry.jpg"
                            alt="Civil Registry of Naic Logo"
                            className="w-full h-full object-contain rounded-2xl shadow-md group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#d4a574]/15 rounded-full blur-[80px] pointer-events-none" />
                    </div>
                </motion.div>
            </section>

            {/* 2. Civil Registry of Naic Employees */}
            <section className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-3xl sm:text-4xl font-black text-white">
                        Civil Registry of Naic Staff
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base">
                        The employees serving the Municipality of Naic, Cavite.
                    </p>
                </div>

                <div className="rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/50 group">
                    <img
                        src="/images/Civil%20Registry/picture%20of%20civil%20registry%20employee.png"
                        alt="Civil Registry of Naic Employees"
                        className="w-full h-auto max-h-[560px] object-cover object-top group-hover:scale-[1.01] transition-transform duration-500"
                    />
                    <div className="p-4 sm:p-6 bg-slate-900/90 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-white font-bold text-base sm:text-lg">
                                Municipal Civil Registrar's Office
                            </h3>
                            <p className="text-slate-400 text-xs sm:text-sm">
                                Municipality of Naic, Cavite
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Technical Adviser & Technical Critic */}
            <section className="space-y-6 flex flex-col items-center text-center">
                <div className="space-y-1 max-w-2xl">
                    <h2 className="text-3xl sm:text-4xl font-black text-white">
                        Technical Adviser & Technical Critic
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base">
                        Guiding and evaluating the development of the project.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
                    <ProfileCard
                        name="Sir Henry Renon Balanza"
                        role="Technical Adviser"
                        imagePath="/images/TA%20and%20TC/henry_balanza.png"
                        icon={AcademicCapIcon}
                    />
                    <ProfileCard
                        name="Sir Gabriel Arcega"
                        role="Technical Critic"
                        imagePath="/images/TA%20and%20TC/gabriel_arcega.png"
                        icon={AcademicCapIcon}
                    />
                </div>
            </section>

            {/* 4. Researchers */}
            <section className="space-y-6 flex flex-col items-center text-center">
                <div className="space-y-1 max-w-2xl">
                    <h2 className="text-3xl sm:text-4xl font-black text-white">
                        Researchers
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base">
                        The researchers and developers behind CiviCORE.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                    <ProfileCard
                        name="Elijah Poblete"
                        role="Project Manager"
                        imagePath="/images/Student/elijah.png"
                        icon={UserIcon}
                    />
                    <ProfileCard
                        name="Jhay Torrijos"
                        role="Documentation Specialist"
                        imagePath="/images/Student/jhay.png"
                        icon={DocumentTextIcon}
                    />
                    <ProfileCard
                        name="Louie Dave Ramilo"
                        role="Programmer"
                        imagePath="/images/Student/louie.png"
                        icon={CodeBracketIcon}
                    />
                </div>
            </section>

        </div>
    );
}
