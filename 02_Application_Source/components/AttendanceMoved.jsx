import { ChevronLeft, ScanFace } from 'lucide-react';

// Since 23-10-2026 hotel staff check in / out on the AuraLock attendance tablet (same system as the Englabs office,
// timesheets come from there). The /attendance link and the staff phone app open this page instead of a second terminal.
export default function AttendanceMoved() {
    return (
        <div className="ui flex min-h-dvh flex-col bg-[#06101f] text-white" data-testid="attendance-moved">
            <div role="banner" className="border-b border-white/10 bg-[#0a192f]">
                <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
                    <a href="/" aria-label="Back to the hotel app"
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 text-white transition-colors hover:border-[#d4af37] hover:text-[#d4af37]">
                        <ChevronLeft aria-hidden className="size-5" />
                    </a>
                    <img src="/images/logo.png" alt="Hotel Sky 5" className="size-10 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] leading-tight font-bold">Staff Attendance</div>
                        <div className="truncate text-[11px] leading-tight text-[#aab4cf]">Hotel Sky 5 · Panchkula</div>
                    </div>
                </div>
            </div>
            <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
                <div className="grid size-20 place-items-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37]">
                    <ScanFace aria-hidden className="size-10" />
                </div>
                <h1 className="text-2xl font-bold">Attendance is on the AuraLock tablet</h1>
                <p className="text-base leading-relaxed text-[#c9d2e6]">
                    Check in and check out on the <b className="text-white">AuraLock attendance tablet</b> at the hotel, with your face.
                </p>
                <p lang="hi" className="text-base leading-relaxed text-[#c9d2e6]">
                    चेक-इन और चेक-आउट अब होटल के <b className="text-white">AuraLock अटेंडेंस टैबलेट</b> पर अपने चेहरे से करें।
                </p>
                <p className="text-xs text-[#8f9bb8]">Your old entries are kept. Questions: ask the manager.</p>
            </main>
        </div>
    );
}
