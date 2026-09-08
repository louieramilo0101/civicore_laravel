import React from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/** Prevents a rendering failure from taking down the entire application shell. */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught UI Error:", error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl backdrop-blur-xl space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                            <ExclamationTriangleIcon className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-white">Something went wrong</h2>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            A temporary application error occurred. Click below to refresh the system queue.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="w-full py-3.5 bg-gradient-to-r from-[#d4a574] to-[#c49a67] text-[#0f172a] rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
