'use client'; 
import { PrimaryButton } from '@/app/components/global/Button';
import { H3, P } from '@/app/components/global/Text';
import React from 'react';
import { FaDownload } from 'react-icons/fa';

const CloseIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" className={className}>
        <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
    </svg>
);

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    formDownloadLink: string;
}

export default function RegistrationModal({ isOpen, onClose, formDownloadLink }: RegistrationModalProps) {
    if (!isOpen) return null;

    const handleDownload = () => {
        if (formDownloadLink) {
            const link = document.createElement('a');
            link.href = formDownloadLink;
            link.setAttribute('download', 'Formulir_Pendaftaran.docx');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            onClose(); 
            console.log("Formulir pendaftaran diunduh melalui tombol PrimaryButton.");
        } else {
            console.error("Link unduhan formulir tidak tersedia.");
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-70 backdrop-blur-sm p-4" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white w-full max-w-lg mx-auto rounded-xl shadow-2xl transform transition-all duration-300 scale-100 opacity-100"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <H3 className="mb-0">Ketentuan Unduh dan Penggunaan Formulir</H3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
                        aria-label="Tutup"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
                    <P className="text-sm text-gray-600">
                        Sebelum mengunduh formulir pendaftaran, pastikan Anda membaca dan memahami ketentuan berikut dengan seksama:
                    </P>

                    <ul className="list-decimal list-inside text-gray-700 space-y-2 text-sm ml-4">
                        <li>
                            <span className="font-semibold">Ukuran dan Format:</span> Formulir harus dicetak menggunakan <strong>kertas ukuran A4</strong> dalam posisi potret (portrait). 
                            File tersedia dalam format <strong>DOCX</strong> dan dapat diisi secara digital atau manual.
                        </li>                   
                        <li>
                            <span className="font-semibold">Penyerahan Formulir:</span> Formulir yang telah diisi harus <strong>dibawa langsung pada hari pelaksanaan kegiatan</strong>. 
                            Peserta wajib menyerahkan formulir kepada panitia saat registrasi ulang.
                        </li>
                    </ul>

                    <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-800 font-medium mt-4">
                        ⚠️ <span className="font-semibold">Perhatian:</span> Pastikan formulir dicetak dengan jelas dan tidak terpotong. Formulir yang tidak lengkap atau rusak dapat menyebabkan pembatalan pendaftaran.
                    </div>
                </div>

                {/* Footer / Action */}
                <div className="p-5 border-t border-gray-100 flex justify-end">
                    <PrimaryButton
                        onClick={handleDownload}
                        type="button"
                        className="inline-flex gap-2 items-center bg-red-600 hover:bg-red-700"
                    >
                         <FaDownload/> Unduh Formulir Sekarang
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}
