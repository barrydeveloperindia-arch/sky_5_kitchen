import {
    LayoutDashboard, BedDouble, ChefHat, Sparkles, Shirt, DoorOpen, Package, Users, CalendarCheck, IndianRupee, UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncError, clearSyncError, useOnline } from '@/lib/syncedState';
import Logo from '../Logo';

const OPS_TABS = [
    { key: 'Today', label: 'Today', icon: LayoutDashboard },
    { key: 'Reception', label: 'Reception', icon: BedDouble },
    { key: 'Kitchen', label: 'Kitchen', icon: ChefHat },
    { key: 'Cleaning', label: 'Cleaning', icon: Sparkles },
    { key: 'Laundry', label: 'Laundry', icon: Shirt },
    { key: 'Checkouts', label: 'Room Checkouts', icon: DoorOpen },
    { key: 'Inventory', label: 'Inventory', icon: Package },
    { key: 'Workforce', label: 'Workforce', icon: Users },
    { key: 'Attendance', label: 'Attendance', icon: CalendarCheck },
    { key: 'Finance', label: 'Finance', icon: IndianRupee },
    { key: 'Menu Config', label: 'Menu Config', icon: UtensilsCrossed },
];

const navId = (key) => `nav-${key.replace(' ', '-').toLowerCase()}`;

export function OpsSidebar({ activeTab, onSelect, onHome }) {
    return (
        <aside data-testid="ops-sidebar" className="ui flex w-full flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
            <button type="button" onClick={onHome} className="flex items-center gap-3 px-4 py-2 text-left md:flex-col md:gap-2 md:px-5 md:pt-6 md:pb-5" title="Back to the guest shop">
                {/* phone: a small logo so the page itself gets the screen (most of all when the phone is sideways) */}
                <span className="md:hidden"><Logo size={34} noBorder /></span>
                <span className="hidden md:block"><Logo size={64} /></span>
                <h2 className="font-serif text-sm font-bold tracking-[0.25em] text-gold">OPS CENTER</h2>
            </button>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:pb-3 md:flex-1 md:flex-col md:gap-0.5 md:overflow-x-visible md:overflow-y-auto" aria-label="OPS Center">
                {OPS_TABS.map(({ key, label, icon }) => {
                    const Icon = icon;
                    const active = activeTab === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            data-testid={navId(key)}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => onSelect(key)}
                            className={cn(
                                'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                                active ? 'bg-sidebar-accent text-sidebar-primary' : 'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                            )}
                        >
                            <Icon className={cn('size-4', active ? 'text-sidebar-primary' : 'opacity-70')} />
                            {label}
                        </button>
                    );
                })}
            </nav>
            <div className="hidden border-t border-sidebar-border px-5 py-4 text-xs md:block">
                <div>Hotel Sky 5 · Panchkula</div>
                <div className="font-semibold text-sidebar-primary">Front office</div>
            </div>
        </aside>
    );
}

export function OpsHeader({ title, subtitle, liveReady, savingCount, stats }) {
    const online = useOnline();
    const liveText = !online ? 'Offline · will sync' : !liveReady ? 'Connecting…' : savingCount ? 'Saving…' : '● Live';
    const syncError = useSyncError();
    return (
        <>
        {syncError && (
            <div role="alert" data-testid="sync-error" className="ui mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                <span>⚠ {syncError}</span>
                <button type="button" onClick={clearSyncError} className="rounded-md border border-destructive/40 px-3 py-1 text-xs font-semibold">OK</button>
            </div>
        )}
        <div role="banner" className="ui mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6 md:gap-4">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl md:text-3xl">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <span
                    data-testid="admin-live"
                    title="Saved to the database and shared with every device"
                    className={cn('rounded-full px-2.5 py-0.5 font-semibold sm:px-3 sm:py-1', online && liveReady && !savingCount ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}
                >{liveText}</span>
                <span data-testid="stat-occupied" title="Rooms where a guest is staying right now" className="rounded-full border bg-card px-2.5 py-0.5 sm:px-3 sm:py-1">Rooms with guests: <b>{stats.occupied}</b></span>
                <span data-testid="stat-dirty" title="Guest has left; the room must be cleaned before the next guest" className="rounded-full border bg-card px-2.5 py-0.5 sm:px-3 sm:py-1 text-destructive">Rooms to clean: <b>{stats.dirty}</b></span>
                <span data-testid="stat-available" title="Clean and empty: can be given to a new guest" className="rounded-full border bg-card px-2.5 py-0.5 sm:px-3 sm:py-1 text-success">Ready for new guest: <b>{stats.clean}</b></span>
            </div>
        </div>
        </>
    );
}
