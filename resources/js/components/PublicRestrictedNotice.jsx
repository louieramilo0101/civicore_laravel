import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldExclamationIcon, ArrowLeftIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

/**
 * Displayed on Vercel deployment when a visitor tries to access
 * staff/admin routes (which are restricted to the local municipal network).
 */
export default function PublicRestrictedNotice() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-md">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <ShieldExclamationIcon className="w-9 h-9" />
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3">
                    <BuildingOffice2Icon className="w-4 h-4 text-emerald-400" />
                    Municipal Intranet Restricted
                </div>

                <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                    Staff Operations Portal
                </h1>

                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    The civil registry back-office operations, document archives, and OCR systems are hosted exclusively on the municipal local area network for data privacy compliance.
                </p>

                <div className="space-y-3">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-950/40"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Public Citizen Services
                    </Link>
                    <Link
                        to="/ticket-request"
                        className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors border border-slate-700/50"
                    >
                        Apply for a Certificate Ticket
                    </Link>
                </div>
            </div>
        </div>
    );
}
