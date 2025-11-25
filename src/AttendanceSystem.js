import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, MapPin, Loader, Check, LogIn, LogOut, Clock, AlertTriangle } from 'lucide-react';

const GOOGLE_SCRIPT_URL = "GANTI_DENGAN_URL_GAS_ANDA"; // !!! GANTI INI !!!

const AttendanceSystem = () => {
    const [status, setStatus] = useState('Masuk');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dateTime, setDateTime] = useState(new Date());
    const [location, setLocation] = useState(null);
    const [photoData, setPhotoData] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const MAX_DISTANCE_KM = 0.5; // Maksimum 500 meter

    // Lokasi Kantor (Ganti sesuai koordinat kantor Anda)
    const OFFICE_LOCATION = {
        lat: -6.108250, // Contoh: Pelabuhan Tanjung Priok
        lon: 106.882480, // Contoh: Pelabuhan Tanjung Priok
    };

    useEffect(() => {
        const timer = setInterval(() => setDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const deg2rad = (deg) => deg * (Math.PI / 180);

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius bumi dalam km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Jarak dalam km
    };

    const capturePhoto = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setPhotoData(dataUrl);
            stopCamera();
        }
    }, []);

    const startCamera = useCallback(() => {
        setIsCameraActive(true);
        setMessage('');
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            })
            .catch(err => {
                setMessage("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
                console.error("Camera access error:", err);
            });
    }, []);

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            setIsCameraActive(false);
        }
    };

    const getLocation = () => {
        if (!navigator.geolocation) {
            setMessage('Geolocation tidak didukung di browser Anda.');
            return false;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ lat: latitude, lon: longitude });
                    resolve({ lat: latitude, lon: longitude });
                },
                (error) => {
                    console.error("Geolocation Error:", error);
                    setMessage('Gagal mendapatkan lokasi. Pastikan GPS diaktifkan.');
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!photoData || !location) {
            setMessage('Mohon ambil foto dan pastikan lokasi terdeteksi.');
            return;
        }

        setIsLoading(true);
        setMessage('Memproses data...');

        const distance = getDistance(
            location.lat,
            location.lon,
            OFFICE_LOCATION.lat,
            OFFICE_LOCATION.lon
        );

        if (distance > MAX_DISTANCE_KM) {
            setMessage(`Gagal: Jarak Anda ${distance.toFixed(2)} km. Terlalu jauh dari kantor (${MAX_DISTANCE_KM} km).`);
            setIsLoading(false);
            return;
        }

        const payload = {
            action: status.toLowerCase(),
            waktu: dateTime.toLocaleString('id-ID'),
            lokasi: `${location.lat}, ${location.lon}`,
            foto: photoData,
            jarak: distance.toFixed(2) + ' km'
        };

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Karena menggunakan mode 'no-cors' (khas Google Apps Script), kita tidak bisa cek 'ok'
            setMessage(`Sukses! Absensi ${status} berhasil dicatat.`);
            setPhotoData(null);
            setLocation(null);
            stopCamera();
        } catch (error) {
            setMessage('Error saat mengirim data. Cek koneksi internet.');
            console.error("Fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleActionChange = (newStatus) => {
        setStatus(newStatus);
        setMessage('');
        setPhotoData(null);
        setLocation(null);
        stopCamera();
    };

    useEffect(() => {
        // Otomatis deteksi lokasi saat komponen dimuat atau status berubah
        getLocation();
        return () => stopCamera();
    }, [status]);

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white shadow-xl rounded-lg p-6">
                <header className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-indigo-800">Absensi PPNPN</h1>
                    <p className="text-gray-600 mt-1">BC Tanjung Priok</p>
                    <div className="flex items-center justify-center mt-3 text-sm text-gray-700">
                        <Clock className="w-4 h-4 mr-2" />
                        {dateTime.toLocaleString('id-ID', {
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                    </div>
                </header>

                <div className="flex justify-center space-x-4 mb-6 p-2 bg-gray-50 rounded-lg">
                    <button
                        onClick={() => handleActionChange('Masuk')}
                        className={`py-2 px-4 rounded-lg flex items-center transition-colors ${status === 'Masuk' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
                    >
                        <LogIn className="w-5 h-5 mr-2" /> Masuk
                    </button>
                    <button
                        onClick={() => handleActionChange('Keluar')}
                        className={`py-2 px-4 rounded-lg flex items-center transition-colors ${status === 'Keluar' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
                    >
                        <LogOut className="w-5 h-5 mr-2" /> Keluar
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Bagian Kamera */}
                    <div className="border border-gray-300 rounded-lg overflow-hidden p-2 text-center">
                        <h3 className="font-semibold mb-2">Ambil Foto ({status})</h3>
                        {photoData ? (
                            <img src={photoData} alt="Selfie" className="w-full h-auto rounded-md object-cover" />
                        ) : isCameraActive ? (
                            <video ref={videoRef} className="w-full h-48 bg-gray-200 rounded-md" playsInline autoPlay />
                        ) : (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-md">
                                <Camera className="w-8 h-8 text-gray-400" />
                            </div>
                        )}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>

                    {!photoData && (
                        <button
                            type="button"
                            onClick={isCameraActive ? capturePhoto : startCamera}
                            className={`w-full py-2 rounded-lg text-white font-medium transition-colors flex items-center justify-center ${isCameraActive ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isCameraActive ? (
                                <> <Camera className="w-5 h-5 mr-2" /> Ambil Foto</>
                            ) : (
                                <> <Camera className="w-5 h-5 mr-2" /> Buka Kamera</>
                            )}
                        </button>
                    )}

                    {/* Bagian Lokasi */}
                    <div className="flex items-center p-3 border rounded-lg">
                        <MapPin className={`w-5 h-5 mr-3 ${location ? 'text-green-500' : 'text-yellow-500'}`} />
                        <span className="font-medium">Status Lokasi:</span>
                        <span className={`ml-auto font-semibold ${location ? 'text-green-600' : 'text-yellow-600'}`}>
                            {location ? 'Terdeteksi' : 'Menunggu...'}
                        </span>
                    </div>

                    {/* Tombol Submit */}
                    <button
                        type="submit"
                        disabled={isLoading || !photoData || !location}
                        className={`w-full py-3 rounded-lg font-bold text-white transition-opacity ${!photoData || !location || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center"><Loader className="w-5 h-5 mr-2 animate-spin" /> Mengirim...</span>
                        ) : (
                            `Kirim Absensi ${status}`
                        )}
                    </button>
                </form>

                {/* Pesan Status */}
                {message && (
                    <div className={`mt-4 p-3 rounded-lg flex items-center ${message.includes('Sukses') ? 'bg-green-100 text-green-700' : message.includes('Gagal') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {message.includes('Gagal') && <AlertTriangle className="w-5 h-5 mr-2" />}
                        {message.includes('Sukses') && <Check className="w-5 h-5 mr-2" />}
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceSystem;
