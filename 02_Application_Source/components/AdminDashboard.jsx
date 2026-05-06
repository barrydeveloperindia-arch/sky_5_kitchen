import { useState, useMemo } from 'react';
import { rooms as initialRooms } from '../data/rooms';
import Logo from './Logo';

function AdminDashboard({ onNavigate, orders, setOrders, menuItems, setMenuItems, rooms, setRooms }) {
    const [activeTab, setActiveTab] = useState('Reception'); // Reception, Kitchen, Cleaning, Workforce, Finance
    const [editingRoom, setEditingRoom] = useState(null);
    const [cleaningRoom, setCleaningRoom] = useState(null);
    const [editingLog, setEditingLog] = useState(null);
    const [guestForm, setGuestForm] = useState({ name: '', phone: '', address: '', advance: '', advanceType: 'Cash', foodBill: '', checkInTime: '', checkOutTime: '' });
    
    // Official Staff Registry State
    const [staffRegistry, setStaffRegistry] = useState({
        reception: [
            { id: 'R1', name: 'Gaurav Panchal', role: 'Front Desk', shift: '08:30 AM – 06:30 PM', phone: '9779395934', duties: 'Front desk management and guest check-ins.' },
            { id: 'R2', name: 'Arjun Tiwari', role: 'Front Desk', shift: '09:00 AM – 07:00 PM', phone: '9876484439', duties: 'Reception operations and billing.' },
            { id: 'R3', name: 'Ratnesh', role: 'Night Manager', shift: '07:00 PM – 08:30 AM', phone: '8360585697', duties: 'Overnight guest support and security.' }
        ],
        kitchen: [
            { id: 'K1', name: 'Varun', role: 'Kitchen Staff', shift: '07:00 AM – 11:00 AM', phone: '7986962196', duties: 'Morning operations and food preparation.' },
            { id: 'K2', name: 'Karan', role: 'Helper', shift: '08:00 AM – 09:00 PM', phone: '6284615502', duties: 'Kitchen work and operational support.' },
            { id: 'K3', name: 'Amar Singh', role: 'Emergency Helper', shift: '08:00 AM – 08:00 PM', phone: '8433412834', duties: 'Backup support during peak hours.' }
        ],
        housekeeping: [
            { id: 'H1', name: 'Veerwati', role: 'Housekeeping', shift: '10:00 AM – 07:00 PM', phone: '9878645698', duties: 'Room setup, cleaning, and dusting.' },
            { id: 'H2', name: 'Bhawana', role: 'Housekeeping', shift: '08:30 AM – 05:00 PM', phone: '', duties: 'Hotel cleaning and room arrangement.' }
        ],
        special: [
            { id: 'S1', name: 'Karan (School Duty)', shift: '08:15 AM – 08:30 AM | 11:00 AM – 11:15 AM', location: 'Disha Arcade Building', remarks: 'Available on-call for hotel emergencies.' },
            { id: 'S2', name: 'Veerwati (Half-Day Leave)', shift: '07-May (Post Lunch)', location: 'DC Office (Official Work)', remarks: 'Duty will resume after lunch; schedule to be managed accordingly.' }
        ],
        dailySchedule: [
            { event: 'BREAKFAST', time: '09:15 AM TO 10:15 AM' },
            { event: 'TEA BREAK', time: '10:15 AM TO 10:30 AM' },
            { event: 'LUNCH BREAK', time: '01:30 PM TO 02:15 PM' },
            { event: 'EVENING TEA', time: '06:15 PM TO 06:30 PM' },
            { event: 'DINNER TIME', time: '10:00 PM TO 11:00 PM' }
        ]
    });

    const [editingStaff, setEditingStaff] = useState(null);
    const [staffForm, setStaffForm] = useState({ name: '', role: '', shift: '', phone: '', duties: '' });

    const cleaningChecklist = [
        'A/C REMOTE', 'TV REMOTE', 'REMOTE CELL', 'BED SHEET', 'TOWEL', 
        'CHARGER', 'SLIPPER', 'BUCKET', 'TEA GLASS', 'TOILET'
    ];

    const [cleaningLogs, setCleaningLogs] = useState([
        { id: 101, roomNumber: 3, roomType: 'Deluxe Room', staffName: 'Veerwati', inTime: '06-May, 08:30 AM', outTime: '06-May, 09:15 AM', missingItems: 'Slipper', remarks: 'Missing item noted during turnover.' },
        { id: 102, roomNumber: 9, roomType: 'Deluxe Room', staffName: 'Bhawana', inTime: '06-May, 09:45 AM', outTime: '06-May, 10:30 AM', missingItems: 'None', remarks: 'Room perfectly ready.' },
    ]);
    const [cleaningForm, setCleaningForm] = useState({ roomNumber: '', staffName: '', inTime: '', outTime: '', missingItems: 'None', remarks: '' });

    // Attendance & Leave State
    const [attendanceLogs, setAttendanceLogs] = useState([
        { id: 1, staffName: 'Gaurav Panchal', date: '06-May', checkIn: '08:25 AM', checkOut: '06:35 PM', status: 'Present' },
        { id: 2, staffName: 'Arjun Tiwari', date: '06-May', checkIn: '08:55 AM', checkOut: '--', status: 'Present' },
        { id: 3, staffName: 'Ratnesh', date: '06-May', checkIn: '06:55 PM', checkOut: '--', status: 'Present' },
        { id: 4, staffName: 'Varun', date: '06-May', checkIn: '07:10 AM', checkOut: '11:15 AM', status: 'Present' },
        { id: 5, staffName: 'Karan', date: '06-May', checkIn: '08:05 AM', checkOut: '--', status: 'Present' },
        { id: 6, staffName: 'Amar Singh', date: '06-May', checkIn: '08:15 AM', checkOut: '--', status: 'Present' },
        { id: 7, staffName: 'Veerwati', date: '06-May', checkIn: '09:50 AM', checkOut: '--', status: 'Present' },
        { id: 8, staffName: 'Bhawana', date: '06-May', checkIn: '08:40 AM', checkOut: '05:10 PM', status: 'Present' },
    ]);

    const [holidays, setHolidays] = useState([
        { date: '15-Aug', event: 'Independence Day', type: 'National' },
        { date: '02-Oct', event: 'Gandhi Jayanti', type: 'National' },
        { date: '25-Dec', event: 'Christmas', type: 'Hotel Holiday' },
    ]);

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

    const handleShareWorkforce = () => {
        const missingItemsSummary = cleaningLogs
            .filter(log => log.missingItems && log.missingItems.toLowerCase() !== 'none')
            .map(log => `* Room ${log.roomNumber}:* ${log.missingItems}`)
            .join('\n') || '• No missing items reported.';

        const formatSection = (title, staffList) => {
            return `*${title}*\n` +
                   `----------------------------\n` +
                   staffList.map(s => 
                       `• *${s.name}* (${s.role})\n` +
                       `  Shift: ${s.shift}\n` +
                       `  Contact: ${s.phone || 'N/A'}\n` +
                       `  Duties: ${s.duties || 'Standard Operations'}`
                   ).join('\n\n');
        };

        const scheduleText = staffRegistry.dailySchedule.map(s => `• ${s.event}: ${s.time}`).join('\n');

        const text = `*Hotel Sky 5*\n` +
            `Address: 5th floor, Disha Arcade Building, IT Park Rd, Mansa Devi Complex, Sector 4, Panchkula, Haryana 134114\n` +
            `Front Office: 08146407934\n` +
            `----------------------------\n` +
            `*EXECUTIVE DUTY ROSTER* | Daily Report\n\n` +
            formatSection('FRONT DESK & MANAGEMENT', staffRegistry.reception) + `\n\n` +
            formatSection('KITCHEN & OPERATIONS', staffRegistry.kitchen) + `\n\n` +
            formatSection('HOUSEKEEPING & TURNOVER', staffRegistry.housekeeping) + `\n\n` +
            `*DAILY STAFF SCHEDULE*\n` +
            `----------------------------\n` +
            scheduleText + `\n\n` +
            `*INVENTORY & MISSING ITEMS*\n` +
            `----------------------------\n` +
            missingItemsSummary + `\n\n` +
            `*OPERATIONAL ALERTS*\n` +
            `----------------------------\n` +
            `• Karan: School Duty (08:15-08:30 & 11:00-11:15)\n` +
            `• Location: Disha Arcade Building (On-Call)\n\n` +
            `_Generated by Hotel Sky 5 Management OS_`;
        
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleEditStaff = (staff) => {
        setStaffForm({ 
            name: staff.name, 
            role: staff.role, 
            shift: staff.shift, 
            phone: staff.phone, 
            duties: staff.duties 
        });
        setEditingStaff(staff);
    };

    const handleSaveStaff = () => {
        if (!staffForm.name.trim()) {
            alert("Staff name is required.");
            return;
        }

        const updatedRegistry = { ...staffRegistry };
        const categories = ['reception', 'kitchen', 'housekeeping'];
        
        categories.forEach(cat => {
            updatedRegistry[cat] = updatedRegistry[cat].map(s => 
                s.id === editingStaff.id ? { ...s, ...staffForm } : s
            );
        });

        setStaffRegistry(updatedRegistry);
        setEditingStaff(null);
    };

    const handlePrintReceipt = (room) => {
        if (!room.guest) return;
        
        const printWindow = window.open('', '_blank');
        const roomTotal = Number(room.price) || 0;
        const foodTotal = Number(room.foodBill) || 0;
        const subtotal = roomTotal + foodTotal;
        const gst = Math.round(subtotal * 0.12); // Standard 12% GST for Luxury Stays
        const grandTotal = subtotal + gst;
        const advance = Number(room.guest.advance) || 0;
        const balance = grandTotal - advance;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Official Receipt - Room ${room.id}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;600;800&display=swap');
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #0a192f; line-height: 1.6; }
                        .receipt-container { max-width: 800px; margin: 0 auto; border: 2px solid #0a192f; padding: 50px; border-radius: 15px; position: relative; }
                        .header { text-align: center; border-bottom: 3px solid #d4af37; padding-bottom: 30px; margin-bottom: 40px; }
                        .brand { font-family: 'Cinzel', serif; fontSize: 2.5rem; margin: 0; color: #0a192f; letter-spacing: 2px; }
                        .address { font-size: 0.8rem; color: #666; margin-top: 10px; max-width: 400px; margin-left: auto; margin-right: auto; }
                        .receipt-info { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 0.9rem; }
                        .billing-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                        .billing-table th { text-align: left; background: #0a192f; color: white; padding: 12px 15px; font-size: 0.8rem; text-transform: uppercase; }
                        .billing-table td { padding: 15px; border-bottom: 1px solid #eee; }
                        .total-section { margin-left: auto; width: 300px; }
                        .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
                        .grand-total { border-top: 2px solid #0a192f; margin-top: 10px; padding-top: 10px; font-weight: 800; font-size: 1.2rem; color: #0a192f; }
                        .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .signature-box { border-top: 1px solid #0a192f; width: 200px; text-align: center; padding-top: 10px; font-size: 0.8rem; font-weight: 700; }
                        .stamp { border: 3px double #d4af37; color: #d4af37; padding: 10px 20px; font-weight: 900; transform: rotate(-15deg); border-radius: 10px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <div class="header">
                            <!-- Visual Logo -->
                            <div style="display: inline-flex; align-items: center; background: #0a192f; padding: 10px 20px; border-radius: 12px; border-left: 4px solid #d4af37; min-width: fit-content; margin-bottom: 20px;">
                                <div style="display: flex; flex-direction: column; line-height: 1.1; text-align: left;">
                                    <div style="font-size: 14px; color: white; letter-spacing: 1px; font-weight: 500; text-transform: uppercase;">Hotel</div>
                                    <div style="display: flex; align-items: baseline; gap: 8px;">
                                        <div style="font-size: 30px; font-weight: 900; color: #d4af37; font-family: 'Cinzel', serif; letter-spacing: 2px;">SKY</div>
                                        <div style="font-size: 42px; font-weight: 900; color: #d4af37; font-family: 'Cinzel', serif;">5</div>
                                    </div>
                                </div>
                            </div>
                            <div class="address">
                                5th floor, Disha Arcade Building, IT Park Rd, Mansa Devi Complex, Sector 4, Panchkula, Haryana 134114<br/>
                                📞 08146407934 | ✉️ contact@hotelsky5.com
                            </div>
                        </div>

                        <div class="receipt-info">
                            <div>
                                <div style="font-weight: 800; text-transform: uppercase; color: #d4af37; margin-bottom: 5px;">Guest Details</div>
                                <div style="font-size: 1.1rem; font-weight: 700;">${room.guest.name}</div>
                                <div>${room.guest.phone}</div>
                                <div style="max-width: 250px;">${room.guest.address || 'N/A'}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 800; text-transform: uppercase; color: #d4af37; margin-bottom: 5px;">Folio Information</div>
                                <div><b>Room Number:</b> ${room.id}</div>
                                <div><b>Room Type:</b> ${room.type}</div>
                                <div><b>Check-In:</b> ${room.guest.checkIn}</div>
                                <div><b>Invoice Date:</b> ${new Date().toLocaleDateString('en-GB')}</div>
                            </div>
                        </div>

                        <table class="billing-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th style="text-align: right;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Room Rent & Services (Room ${room.id})</td>
                                    <td style="text-align: right;">₹${roomTotal.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td>Food & Beverage Bill (Restaurant Sync)</td>
                                    <td style="text-align: right;">₹${foodTotal.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="total-section">
                            <div class="total-row">
                                <span>Subtotal:</span>
                                <span>₹${subtotal.toLocaleString()}</span>
                            </div>
                            <div class="total-row">
                                <span>GST (12%):</span>
                                <span>₹${gst.toLocaleString()}</span>
                            </div>
                            <div class="grand-total total-row">
                                <span>GRAND TOTAL:</span>
                                <span>₹${grandTotal.toLocaleString()}</span>
                            </div>
                            <div class="total-row" style="color: #27ae60; font-weight: 700; margin-top: 10px;">
                                <span>Advance Paid (${room.guest.advanceType}):</span>
                                <span>- ₹${advance.toLocaleString()}</span>
                            </div>
                            <div class="total-row" style="font-weight: 800; border-top: 1px dashed #ccc; margin-top: 5px; padding-top: 5px;">
                                <span>NET PAYABLE:</span>
                                <span>₹${balance.toLocaleString()}</span>
                            </div>
                        </div>

                        <div class="footer">
                            <div class="stamp">PAID & VERIFIED</div>
                            <div>
                                <div class="signature-box">FRONT OFFICE MANAGER</div>
                                <div style="font-size: 0.6rem; color: #888; margin-top: 5px;">Hotel Sky 5 Management OS - Verified Artifact</div>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 30px;" class="no-print">
                        <button onclick="window.print()" style="padding: 15px 40px; background: #0a192f; color: #d4af37; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 10px 20px rgba(0,0,0,0.2);">🖨️ CONFIRM & PRINT RECEIPT</button>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
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
                        <!-- Visual Logo -->
                        <div style="display: inline-flex; align-items: center; background: #0a192f; padding: 10px 20px; border-radius: 12px; border-left: 4px solid #d4af37; min-width: fit-content;">
                            <div style="display: flex; flex-direction: column; line-height: 1.1; text-align: left;">
                                <div style="font-size: 14px; color: white; letter-spacing: 1px; font-weight: 500; text-transform: uppercase;">Hotel</div>
                                <div style="display: flex; align-items: baseline; gap: 8px;">
                                    <div style="font-size: 30px; font-weight: 900; color: #d4af37; font-family: 'Cinzel', serif; letter-spacing: 2px;">SKY</div>
                                    <div style="font-size: 42px; font-weight: 900; color: #d4af37; font-family: 'Cinzel', serif;">5</div>
                                </div>
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
                        OFFICIAL HOUSEKEEPING RECORD • GENERATED BY Sky-Ops Center • ${new Date().toLocaleString()}<br>
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
        const message = `*Hotel Sky 5*%0A------------------------------------%0A*Room:* ${log.roomNumber} (${log.roomType})%0A*Staff:* ${log.staffName}%0A*In Time:* ${log.inTime}%0A*Out Time:* ${log.outTime}%0A*Missing Items:* ${log.missingItems}%0A*Remarks:* ${log.remarks || 'None'}%0A------------------------------------%0A_Generated via Sky-Ops Center_`;
        
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
                        <!-- Visual Logo Mini -->
                        <div style="display: inline-flex; align-items: center; background: #0a192f; padding: 5px 10px; border-radius: 6px; border-left: 2px solid #d4af37; min-width: fit-content;">
                            <div style="display: flex; flex-direction: column; line-height: 1.1; text-align: left;">
                                <div style="font-size: 7px; color: white; letter-spacing: 0.5px; font-weight: 500; text-transform: uppercase;">Hotel</div>
                                <div style="display: flex; align-items: baseline; gap: 4px;">
                                    <div style="font-size: 15px; font-weight: 900; color: #d4af37; font-family: 'Cinzel', serif; letter-spacing: 1px;">SKY</div>
                                    <div style="font-size: 20px; font-weight: 900; color: #d4af37; font-family: 'Cinzel', serif;">5</div>
                                </div>
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
                    {['Reception', 'Kitchen', 'Cleaning', 'Workforce', 'Attendance', 'Finance', 'Menu Config'].map(tab => (
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
                            {tab === 'Attendance' && '📅 '}
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
                        background: 'linear-gradient(rgba(10, 25, 47, 0.85), rgba(10, 25, 47, 0.85)), url("/sky5_luxury_reception_background.png")',
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
                                                            <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem', background: '#27ae60' }} onClick={() => handlePrintReceipt(room)}>PRINT RECEIPT</button>
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
                            
                            {/* Forensic Room Checklist Card */}
                            <div style={{ background: '#0a192f', color: 'white', padding: '25px', borderRadius: '20px', marginBottom: '30px', borderLeft: '8px solid var(--accent)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ margin: '0 0 15px 0', color: 'var(--accent)', fontSize: '1rem', letterSpacing: '1px' }}>📋 OFFICIAL 10-ITEM ROOM INSPECTION CHECKLIST</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                                    {cleaningChecklist.map((item, idx) => (
                                        <div key={idx} style={{ fontSize: '0.75rem', fontWeight: '700', background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                            {idx + 1}. {item}
                                        </div>
                                    ))}
                                </div>
                            </div>

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
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid #e67e22' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Front Desk</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)' }}>3 STAFF</div>
                            </div>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid #3498db' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Kitchen Personnel</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)' }}>3 STAFF</div>
                            </div>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid #27ae60' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Housekeeping</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)' }}>2 STAFF</div>
                            </div>
                        </div>

                        {/* 24-Hour Duty Timeline (Per Day Wise Details) */}
                        <div style={{ background: 'white', borderRadius: '30px', padding: '30px', boxShadow: '0 15px 50px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h2 style={{ fontSize: '1.3rem', color: 'var(--primary-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>🕒 Daily Coverage Timeline (24h)</h2>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <button 
                                        onClick={handleShareWorkforce}
                                        style={{ background: '#25D366', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 5px 15px rgba(37, 211, 102, 0.3)' }}
                                    >
                                        💬 SHARE ON WHATSAPP
                                    </button>
                                    <span style={{ fontSize: '0.8rem', background: '#f0f2f5', padding: '5px 15px', borderRadius: '20px', color: '#555', fontWeight: 'bold' }}>LIVE TRACKING ACTIVE</span>
                                </div>
                            </div>

                            {/* Daily Schedule Row */}
                            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', marginBottom: '30px', border: '1px solid #eee' }}>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--primary-navy)', fontWeight: '800' }}>🥗 OFFICIAL STAFF BREAK SCHEDULE</h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                    {staffRegistry.dailySchedule.map((s, idx) => (
                                        <div key={idx} style={{ flex: 1, background: 'white', padding: '12px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'bold' }}>{s.event}</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--primary-navy)' }}>{s.time}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ position: 'relative', paddingLeft: '120px' }}>
                                {/* Time Labels (06:00 to 22:00) */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                                    {['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'].map(time => (
                                        <span key={time} style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 'bold' }}>{time}</span>
                                    ))}
                                </div>

                                {/* Timeline Grid Bars */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {[...staffRegistry.reception, ...staffRegistry.kitchen, ...staffRegistry.housekeeping].map(staff => {
                                        // Calculate bar position (mocking based on shift string for UI demo)
                                        let left = '0%';
                                        let width = '0%';
                                        
                                        if (staff.name === 'Gaurav Panchal') { left = '15.6%'; width = '41.6%'; }
                                        if (staff.name === 'Arjun Tiwari') { left = '18.75%'; width = '41.6%'; }
                                        if (staff.name === 'Ratnesh') { left = '81.25%'; width = '18.75%'; } // Wraps visually for night
                                        if (staff.name === 'Varun') { left = '6.25%'; width = '16.6%'; }
                                        if (staff.name === 'Karan') { left = '12.5%'; width = '54.1%'; }
                                        if (staff.name === 'Amar Singh') { left = '12.5%'; width = '50%'; }
                                        if (staff.name === 'Veerwati') { left = '25%'; width = '37.5%'; }
                                        if (staff.name === 'Bhawana') { left = '15.6%'; width = '35.4%'; }

                                        let color = '#3498db'; // Kitchen default
                                        if (staffRegistry.reception.includes(staff)) color = '#e67e22'; // Reception
                                        if (staffRegistry.housekeeping.includes(staff)) color = '#27ae60'; // Housekeeping

                                        return (
                                            <div key={staff.name} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                <div style={{ width: '100px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-navy)', position: 'absolute', left: 0 }}>
                                                    {staff.name}
                                                </div>
                                                <div style={{ flex: 1, height: '12px', background: '#f0f2f5', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                                                    <div style={{ 
                                                        position: 'absolute', 
                                                        left: left, 
                                                        width: width, 
                                                        height: '100%', 
                                                        background: color, 
                                                        borderRadius: '6px',
                                                        boxShadow: `0 0 10px ${color}44`
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Current Time Indicator Mock */}
                                <div style={{ position: 'absolute', top: '25px', bottom: 0, left: '35%', width: '2px', background: 'var(--accent)', zIndex: 10 }}>
                                    <div style={{ position: 'absolute', top: '-5px', left: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)' }} />
                                </div>
                            </div>
                        </div>

                        {/* Edit Staff Modal */}
                        {editingStaff && (
                            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 33, 71, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                                <div style={{ background: 'white', borderRadius: '24px', width: '450px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', overflow: 'hidden', margin: 'auto' }}>
                                    <div style={{ background: 'var(--primary-navy)', padding: '25px 30px', borderBottom: '3px solid var(--accent)' }}>
                                        <h2 style={{ margin: '0', color: 'white', fontFamily: 'Cinzel, serif', fontSize: '1.6rem', letterSpacing: '1px' }}>EDIT PERSONNEL</h2>
                                        <div style={{ color: 'var(--accent)', fontSize: '0.9rem', marginTop: '5px', letterSpacing: '1px' }}>Sky-Ops Center Management</div>
                                    </div>
                                    <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Full Name</label>
                                            <input 
                                                type="text" 
                                                value={staffForm.name} 
                                                onChange={(e) => setStaffForm({...staffForm, name: e.target.value})}
                                                style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Duty Shift</label>
                                            <input 
                                                type="text" 
                                                value={staffForm.shift} 
                                                onChange={(e) => setStaffForm({...staffForm, shift: e.target.value})}
                                                style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Phone Number</label>
                                            <input 
                                                type="text" 
                                                value={staffForm.phone} 
                                                onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                                                style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Duty Description</label>
                                            <textarea 
                                                value={staffForm.duties} 
                                                onChange={(e) => setStaffForm({...staffForm, duties: e.target.value})}
                                                style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '0.9rem', minHeight: '80px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                            <button style={{ flex: 1, padding: '15px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setEditingStaff(null)}>CANCEL</button>
                                            <button style={{ flex: 1, padding: '15px', background: 'var(--primary-navy)', border: 'none', borderRadius: '12px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleSaveStaff}>UPDATE</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Shift Roster Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px' }}>
                            {/* Reception & Front Desk */}
                            <div style={{ background: 'white', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                                <h2 style={{ fontSize: '1.3rem', color: 'var(--primary-navy)', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>🛎️ Front Desk</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {staffRegistry.reception.map(staff => (
                                        <div key={staff.name} style={{ padding: '15px', borderRadius: '15px', background: '#f8f9fa', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--primary-navy)' }}>{staff.name}</span>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <span 
                                                        onClick={() => handleEditStaff(staff)}
                                                        style={{ fontSize: '0.65rem', background: '#34495e', color: 'white', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                                    >EDIT</span>
                                                    <span style={{ fontSize: '0.7rem', background: '#e67e22', color: 'white', padding: '3px 10px', borderRadius: '10px' }}>{staff.role}</span>
                                                </div>
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

                            {/* Kitchen & Helpers */}
                            <div style={{ background: 'white', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                                <h2 style={{ fontSize: '1.3rem', color: 'var(--primary-navy)', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>🍳 Kitchen & Operations</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {staffRegistry.kitchen.map(staff => (
                                        <div key={staff.name} style={{ padding: '15px', borderRadius: '15px', background: '#f8f9fa', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--primary-navy)' }}>{staff.name}</span>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <span 
                                                        onClick={() => handleEditStaff(staff)}
                                                        style={{ fontSize: '0.65rem', background: '#34495e', color: 'white', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                                    >EDIT</span>
                                                    <span style={{ fontSize: '0.7rem', background: '#3498db', color: 'white', padding: '3px 10px', borderRadius: '10px' }}>{staff.role}</span>
                                                </div>
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
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <span 
                                                        onClick={() => handleEditStaff(staff)}
                                                        style={{ fontSize: '0.65rem', background: '#34495e', color: 'white', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                                    >EDIT</span>
                                                    <span style={{ fontSize: '0.7rem', background: '#27ae60', color: 'white', padding: '3px 10px', borderRadius: '10px' }}>{staff.role}</span>
                                                </div>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {staffRegistry.special.map(alert => (
                                <div key={alert.id} style={{ background: '#0a192f', padding: '30px', borderRadius: '25px', color: 'white', borderLeft: '10px solid var(--accent)', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
                                    <h3 style={{ margin: '0 0 15px 0', color: 'var(--accent)', fontSize: '1.1rem', textTransform: 'uppercase' }}>⚠️ SPECIAL DUTY ALERT: {alert.name}</h3>
                                    <div style={{ display: 'flex', gap: '40px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.8rem', color: '#8892b0', marginBottom: '5px' }}>SHIFT / TIMING</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>⏰ {alert.shift}</div>
                                        </div>
                                        <div style={{ flex: 1, borderLeft: '1px solid #233554', paddingLeft: '40px' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#8892b0', marginBottom: '5px' }}>LOCATION / REASON</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>📍 {alert.location}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '5px' }}>{alert.remarks}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'Finance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {/* Financial Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderBottom: '5px solid #2ecc71' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Revenue</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)', marginTop: '5px' }}>
                                    ₹{rooms.reduce((acc, r) => acc + (r.status === 'Occupied' ? (r.price + (r.foodBill || 0)) : 0), 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#2ecc71', fontWeight: 'bold', marginTop: '5px' }}>↑ 12% vs Yesterday</div>
                            </div>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderBottom: '5px solid #3498db' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Occupancy Rate</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)', marginTop: '5px' }}>
                                    {Math.round((rooms.filter(r => r.status === 'Occupied').length / rooms.length) * 100)}%
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#3498db', fontWeight: 'bold', marginTop: '5px' }}>{rooms.filter(r => r.status === 'Occupied').length} / {rooms.length} Rooms Active</div>
                            </div>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderBottom: '5px solid #f1c40f' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Food Revenue</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)', marginTop: '5px' }}>
                                    ₹{rooms.reduce((acc, r) => acc + (r.foodBill || 0), 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#f1c40f', fontWeight: 'bold', marginTop: '5px' }}>Sky Kitchen Integration</div>
                            </div>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderBottom: '5px solid #e74c3c' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Balances</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)', marginTop: '5px' }}>
                                    ₹{rooms.reduce((acc, r) => {
                                        if (r.status !== 'Occupied' || !r.guest) return acc;
                                        const total = (r.price + (r.foodBill || 0)) * 1.12; // with GST
                                        return acc + (total - (r.guest.advance || 0));
                                    }, 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#e74c3c', fontWeight: 'bold', marginTop: '5px' }}>Estimated Receivables</div>
                            </div>
                        </div>

                        {/* Visual Charts & Logs Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
                            {/* Transaction Log */}
                            <div style={{ background: 'white', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                                <h3 style={{ margin: '0 0 25px 0', color: 'var(--primary-navy)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    📄 RECENT TRANSACTION AUDIT
                                </h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>
                                            <th style={{ padding: '15px 10px', fontSize: '0.75rem', color: '#888' }}>ROOM</th>
                                            <th style={{ padding: '15px 10px', fontSize: '0.75rem', color: '#888' }}>GUEST</th>
                                            <th style={{ padding: '15px 10px', fontSize: '0.75rem', color: '#888' }}>REVENUE</th>
                                            <th style={{ padding: '15px 10px', fontSize: '0.75rem', color: '#888' }}>PAYMENT</th>
                                            <th style={{ padding: '15px 10px', fontSize: '0.75rem', color: '#888' }}>STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rooms.filter(r => r.status === 'Occupied').map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                <td style={{ padding: '15px 10px', fontWeight: 'bold', color: 'var(--primary-navy)' }}>{r.id}</td>
                                                <td style={{ padding: '15px 10px', fontSize: '0.9rem' }}>{r.guest?.name}</td>
                                                <td style={{ padding: '15px 10px', fontWeight: 'bold' }}>₹{(r.price + (r.foodBill || 0)).toLocaleString()}</td>
                                                <td style={{ padding: '15px 10px' }}>
                                                    <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '5px', background: '#f0f2f5', color: '#555' }}>{r.guest?.advanceType || 'CASH'}</span>
                                                </td>
                                                <td style={{ padding: '15px 10px' }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#2ecc71', fontWeight: 'bold' }}>ACTIVE</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Revenue Breakdown */}
                            <div style={{ background: '#0a192f', borderRadius: '25px', padding: '30px', color: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ margin: '0 0 25px 0', color: 'var(--accent)', fontSize: '1.1rem' }}>📊 Revenue Breakdown</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {[
                                        { label: 'Room Stays', amount: rooms.reduce((acc, r) => acc + (r.status === 'Occupied' ? r.price : 0), 0), color: '#3498db' },
                                        { label: 'Food & Dining', amount: rooms.reduce((acc, r) => acc + (r.foodBill || 0), 0), color: '#f1c40f' },
                                        { label: 'GST Collected', amount: Math.round(rooms.reduce((acc, r) => acc + (r.status === 'Occupied' ? (r.price + (r.foodBill || 0)) : 0), 0) * 0.12), color: '#2ecc71' }
                                    ].map((item, idx) => {
                                        const total = rooms.reduce((acc, r) => acc + (r.status === 'Occupied' ? (r.price + (r.foodBill || 0)) : 0), 0) * 1.12;
                                        const percent = total > 0 ? (item.amount / total) * 100 : 0;
                                        return (
                                            <div key={idx}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                                                    <span>{item.label}</span>
                                                    <span style={{ fontWeight: 'bold' }}>₹{item.amount.toLocaleString()}</span>
                                                </div>
                                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${percent}%`, height: '100%', background: item.color }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>FORECASTED COLLECTION</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)', marginTop: '5px' }}>₹32,500.00</div>
                                    <div style={{ fontSize: '0.7rem', color: '#2ecc71', marginTop: '5px' }}>Monthly Target: 78% Achieved</div>
                                </div>
                            </div>
                        </div>
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
