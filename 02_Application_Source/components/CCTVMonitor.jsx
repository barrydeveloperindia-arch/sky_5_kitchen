import React, { useState } from 'react';
import { keyActivate } from '../lib/utils';

const CCTVMonitor = () => {
    const [selectedCamera, setSelectedCamera] = useState(null);

    const cameras = [
        { id: 1, name: 'RECEPTION MAIN', type: 'W Box IP', status: 'Online', resolution: '4K' },
        { id: 2, name: 'KITCHEN ENTRY', type: 'W Box IP', status: 'Online', resolution: '1080P' },
        { id: 3, name: 'PARKING AREA', type: 'CP Plus Analog', status: 'Online', resolution: '1080P' },
        { id: 4, name: 'CORRIDOR 1ST FL', type: 'CP Plus Analog', status: 'Offline', resolution: '1080P' },
        { id: 5, name: 'BACK EXIT', type: 'W Box IP', status: 'Online', resolution: '1080P' },
        { id: 6, name: 'STAFF ROOM', type: 'W Box IP', status: 'Online', resolution: '720P' },
    ];

    return (
        <div style={{ padding: '30px', background: '#0a192f', minHeight: '100vh', color: 'white', borderRadius: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ margin: 0, fontFamily: 'Cinzel', color: '#d4af37' }}>HOTEL SKY 5 - SURVEILLANCE HUB</h2>
                    <div style={{ fontSize: '0.8rem', color: '#8899af', marginTop: '5px' }}>DVR: CP Plus | Cameras: W Box | Protocol: RTSP Over HTTPS</div>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ background: '#112240', padding: '10px 20px', borderRadius: '12px', border: '1px solid #233554' }}>
                        <span style={{ color: '#64ffda', fontSize: '0.9rem', fontWeight: 'bold' }}>● LIVE FEED</span>
                    </div>
                    <button style={{ background: '#d4af37', color: '#0a192f', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                        REFRESH ALL
                    </button>
                </div>
            </div>

            {/* Camera Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                {cameras.map(cam => (
                    <div key={cam.id} style={{ 
                        background: '#112240', 
                        borderRadius: '20px', 
                        overflow: 'hidden', 
                        border: '1px solid #233554',
                        position: 'relative',
                        aspectRatio: '16/9',
                        cursor: 'pointer',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }} onClick={() => setSelectedCamera(cam)} role="button" tabIndex={0} onKeyDown={keyActivate}>
                        {/* Camera Header Overlay */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '15px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>CH {cam.id} | {cam.name}</div>
                            <div style={{ fontSize: '0.7rem', background: cam.status === 'Online' ? '#27ae60' : '#e74c3c', padding: '2px 8px', borderRadius: '4px' }}>{cam.status}</div>
                        </div>

                        {/* Static/Live Stream Placeholder */}
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                           {cam.status === 'Online' ? (
                               <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                   {/* Simulated CCTV Noise/Overlay */}
                                   <div style={{ position: 'absolute', bottom: '15px', left: '15px', fontSize: '0.7rem', color: '#64ffda', fontFamily: 'monospace' }}>
                                       REC [●] 2026-05-07 {new Date().toLocaleTimeString()}
                                   </div>
                                   <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.1 }}>
                                       <i style={{ fontSize: '4rem' }}>📹</i>
                                   </div>
                                   <img 
                                       src={`https://images.unsplash.com/photo-1541518763669-27fef04b14ea?q=80&w=800&auto=format&fit=crop&sig=${cam.id}`} 
                                       style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} 
                                       alt="CCTV Feed" 
                                   />
                               </div>
                           ) : (
                               <div style={{ color: '#e74c3c', textAlign: 'center' }}>
                                   <div style={{ fontSize: '2rem' }}>⚠️</div>
                                   <div>SIGNAL LOST</div>
                               </div>
                           )}
                        </div>

                        {/* Camera Footer Overlay */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 15px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', gap: '15px', fontSize: '0.7rem', color: '#8899af' }}>
                            <span>{cam.type}</span>
                            <span>{cam.resolution}</span>
                            <span>30 FPS</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Fullscreen Modal Placeholder */}
            {selectedCamera && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, color: '#d4af37' }}>LIVE FEED: {selectedCamera.name}</h2>
                        <button onClick={() => setSelectedCamera(null)} style={{ background: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer' }}>CLOSE VIEW</button>
                    </div>
                    <div style={{ flex: 1, background: '#000', borderRadius: '20px', overflow: 'hidden', border: '2px solid #233554', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '20px', left: '20px', color: '#64ffda', zIndex: 2, fontFamily: 'monospace' }}>
                            HQ MAIN STREAM | 2560x1440 | 4.2 Mbps
                        </div>
                        <img 
                            src={`https://images.unsplash.com/photo-1541518763669-27fef04b14ea?q=80&w=1200`} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            alt="Main Feed" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CCTVMonitor;
