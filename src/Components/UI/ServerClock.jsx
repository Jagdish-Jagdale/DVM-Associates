import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../firebase';

const ServerClock = () => {
    const [offset, setOffset] = useState(0);
    const [now, setNow] = useState(Date.now());

    // 1. Sync offset
    useEffect(() => {
        const offsetRef = ref(db, ".info/serverTimeOffset");
        const unsub = onValue(offsetRef, (snap) => {
            setOffset(snap.val() || 0);
        });
        return () => unsub();
    }, []);

    // 2. Tick every second
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 3. Calculate server time
    const serverDate = useMemo(() => new Date(now + offset), [now, offset]);

    // 4. Format
    const dateStr = serverDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const timeStr = serverDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    return (
        <div className="flex items-center justify-center gap-2 mt-2 text-center pointer-events-none select-none">
            <div
                className="text-[11px] font-medium text-gray-500"
                style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}
            >
                {dateStr} • {timeStr}
            </div>
        </div>
    );
};

export default ServerClock;
