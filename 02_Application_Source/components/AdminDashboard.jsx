import { useState, useMemo } from 'react';
import { rooms as initialRooms } from '../data/rooms';
import Logo from './Logo';

function AdminDashboard({ onNavigate, orders, setOrders, menuItems, setMenuItems, rooms, setRooms }) {
    const [activeTab, setActiveTab] = useState('Reception'); // Reception, Kitchen, Cleaning, Workforce, Finance
    const [editingRoom, setEditingRoom] = useState(null);
    const [cleaningRoom, setCleaningRoom] = useState(null);
    const [editingLog, setEditingLog] = useState(null);
    const [guestForm, setGuestForm] = useState({ name: '', phone: '', address: '', advance: '', advanceType: 'Cash', foodBill: '', checkInTime: '', checkOutTime: '' });
    
    // Official Staff Registry
    const staffRegistry = {
        kitchen: [
            { name: 'Varun', role: 'Kitchen Staff', shift: '07:00 AM – 11:00 AM', phone: '7986962196', duties: 'Morning operations and food preparation.' },
            { name: 'Karan', role: 'Helper', shift: '08:00 AM – 09:00 PM', phone: '6284615502', duties: 'Kitchen work and operational support.' },
            { name: 'Amar Singh', role: 'Emergency Helper', shift: '08:00 AM – 08:00 PM', phone: '8433412834', duties: 'Backup support during peak hours.' }
        ],
        housekeeping: [
            { name: 'Veerwati', role: 'Housekeeping', shift: '10:00 AM – 07:00 PM', phone: '9878645698', duties: 'Room setup, cleaning, and dusting.' },
            { name: 'Bhawana', role: 'Housekeeping', shift: '08:30 AM – 05:00 PM', phone: '', duties: 'Hotel cleaning and room arrangement.' }
        ],
        special: [
            { name: 'Karan (School Duty)', shift: '08:15 AM – 08:30 AM | 11:00 AM – 11:15 AM', location: 'Disha Arcade Building' }
        ]
    };

    const [cleaningLogs, setCleaningLogs] = useState([
        { id: 101, roomNumber: 3, roomType: 'Deluxe Room', staffName: 'Veerwati', inTime: '06-May, 08:30 AM', outTime: '06-May, 09:15 AM', missingItems: 'None', remarks: 'Full turnover completed.' },
        { id: 102, roomNumber: 9, roomType: 'Deluxe Room', staffName: 'Bhawana', inTime: '06-May, 09:45 AM', outTime: '06-May, 10:30 AM', missingItems: '1 Hand Towel', remarks: 'Guest took towel, added to bill.' },
    ]);
    const [cleaningForm, setCleaningForm] = useState({ roomNumber: '', staffName: '', inTime: '', outTime: '', missingItems: 'None', remarks: '' });

    const stats = useMemo(() => {
        const occupied = rooms.filter(r => r.status === 'Occupied').length;
        const dirty = rooms.filter(r => r.status === 'Dirty').length;
        const clean = rooms.filter(r => r.status === 'Clean').length;
        return { occupied, dirty, clean };
    }, [rooms]);

    const updateRoomStatus = (id, newStatus) => {
        setRooms(prev => prev.map(r => {
            if (r.id === id) {
                // If checking out, we optionally could clear the guest data, but keeping it for history is fine.
                // However, for clean state, we should probably clear it when marking clean.
                if (newStatus === 'Clean') {
                    const { guest, ...rest } = r;
                    return { ...rest, status: newStatus };
                }
                return { ...r, status: newStatus };
            }
            return r;
        }));
    };

    const handleCheckInClick = (room) => {
        const now = new Date();
        const defaultCheckIn = now.toISOString().slice(0, 16);
        setGuestForm(room.guest ? { 
            name: room.guest.name, 
            phone: room.guest.phone, 
            address: room.guest.address || '', 
            advance: room.guest.advance || '', 
            advanceType: room.guest.advanceType || 'Cash', 
            foodBill: room.foodBill || '',
            checkInTime: room.guest.checkIn || defaultCheckIn,
            checkOutTime: room.guest.checkOut || ''
        } : { 
            name: '', 
            phone: '', 
            address: '', 
            advance: '', 
            advanceType: 'Cash', 
            foodBill: room.foodBill || '',
            checkInTime: defaultCheckIn,
            checkOutTime: ''
        });
        setEditingRoom(room);
    };

    const handleSaveGuest = () => {
        if (!guestForm.name.trim()) {
            alert("Guest name is required.");
            return;
        }
        
        const now = new Date();
        const checkInTime = editingRoom.guest?.checkIn || now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ", " + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        setRooms(prev => prev.map(r => r.id === editingRoom.id ? { 
            ...r, 
            status: 'Occupied',
            foodBill: Number(guestForm.foodBill) || 0,
            guest: { 
                name: guestForm.name, 
                phone: guestForm.phone, 
                address: guestForm.address, 
                checkIn: guestForm.checkInTime || checkInTime, 
                checkOut: guestForm.checkOutTime,
                advance: Number(guestForm.advance) || 0, 
                advanceType: guestForm.advanceType 
            }
        } : r));
        
        setEditingRoom(null);
    };

    const handleStartCleaning = (room) => {
        const now = new Date();
        const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ", " + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setCleaningForm({ roomNumber: room.id, staffName: '', inTime: timeStr, outTime: '', missingItems: 'None', remarks: '' });
        setCleaningRoom(room);
    };

    const handleEditLog = (log) => {
        setCleaningForm({ 
            roomNumber: log.roomNumber,
            staffName: log.staffName, 
            inTime: log.inTime, 
            outTime: log.outTime, 
            missingItems: log.missingItems, 
            remarks: log.remarks 
        });
        setEditingLog(log);
        // Find the room to set context for the modal
        const room = rooms.find(r => r.id === Number(log.roomNumber));
        setCleaningRoom(room);
    };

    const handleSaveCleaning = () => {
        if (!cleaningForm.staffName.trim()) {
            alert("Staff name is required.");
            return;
        }

        const now = new Date();
        const outTime = cleaningForm.outTime || (now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ", " + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

        const selectedRoom = rooms.find(r => r.id === Number(cleaningForm.roomNumber)) || cleaningRoom;

        if (editingLog) {
            setCleaningLogs(prev => prev.map(log => log.id === editingLog.id ? {
                ...log,
                roomNumber: Number(cleaningForm.roomNumber),
                roomType: selectedRoom?.type || log.roomType,
                staffName: cleaningForm.staffName,
                inTime: cleaningForm.inTime,
                outTime: outTime,
                missingItems: cleaningForm.missingItems,
                remarks: cleaningForm.remarks
            } : log));
            setEditingLog(null);
        } else {
            const newLog = {
                id: Date.now(),
                roomNumber: Number(cleaningForm.roomNumber),
                roomType: selectedRoom?.type || cleaningRoom.type,
                staffName: cleaningForm.staffName,
                inTime: cleaningForm.inTime,
                outTime: outTime,
                missingItems: cleaningForm.missingItems,
                remarks: cleaningForm.remarks
            };
            setCleaningLogs(prev => [newLog, ...prev]);
            updateRoomStatus(cleaningRoom.id, 'Clean');
        }
        
        setCleaningRoom(null);
    };

    const handlePrintSlip = (log) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Housekeeping Slip - Room ${log.roomNumber}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;600;800&display=swap');
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #0a192f; line-height: 1.6; }
                        .header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px; }
                        .hotel-name { font-family: 'Cinzel', serif; font-size: 28px; font-weight: bold; margin: 0; color: #0a192f; }
                        .slip-title { font-size: 12px; color: #d4af37; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px; font-weight: 800; }
                        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px; }
                        .item { border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
                        .label { font-size: 10px; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 1px; }
                        .value { font-size: 15px; font-weight: 600; color: #0a192f; }
                        .section-title { font-size: 10px; font-weight: 800; color: #0a192f; background: #f8f9fa; padding: 5px 10px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
                        .remarks-area { margin-top: 20px; padding: 20px; background: #fafafa; border-radius: 8px; border-left: 4px solid #d4af37; }
                        .footer { margin-top: 60px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                        .signature-space { margin-top: 40px; display: flex; justify-content: space-between; }
                        .sig-line { border-top: 1px solid #333; width: 150px; text-align: center; font-size: 10px; padding-top: 5px; margin-top: 30px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header" style="display: flex; align-items: center; justify-content: center; gap: 30px;">
                        <div style="background: #0a192f; padding: 15px 25px; border-radius: 8px; display: flex; align-items: center; gap: 15px; border-left: 5px solid #d4af37;">
                            <div style="display: flex; flex-direction: column; line-height: 1; text-align: left;">
                                <div style="font-family: 'Cinzel', serif; font-size: 22px; font-weight: 900; color: #d4af37; letter-spacing: 2px;">SKY</div>
                                <div style="font-family: 'Cinzel', serif; font-size: 32px; font-weight: 900; color: #d4af37; margin-top: -5px;">5</div>
                                <div style="font-size: 10px; color: white; letter-spacing: 1px; text-transform: uppercase; margin-top: 5px; font-weight: 500;">Boutique Hotel</div>
                            </div>
                        </div>
                        <div class="slip-title" style="margin-top: 0; padding-top: 5px;">Housekeeping Verification</div>
                    </div>
                    
                    <div class="section-title">Room Assignment</div>
                    <div class="details-grid">
                        <div class="item"><div class="label">Room Number</div><div class="value">ROOM ${log.roomNumber}</div></div>
                        <div class="item"><div class="label">Room Category</div><div class="value">${log.roomType}</div></div>
                        <div class="item"><div class="label">Housekeeper</div><div class="value">${log.staffName}</div></div>
                        <div class="item"><div class="label">Audit Date</div><div class="value">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
                    </div>

                    <div class="section-title">Timeline & Inventory</div>
                    <div class="details-grid">
                        <div class="item"><div class="label">Check-In Time</div><div class="value">${log.inTime}</div></div>
                        <div class="item"><div class="label">Completion Time</div><div class="value">${log.outTime}</div></div>
                        <div class="item" style="grid-column: span 2;">
                            <div class="label">Missing Items / Discrepancies</div>
                            <div class="value" style="color: ${log.missingItems === 'None' ? '#27ae60' : '#e74c3c'}">${log.missingItems}</div>
                        </div>
                    </div>

                    <div class="section-title">Supervisor Observations</div>
                    <div class="remarks-area">
                        <div class="value" style="font-style: italic;">${log.remarks || 'Room verified as per 5-star hospitality standards. No specific discrepancies noted.'}</div>
                    </div>

                    <div class="signature-space">
                        <div class="sig-line">Housekeeper Signature</div>
                        <div class="sig-line">Supervisor Approval</div>
                    </div>

                    <div class="footer">
                        OFFICIAL HOUSEKEEPING RECORD • GENERATED BY SKY-OPS CENTER • ${new Date().toLocaleString()}<br>
                        "Redefining Luxury with Precision"
                    </div>
                    <script>
                        window.onload = () => { 
                            window.print(); 
                            setTimeout(() => { window.close(); }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleShareWhatsApp = (log) => {
        const message = `*SKY 5 BOUTIQUE HOTEL*%0A------------------------------------%0A*Room:* ${log.roomNumber} (${log.roomType})%0A*Staff:* ${log.staffName}%0A*In Time:* ${log.inTime}%0A*Out Time:* ${log.outTime}%0A*Missing Items:* ${log.missingItems}%0A*Remarks:* ${log.remarks || 'None'}%0A------------------------------------%0A_Generated via Sky-Ops Center_`;
        
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const handlePrintBlankSlips = () => {
        const printWindow = window.open('', '_blank');
        const checklistItems = [
            "A/c REMOTE", "Tv REMOTE", "REMOTE CELL", "BED SHEET", 
            "TOWEL", "CHARGER", "SLIPPER", "BUCKET", "TEA GLASS", "TOILET"
        ];

        let slipsHtml = '';
        for(let i = 0; i < 10; i++) {
            slipsHtml += `
                <div class="slip">
                    <div class="slip-header">
                        <div style="background: #0a192f; padding: 6px 12px; border-radius: 4px; display: flex; align-items: center; gap: 8px; border-left: 3px solid #d4af37;">
                            <div style="display: flex; flex-direction: column; line-height: 1; text-align: left;">
                                <div style="font-family: 'Cinzel', serif; font-size: 10px; font-weight: 900; color: #d4af37; letter-spacing: 1px;">SKY</div>
                                <div style="font-family: 'Cinzel', serif; font-size: 14px; font-weight: 900; color: #d4af37; margin-top: -2px;">5</div>
                                <div style="font-size: 5px; color: white; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 500;">Boutique Hotel</div>
                            </div>
                        </div>
                        <span class="slip-type">HOUSEKEEPING CHECKLIST</span>
                    </div>
                    <div class="info-row">
                        <div class="field">ROOM #: ________</div>
                        <div class="field">STAFF: ______________</div>
                        <div class="field">DATE: ____________</div>
                    </div>
                    <div class="checklist-grid">
                        ${checklistItems.map(item => `
                            <div class="check-item">
                                <div class="box"></div>
                                <span class="check-label">${item}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="time-row">
                        <span>IN: ________</span>
                        <span>OUT: ________</span>
                        <span style="flex: 1; text-align: right;">SUPERVISOR: ________________</span>
                    </div>
                </div>
            `;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Blank Housekeeping Slips (A4 - 10 per page)</title>
                    <script>
                        window.onload = () => { window.print(); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="mobile-app-container" style={{ maxWidth: '100%', background: '#f0f2f5', minHeight: '100vh', display: 'flex' }}>
            
            {/* Sidebar Navigation */}
            <aside style={{ width: '280px', background: 'var(--primary-navy)', color: 'white', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div onClick={() => onNavigate('shop')} style={{ cursor: 'pointer' }}>
                    <Logo size={80} />
                    <h2 style={{ fontFamily: 'Cinzel', color: 'var(--accent)', marginTop: '15px', textAlign: 'center' }}>OPS CENTER</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {['Reception', 'Kitchen', 'Cleaning', 'Workforce', 'Finance', 'Menu Config'].map(tab => (
                        <div 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '15px 25px',
                                borderRadius: '12px',
                                background: activeTab === tab ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                                color: activeTab === tab ? 'var(--accent)' : '#8892b0',
                                cursor: 'pointer',
                                fontWeight: '700',
                                transition: 'all 0.3s'
                            }}
                        >
                            {tab === 'Reception' && '🏨 '}
                            {tab === 'Kitchen' && '🍳 '}
                            {tab === 'Cleaning' && '🧹 '}
                            {tab === 'Workforce' && '👥 '}
                            {tab === 'Finance' && '📊 '}
                            {tab === 'Menu Config' && '⚙️ '}
                            {tab}
                        </div>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#8892b0' }}>LOGGED IN AS</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>System Admin</div>
                </div>
            </aside>

            {/* Main Operational Area */}
            <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-navy)' }}>{activeTab} Dashboard</h1>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div className="stat-pill">Occupied: <b>{stats.occupied}</b></div>
                        <div className="stat-pill" style={{ color: '#e74c3c' }}>Dirty: <b>{stats.dirty}</b></div>
                        <div className="stat-pill" style={{ color: '#27ae60' }}>Available: <b>{stats.clean}</b></div>
                    </div>
                </header>

                {/* Tab: Reception (Room Grid) */}
                {activeTab === 'Reception' && (
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '30px',
                        padding: '40px',
                        borderRadius: '30px',
                        minHeight: '800px',
                        position: 'relative',
                        background: 'linear-gradient(rgba(10, 25, 47, 0.85), rgba(10, 25, 47, 0.85)), url("/sky5_luxury_reception_background_1778060409023.png")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        overflow: 'hidden'
                    }}>
                        
                        {/* Real-World Front Desk Context Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '10px' }}>
                            {/* CCTV Monitor Panel */}
                            <div style={{ background: '#1a1a1a', borderRadius: '20px', padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', gap: '15px', border: '3px solid #333', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#888' }}>🔴 LIVE CCTV FEED - RECEPTION & CORRIDORS</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#27ae60' }}>SYSTEM ACTIVE</span>
                                        <button 
                                            onClick={() => {
                                                const urls = prompt("Enter Camera MJPEG/Stream URLs separated by commas (Cam1,Cam2,...):", localStorage.getItem('sky5_cams') || '');
                                                if (urls !== null) localStorage.setItem('sky5_cams', urls);
                                                window.location.reload();
                                            }}
                                            style={{ background: 'transparent', border: '1px solid #444', color: '#888', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            ⚙️ CONFIG
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    {(() => {
                                        const savedCams = (localStorage.getItem('sky5_cams') || '').split(',');
                                        return [1,2,3,4,5,6].map((cam, idx) => {
                                            const url = savedCams[idx];
                                            return (
                                                <div key={cam} style={{ background: '#222', height: '80px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#444', border: '1px solid #333', overflow: 'hidden', position: 'relative' }}>
                                                    {url ? (
                                                        <img src={url} alt={`Cam ${cam}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML=`<div style="color:#e74c3c">CAM ${cam} OFFLINE</div>`; }} />
                                                    ) : (
                                                        <span>CAM {cam}</span>
                                                    )
                                                    }
                                                    <div style={{ position: 'absolute', top: '5px', left: '5px', background: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: '3px', fontSize: '0.5rem', color: '#aaa' }}>CAM {cam}</div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                                <div style={{ fontSize: '0.6rem', color: '#555', fontStyle: 'italic' }}>
                                    Note: Use MJPEG stream URLs from your NVR (e.g., http://192.168.1.10:8080/video)
                                </div>
                            </div>

                            {/* Front Desk Policy Panel */}
                            <div style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid var(--accent)' }}>
                                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>📜 POLICY</h3>
                                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Check-In:</span> <b>12:00 PM</b></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Check-Out:</span> <b>11:00 AM</b></div>
                                    <div style={{ marginTop: '5px', color: '#e74c3c', fontSize: '0.7rem', fontWeight: 'bold' }}>🚭 NO SMOKING ZONE</div>
                                </div>
                            </div>

                            {/* Quick Pay / QR Panel */}
                            <div style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#555', marginBottom: '10px' }}>SCAN TO PAY</div>
                                <div style={{ width: '60px', height: '60px', background: '#f0f2f5', borderRadius: '8px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                    📱
                                </div>
                                <div style={{ fontSize: '0.6rem', marginTop: '10px', color: '#888' }}>PhonePe / UPI</div>
                            </div>
                        </div>

                        {/* Room Categories */}
                        {['Super Deluxe Room', 'Deluxe Room', 'Standard Room'].map(roomType => {
                            const categoryRooms = rooms.filter(r => r.type === roomType);
                            if (categoryRooms.length === 0) return null;
                            return (
                                <div key={roomType}>
                                    <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-navy)', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
                                        {roomType}s
                                    </h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                                        {categoryRooms.map(room => (
                                            <div key={room.id} style={{ background: 'white', borderRadius: '20px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
                                                <div style={{ 
                                                    position: 'absolute', top: '20px', right: '20px', 
                                                    background: room.status === 'Clean' ? '#27ae60' : room.status === 'Occupied' ? '#3498db' : '#e74c3c',
                                                    color: 'white', padding: '5px 12px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold'
                                                }}>{room.status.toUpperCase()}</div>
                                                
                                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.4rem', color: 'var(--primary-navy)' }}>Room {room.id}</h3>
                                                <div style={{ color: '#27ae60', fontSize: '0.85rem', marginBottom: '10px', fontWeight: 'bold' }}>{room.description}</div>
                                                <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '15px' }}>Features: {room.amenities.join(', ')}</div>
                                                
                                                {room.status === 'Occupied' && room.guest ? (
                                                    <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #3498db', fontSize: '0.8rem' }}>
                                                        <div style={{ fontWeight: '800', color: '#0a192f', marginBottom: '5px' }}>👤 {room.guest.name}</div>
                                                        <div style={{ color: '#555', marginBottom: '3px' }}>📞 {room.guest.phone}</div>
                                                        {room.guest.address && <div style={{ color: '#555', marginBottom: '3px' }}>📍 {room.guest.address}</div>}
                                                        <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: '10px' }}>🕒 In: {room.guest.checkIn}</div>
                                                        <div style={{ borderTop: '1px dashed #ccc', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Room Rate:</span> <b>₹{room.price}</b></div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Food Bill:</span> <b>₹{room.foodBill || 0}</b></div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#27ae60' }}><span>Advance {room.guest.advanceType ? `(${room.guest.advanceType})` : ''}:</span> <b>- ₹{room.guest.advance || 0}</b></div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #ddd', fontWeight: 'bold', fontSize: '0.9rem', color: ((room.price + (room.foodBill || 0)) - (room.guest.advance || 0)) > 0 ? '#e74c3c' : '#27ae60' }}>
                                                                <span>Balance:</span> <span>₹{(room.price + (room.foodBill || 0)) - (room.guest.advance || 0)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ height: '70px', marginBottom: '20px' }}></div>
                                                )}
                                                
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    {room.status === 'Clean' && <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem' }} onClick={() => handleCheckInClick(room)}>CHECK-IN</button>}
                                                    {room.status === 'Occupied' && (
                                                        <>
                                                            <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem', background: '#e67e22' }} onClick={() => handleCheckInClick(room)}>EDIT GUEST</button>
                                                            <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem', background: '#34495e' }} onClick={() => updateRoomStatus(room.id, 'Dirty')}>CHECK-OUT</button>
                                                        </>
                                                    )}
                                                    {room.status === 'Dirty' && <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem', background: 'var(--accent)', color: 'black' }} onClick={() => updateRoomStatus(room.id, 'Clean')}>MARK CLEANED</button>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tab: Kitchen (Orders) */}
                {activeTab === 'Kitchen' && (
                    <div style={{ background: 'white', borderRadius: '25px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                    <th style={{ padding: '20px' }}>Order ID</th>
                                    <th>Table/Room</th>
                                    <th>Items</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                        <td style={{ padding: '20px', fontWeight: 'bold' }}>{order.id}</td>
                                        <td style={{ fontWeight: 'bold', color: '#e74c3c' }}>{order.table || 'N/A'}</td>
                                        <td>{order.items}</td>
                                        <td>{order.time}</td>
                                        <td><span style={{ padding: '5px 10px', borderRadius: '8px', background: order.status === 'Completed' ? '#2ecc71' : order.status === 'Preparing' ? '#3498db' : '#f1c40f', color: order.status === 'Completed' || order.status === 'Preparing' ? 'white' : 'black', fontSize: '0.7rem', fontWeight: 'bold' }}>{order.status}</span></td>
                                        <td>
                                            {order.status === 'Pending' && <button className="shop-now-btn" style={{ padding: '5px 15px' }} onClick={() => setOrders(prev => prev.map(o => o.id === order.id ? {...o, status: 'Preparing'} : o))}>PREPARE</button>}
                                            {order.status === 'Preparing' && <button className="shop-now-btn" style={{ padding: '5px 15px', background: '#3498db', color: 'white', border: 'none' }} onClick={() => setOrders(prev => prev.map(o => o.id === order.id ? {...o, status: 'Completed'} : o))}>SERVE</button>}
                                            {order.status === 'Completed' && <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>✓ DELIVERED</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'Cleaning' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {/* Task Queue Section */}
                        <section>
                            <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-navy)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                🧹 Rooms Awaiting Turnover 
                                <span style={{ fontSize: '0.9rem', background: '#e74c3c', color: 'white', padding: '4px 12px', borderRadius: '20px' }}>{stats.dirty} Pending</span>
                            </h2>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <button 
                                    onClick={handlePrintBlankSlips}
                                    style={{ padding: '12px 25px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(212,175,55,0.2)' }}
                                >
                                    🖨️ PRINT BLANK CHECKLISTS (A4)
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {rooms.filter(r => r.status === 'Dirty').map(room => (
                                    <div key={room.id} style={{ background: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', borderLeft: '6px solid #e74c3c' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-navy)' }}>Room {room.id}</h3>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#e74c3c' }}>NEEDS CLEANING</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>{room.type}</div>
                                        <button 
                                            onClick={() => handleStartCleaning(room)}
                                            style={{ width: '100%', padding: '12px', background: 'var(--primary-navy)', color: 'var(--accent)', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}
                                        >
                                            RECORD CLEANING
                                        </button>
                                    </div>
                                ))}
                                {stats.dirty === 0 && (
                                    <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: 'rgba(39, 174, 96, 0.05)', borderRadius: '18px', border: '2px dashed #27ae60', color: '#27ae60' }}>
                                        <b>✨ All rooms are currently clean. Excellent job!</b>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* History Table Section */}
                        <section style={{ background: 'white', borderRadius: '25px', padding: '35px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-navy)', marginBottom: '25px' }}>Housekeeping Audit Logs</h2>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left' }}>
                                            <th style={{ padding: '15px', color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>ROOM #</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>ROOM TYPE</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>STAFF NAME</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>IN TIME</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>OUT TIME</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>MISSING ITEMS</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>REMARKS</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cleaningLogs.map(log => (
                                            <tr key={log.id} style={{ background: '#f8f9fa', borderRadius: '12px' }}>
                                                <td style={{ padding: '15px', fontWeight: '800', color: 'var(--primary-navy)', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>{log.roomNumber}</td>
                                                <td style={{ fontSize: '0.9rem' }}>{log.roomType}</td>
                                                <td style={{ fontWeight: '600' }}>{log.staffName}</td>
                                                <td style={{ fontSize: '0.8rem', color: '#666' }}>{log.inTime}</td>
                                                <td style={{ fontSize: '0.8rem', color: '#666' }}>{log.outTime}</td>
                                                <td>
                                                    <span style={{ 
                                                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold',
                                                        background: log.missingItems === 'None' ? '#eafaf1' : '#fdf2f2',
                                                        color: log.missingItems === 'None' ? '#27ae60' : '#e74c3c'
                                                    }}>
                                                        {log.missingItems}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: '#555', fontStyle: 'italic' }}>
                                                    {log.remarks}
                                                </td>
                                                <td style={{ borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => handleEditLog(log)}
                                                            style={{ background: 'transparent', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--primary-navy)', fontWeight: 'bold', fontSize: '0.75rem' }}
                                                        >
                                                            EDIT
                                                        </button>
                                                        <button 
                                                            onClick={() => handlePrintSlip(log)}
                                                            style={{ background: '#f8f9fa', border: '1px solid #d4af37', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', color: '#0a192f', fontWeight: 'bold', fontSize: '0.75rem' }}
                                                        >
                                                            🖨️ PRINT
                                                        </button>
                                                        <button 
                                                            onClick={() => handleShareWhatsApp(log)}
                                                            style={{ background: '#25D366', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: 'bold', fontSize: '0.75rem' }}
                                                        >
                                                            💬 WHATSAPP
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'Workforce' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {/* Summary Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid #3498db' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Kitchen Personnel</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)' }}>3 STAFF</div>
                            </div>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid #27ae60' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Housekeeping</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)' }}>2 STAFF</div>
                            </div>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid var(--accent)' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>On-Duty Now</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--accent)' }}>ACTIVE</div>
                            </div>
                        </div>

                        {/* Shift Roster Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            {/* Kitchen & Helpers */}
                            <div style={{ background: 'white', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                                <h2 style={{ fontSize: '1.3rem', color: 'var(--primary-navy)', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>🍳 Kitchen & Operations</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {staffRegistry.kitchen.map(staff => (
                                        <div key={staff.name} style={{ padding: '15px', borderRadius: '15px', background: '#f8f9fa', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--primary-navy)' }}>{staff.name}</span>
                                                <span style={{ fontSize: '0.7rem', background: '#3498db', color: 'white', padding: '3px 10px', borderRadius: '10px' }}>{staff.role}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '10px' }}>⏰ {staff.shift}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic', marginBottom: '10px' }}>{staff.duties}</div>
                                            <a href={`tel:${staff.phone}`} style={{ textDecoration: 'none', color: '#27ae60', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                📞 {staff.phone} • CALL NOW
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Housekeeping & Cleaning */}
                            <div style={{ background: 'white', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                                <h2 style={{ fontSize: '1.3rem', color: 'var(--primary-navy)', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>🧹 Housekeeping</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {staffRegistry.housekeeping.map(staff => (
                                        <div key={staff.name} style={{ padding: '15px', borderRadius: '15px', background: '#f8f9fa', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--primary-navy)' }}>{staff.name}</span>
                                                <span style={{ fontSize: '0.7rem', background: '#27ae60', color: 'white', padding: '3px 10px', borderRadius: '10px' }}>{staff.role}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '10px' }}>⏰ {staff.shift}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic', marginBottom: '10px' }}>{staff.duties}</div>
                                            {staff.phone && (
                                                <a href={`tel:${staff.phone}`} style={{ textDecoration: 'none', color: '#27ae60', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    📞 {staff.phone} • CALL NOW
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Special Duty Warning Panel */}
                        <div style={{ background: '#0a192f', padding: '30px', borderRadius: '25px', color: 'white', borderLeft: '10px solid var(--accent)', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
                            <h3 style={{ margin: '0 0 15px 0', color: 'var(--accent)', fontSize: '1.1rem' }}>⚠️ SPECIAL DUTY ALERT: KARAN</h3>
                            <div style={{ display: 'flex', gap: '40px' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#8892b0', marginBottom: '5px' }}>SCHOOL RUNS (FIXED TIMING)</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>⏰ 08:15 AM – 08:30 AM</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>⏰ 11:00 AM – 11:15 AM</div>
                                </div>
                                <div style={{ borderLeft: '1px solid #233554', paddingLeft: '40px' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#8892b0', marginBottom: '5px' }}>POST-DUTY ASSIGNMENT</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>📍 DISHA ARCADE BUILDING</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '5px' }}>Available on-call for hotel emergencies.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Finance' && (
                    <div style={{ textAlign: 'center', padding: '100px', color: '#999' }}>
                        <div style={{ fontSize: '4rem' }}>💰</div>
                        <h2>Daily Collection Report</h2>
                        <p>Revenue Stream: <b>₹14,580</b> (Today)</p>
                    </div>
                )}

                {activeTab === 'Menu Config' && (
                    <div style={{ background: 'white', borderRadius: '25px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <h2 style={{ marginBottom: '20px', color: 'var(--primary-navy)' }}>Menu Configuration</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                    <th style={{ padding: '20px' }}>Item ID</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Price (₹)</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {menuItems?.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                        <td style={{ padding: '20px', color: '#666' }}>{item.id}</td>
                                        <td style={{ fontWeight: 'bold', color: 'var(--primary-navy)' }}>{item.name}</td>
                                        <td>{item.category}</td>
                                        <td>
                                            <input 
                                                type="number" 
                                                value={item.price} 
                                                onChange={(e) => setMenuItems(prev => prev.map(m => m.id === item.id ? {...m, price: Number(e.target.value)} : m))}
                                                style={{ padding: '8px', width: '80px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }}
                                            />
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => setMenuItems(prev => prev.map(m => m.id === item.id ? {...m, isActive: !m.isActive} : m))}
                                                style={{ 
                                                    padding: '8px 15px', 
                                                    borderRadius: '8px', 
                                                    border: 'none', 
                                                    background: item.isActive ? '#2ecc71' : '#e74c3c', 
                                                    color: 'white', 
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {item.isActive ? 'ACTIVE' : 'HIDDEN'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </main>

            {/* Check-In / Edit Modal */}
            {editingRoom && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 33, 71, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '450px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        {/* Modal Header */}
                        <div style={{ background: 'var(--primary-navy)', padding: '25px 30px', borderBottom: '3px solid var(--accent)' }}>
                            <h2 style={{ margin: '0', color: 'white', fontFamily: 'Cinzel, serif', fontSize: '1.6rem', letterSpacing: '1px' }}>
                                {editingRoom.status === 'Occupied' ? 'GUEST DOSSIER' : 'GUEST REGISTRATION'}
                            </h2>
                            <div style={{ color: 'var(--accent)', fontSize: '0.9rem', marginTop: '5px', letterSpacing: '1px' }}>
                                ROOM {editingRoom.id} • {editingRoom.type.toUpperCase()}
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name <span style={{color: '#e74c3c'}}>*</span></label>
                                <input 
                                    type="text" 
                                    value={guestForm.name} 
                                    onChange={(e) => setGuestForm({...guestForm, name: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                    placeholder="Enter guest's full name"
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Contact Number</label>
                                <input 
                                    type="text" 
                                    value={guestForm.phone} 
                                    onChange={(e) => setGuestForm({...guestForm, phone: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                    placeholder="Enter mobile number"
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Address Details</label>
                                <textarea 
                                    value={guestForm.address} 
                                    onChange={(e) => setGuestForm({...guestForm, address: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s', minHeight: '80px', fontFamily: 'inherit' }}
                                    placeholder="Enter full address, ID info, or city"
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                ></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Check-In Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={guestForm.checkInTime} 
                                        onChange={(e) => setGuestForm({...guestForm, checkInTime: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Check-Out Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={guestForm.checkOutTime} 
                                        onChange={(e) => setGuestForm({...guestForm, checkOutTime: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Advance Payment (₹)</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="number" 
                                        value={guestForm.advance} 
                                        onChange={(e) => setGuestForm({...guestForm, advance: e.target.value})}
                                        style={{ flex: 2, padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                        placeholder="0"
                                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                    />
                                    <select
                                        value={guestForm.advanceType}
                                        onChange={(e) => setGuestForm({...guestForm, advanceType: e.target.value})}
                                        style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Card">Card</option>
                                        <option value="GPay">GPay</option>
                                        <option value="PhonePe">PhonePe</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Food Bill (₹)</label>
                                <input 
                                    type="number" 
                                    value={guestForm.foodBill} 
                                    onChange={(e) => setGuestForm({...guestForm, foodBill: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                    placeholder="0"
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                />
                            </div>
                            
                            {/* Modal Footer */}
                            <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                                <button style={{ flex: 1, padding: '15px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '12px', color: '#555', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', fontSize: '0.9rem', letterSpacing: '1px' }} onClick={() => setEditingRoom(null)} onMouseOver={(e) => e.target.style.background='#f0f0f0'} onMouseOut={(e) => e.target.style.background='white'}>CANCEL</button>
                                <button style={{ flex: 1, padding: '15px', background: 'var(--primary-navy)', border: 'none', borderRadius: '12px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', fontSize: '0.9rem', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(0,33,71,0.2)' }} onClick={handleSaveGuest} onMouseOver={(e) => e.target.style.transform='translateY(-2px)'} onMouseOut={(e) => e.target.style.transform='translateY(0)'}>AUTHORIZE</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Cleaning Entry Modal */}
            {cleaningRoom && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 33, 71, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '450px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--primary-navy)', padding: '25px 30px', borderBottom: '3px solid var(--accent)' }}>
                            <h2 style={{ margin: '0', color: 'white', fontFamily: 'Cinzel, serif', fontSize: '1.6rem', letterSpacing: '1px' }}>CLEANING LOG</h2>
                            <div style={{ color: 'var(--accent)', fontSize: '0.9rem', marginTop: '5px' }}>ROOM {cleaningRoom.id} • {cleaningRoom.type.toUpperCase()}</div>
                        </div>

                        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Room Number <span style={{color: '#e74c3c'}}>*</span></label>
                                    <input 
                                        type="number" 
                                        value={cleaningForm.roomNumber} 
                                        onChange={(e) => setCleaningForm({...cleaningForm, roomNumber: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none' }}
                                        placeholder="Room #"
                                    />
                                </div>
                                <div style={{ flex: 2 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Staff Name <span style={{color: '#e74c3c'}}>*</span></label>
                                    <select 
                                        value={cleaningForm.staffName} 
                                        onChange={(e) => setCleaningForm({...cleaningForm, staffName: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="">Select Housekeeper</option>
                                        {staffRegistry.housekeeping.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>In Time</label>
                                    <input 
                                        type="text" 
                                        value={cleaningForm.inTime} 
                                        onChange={(e) => setCleaningForm({...cleaningForm, inTime: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Out Time</label>
                                    <input 
                                        type="text" 
                                        value={cleaningForm.outTime} 
                                        onChange={(e) => setCleaningForm({...cleaningForm, outTime: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none' }}
                                        placeholder="Auto-filled on save"
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Missing Items</label>
                                <input 
                                    type="text" 
                                    value={cleaningForm.missingItems} 
                                    onChange={(e) => setCleaningForm({...cleaningForm, missingItems: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none' }}
                                    placeholder="None or list items"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Remarks / Observations</label>
                                <textarea 
                                    value={cleaningForm.remarks} 
                                    onChange={(e) => setCleaningForm({...cleaningForm, remarks: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }}
                                    placeholder="Any specific room condition notes..."
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button style={{ flex: 1, padding: '15px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => { setCleaningRoom(null); setEditingLog(null); }}>CANCEL</button>
                                    <button style={{ flex: 1, padding: '15px', background: 'var(--primary-navy)', border: 'none', borderRadius: '12px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleSaveCleaning}>{editingLog ? 'UPDATE LOG' : 'COMPLETE CLEANING'}</button>
                                </div>
                                {editingLog && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            onClick={() => handlePrintSlip(editingLog)}
                                            style={{ flex: 1, padding: '12px', background: '#f8f9fa', border: '2px solid #d4af37', borderRadius: '12px', color: '#0a192f', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            🖨️ PRINT SLIP
                                        </button>
                                        <button 
                                            onClick={() => handleShareWhatsApp(editingLog)}
                                            style={{ flex: 1, padding: '12px', background: '#25D366', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            💬 SHARE WHATSAPP
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
