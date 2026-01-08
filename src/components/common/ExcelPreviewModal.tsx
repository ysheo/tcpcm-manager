import React from 'react';
import { FiDownload, FiX, FiRefreshCw } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext'; // 경로 주의

interface ExcelPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: any[];
    loading: boolean;
    saving?: boolean;
    totalCount: number;
}

const ExcelPreviewModal = ({
    isOpen, onClose, onConfirm, data, loading, saving, totalCount
}: ExcelPreviewModalProps) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    const previewList = data.slice(0, 10);
    const headers = data.length > 0 ? Object.keys(data[0]) : [];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-[900px] max-w-[95vw] overflow-hidden flex flex-col max-h-[85vh]">
                {/* 헤더 */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#059669] text-white">
                    <div className="flex items-center gap-2">
                        <FiDownload className="text-xl" />
                        <h3 className="font-bold text-lg">{t('mat_download_preview_title')}</h3>
                    </div>
                    <button onClick={!saving ? onClose : undefined} className={`text-white/70 hover:text-white ${saving ? 'cursor-not-allowed opacity-50' : ''}`}>
                        <FiX size={24} />
                    </button>
                </div>

                {/* 정보 바 */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-sm">
                    <span className="text-gray-500">{t('mat_download_preview_msg')}</span>
                    <div className="text-gray-600 font-bold">
                        {t('mat_total_items')} <span className="text-[#059669] text-lg">{totalCount.toLocaleString()}</span> items
                    </div>
                </div>

                {/* 테이블 영역 */}
                <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
                    {loading ? (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <FiRefreshCw className="animate-spin text-3xl text-[#059669]" />
                            <span className="text-sm font-medium">{t('mat_msg_extracting')}</span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-gray-400">{t('mat_msg_no_data') || 'No Data'}</div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-100 text-gray-600 font-bold uppercase sticky top-0">
                                    <tr>
                                        {headers.map((h, i) => (
                                            <th key={i} className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {previewList.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-green-50/30">
                                            {headers.map((h, i) => (
                                                <td key={i} className="px-4 py-2.5 text-gray-600 whitespace-nowrap max-w-[200px] truncate">{row[h]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.length > 10 && (
                                <div className="p-2 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                                    ... and {data.length - 10} more items ...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 버튼 영역 */}
                <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} disabled={saving} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 disabled:opacity-50">
                        {t('mat_btn_cancel')}
                    </button>
                    <button onClick={onConfirm} disabled={loading || saving || data.length === 0} className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg flex items-center text-sm gap-2 ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#059669] hover:bg-[#047857]'}`}>
                        {saving ? <><FiRefreshCw className="animate-spin" /> Saving...</> : <><FiDownload /> {t('mat_btn_save_excel')}</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExcelPreviewModal;