import { useState, useMemo } from 'react';
import { rooms as initialRooms } from '../data/rooms';
import Logo from './Logo';

function AdminDashboard({ onNavigate, orders, setOrders, menuItems, setMenuItems, rooms, setRooms }) {
    const [activeTab, setActiveTab] = useState('Reception'); // Reception, Kitchen, Cleaning, Workforce, Finance
    const [editingRoom, setEditingRoom] = useState(null);
    const [cleaningRoom, setCleaningRoom] = useState(null);
    const [editingLog, setEditingLog] = useState(null);
    const [guestForm, setGuestForm] = useState({ name: '', phone: '', address: '', advance: '', advanceType: 'Cash', foodBill: '', checkInTime: '', checkOutTime: '' });
    const [showBill, setShowBill] = useState(false);
    
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
            { id: 'H2', name: 'Bhawna', role: 'Housekeeping', shift: '08:30 AM – 05:00 PM', phone: '', duties: 'Hotel cleaning and room arrangement.' },
            { id: 'H3', name: 'Amresh Kumar', role: 'Housekeeping', shift: 'Task-based (Flexible)', phone: '7307757067', duties: 'Primary focus: Cleaning 10 toilets daily (Fixed mandate).' }
        ],
        special: [
            { id: 'S1', name: 'Karan (School Duty)', shift: '08:15 AM – 08:30 AM | 11:00 AM – 11:15 AM', location: 'Disha Arcade Building', remarks: 'Available on-call for hotel emergencies.' },
            { id: 'S2', name: 'Veerwati (Half-Day Leave)', shift: '06-May (Post Lunch)', location: 'Official Work (DC Office)', remarks: 'Duty will resume after lunch; schedule to be managed accordingly.' },
            { id: 'S3', name: 'MD Sir (Management Directive)', shift: 'High Priority / Immediate', location: 'Full Hotel Premises', remarks: 'Ensure absolute discipline, professional uniform compliance, and audit-ready room standards.' },
            { id: 'S4', name: 'Veerwati (First-Half Off)', shift: '07-May (Reporting 02:00 PM)', location: 'Authorized Leave', remarks: 'Duty will commence from the second half (post-lunch).' }
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
        'A/c Remote + Cell',
        'Set-up Box Remote + Cell',
        'Cup/Glass',
        'Towel',
        'Bed Sheet',
        'Bucket / Mug / Stool',
        'Turn on TV/AC Prop. Working / Not',
        'TV Remote + Cell',
        'Slippers',
        'Tea/Coffee/milk/Sugar/Green Tea',
        'Hand Towel',
        'Pillow - 2',
        'Toilet (Soap, Handwash, Shower gel)'
    ];

    const [cleaningLogs, setCleaningLogs] = useState([
        { id: 101, roomNumber: 3, roomType: 'Deluxe Room', staffName: 'Veerwati', inTime: '06-May, 08:30 AM', outTime: '06-May, 09:15 AM', missingItems: 'Slipper', remarks: 'Missing item noted during turnover.' },
        { id: 102, roomNumber: 9, roomType: 'Deluxe Room', staffName: 'Bhawna', inTime: '06-May, 09:45 AM', outTime: '06-May, 10:30 AM', missingItems: 'None', remarks: 'Room perfectly ready.' },
    ]);
    const [cleaningForm, setCleaningForm] = useState({ roomNumber: '', staffName: '', inTime: '', outTime: '', missingItems: 'None', remarks: '' });

    // Laundry Service State
    const laundryItems = [
        'Double Bed Sheet',
        'Quilt Cover',
        'Towel',
        'Hand Towel',
        'Pillow Cover',
        'Cushion Cover',
        'Runner'
    ];

    const [laundryLogs, setLaundryLogs] = useState([
        { id: 201, roomNumber: 3, date: '25-May, 10:15 AM', pickedUpBy: 'Veerwati', supervisor: 'Gaurav Panchal', items: { 'Double Bed Sheet': 2, 'Quilt Cover': 1, 'Towel': 2, 'Pillow Cover': 2 }, remarks: 'Standard room pickup.' },
        { id: 202, roomNumber: 9, date: '25-May, 11:30 AM', pickedUpBy: 'Bhawna', supervisor: 'Arjun Tiwari', items: { 'Double Bed Sheet': 4, 'Towel': 4, 'Hand Towel': 2, 'Runner': 1 }, remarks: 'Linen sent for laundry.' }
    ]);
    const [laundryRoom, setLaundryRoom] = useState(null);
    const [editingLaundryLog, setEditingLaundryLog] = useState(null);
    const [laundryForm, setLaundryForm] = useState({
        roomNumber: '',
        pickedUpBy: '',
        supervisor: '',
        date: '',
        items: {
            'Double Bed Sheet': 0,
            'Quilt Cover': 0,
            'Towel': 0,
            'Hand Towel': 0,
            'Pillow Cover': 0,
            'Cushion Cover': 0,
            'Runner': 0
        },
        remarks: ''
    });

    // Attendance & Leave State
    const [attendanceLogs, setAttendanceLogs] = useState([
        { id: 1, staffName: 'Gaurav Panchal', date: '06-May', checkIn: '08:25 AM', checkOut: '06:35 PM', status: 'Present' },
        { id: 2, staffName: 'Arjun Tiwari', date: '06-May', checkIn: '08:55 AM', checkOut: '--', status: 'Present' },
        { id: 3, staffName: 'Ratnesh', date: '06-May', checkIn: '06:55 PM', checkOut: '--', status: 'Present' },
        { id: 4, staffName: 'Varun', date: '06-May', checkIn: '07:10 AM', checkOut: '11:15 AM', status: 'Present' },
        { id: 5, staffName: 'Karan', date: '06-May', checkIn: '08:05 AM', checkOut: '--', status: 'Present' },
        { id: 6, staffName: 'Amar Singh', date: '06-May', checkIn: '08:15 AM', checkOut: '--', status: 'Present' },
        { id: 7, staffName: 'Veerwati', date: '06-May', checkIn: '09:50 AM', checkOut: '--', status: 'Half-Day Leave' },
        { id: 8, staffName: 'Bhawna', date: '06-May', checkIn: '08:40 AM', checkOut: '05:10 PM', status: 'Present' },
        { id: 9, staffName: 'Amresh Kumar', date: '06-May', checkIn: '--', checkOut: '--', status: 'Present' },
    ]);

    const [holidays, setHolidays] = useState([
        { date: '15-Aug', event: 'Independence Day', type: 'National' },
        { date: '02-Oct', event: 'Gandhi Jayanti', type: 'National' },
        { date: '25-Dec', event: 'Christmas', type: 'Hotel Holiday' },
    ]);

    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [attendanceForm, setAttendanceForm] = useState({ staffName: '', date: '', checkIn: '', checkOut: '', status: 'Present' });

    const [showStaffModal, setShowStaffModal] = useState(false);
    const [enrollmentForm, setEnrollmentForm] = useState({ name: '', role: '', department: 'reception', shift: '', phone: '', duties: '', photo: '' });

    const [activeAttendanceDate, setActiveAttendanceDate] = useState(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
    const [calendarView, setCalendarView] = useState('list'); // 'list' or 'grid'

    const roomRateData = [
        { rooms: '1, 5, 14', category: 'PREMIUM SUITE', min: 2500, max: 3500, color: '#d4af37' },
        { rooms: '2, 3, 4, 6, 7, 8, 9', category: 'EXECUTIVE DELUXE', min: 1500, max: 2500, color: '#3498db' },
        { rooms: '10, 11, 12', category: 'EXECUTIVE STANDARD', min: 1500, max: 2500, color: '#27ae60' },
        { rooms: '16, 17, 19, 20', category: 'BUDGET COMFORT', min: 1200, max: 1800, color: '#7f8c8d' }
    ];

    const handleShareRateCard = () => {
        let message = `*🏨 HOTEL SKY 5 - OFFICIAL RATE CARD*\n`;
        message += `------------------------------------\n`;
        roomRateData.forEach(tier => {
            message += `*${tier.category}*\n`;
            message += `Rooms: ${tier.rooms}\n`;
            message += `Rent: ₹${tier.min} - ₹${tier.max}\n`;
            message += `------------------------------------\n`;
        });
        message += `_Confidential for Reception Use Only_`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const handleShareAlert = (leave) => {
        const message = `*HOTEL SKY 5 - OFFICIAL ALERT*%0A------------------------------------%0A*Name:* ${leave.name}%0A*Schedule:* ${leave.shift}%0A*Context:* ${leave.location}%0A*Directive:* ${leave.remarks}%0A------------------------------------%0A_Authorized by Sky-Ops Center_`;
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

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
            checkOutTime: room.guest.checkOut || '',
            extraGuests: room.guest.extraGuests || '',
            gstEnabled: room.guest.gstEnabled !== undefined ? room.guest.gstEnabled : true,
            adults: room.guest.adults || 1,
            children: room.guest.children || 0
        } : { 
            name: '', 
            phone: '', 
            address: '', 
            advance: '', 
            advanceType: 'Cash', 
            foodBill: room.foodBill || '',
            checkInTime: defaultCheckIn,
            checkOutTime: '',
            extraGuests: '',
            gstEnabled: true,
            adults: 1,
            children: 0
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
                advanceType: guestForm.advanceType,
                extraGuests: guestForm.extraGuests,
                gstEnabled: guestForm.gstEnabled,
                adults: guestForm.adults,
                children: guestForm.children
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

    const handleSaveAttendance = () => {
        if (!attendanceForm.staffName || !attendanceForm.date) {
            alert("Staff Name and Date are required.");
            return;
        }
        const newLog = {
            id: attendanceLogs.length + 1,
            ...attendanceForm
        };
        setAttendanceLogs([...attendanceLogs, newLog]);
        setShowAttendanceModal(false);
        setAttendanceForm({ staffName: '', date: '', checkIn: '', checkOut: '', status: 'Present' });
    };

    const handleEnrollStaff = () => {
        if (!enrollmentForm.name || !enrollmentForm.role) {
            alert("Name and Role are required.");
            return;
        }
        
        const dept = enrollmentForm.department;
        const newId = `${dept.charAt(0).toUpperCase()}${staffRegistry[dept].length + 1}`;
        const newStaff = {
            id: newId,
            ...enrollmentForm
        };

        setStaffRegistry(prev => ({
            ...prev,
            [dept]: [...prev[dept], newStaff]
        }));

        // Also add to attendance logs as 'Pending' for today
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        setAttendanceLogs(prev => [...prev, { 
            id: prev.length + 1, 
            staffName: enrollmentForm.name, 
            date: today, 
            checkIn: '--', 
            checkOut: '--', 
            status: 'Pending' 
        }]);

        setShowStaffModal(false);
        setEnrollmentForm({ name: '', role: '', department: 'reception', shift: '', phone: '', duties: '' });
    };

    const handleExportAttendance = (type) => {
        const headers = ["ID", "Staff Name", "Date", "Check-In", "Check-Out", "Status"];
        let filteredLogs = [...attendanceLogs];
        
        const now = new Date();
        if (type === 'monthly') {
            const currentMonth = now.toLocaleDateString('en-GB', { month: 'short' });
            filteredLogs = attendanceLogs.filter(log => log.date.includes(currentMonth));
        } else if (type === 'yearly') {
            // Simplified for local state
            filteredLogs = [...attendanceLogs];
        }

        const rows = filteredLogs.map(log => [log.id, log.staffName, log.date, log.checkIn, log.checkOut, log.status]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `HotelSky5_Attendance_${type.toUpperCase()}_${now.toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleQuickCheckIn = (staffName) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const today = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        
        setAttendanceLogs(prev => {
            const index = prev.findIndex(l => l.staffName === staffName && l.date === today);
            if (index !== -1) {
                const newLogs = [...prev];
                newLogs[index] = { ...newLogs[index], checkIn: timeStr, status: 'Present' };
                return newLogs;
            }
            return [...prev, { id: prev.length + 1, staffName, date: today, checkIn: timeStr, checkOut: '--', status: 'Present' }];
        });
    };

    const handleQuickCheckOut = (staffName) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const today = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        
        setAttendanceLogs(prev => {
            const index = prev.findIndex(l => l.staffName === staffName && l.date === today);
            if (index !== -1) {
                const newLogs = [...prev];
                newLogs[index] = { ...newLogs[index], checkOut: timeStr };
                return newLogs;
            }
            return prev;
        });
    };

    const handleShareAttendanceWhatsApp = () => {
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const presentCount = attendanceLogs.filter(l => l.status === 'Present').length;
        const leaveCount = attendanceLogs.filter(l => l.status.includes('Leave')).length;
        
        let message = `*🏨 HOTEL SKY 5 - ATTENDANCE REPORT (${today})*\n\n`;
        message += `✅ *Present:* ${presentCount}\n`;
        message += `⚠️ *On Leave:* ${leaveCount}\n`;
        message += `📊 *Total Staff:* ${attendanceLogs.length}\n\n`;
        message += `*--- DAILY LEDGER ---*\n`;
        
        attendanceLogs.forEach(log => {
            message += `• ${log.staffName}: ${log.status} (${log.checkIn} - ${log.checkOut})\n`;
        });
        
        message += `\n_Generated by Sky-Ops Center_`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
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
        const encodedMessage = encodeURIComponent(
            `*Hotel Sky 5 - Housekeeping Verification*\n` +
            `------------------------------------\n` +
            `*Room:* ${log.roomNumber} (${log.roomType})\n` +
            `*Housekeeper:* ${log.staffName}\n` +
            `*In Time:* ${log.inTime}\n` +
            `*Out Time:* ${log.outTime}\n` +
            `*Missing Items:* ${log.missingItems}\n` +
            `*Remarks:* ${log.remarks || 'None'}\n` +
            `------------------------------------\n` +
            `_Generated via Sky-Ops Center_`
        );
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
                        @media print { .no-print { display: none !important; } }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; padding: 12px; background: #f4f4f4; border-radius: 8px; align-items: center; border: 1px solid #ddd; font-family: 'Inter', sans-serif;">
                        <div style="display: flex; gap: 10px;">
                            <button onclick="window.print()" style="padding: 10px 20px; background: #0a192f; color: #d4af37; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">🖨️ Print / Save PDF</button>
                            <button onclick="window.open('https://wa.me/?text=${encodedMessage}', '_blank')" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">💬 Share on WhatsApp</button>
                            <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">Close</button>
                        </div>
                        <div style="font-size: 10px; color: #555; font-weight: 700; text-align: center;">
                            💡 <b>To Share as PDF:</b> Click "Print / Save PDF" → Select "Save as PDF" as Destination → Upload/attach that PDF file to WhatsApp!
                        </div>
                    </div>
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
        const leftItems = [
            'A/c Remote + Cell',
            'Set-up Box Remote + Cell',
            'Cup/Glass',
            'Towel',
            'Bed Sheet',
            'Bucket / Mug / Stool',
            'Turn on TV/AC Prop. Working / Not'
        ];

        const rightItems = [
            'TV Remote + Cell',
            'Slippers',
            'Tea/Coffee/milk/Sugar/Green Tea',
            'Hand Towel',
            'Pillow - 2',
            'Toilet (Soap, Handwash, Shower gel)'
        ];

        let slipsHtml = '';
        for(let i = 0; i < 10; i++) {
            slipsHtml += `
                <div class="slip" style="border: 1.5px solid #000; padding: 6px 10px; display: flex; flex-direction: column; justify-content: space-between; background: white; box-sizing: border-box; page-break-inside: avoid; height: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 2px; margin-bottom: 2px; border-bottom: 1.5px solid #000;">
                        <div style="text-align: left; line-height: 1;">
                            <div style="font-size: 13px; font-weight: 900; color: #0a192f; font-family: 'Inter', sans-serif;">
                                SKY <span style="color: #d4af37;">5</span>
                            </div>
                            <div style="font-size: 6px; font-weight: 800; color: #0a192f; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 1px;">BOUTIQUE HOTEL</div>
                        </div>
                        <span style="font-family: 'Inter', sans-serif; font-size: 8px; font-weight: 900; color: #d4af37; letter-spacing: 0.5px; text-transform: uppercase; padding-bottom: 1px;">HOUSEKEEPING CHECKLIST</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 7.5px; font-weight: 800; margin-bottom: 4px; color: #000; border-bottom: 1px dashed #000; padding-bottom: 3px;">
                        <div>ROOM #: ________</div>
                        <div>CLEANING STAFF: ______________</div>
                        <div>Checkout DATE: ____________</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 0 8px; margin-bottom: 4px; flex: 1;">
                        <!-- Left Column -->
                        <div style="display: flex; flex-direction: column; gap: 2.5px;">
                            ${leftItems.map(item => `
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <div style="width: 8px; height: 8px; border: 1.2px solid #000; border-radius: 1px; flex-shrink: 0; background: white;"></div>
                                    <span style="font-size: 7px; font-weight: 800; text-transform: uppercase; color: #000; line-height: 1;">${item}</span>
                                </div>
                            `).join('')}
                        </div>
                        <!-- Right Column -->
                        <div style="display: flex; flex-direction: column; gap: 2.5px;">
                            ${rightItems.map(item => `
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <div style="width: 8px; height: 8px; border: 1.2px solid #000; border-radius: 1px; flex-shrink: 0; background: white;"></div>
                                    <span style="font-size: 7px; font-weight: 800; text-transform: uppercase; color: #000; line-height: 1;">${item}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div style="border-top: 1px dotted #000; padding-top: 2px;">
                        <div style="display: flex; justify-content: space-between; font-size: 7.5px; font-weight: 800; color: #000;">
                            <span>IN: ________</span>
                            <span>OUT: ________</span>
                            <span>SUPERVISOR: ________________</span>
                        </div>
                    </div>
                </div>
            `;
        }

        const allItems = [...leftItems, ...rightItems];
        const shareMessage = `*🏨 HOTEL SKY 5 - HOUSEKEEPING CHECKLIST* 🏨\n` +
            `------------------------------------\n` +
            allItems.map((item, idx) => `[ ] ${idx + 1}. ${item.toUpperCase()}`).join('\n') + `\n` +
            `------------------------------------\n` +
            `_Date:_ ___________________\n` +
            `_Room No:_ _______________\n` +
            `_Staff Name:_ ____________\n` +
            `_In Time:_ _______________\n` +
            `_Out Time:_ ______________\n` +
            `_Supervisor Sig:_ _________\n\n` +
            `_Generated by Sky-Ops Center_`;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Blank Housekeeping Slips (A4 - 10 per page)</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
                        html, body {
                            height: 100vh;
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                            overflow: hidden;
                        }
                        body {
                            font-family: 'Inter', sans-serif;
                            padding: 10px;
                            background: #fff;
                            color: #000;
                        }
                        .top-header {
                            text-align: center;
                            margin-bottom: 10px;
                            font-weight: 800;
                            font-size: 13px;
                            text-transform: uppercase;
                            border-bottom: 2px dashed #000;
                            padding-bottom: 5px;
                            font-family: 'Inter', sans-serif;
                            height: 25px;
                            box-sizing: border-box;
                        }
                        .slips-container {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            grid-template-rows: repeat(5, 1fr);
                            gap: 8px;
                            height: calc(100vh - 65px);
                            box-sizing: border-box;
                        }
                        @media print {
                            .no-print { display: none !important; }
                            body {
                                padding: 5px;
                                margin: 0;
                                height: 100vh;
                                box-sizing: border-box;
                                overflow: hidden;
                            }
                            .slips-container {
                                height: calc(100vh - 40px);
                                gap: 6px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; padding: 12px; background: #f4f4f4; border-radius: 8px; align-items: center; border: 1px solid #ddd; font-family: 'Inter', sans-serif; box-sizing: border-box;">
                        <div style="display: flex; gap: 10px;">
                            <button onclick="window.print()" style="padding: 6px 15px; background: #0a192f; color: #d4af37; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">🖨️ Print / Save PDF</button>
                            <button onclick="window.open('https://wa.me/?text=${encodeURIComponent(shareMessage)}', '_blank')" style="padding: 6px 15px; background: #25D366; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">💬 Share on WhatsApp</button>
                            <button onclick="window.close()" style="padding: 6px 15px; background: #666; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">Close</button>
                        </div>
                        <div style="font-size: 10px; color: #555; font-weight: 700; text-align: center;">
                            💡 <b>To Share as PDF:</b> Click "Print / Save PDF" → Select "Save as PDF" as Destination → Upload/attach that PDF file to WhatsApp!
                        </div>
                    </div>
                    <div class="top-header">Checking Date: ____/____/________</div>
                    <div class="slips-container">
                        ${slipsHtml}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePrintBlankLaundryCoupons = () => {
        const printWindow = window.open('', '_blank');
        const items = [
            'Double Bed Sheet',
            'Quilt Cover',
            'Towel',
            'Hand Towel',
            'Pillow Cover',
            'Cushion Cover',
            'Runner'
        ];

        let couponsHtml = '';
        for(let i = 0; i < 6; i++) {
            couponsHtml += `
                <div class="coupon" style="border: 2px solid #000; padding: 12px 15px; display: flex; flex-direction: column; justify-content: space-between; background: white; box-sizing: border-box; page-break-inside: avoid; height: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 4px; margin-bottom: 6px; border-bottom: 2px solid #000;">
                        <div style="text-align: left; line-height: 1.1;">
                            <div style="font-size: 16px; font-weight: 900; color: #0a192f; font-family: 'Inter', sans-serif; letter-spacing: 0.5px;">
                                SKY <span style="color: #d4af37;">5</span>
                            </div>
                            <div style="font-size: 7px; font-weight: 800; color: #0a192f; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px;">BOUTIQUE HOTEL</div>
                        </div>
                        <span style="font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 900; color: #0a192f; letter-spacing: 1px; text-transform: uppercase; padding-bottom: 2px; border-bottom: 2px solid #d4af37;">LAUNDRY SERVICE</span>
                        <div style="font-size: 8px; font-weight: 800; color: #000;">DATE: ____/____/____</div>
                    </div>


                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; flex: 1;">
                        <thead>
                            <tr style="border-bottom: 1.5px solid #000; text-align: left; font-size: 8px; font-weight: 900;">
                                <th style="padding: 3px 0; color: #000; text-transform: uppercase;">Laundry Item</th>
                                <th style="text-align: right; padding: 3px 0; color: #000; text-transform: uppercase; width: 80px;">Pick Up Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr style="border-bottom: 1px dashed #ccc; font-size: 9px; font-weight: 800;">
                                    <td style="padding: 4px 0; color: #000; text-transform: uppercase;">• ${item}</td>
                                    <td style="text-align: right; padding: 4px 0; color: #000;">________________</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div style="border-top: 1.5px solid #000; padding-top: 6px; margin-top: auto;">
                        <div style="display: flex; justify-content: space-between; font-size: 8.5px; font-weight: 800; color: #000;">
                            <span>Picked up By: ____________________</span>
                            <span>Supervisor: ____________________</span>
                        </div>
                    </div>
                </div>
            `;
        }

        const shareMessage = `*🏨 HOTEL SKY 5 - LAUNDRY SERVICE COUPON* 🏨\n` +
            `------------------------------------\n` +
            items.map((item, idx) => `${idx + 1}. ${item.toUpperCase()}: [ Qty: ___ ]`).join('\n') + `\n` +
            `------------------------------------\n` +
            `_Date:_ ___________________\n` +
            `_Picked up By:_ ___________\n` +
            `_Supervisor Sig:_ _________\n\n` +
            `_Generated by Sky-Ops Center_`;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Blank Laundry Service Coupons (A4 - 6 per page)</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
                        html, body {
                            height: 100vh;
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                            overflow: hidden;
                        }
                        body {
                            font-family: 'Inter', sans-serif;
                            padding: 15px;
                            background: #fff;
                            color: #000;
                        }
                        .coupons-container {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            grid-template-rows: repeat(3, 1fr);
                            gap: 15px;
                            height: calc(100vh - 55px);
                            box-sizing: border-box;
                        }
                        @media print {
                            .no-print { display: none !important; }
                            body {
                                padding: 10px;
                                margin: 0;
                                height: 100vh;
                                box-sizing: border-box;
                                overflow: hidden;
                            }
                            .coupons-container {
                                height: 100vh;
                                gap: 12px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; padding: 12px; background: #f4f4f4; border-radius: 8px; align-items: center; border: 1px solid #ddd; font-family: 'Inter', sans-serif; box-sizing: border-box;">
                        <div style="display: flex; gap: 10px;">
                            <button onclick="window.print()" style="padding: 6px 15px; background: #0a192f; color: #d4af37; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">🖨️ Print / Save PDF</button>
                            <button onclick="window.open('https://wa.me/?text=${encodeURIComponent(shareMessage)}', '_blank')" style="padding: 6px 15px; background: #25D366; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">💬 Share on WhatsApp</button>
                            <button onclick="window.close()" style="padding: 6px 15px; background: #666; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">Close</button>
                        </div>
                        <div style="font-size: 10px; color: #555; font-weight: 700; text-align: center;">
                            💡 <b>To Share as PDF:</b> Click "Print / Save PDF" → Select "Save as PDF" as Destination → Upload/attach that PDF file to WhatsApp!
                        </div>
                    </div>
                    <div class="coupons-container">
                        ${couponsHtml}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePrintLaundrySlip = (log) => {
        const printWindow = window.open('', '_blank');
        const itemsHtml = Object.entries(log.items || {})
            .map(([item, qty]) => `
                <tr style="border-bottom: 1px solid #eee; font-size: 14px;">
                    <td style="padding: 10px 0; color: #0a192f; font-weight: 600; text-transform: uppercase;">${item}</td>
                    <td style="text-align: right; padding: 10px 0; font-weight: 800; color: #0a192f;">${qty}</td>
                </tr>
            `).join('');

        const shareText = `*Hotel Sky 5 - Laundry Service Receipt*\n` +
            `------------------------------------\n` +
            `*Room:* ROOM ${log.roomNumber}\n` +
            `*Date:* ${log.date}\n` +
            `*Picked up By:* ${log.pickedUpBy}\n` +
            `*Supervisor:* ${log.supervisor}\n` +
            `------------------------------------\n` +
            Object.entries(log.items || {}).map(([item, qty]) => `• ${item.toUpperCase()}: ${qty}`).join('\n') + `\n` +
            `------------------------------------\n` +
            `*Remarks:* ${log.remarks || 'None'}\n` +
            `------------------------------------\n` +
            `_Generated via Sky-Ops Center_`;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Laundry Slip - Room ${log.roomNumber}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;600;800;900&display=swap');
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #0a192f; line-height: 1.6; }
                        .header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px; }
                        .hotel-name { font-family: 'Cinzel', serif; font-size: 28px; font-weight: bold; margin: 0; color: #0a192f; }
                        .slip-title { font-size: 12px; color: #d4af37; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px; font-weight: 800; }
                        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px; }
                        .item { border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
                        .label { font-size: 10px; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 1px; }
                        .value { font-size: 15px; font-weight: 600; color: #0a192f; }
                        .section-title { font-size: 10px; font-weight: 800; color: #0a192f; background: #f8f9fa; padding: 5px 10px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
                        .footer { margin-top: 60px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                        .signature-space { margin-top: 40px; display: flex; justify-content: space-between; }
                        .sig-line { border-top: 1px solid #333; width: 150px; text-align: center; font-size: 10px; padding-top: 5px; margin-top: 30px; }
                        @media print { .no-print { display: none !important; } }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; padding: 12px; background: #f4f4f4; border-radius: 8px; align-items: center; border: 1px solid #ddd;">
                        <div style="display: flex; gap: 10px;">
                            <button onclick="window.print()" style="padding: 10px 20px; background: #0a192f; color: #d4af37; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">🖨️ Print / Save PDF</button>
                            <button onclick="window.open('https://wa.me/?text=${encodeURIComponent(shareText)}', '_blank')" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">💬 Share on WhatsApp</button>
                            <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 12px;">Close</button>
                        </div>
                        <div style="font-size: 10px; color: #555; font-weight: 700; text-align: center;">
                            💡 <b>To Share as PDF:</b> Click "Print / Save PDF" → Select "Save as PDF" as Destination → Upload/attach that PDF file to WhatsApp!
                        </div>
                    </div>
                    
                    <div class="header" style="display: flex; align-items: center; justify-content: center; gap: 30px;">
                        <div style="display: inline-flex; align-items: center; background: #0a192f; padding: 10px 20px; border-radius: 12px; border-left: 4px solid #d4af37; min-width: fit-content;">
                            <div style="display: flex; flex-direction: column; line-height: 1.1; text-align: left;">
                                <div style="font-size: 14px; color: white; letter-spacing: 1px; font-weight: 500; text-transform: uppercase;">Hotel</div>
                                <div style="display: flex; align-items: baseline; gap: 8px;">
                                    <div style="font-size: 30px; font-weight: 900; color: #d4af37; font-family: 'Cinzel', serif; letter-spacing: 2px;">SKY</div>
                                    <div style="font-size: 42px; font-weight: 900; color: #d4af37; font-family: 'Cinzel', serif;">5</div>
                                </div>
                            </div>
                        </div>
                        <div class="slip-title" style="margin-top: 0; padding-top: 5px;">Laundry service coupon</div>
                    </div>

                    <div class="section-title">Service Details</div>
                    <div class="details-grid">
                        <div class="item"><div class="label">Room Number</div><div class="value">ROOM ${log.roomNumber}</div></div>
                        <div class="item"><div class="label">Date & Time</div><div class="value">${log.date}</div></div>
                        <div class="item"><div class="label">Picked Up By</div><div class="value">${log.pickedUpBy}</div></div>
                        <div class="item"><div class="label">Supervisor</div><div class="value">${log.supervisor}</div></div>
                    </div>

                    <div class="section-title">Picked Up Linen Quantities</div>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                        <thead>
                            <tr style="border-bottom: 2px solid #0a192f; text-align: left; font-size: 12px; font-weight: 800;">
                                <th style="padding: 10px 0; color: #0a192f;">Linen Item</th>
                                <th style="text-align: right; padding: 10px 0; color: #0a192f; width: 100px;">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="section-title">Remarks / Instructions</div>
                    <div style="padding: 15px; background: #fafafa; border-radius: 8px; border-left: 4px solid #d4af37; font-style: italic; font-size: 14px;">
                        ${log.remarks || 'No special instructions.'}
                    </div>

                    <div class="signature-space">
                        <div class="sig-line">Picked Up By Signature</div>
                        <div class="sig-line">Supervisor / Manager</div>
                    </div>

                    <div class="footer">
                        LAUNDRY SERVICE RECEIPT • GENERATED BY Sky-Ops Center<br>
                        "Cleanliness & Comfort, Delivered with Care"
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleShareLaundryWhatsApp = (log) => {
        const text = `*Hotel Sky 5 - Laundry Pickup*\n` +
            `------------------------------------\n` +
            `*Room:* ROOM ${log.roomNumber}\n` +
            `*Date:* ${log.date}\n` +
            `*Picked up By:* ${log.pickedUpBy}\n` +
            `*Supervisor:* ${log.supervisor}\n` +
            `------------------------------------\n` +
            Object.entries(log.items || {}).map(([item, qty]) => `• ${item.toUpperCase()}: ${qty}`).join('\n') + `\n` +
            `------------------------------------\n` +
            `*Remarks:* ${log.remarks || 'None'}\n` +
            `------------------------------------\n` +
            `_Generated via Sky-Ops Center_`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleStartLaundry = (room) => {
        const now = new Date();
        const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ", " + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setLaundryForm({
            roomNumber: room.id,
            pickedUpBy: '',
            supervisor: '',
            date: timeStr,
            items: {
                'Double Bed Sheet': 0,
                'Quilt Cover': 0,
                'Towel': 0,
                'Hand Towel': 0,
                'Pillow Cover': 0,
                'Cushion Cover': 0,
                'Runner': 0
            },
            remarks: ''
        });
        setLaundryRoom(room);
    };

    const handleEditLaundryLog = (log) => {
        setLaundryForm({
            roomNumber: log.roomNumber,
            pickedUpBy: log.pickedUpBy,
            supervisor: log.supervisor,
            date: log.date,
            items: {
                'Double Bed Sheet': log.items['Double Bed Sheet'] || 0,
                'Quilt Cover': log.items['Quilt Cover'] || 0,
                'Towel': log.items['Towel'] || 0,
                'Hand Towel': log.items['Hand Towel'] || 0,
                'Pillow Cover': log.items['Pillow Cover'] || 0,
                'Cushion Cover': log.items['Cushion Cover'] || 0,
                'Runner': log.items['Runner'] || 0
            },
            remarks: log.remarks || ''
        });
        setEditingLaundryLog(log);
        const room = rooms.find(r => r.id === Number(log.roomNumber)) || { id: Number(log.roomNumber), type: 'Deluxe' };
        setLaundryRoom(room);
    };

    const handleSaveLaundry = () => {
        if (!laundryForm.pickedUpBy.trim()) {
            alert("Staff name (Picked Up By) is required.");
            return;
        }

        const now = new Date();
        const dateStr = laundryForm.date || (now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ", " + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

        const nonZeroItems = {};
        Object.entries(laundryForm.items).forEach(([item, qty]) => {
            if (Number(qty) > 0) {
                nonZeroItems[item] = Number(qty);
            }
        });

        if (editingLaundryLog) {
            setLaundryLogs(prev => prev.map(log => log.id === editingLaundryLog.id ? {
                ...log,
                roomNumber: Number(laundryForm.roomNumber),
                pickedUpBy: laundryForm.pickedUpBy,
                supervisor: laundryForm.supervisor || 'Manager',
                date: dateStr,
                items: nonZeroItems,
                remarks: laundryForm.remarks
            } : log));
            setEditingLaundryLog(null);
        } else {
            const newLog = {
                id: Date.now(),
                roomNumber: Number(laundryForm.roomNumber),
                pickedUpBy: laundryForm.pickedUpBy,
                supervisor: laundryForm.supervisor || 'Manager',
                date: dateStr,
                items: nonZeroItems,
                remarks: laundryForm.remarks
            };
            setLaundryLogs(prev => [newLog, ...prev]);
        }

        setLaundryRoom(null);
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
                    {['Reception', 'Kitchen', 'Cleaning', 'Laundry', 'Workforce', 'Attendance', 'Finance', 'Menu Config'].map(tab => (
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
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-navy)' }}>
                        {activeTab === 'Attendance' ? 'Personnel Attendance' : `${activeTab} Dashboard`}
                    </h1>
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
                        
                        {/* Front Desk Rate Card Overlay - New Feature */}
                        <div style={{ background: 'white', borderRadius: '25px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', marginBottom: '30px', borderLeft: '8px solid var(--accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--primary-navy)', fontSize: '1.1rem', fontFamily: 'Cinzel, serif' }}>📋 RECEPTION RATE CARD</h3>
                                    <div style={{ fontSize: '0.7rem', color: '#888' }}>Authorized Rent Ranges for All Rooms</div>
                                </div>
                                <button onClick={handleShareRateCard} style={{ background: '#25D366', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    🟢 SHARE RATES
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                                {roomRateData.map((tier, i) => (
                                    <div key={i} style={{ padding: '12px', background: '#f8f9fa', borderRadius: '12px', border: `1px solid ${tier.color}44` }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: '900', color: tier.color, textTransform: 'uppercase' }}>{tier.category}</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary-navy)', margin: '4px 0' }}>₹{tier.min} - ₹{tier.max}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#666' }}>Rooms: {tier.rooms}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

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
                                                    )}
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

                {activeTab === 'Laundry' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {/* Summary & Printable Slips Section */}
                        <section>
                            <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-navy)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                🧺 Laundry Service Control
                            </h2>
                            
                            {/* Laundry Items Grid Display */}
                            <div style={{ background: '#0a192f', color: 'white', padding: '25px', borderRadius: '20px', marginBottom: '30px', borderLeft: '8px solid var(--accent)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ margin: '0 0 15px 0', color: 'var(--accent)', fontSize: '1rem', letterSpacing: '1px' }}>🧺 REGISTERED LAUNDRY ITEMS (COUPON FORM)</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                                    {laundryItems.map((item, idx) => (
                                        <div key={idx} style={{ fontSize: '0.75rem', fontWeight: '700', background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                                <button 
                                    onClick={handlePrintBlankLaundryCoupons}
                                    style={{ padding: '12px 25px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(212,175,55,0.2)' }}
                                >
                                    🖨️ PRINT BLANK LAUNDRY COUPONS (A4)
                                </button>
                                <button 
                                    onClick={() => handleStartLaundry({ id: '' })}
                                    style={{ padding: '12px 25px', background: 'var(--primary-navy)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                                >
                                    ➕ RECORD NEW LAUNDRY PICKUP
                                </button>
                            </div>

                            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-navy)', marginBottom: '15px' }}>Select Room to Record Pickup:</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                                {rooms.filter(r => r.status === 'Occupied').map(room => (
                                    <div key={room.id} style={{ background: 'white', borderRadius: '14px', padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: '5px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: '800', color: 'var(--primary-navy)' }}>Room {room.id}</span>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#27ae60', background: '#eafaf1', padding: '2px 8px', borderRadius: '8px' }}>OCCUPIED</span>
                                        </div>
                                        <button 
                                            onClick={() => handleStartLaundry(room)}
                                            style={{ padding: '8px', background: 'var(--primary-navy)', color: 'var(--accent)', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                                        >
                                            RECORD PICKUP
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* History Table Section */}
                        <section style={{ background: 'white', borderRadius: '25px', padding: '35px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-navy)', marginBottom: '25px' }}>Laundry Collection Logs</h2>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left' }}>
                                            <th style={{ padding: '15px', color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>ROOM #</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>DATE & TIME</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>PICKED UP BY</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>SUPERVISOR</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>ITEMS SUMMARY</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>REMARKS</th>
                                            <th style={{ color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {laundryLogs.map(log => (
                                            <tr key={log.id} style={{ background: '#f8f9fa', borderRadius: '12px' }}>
                                                <td style={{ padding: '15px', fontWeight: '800', color: 'var(--primary-navy)', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>Room {log.roomNumber}</td>
                                                <td style={{ fontSize: '0.85rem', color: '#666' }}>{log.date}</td>
                                                <td style={{ fontWeight: '600' }}>{log.pickedUpBy}</td>
                                                <td style={{ fontWeight: '600' }}>{log.supervisor}</td>
                                                <td style={{ fontSize: '0.85rem' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                        {Object.entries(log.items || {}).map(([item, qty]) => (
                                                            <span key={item} style={{ background: '#eaf2f8', color: '#2980b9', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                                {qty}x {item}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: '#555', fontStyle: 'italic' }}>{log.remarks || '-'}</td>
                                                <td style={{ borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => handleEditLaundryLog(log)}
                                                            style={{ background: 'transparent', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--primary-navy)', fontWeight: 'bold', fontSize: '0.75rem' }}
                                                        >
                                                            EDIT
                                                        </button>
                                                        <button 
                                                            onClick={() => handlePrintLaundrySlip(log)}
                                                            style={{ background: '#f8f9fa', border: '1px solid #d4af37', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', color: '#0a192f', fontWeight: 'bold', fontSize: '0.75rem' }}
                                                        >
                                                            🖨️ PRINT
                                                        </button>
                                                        <button 
                                                            onClick={() => handleShareLaundryWhatsApp(log)}
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

                {activeTab === 'Attendance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {/* Attendance Header Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid #2ecc71' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Present Today</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)' }}>{attendanceLogs.filter(l => l.status === 'Present').length} STAFF</div>
                            </div>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid #f1c40f' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>On Leave</h4>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-navy)' }}>{staffRegistry.special.filter(s => s.name.includes('Leave')).length} STAFF</div>
                            </div>
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', borderLeft: '6px solid #3498db' }}>
                                <h4 style={{ margin: 0, color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Upcoming Holiday</h4>
                                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary-navy)', marginTop: '5px' }}>{holidays[0].event} ({holidays[0].date})</div>
                            </div>
                        </div>

                        {/* Professional Daily Attendance Ledger */}
                        <div style={{ background: 'white', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--primary-navy)', fontSize: '1.4rem', fontFamily: 'Cinzel, serif' }}>FORENSIC ATTENDANCE REGISTER</h3>
                                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '5px' }}>Audit Date: <b style={{ color: 'var(--primary-navy)' }}>{activeAttendanceDate} 2026</b></div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => handleExportAttendance('daily')}
                                            style={{ background: '#f8f9fa', color: 'var(--primary-navy)', border: '1px solid #e0e0e0', padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            📅 DAILY
                                        </button>
                                        <button 
                                            onClick={() => handleExportAttendance('monthly')}
                                            style={{ background: '#f8f9fa', color: 'var(--primary-navy)', border: '1px solid #e0e0e0', padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            📊 MONTHLY
                                        </button>
                                        <button 
                                            onClick={() => handleExportAttendance('yearly')}
                                            style={{ background: '#f8f9fa', color: 'var(--primary-navy)', border: '1px solid #e0e0e0', padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            📁 YEARLY
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setShowStaffModal(true)}
                                        style={{ background: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 15px rgba(52,152,219,0.2)' }}
                                    >
                                        + ENROLL STAFF
                                    </button>
                                    <button 
                                        onClick={() => setShowAttendanceModal(true)}
                                        style={{ background: 'var(--primary-navy)', color: 'var(--accent)', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 15px rgba(0,33,71,0.2)' }}
                                    >
                                        + MANUAL LOG
                                    </button>
                                </div>
                            </div>

                        <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>
                                            <th style={{ padding: '20px 15px', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Staff Identity</th>
                                            <th style={{ padding: '20px 15px', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Department</th>
                                            <th style={{ padding: '20px 15px', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Scheduled Shift</th>
                                            <th style={{ padding: '20px 15px', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Actual Check-In</th>
                                            <th style={{ padding: '20px 15px', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Check-Out</th>
                                            <th style={{ padding: '20px 15px', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Performance</th>
                                            <th style={{ padding: '20px 15px', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceLogs.map(log => {
                                            const staffInfo = [...staffRegistry.reception, ...staffRegistry.kitchen, ...staffRegistry.housekeeping].find(s => s.name === log.staffName);
                                            const dept = staffRegistry.reception.find(s => s.name === log.staffName) ? 'Reception' : 
                                                         staffRegistry.kitchen.find(s => s.name === log.staffName) ? 'Kitchen' : 'Housekeeping';
                                            
                                            // Simple Punctuality Logic
                                            let performance = "On Time";
                                            let perfColor = "#27ae60";
                                            if (log.checkIn !== '--') {
                                                const checkInTime = log.checkIn.split(' ')[0];
                                                const shiftStart = staffInfo?.shift?.split(' – ')[0] || staffInfo?.shift?.split(' TO ')[0] || "09:00 AM";
                                                // Forensic comparison would happen here
                                            }

                                            return (
                                                <tr key={log.id} style={{ borderBottom: '1px solid #f9f9f9', transition: 'background 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fcfcfc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '18px 15px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eee', overflow: 'hidden', border: '1px solid #ddd' }}>
                                                                <img src={staffInfo?.photo || `https://ui-avatars.com/api/?name=${log.staffName}&background=random`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="staff" />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 'bold', color: 'var(--primary-navy)', fontSize: '1rem' }}>{log.staffName}</div>
                                                                <div style={{ fontSize: '0.7rem', color: '#888' }}>ID: EMP-00{log.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '18px 15px' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#555', background: '#f0f2f5', padding: '4px 10px', borderRadius: '6px' }}>{dept.toUpperCase()}</span>
                                                    </td>
                                                    <td style={{ padding: '18px 15px', fontSize: '0.85rem', color: '#666' }}>{staffInfo?.shift || 'Flexible'}</td>
                                                    <td style={{ padding: '18px 15px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontWeight: '800', color: log.checkIn === '--' ? '#ccc' : '#27ae60', fontSize: '0.95rem' }}>{log.checkIn}</span>
                                                            {log.checkIn === '--' && (
                                                                <button onClick={() => handleQuickCheckIn(log.staffName)} style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}>CHECK-IN</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '18px 15px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontWeight: '800', color: log.checkOut === '--' ? '#ccc' : '#e67e22', fontSize: '0.95rem' }}>{log.checkOut}</span>
                                                            {log.checkIn !== '--' && log.checkOut === '--' && (
                                                                <button onClick={() => handleQuickCheckOut(log.staffName)} style={{ background: '#fff3e0', color: '#e65100', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}>CHECK-OUT</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '18px 15px' }}>
                                                        {log.status === 'Present' ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27ae60' }}></div>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#27ae60' }}>EXCELLENT</span>
                                                            </div>
                                                        ) : log.status === 'Half-Day Leave' ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e67e22' }}></div>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#e67e22' }}>PLANNED</span>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '0.8rem', color: '#ccc' }}>--</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '18px 15px' }}>
                                                        <span style={{ 
                                                            fontSize: '0.7rem', 
                                                            padding: '6px 12px', 
                                                            borderRadius: '20px', 
                                                            background: log.status === 'Present' ? '#e8f5e9' : log.status === 'Half-Day Leave' ? '#fff3e0' : '#f5f5f5', 
                                                            color: log.status === 'Present' ? '#2e7d32' : log.status === 'Half-Day Leave' ? '#e65100' : '#757575', 
                                                            fontWeight: '900',
                                                            border: `1px solid ${log.status === 'Present' ? '#c8e6c9' : log.status === 'Half-Day Leave' ? '#ffe0b2' : '#e0e0e0'}`,
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            {log.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Leaves & Holidays Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                            {/* Approved Leaves */}
                            <div style={{ background: 'white', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                                <h3 style={{ margin: '0 0 20px 0', color: 'var(--primary-navy)', fontSize: '1.1rem' }}>📜 Approved Leaves & Alerts</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {staffRegistry.special.map(leave => (
                                        <div key={leave.id} style={{ 
                                            padding: '15px', 
                                            borderRadius: '15px', 
                                            background: leave.name.includes('MD Sir') ? '#fffdf0' : '#fcfcfc', 
                                            border: `1px solid ${leave.name.includes('MD Sir') ? '#d4af37' : '#eee'}`, 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            boxShadow: leave.name.includes('MD Sir') ? '0 5px 15px rgba(212, 175, 55, 0.1)' : 'none'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: leave.name.includes('MD Sir') ? '#b8860b' : 'var(--primary-navy)' }}>
                                                    {leave.name.includes('MD Sir') ? '👑 ' : ''}{leave.name}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#888' }}>Reason: {leave.location}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: leave.name.includes('MD Sir') ? '#b8860b' : '#e74c3c' }}>{leave.shift}</div>
                                                <div style={{ 
                                                    fontSize: '0.65rem', 
                                                    background: leave.name.includes('MD Sir') ? '#d4af37' : '#fadbd8', 
                                                    color: leave.name.includes('MD Sir') ? 'white' : '#c0392b', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '5px', 
                                                    marginTop: '4px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {leave.name.includes('MD Sir') ? 'EXECUTIVE' : 'OFFICIAL'}
                                                </div>
                                                <button 
                                                    onClick={() => handleShareAlert(leave)}
                                                    style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 'bold', marginTop: '8px', cursor: 'pointer', display: 'block', marginLeft: 'auto' }}
                                                >
                                                    SHARE 🟢
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Holiday & Attendance Calendar */}
                            <div style={{ background: '#0a192f', borderRadius: '25px', padding: '30px', color: 'white', minHeight: '400px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.1rem' }}>🗓️ Sky-Ops Interactive Calendar</h3>
                                    <div style={{ display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.1)', padding: '5px', borderRadius: '8px' }}>
                                        <button onClick={() => setCalendarView('grid')} style={{ background: calendarView === 'grid' ? 'var(--accent)' : 'transparent', border: 'none', color: calendarView === 'grid' ? 'var(--primary-navy)' : 'white', padding: '5px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>GRID</button>
                                        <button onClick={() => setCalendarView('list')} style={{ background: calendarView === 'list' ? 'var(--accent)' : 'transparent', border: 'none', color: calendarView === 'list' ? 'var(--primary-navy)' : 'white', padding: '5px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>LIST</button>
                                    </div>
                                </div>

                                {calendarView === 'grid' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: '800', color: '#8892b0', paddingBottom: '5px' }}>{d}</div>)}
                                        {Array.from({ length: 31 }).map((_, i) => {
                                            const day = i + 1;
                                            const dateStr = `${day.toString().padStart(2, '0')}-May`;
                                            const isHoliday = holidays.find(h => h.date.startsWith(day.toString().padStart(2, '0')));
                                            const isActive = activeAttendanceDate === dateStr;
                                            
                                            return (
                                                <div 
                                                    key={i} 
                                                    onClick={() => setActiveAttendanceDate(dateStr)}
                                                    style={{ 
                                                        height: '45px', 
                                                        background: isActive ? 'var(--accent)' : isHoliday ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.03)', 
                                                        borderRadius: '10px', 
                                                        display: 'flex', 
                                                        flexDirection: 'column',
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        cursor: 'pointer',
                                                        border: isActive ? 'none' : isHoliday ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                                                        transition: 'all 0.3s'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isActive ? 'var(--primary-navy)' : isHoliday ? 'var(--accent)' : 'white' }}>{day}</span>
                                                    {isHoliday && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isActive ? 'var(--primary-navy)' : 'var(--accent)', marginTop: '2px' }}></div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {holidays.map((h, idx) => (
                                            <div key={idx} style={{ padding: '15px', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{h.event}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#8892b0' }}>{h.type}</div>
                                                </div>
                                                <div style={{ fontWeight: '800', color: 'white' }}>{h.date}</div>
                                            </div>
                                        ))}
                                        <div style={{ marginTop: '10px', padding: '15px', borderRadius: '15px', border: '1px dashed rgba(255,255,255,0.2)', textAlign: 'center', fontSize: '0.75rem', color: '#8892b0' }}>
                                            Select GRID mode for interactive day-wise logs
                                        </div>
                                    </div>
                                )}
                            </div>
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

            {/* Modals & Overlays Group */}
            <div className="modals-overlay">
                
                {/* Guest Dossier / Registration Modal */}
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
                            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                                <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Primary Guest Identity <span style={{color: '#e74c3c'}}>*</span></label>
                                <input 
                                    type="text" 
                                    value={guestForm.name} 
                                    onChange={(e) => setGuestForm({...guestForm, name: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box' }}
                                    placeholder="Lead Guest Full Name"
                                />
                            </div>

                            {/* Granular Occupancy Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Adult Occupants</label>
                                    <select 
                                        value={guestForm.adults} 
                                        onChange={(e) => setGuestForm({...guestForm, adults: Number(e.target.value)})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none', fontWeight: 'bold' }}
                                    >
                                        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Adult(s)</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Child Occupants</label>
                                    <select 
                                        value={guestForm.children} 
                                        onChange={(e) => setGuestForm({...guestForm, children: Number(e.target.value)})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none', fontWeight: 'bold' }}
                                    >
                                        {[0,1,2,3,4].map(n => <option key={n} value={n}>{n} Child(ren)</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Contact Number & Communication</label>
                                <input 
                                    type="text" 
                                    value={guestForm.phone} 
                                    onChange={(e) => setGuestForm({...guestForm, phone: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box' }}
                                    placeholder="Verified Mobile Number"
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
                            {/* Tax Config & Person-Wise Ledger */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary-navy)' }}>GST TAXATION ENABLED</span>
                                <div 
                                    onClick={() => setGuestForm({...guestForm, gstEnabled: !guestForm.gstEnabled})}
                                    style={{ width: '50px', height: '26px', background: guestForm.gstEnabled ? '#2ecc71' : '#bdc3c7', borderRadius: '13px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                                >
                                    <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: guestForm.gstEnabled ? '27px' : '3px', transition: 'left 0.3s' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Occupant Ledger (Person-Wise Names)</label>
                                <textarea 
                                    value={guestForm.extraGuests} 
                                    onChange={(e) => setGuestForm({...guestForm, extraGuests: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '0.9rem', color: '#333', outline: 'none', boxSizing: 'border-box', minHeight: '60px' }}
                                    placeholder="List all adult & child names staying in the room..."
                                />
                            </div>

                            {/* Forensic Tax Summary Panel */}
                            <div style={{ background: '#0a192f', padding: '25px', borderRadius: '20px', color: 'white', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '12px' }}>
                                    <span style={{ color: '#8892b0' }}>Base Room Rent:</span>
                                    <span style={{ fontWeight: 'bold' }}>₹{editingRoom.price.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '12px' }}>
                                    <span style={{ color: '#8892b0' }}>Sky Kitchen (Dining):</span>
                                    <span style={{ fontWeight: 'bold' }}>₹{(Number(guestForm.foodBill) || 0).toLocaleString()}</span>
                                </div>
                                {guestForm.gstEnabled && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                                        <span>GST Applied (12%):</span>
                                        <span style={{ fontWeight: 'bold' }}>₹{Math.round((editingRoom.price + (Number(guestForm.foodBill) || 0)) * 0.12).toLocaleString()}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: '900', marginTop: '10px' }}>
                                    <span style={{ color: '#fff' }}>TOTAL BILLED:</span>
                                    <span style={{ color: 'var(--accent)' }}>₹{Math.round((editingRoom.price + (Number(guestForm.foodBill) || 0)) * (guestForm.gstEnabled ? 1.12 : 1.0)).toLocaleString()}</span>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#8892b0', marginTop: '10px', textAlign: 'center', letterSpacing: '1px' }}>
                                    {guestForm.gstEnabled ? 'INCLUSIVE OF ALL APPLICABLE TAXES' : 'EXCLUDING GST AS PER OPERATIONAL OVERRIDE'}
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <button 
                                    style={{ width: '100%', padding: '15px', background: 'var(--accent)', border: 'none', borderRadius: '12px', color: 'var(--primary-navy)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(212,175,55,0.2)' }}
                                    onClick={() => setShowBill(true)}
                                >
                                    📄 GENERATE PRINTABLE BILL
                                </button>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button style={{ flex: 1, padding: '15px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '12px', color: '#555', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', fontSize: '0.9rem', letterSpacing: '1px' }} onClick={() => setEditingRoom(null)}>CANCEL</button>
                                    <button style={{ flex: 1, padding: '15px', background: 'var(--primary-navy)', border: 'none', borderRadius: '12px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', fontSize: '0.9rem', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(0,33,71,0.2)' }} onClick={handleSaveGuest}>AUTHORIZE & SAVE</button>
                                </div>
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

            {/* Laundry Entry Modal */}
            {laundryRoom && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 33, 71, 0.8)', display: 'flex', alignItems: 'center', justifycontent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '500px', maxHeight: '90vh', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: 'var(--primary-navy)', padding: '25px 30px', borderBottom: '3px solid var(--accent)' }}>
                            <h2 style={{ margin: '0', color: 'white', fontFamily: 'Cinzel, serif', fontSize: '1.6rem', letterSpacing: '1px' }}>LAUNDRY PICKUP</h2>
                            <div style={{ color: 'var(--accent)', fontSize: '0.9rem', marginTop: '5px' }}>ROOM {laundryRoom.id || 'N/A'} • SERVICE DETAILS</div>
                        </div>

                        <div style={{ padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Room Number <span style={{color: '#e74c3c'}}>*</span></label>
                                    <input 
                                        type="number" 
                                        value={laundryForm.roomNumber} 
                                        onChange={(e) => setLaundryForm({...laundryForm, roomNumber: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none' }}
                                        placeholder="Room #"
                                    />
                                </div>
                                <div style={{ flex: 1.5 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Picked Up By <span style={{color: '#e74c3c'}}>*</span></label>
                                    <select 
                                        value={laundryForm.pickedUpBy} 
                                        onChange={(e) => setLaundryForm({...laundryForm, pickedUpBy: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="">Select Staff</option>
                                        {staffRegistry.housekeeping.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1.2 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Date & Time</label>
                                    <input 
                                        type="text" 
                                        value={laundryForm.date} 
                                        onChange={(e) => setLaundryForm({...laundryForm, date: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Supervisor</label>
                                    <input 
                                        type="text" 
                                        value={laundryForm.supervisor} 
                                        onChange={(e) => setLaundryForm({...laundryForm, supervisor: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none' }}
                                        placeholder="Supervisor"
                                    />
                                </div>
                            </div>

                            {/* Linen Item Quantities */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', marginBottom: '10px', color: 'var(--primary-navy)', textTransform: 'uppercase', borderBottom: '2px solid #f0f0f0', paddingBottom: '5px' }}>Linen Pickup Quantities</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                                    {laundryItems.map(item => (
                                        <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9fa', padding: '10px 15px', borderRadius: '10px', border: '1px solid #eee' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#333' }}>{item}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button 
                                                    onClick={() => {
                                                        const currentVal = laundryForm.items[item] || 0;
                                                        if (currentVal > 0) {
                                                            setLaundryForm({
                                                                ...laundryForm,
                                                                items: { ...laundryForm.items, [item]: currentVal - 1 }
                                                            });
                                                        }
                                                    }}
                                                    style={{ width: '25px', height: '25px', borderRadius: '5px', border: '1px solid #ccc', background: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                                >-</button>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={laundryForm.items[item] || 0}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        setLaundryForm({
                                                            ...laundryForm,
                                                            items: { ...laundryForm.items, [item]: val }
                                                        });
                                                    }}
                                                    style={{ width: '40px', textAlign: 'center', padding: '3px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const currentVal = laundryForm.items[item] || 0;
                                                        setLaundryForm({
                                                            ...laundryForm,
                                                            items: { ...laundryForm.items, [item]: currentVal + 1 }
                                                        });
                                                    }}
                                                    style={{ width: '25px', height: '25px', borderRadius: '5px', border: '1px solid #ccc', background: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                                >+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Remarks / Observations</label>
                                <textarea 
                                    value={laundryForm.remarks} 
                                    onChange={(e) => setLaundryForm({...laundryForm, remarks: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f9fa', outline: 'none', minHeight: '60px', fontFamily: 'inherit' }}
                                    placeholder="Any specific linen conditions..."
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button style={{ flex: 1, padding: '15px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => { setLaundryRoom(null); setEditingLaundryLog(null); }}>CANCEL</button>
                                <button style={{ flex: 1, padding: '15px', background: 'var(--primary-navy)', border: 'none', borderRadius: '12px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleSaveLaundry}>{editingLaundryLog ? 'UPDATE LOG' : 'SAVE RECORD'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
                {/* Professional Bill Modal */}
                {showBill && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
                        <div style={{ background: 'white', width: '500px', borderRadius: '5px', padding: '40px', boxShadow: '0 0 50px rgba(0,0,0,0.5)', fontFamily: 'serif', color: '#000', position: 'relative' }}>
                            {/* Hotel Header */}
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '25px' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '2px' }}>HOTEL SKY 5</div>
                                <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '5px' }}>Zirakpur-Panchkula Highway, Near Chandigarh</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '10px', color: '#000' }}>OFFICIAL TAX INVOICE</div>
                            </div>

                            {/* Guest & Room Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.9rem', marginBottom: '30px' }}>
                                <div>
                                    <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 'bold' }}>GUEST NAME</div>
                                    <div style={{ fontWeight: 'bold' }}>{guestForm.name.toUpperCase()}</div>
                                    <div style={{ color: '#555', marginTop: '5px' }}>{guestForm.phone}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 'bold' }}>ROOM / TYPE</div>
                                    <div style={{ fontWeight: 'bold' }}>ROOM {editingRoom.id}</div>
                                    <div style={{ color: '#555', marginTop: '5px' }}>{editingRoom.type.toUpperCase()}</div>
                                </div>
                            </div>

                            {/* Occupancy Detail */}
                            <div style={{ background: '#f9f9f9', padding: '10px 15px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: '30px', border: '1px solid #eee' }}>
                                <span><strong>OCCUPANCY:</strong> {guestForm.adults} Adult(s), {guestForm.children} Child(ren)</span>
                                <span><strong>CHECK-IN:</strong> {new Date(guestForm.checkInTime).toLocaleDateString()}</span>
                            </div>

                            {/* Itemized Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #000', textAlign: 'left', fontSize: '0.8rem' }}>
                                        <th style={{ padding: '10px 0' }}>DESCRIPTION</th>
                                        <th style={{ textAlign: 'right' }}>AMOUNT (₹)</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '0.95rem' }}>
                                    <tr>
                                        <td style={{ padding: '12px 0' }}>Room Rent Charge ({editingRoom.type})</td>
                                        <td style={{ textAlign: 'right' }}>{editingRoom.price.toLocaleString()}.00</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '12px 0' }}>Sky Kitchen (Room Service / Dining)</td>
                                        <td style={{ textAlign: 'right' }}>{(Number(guestForm.foodBill) || 0).toLocaleString()}.00</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Calculation Section */}
                            <div style={{ borderTop: '2px solid #000', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                                    <span>SUBTOTAL</span>
                                    <span>₹{(editingRoom.price + (Number(guestForm.foodBill) || 0)).toLocaleString()}.00</span>
                                </div>
                                {guestForm.gstEnabled && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px', color: '#444' }}>
                                        <span>GST (12.0%)</span>
                                        <span>₹{Math.round((editingRoom.price + (Number(guestForm.foodBill) || 0)) * 0.12).toLocaleString()}.00</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 'bold', marginTop: '10px', borderTop: '1px double #000', paddingTop: '10px' }}>
                                    <span>NET PAYABLE</span>
                                    <span>₹{Math.round((editingRoom.price + (Number(guestForm.foodBill) || 0)) * (guestForm.gstEnabled ? 1.12 : 1.0)).toLocaleString()}.00</span>
                                </div>
                            </div>

                            {/* Note */}
                            <div style={{ marginTop: '40px', fontSize: '0.7rem', color: '#777', fontStyle: 'italic', textAlign: 'center' }}>
                                This is a computer-generated invoice. Thank you for choosing Hotel Sky 5.
                            </div>

                            {/* Bill Actions */}
                            <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
                                <button 
                                    onClick={() => window.print()}
                                    style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    🖨️ PRINT BILL
                                </button>
                                <button 
                                    onClick={() => setShowBill(false)}
                                    style={{ flex: 1, padding: '12px', background: '#fff', color: '#000', border: '1px solid #000', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    CLOSE
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manual Attendance Entry Modal */}
                {showAttendanceModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 33, 71, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(5px)' }}>
                        <div style={{ background: 'white', borderRadius: '24px', width: '450px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            <div style={{ background: 'var(--primary-navy)', padding: '25px 30px', borderBottom: '3px solid var(--accent)' }}>
                                <h2 style={{ margin: '0', color: 'white', fontFamily: 'Cinzel, serif', fontSize: '1.4rem', letterSpacing: '1px' }}>MANUAL ATTENDANCE</h2>
                                <div style={{ color: 'var(--accent)', fontSize: '0.8rem', marginTop: '5px' }}>FORENSIC PERSONNEL LOG</div>
                            </div>
                            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Staff Name</label>
                                    <select 
                                        value={attendanceForm.staffName}
                                        onChange={(e) => setAttendanceForm({...attendanceForm, staffName: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem' }}
                                    >
                                        <option value="">Select Staff...</option>
                                        {[...staffRegistry.reception, ...staffRegistry.kitchen, ...staffRegistry.housekeeping].map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Date</label>
                                    <input 
                                        type="text" 
                                        value={attendanceForm.date}
                                        onChange={(e) => setAttendanceForm({...attendanceForm, date: e.target.value})}
                                        placeholder="e.g., 06-May"
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Check-In</label>
                                        <input 
                                            type="text" 
                                            value={attendanceForm.checkIn}
                                            onChange={(e) => setAttendanceForm({...attendanceForm, checkIn: e.target.value})}
                                            placeholder="09:00 AM"
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Check-Out</label>
                                        <input 
                                            type="text" 
                                            value={attendanceForm.checkOut}
                                            onChange={(e) => setAttendanceForm({...attendanceForm, checkOut: e.target.value})}
                                            placeholder="06:00 PM"
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Status</label>
                                    <select 
                                        value={attendanceForm.status}
                                        onChange={(e) => setAttendanceForm({...attendanceForm, status: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem' }}
                                    >
                                        <option value="Present">Present</option>
                                        <option value="Half-Day Leave">Half-Day Leave</option>
                                        <option value="Absent">Absent</option>
                                        <option value="Holiday">Holiday</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <button style={{ flex: 1, padding: '15px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setShowAttendanceModal(false)}>CANCEL</button>
                                    <button style={{ flex: 1, padding: '15px', background: 'var(--primary-navy)', border: 'none', borderRadius: '12px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,33,71,0.2)' }} onClick={handleSaveAttendance}>SAVE LOG</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Staff Enrollment Modal */}
                {showStaffModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 33, 71, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(5px)' }}>
                        <div style={{ background: 'white', borderRadius: '24px', width: '500px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            <div style={{ background: '#3498db', padding: '25px 30px', borderBottom: '3px solid rgba(255,255,255,0.2)' }}>
                                <h2 style={{ margin: '0', color: 'white', fontFamily: 'Cinzel, serif', fontSize: '1.4rem', letterSpacing: '1px' }}>PERSONNEL ENROLLMENT</h2>
                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginTop: '5px' }}>OFFICIAL STAFF ONBOARDING SYSTEM</div>
                            </div>
                            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1.5 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Full Name</label>
                                        <input 
                                            type="text" 
                                            value={enrollmentForm.name}
                                            onChange={(e) => setEnrollmentForm({...enrollmentForm, name: e.target.value})}
                                            placeholder="Enter Name"
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Department</label>
                                        <select 
                                            value={enrollmentForm.department}
                                            onChange={(e) => setEnrollmentForm({...enrollmentForm, department: e.target.value})}
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem' }}
                                        >
                                            <option value="reception">Reception</option>
                                            <option value="kitchen">Kitchen</option>
                                            <option value="housekeeping">Housekeeping</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Official Role</label>
                                    <input 
                                        type="text" 
                                        value={enrollmentForm.role}
                                        onChange={(e) => setEnrollmentForm({...enrollmentForm, role: e.target.value})}
                                        placeholder="e.g., Front Desk, Chef"
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Shift Timing</label>
                                        <input 
                                            type="text" 
                                            value={enrollmentForm.shift}
                                            onChange={(e) => setEnrollmentForm({...enrollmentForm, shift: e.target.value})}
                                            placeholder="09:00 AM – 06:00 PM"
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Phone Number</label>
                                        <input 
                                            type="text" 
                                            value={enrollmentForm.phone}
                                            onChange={(e) => setEnrollmentForm({...enrollmentForm, phone: e.target.value})}
                                            placeholder="+91..."
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Duty Responsibilities</label>
                                    <textarea 
                                        value={enrollmentForm.duties}
                                        onChange={(e) => setEnrollmentForm({...enrollmentForm, duties: e.target.value})}
                                        placeholder="Detailed duties..."
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '0.9rem', minHeight: '80px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase' }}>Staff Photo URL</label>
                                    <input 
                                        type="text" 
                                        value={enrollmentForm.photo}
                                        onChange={(e) => setEnrollmentForm({...enrollmentForm, photo: e.target.value})}
                                        placeholder="https://example.com/photo.jpg"
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <button style={{ flex: 1, padding: '15px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setShowStaffModal(false)}>CANCEL</button>
                                    <button style={{ flex: 1, padding: '15px', background: '#3498db', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(52,152,219,0.2)' }} onClick={handleEnrollStaff}>ENROLL PERSONNEL</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;
