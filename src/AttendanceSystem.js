import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, MapPin, Loader, Check, LogIn, LogOut, Clock, AlertTriangle, AlertCircle, RefreshCw, X } from 'lucide-react';

// URL GOOGLE APPS SCRIPT ANDA
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxzzkCZs1RPGH7UuC1LY5-db-SDcnUVp5QflSpYfUSGZPWygweDsLUGPIOWGgqtypn4/exec"; 
const HISTORY_API_URL = "https://script.google.com/macros/s/AKfycbxzzkCZs1RPGH7UuC1LY5-db-SDcnUVp5QflSpYfUSGZPWygweDsLUGPIOWGgqtypn4/exec"; 

const AttendanceSystem = () => {
    const [status, setStatus] = useState('Masuk');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dateTime, setDateTime] = useState(new Date());
    const [location, setLocation] = useState(null);
    const [photoData, setPhotoData] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    
    // State untuk Pertanyaan Wajib Absensi Keluar
    const [isSupervisorApproved, setIsSupervisorApproved] = useState(''); 
    const [isFormFilled, setIsFormFilled] = useState(''); 
    
    // STATE BARU: Keperluan
    const [necessity, setNecessity] = useState(''); 

    // State untuk Riwayat
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => setDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
        
        // Cek Validasi Pertanyaan Wajib dan Field Keperluan
        if (status === 'Keluar') {
            if (isSupervisorApproved !== 'YA' || isFormFilled !== 'YA') {
                setMessage('Gagal: Absensi Keluar memerlukan persetujuan Pengawas dan pengisian Form SUBBAG TURT.');
                return;
            }
            if (!necessity.trim()) {
                 setMessage('Gagal: Keperluan (tujuan keluar) wajib diisi.');
                 return;
            }
        }
        
        if (!photoData || !location) {
            setMessage('Mohon ambil foto dan pastikan lokasi terdeteksi.');
            return;
        }

        setIsLoading(true);
        setMessage('Memproses data...');

        const payload = {
            action: status.toLowerCase(),
            waktu: dateTime.toLocaleString('id-ID'),
            lokasi: `${location.lat}, ${location.lon}`,
            foto: photoData, // Data Base64 foto dikirim ke GAS
            jarak: '0.00 km', // Nilai statis
            keperluan: status === 'Keluar' ? necessity : 'N/A' // DATA BARU
        };

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            setMessage(`Sukses! Absensi ${status} berhasil dicatat.`);
            setPhotoData(null);
            setLocation(null);
            setNecessity(''); // Reset keperluan
            stopCamera();
            if (showHistory) fetchHistory(); 
        } catch (error) {
            setMessage('Error saat mengirim data. Cek koneksi internet.');
            console.error("Fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // FUNGSI UNTUK MENGAMBIL RIWAYAT
    const fetchHistory = async () => {
        setIsHistoryLoading(true);
        try {
            const response = await fetch(HISTORY_API_URL);
            if (!response.ok) throw new Error('Gagal mengambil data riwayat.');
            
            const data = await response.json();
            data.reverse(); 
            setHistory(data);
        } catch (error) {
            console.error("Error fetching history:", error);
            setMessage("Gagal memuat riwayat: " + error.message);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleActionChange = (newStatus) => {
        setStatus(newStatus);
        setMessage('');
        setPhotoData(null);
        setLocation(null);
        stopCamera();
        
        // Reset state pertanyaan dan Keperluan
        setIsSupervisorApproved('');
        setIsFormFilled('');
        setNecessity(''); 
    };

    useEffect(() => {
        getLocation();
        return () => stopCamera();
    }, [status]);
    
    // Keterangan Wajib Absensi Keluar
    const KeteranganKeluar = () => (
        <div className="mb-6 p-4 rounded-xl bg-red-100 border border-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-800">
                PERHATIAN: Absen keluar wajib dilakukan saat jam kerja berakhir. Jika absen di luar jam kerja, harus melampirkan keterangan Dinas Luar.
            </p>
        </div>
    );

    // Komponen Pertanyaan Wajib Absensi Keluar + Keperluan
    const WajibTanyaKeluar = () => (
        <div className="space-y-4 p-4 border rounded-lg bg-yellow-50">
            <h3 className="font-bold text-yellow-800 border-b pb-2">Informasi Wajib Keluar Kantor</h3>
            
            {/* Pertanyaan 1: Izin Pengawas */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    1. Apakah anda sudah izin kepada pengawas lantai?
                </label>
                <div className="flex space-x-4">
                    <button 
                        type="button" 
                        onClick={() => setIsSupervisorApproved('YA')}
                        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${isSupervisorApproved === 'YA' ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    >YA</button>
                    <button 
                        type="button" 
                        onClick={() => setIsSupervisorApproved('TIDAK')}
                        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${isSupervisorApproved === 'TIDAK' ? 'bg-red-500 text-white border-red-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    >TIDAK</button>
                </div>
            </div>
            
            {/* Pertanyaan 2: Form SUBBAG TURT */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    2. Apakah anda sudah mengisi form di ruangan SUBBAG TURT Basement?
                </label>
                <div className="flex space-x-4">
                    <button 
                        type="button" 
                        onClick={() => setIsFormFilled('YA')}
                        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${isFormFilled === 'YA' ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    >YA</button>
                    <button 
                        type="button" 
                        onClick={() => setIsFormFilled('TIDAK')}
                        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${isFormFilled === 'TIDAK' ? 'bg-red-500 text-white border-red-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    >TIDAK</button>
                </div>
            </div>

            {/* FIELD BARU: KEPERLUAN */}
            <div>
                <label htmlFor="necessity" className="block text-sm font-medium text-gray-700 mb-2">
                    3. Keperluan (Tujuan Keluar Kantor Wajib Diisi):
                </label>
                <textarea
                    id="necessity"
                    value={necessity}
                    onChange={(e) => setNecessity(e.target.value)}
                    rows="3"
                    required
                    placeholder="Contoh: Mengurus dokumen di Bank BNI cabang Tugu Tani terkait pekerjaan."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                ></textarea>
            </div>
        </div>
    );
    
    // Tampilan Riwayat
    if (showHistory) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl bg-white shadow-xl rounded-lg p-6">
                    <div className="flex justify-between items-center mb-6 border-b pb-3">
                        <h2 className="text-2xl font-bold text-indigo-800">Riwayat Absensi (10 Terakhir)</h2>
                        <div className='flex gap-2'>
                            <button
                                onClick={fetchHistory}
                                className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                disabled={isHistoryLoading}
                                title="Refresh Riwayat"
                            >
                                <RefreshCw className={`w-5 h-5 ${isHistoryLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                title="Tutup Riwayat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {isHistoryLoading && (
                        <div className="text-center p-4 text-indigo-600">
                            <Loader className="w-6 h-6 inline mr-2 animate-spin" /> Memuat data riwayat...
                        </div>
                    )}

                    {!isHistoryLoading && history.length === 0 && (
                        <div className="text-center p-4 text-gray-500">
                            Belum ada riwayat absensi yang tercatat.
                        </div>
                    )}
                    
                    {!isHistoryLoading && history.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keperluan</th> 
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foto</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {history.slice(0, 10).map((record, index) => (
                                        <tr key={index}>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{record.Waktu}</td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    record.Aksi === 'masuk' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {record.Aksi.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 max-w-xs overflow-hidden text-ellipsis">
                                                {record.Keperluan || record.keperluan || 'N/A'} 
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap">
                                                {record.URL_Foto && record.URL_Foto !== 'N/A' ? (
                                                    <a href={record.URL_Foto} target="_blank" rel="noopener noreferrer">
                                                        Lihat Foto
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {record.Lokasi && (
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${record.Lokasi}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline flex items-center"
                                                        title={record.Lokasi}
                                                    >
                                                        Lihat Peta <MapPin className="w-4 h-4 ml-1" />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
            </div>
        );
    }

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
                    <button
                        onClick={handleShowHistory}
                        className="mt-4 w-full py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                    >
                        Lihat Riwayat Absensi
                    </button>
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
                    
                    {status === 'Keluar' && <KeteranganKeluar />}

                    {status === 'Keluar' && <WajibTanyaKeluar />}
                    
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
