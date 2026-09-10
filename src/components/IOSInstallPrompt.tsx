import { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';

export const IOSInstallPrompt = () => {
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Detect iOS
        const ua = window.navigator.userAgent;
        const webkit = !!ua.match(/WebKit/i);
        const isIOSDevice = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i) || !!ua.match(/iPod/i);

        // Detect standalone mode (already installed)
        const isStandaloneMode = ('standalone' in window.navigator) && ((window.navigator as any).standalone);

        setIsIOS(isIOSDevice && webkit);
        setIsStandalone(isStandaloneMode);

        // Only show if it's iOS, not standalone, and user hasn't dismissed it
        const hasDismissed = localStorage.getItem('iosInstallPromptDismissed');
        if (isIOSDevice && webkit && !isStandaloneMode && !hasDismissed) {
            // Trigger prompt after a short delay for better UX
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismissPrompt = () => {
        setShowPrompt(false);
        localStorage.setItem('iosInstallPromptDismissed', 'true');
    };

    if (!showPrompt || !isIOS || isStandalone) return null;

    return (

        <div className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border/50 rounded-xl p-4 shadow-xl flex items-start gap-4 animate-in slide-in-from-bottom-5">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                    <path d="M11 20A7 7 0 0 1 4 13V6l7-4 7 4v7a7 7 0 0 1-7 7Z" />
                    <path d="m9 12 2 2 4-4" />
                </svg>
            </div>
            <div className="flex-1">
                <h3 className="font-medium text-sm text-foreground mb-1">Install SplitTrack</h3>
                <p className="text-xs text-muted-foreground leading-snug">
                    Install this app on your device: tap <Share className="inline-block h-4 w-4 mx-0.5" /> and then <span className="font-semibold text-foreground">Add to Home Screen</span>.
                </p>
            </div>
            <button
                onClick={dismissPrompt}
                className="text-muted-foreground hover:text-foreground shrink-0 p-1 bg-secondary rounded-full"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

export default IOSInstallPrompt;
