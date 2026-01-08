import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight, FiUpload, FiDownload, FiCalendar } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import { MaterialPriceService } from '../services/MaterialPriceService'; // ★ Service import
import { useMaterialPriceExcel } from '../hooks/useMaterialPriceExcel'; // ★ Hook import
import ExcelPreviewModal from '../components/common/ExcelPreviewModal'; // ★ 공통 컴포넌트
import SearchableSelect from '../components/common/SearchableSelect';   // ★ 공통 컴포넌트

interface FilterOption {
    id?: string;
    uniqueKey: string;
    nameEn: string;
    nameKo: string;
}

const MaterialList_Price = () => {
    const { t, language } = useLanguage();

    // --- State: Data & UI ---
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    // 필터 상태
    const [searchText, setSearchText] = useState('');
    const [filterRegion, setFilterRegion] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [isAllPeriod, setIsAllPeriod] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [includeReference, setIncludeReference] = useState(false);

    // 옵션 상태
    const [regionOptions, setRegionOptions] = useState<FilterOption[]>([]);
    const [classOptions, setClassOptions] = useState<FilterOption[]>([]);

    // 페이지네이션
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [pageInput, setPageInput] = useState('1');

    // ★ 엑셀 Hook 사용
    const excel = useMaterialPriceExcel(language);

    // 1. 초기 옵션 로드
    useEffect(() => {
        const fetchOptions = async () => {
            const [resR, resC] = await MaterialPriceService.getOptions();

            if (resR.success) {
                setRegionOptions(resR.data.map((i: any) => ({
                    uniqueKey: i.UniqueKey, nameEn: i.NameEn, nameKo: i.NameKo
                })));
            }
            if (resC.success) {
                setClassOptions(resC.data.map((i: any) => ({
                    uniqueKey: i.UniqueKey, nameEn: i.NameEn, nameKo: i.NameKo
                })));
            }
        };
        fetchOptions();
    }, []);

    // 2. 데이터 조회
    const fetchData = async (page: number) => {
        setLoading(true);
        try {
            const filters = {
                searchText, region: filterRegion, classKey: filterClass,
                isAllPeriod, startDate, endDate, includeReference
            };

            const [countRes, dataRes] = await MaterialPriceService.getList(page, itemsPerPage, filters);

            if (countRes.success) setTotalItems(countRes.data[0].total);
            if (dataRes.success) setData(dataRes.data);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // 필터 변경 시 자동 조회 (Debounce)
    useEffect(() => {
        const timer = setTimeout(() => fetchData(currentPage), 300);
        setPageInput(currentPage.toString());
        return () => clearTimeout(timer);
    }, [currentPage, searchText, filterRegion, filterClass, isAllPeriod, startDate, endDate, includeReference]);

    // 엑셀 버튼 핸들러
    const handleExcelClick = () => {
        excel.prepareData({
            searchText, region: filterRegion, classKey: filterClass,
            isAllPeriod, startDate, endDate, includeReference
        });
    };

    // --- Helper UI Functions ---
    const getOptionLabel = (opt: FilterOption) => {
        const target = language === 'ko' ? opt.nameKo : opt.nameEn;
        return target || opt.nameEn || opt.nameKo || opt.uniqueKey;
    };

    const getDisplayName = (row: any) => {
        return language === 'ko' ? (row.nameKo || row.nameEn) : (row.nameEn || row.nameKo);
    };

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* 기간 필터 */}
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date Range</span>
                            <label className="text-[10px] font-bold text-teal-600 cursor-pointer flex items-center gap-1">
                                <input type="checkbox" checked={isAllPeriod} onChange={e => setIsAllPeriod(e.target.checked)} className="rounded-sm" /> {t('all')}
                            </label>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                            <FiCalendar className="text-gray-400" />
                            <input type="date" disabled={isAllPeriod} value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs outline-none flex-1 disabled:text-gray-200" />
                            <span className="text-gray-300">~</span>
                            <input type="date" disabled={isAllPeriod} value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs outline-none flex-1 disabled:text-gray-200" />
                        </div>
                    </div>

                    {/* Region Select (공통 컴포넌트) */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Region</span>
                        <SearchableSelect
                            options={regionOptions}
                            value={filterRegion}
                            onChange={setFilterRegion}
                            getLabel={getOptionLabel}
                            placeholder="Search region..."
                        />
                    </div>

                    {/* Classification Select (공통 컴포넌트) */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Classification</span>
                        <SearchableSelect
                            options={classOptions}
                            value={filterClass}
                            onChange={setFilterClass}
                            getLabel={getOptionLabel}
                            placeholder="Search class..."
                        />
                    </div>

                    {/* Smart Search */}
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("mat_label_smart_search")}</span>
                            <label className="text-[10px] font-bold text-teal-600 cursor-pointer flex items-center gap-1">
                                <input type="checkbox" checked={includeReference} onChange={e => setIncludeReference(e.target.checked)} className="rounded-sm accent-teal-600" />
                                {t("mat_label_include_siemens")}
                            </label>
                        </div>
                        <div className="relative flex items-center">
                            <FiSearch className="absolute left-3.5 text-gray-400" />
                            <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="XML & Key Search..." className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                            <button onClick={() => fetchData(currentPage)} className="absolute right-2 p-2 text-gray-400 hover:text-teal-600"><FiRefreshCw className={loading ? "animate-spin" : ""} /></button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end mb-2 gap-2">
                <button
                    className="flex items-center px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm text-sm font-medium">
                    <FiUpload className="mr-2" /> {t('plant_upload')}
                </button>
                <button onClick={handleExcelClick} disabled={loading}
                    className="flex items-center px-4 py-2.5 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors shadow-sm text-sm font-medium">
                    <FiDownload className="mr-2" /> {t('plant_download')}
                </button>
            </div >

            {/* Grid */}
            < div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col" >
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold text-[10px] sticky top-0 backdrop-blur-sm z-10 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 w-20 text-center">No</th>
                                <th className="px-6 py-4">{t('mat_header_valid_from')}</th>
                                <th className="px-6 py-4">{t('plant_header_region')}</th>
                                <th className="px-6 py-4">{t('plant_header_key')}</th>
                                <th className="px-6 py-4">{t('mat_header_name')}</th>
                                <th className="px-6 py-4">{t('mat_header_revision')}</th>
                                <th className="px-6 py-4">{t('mat_header_currency')}</th>
                                <th className="px-6 py-4">{t('mat_header_unit')}</th>
                                <th className="px-6 py-4 text-right">{t('mat_header_price')}</th>
                                <th className="px-6 py-4 text-right">{t('mat_header_scrap_price')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={10} className="px-6 py-32 text-center text-gray-400">{t('loading')}</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={10} className="px-6 py-32 text-center text-gray-400">{t('no_data')}</td></tr>
                            ) : (
                                data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-teal-50/40">
                                        <td className="px-6 py-4 text-gray-400 text-center font-mono text-xs">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                        <td className="px-6 py-4 text-gray-600 font-semibold">{row.validFrom}</td>
                                        <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">{row.region}</span></td>
                                        <td className="px-6 py-4 font-mono text-gray-500">{row.uniqueKey}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{getDisplayName(row)}</td>
                                        <td className="px-6 py-4"><span className="text-[11px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{row.revisionName}</span></td>
                                        <td className="px-6 py-4">{row.currency}</td>
                                        <td className="px-6 py-4">{row.unit}</td>
                                        <td className="px-6 py-4 text-right font-bold text-teal-600">{row.price?.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-gray-400">{row.scrapPrice?.toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="text-xs text-gray-500">Total <span className="font-bold text-teal-600">{totalItems.toLocaleString()}</span> items</div>
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30"><FiChevronLeft /></button>
                        <span className="text-sm text-gray-600 px-2">{currentPage} / {Math.ceil(totalItems / itemsPerPage) || 1}</span>
                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30"><FiChevronRight /></button>
                    </div>
                </div>
            </div >

            {/* 모달 (공통 컴포넌트 재사용) */}
            < ExcelPreviewModal
                isOpen={excel.isOpen}
                onClose={excel.close}
                onConfirm={excel.saveFile}
                data={excel.exportData}
                loading={excel.isPreparing}
                saving={excel.isSaving}
                totalCount={excel.exportData.length}
            />
        </>
    );
};

export default MaterialList_Price;