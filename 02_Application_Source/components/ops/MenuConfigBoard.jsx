import { useState } from 'react';
import { Search, Eye, EyeOff, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Menu price: typed locally, saved on blur / Enter; an empty or invalid entry keeps the old price
function PriceInput({ item, onCommit }) {
    const [draft, setDraft] = useState(String(item.price));
    const [editing, setEditing] = useState(false);
    const commit = () => {
        setEditing(false);
        if (draft.trim() === '' || !Number.isFinite(Number(draft))) { setDraft(String(item.price)); return; }
        const price = Math.max(0, Math.round(Number(draft)));
        setDraft(String(price));
        if (price !== item.price) onCommit(price);
    };
    return (
        <div className="flex items-center gap-1">
            <span className="text-muted-foreground">₹</span>
            <Input type="number" min="0" aria-label={`Price of ${item.name}`} className="h-8 w-24"
                value={editing ? draft : String(item.price)}
                onFocus={() => { setDraft(String(item.price)); setEditing(true); }}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
        </div>
    );
}

// Prices and show / hide for every menu item; changes reach every guest phone live
export default function MenuConfigBoard({ items, onSetPrice, onToggle }) {
    const [q, setQ] = useState('');
    const [cat, setCat] = useState('All');
    const categories = ['All', ...new Set(items.map(i => i.category))];
    const term = q.trim().toLowerCase();
    const shown = items.filter(i => (cat === 'All' || i.category === cat) && (!term || i.name.toLowerCase().includes(term) || String(i.id).includes(term)));
    const hidden = items.filter(i => !i.isActive).length;

    return (
        <section className="ui space-y-4" data-testid="menu-config-board">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-primary"><UtensilsCrossed className="size-5" />Menu Configuration</h2>
                <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline" className="border-success/30 bg-success/10 text-success" data-testid="menu-count-active">{items.length - hidden} on menu</Badge>
                    <Badge variant="outline" className={hidden ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'text-muted-foreground'} data-testid="menu-count-hidden">{hidden} hidden</Badge>
                </div>
            </div>
            <p className="text-sm text-muted-foreground">Change a price and press Enter (or click outside) to save. Hidden items disappear from the guest menu and the printed card.</p>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-xs">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input data-testid="menu-search" aria-label="Search menu items" placeholder="Search item or ID" className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Category">
                    {categories.map(c => (
                        <Button key={c} type="button" role="tab" aria-selected={cat === c} size="sm" variant={cat === c ? 'default' : 'outline'}
                            data-testid={`menu-cat-${c.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setCat(c)}>
                            {c}<span className="ml-1 text-xs">{c === 'All' ? items.length : items.filter(i => i.category === c).length}</span>
                        </Button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-card shadow-xs" tabIndex={0} role="region" aria-label="Menu items">
                {shown.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">No menu item matches.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item ID</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead>
                                <TableHead>Price (₹)</TableHead><TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shown.map(item => (
                                <TableRow key={item.id} className={cn(!item.isActive && 'bg-muted/50')}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                                    <TableCell className={cn('font-semibold', item.isActive ? 'text-primary' : 'text-muted-foreground line-through')}>{item.name}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell><PriceInput item={item} onCommit={(price) => onSetPrice(item.id, price)} /></TableCell>
                                    <TableCell>
                                        <Button size="sm" variant={item.isActive ? 'default' : 'outline'}
                                            className={item.isActive ? 'bg-success text-white hover:bg-success/90' : 'border-destructive/40 text-destructive'}
                                            aria-label={item.isActive ? `${item.name} is ACTIVE, click to hide` : `${item.name} is HIDDEN, click to show`}
                                            onClick={() => onToggle(item.id)}>
                                            {item.isActive ? <><Eye />ACTIVE</> : <><EyeOff />HIDDEN</>}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </section>
    );
}
