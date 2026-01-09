import React, { useState, useEffect } from 'react';
import { FiSearch, FiCpu, FiDownload, FiChevronRight, FiChevronLeft, FiUpload } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import { MachineService } from '../services/MachineService'; // 설비 서비스
import { useMachineExcel } from '../hooks/useMachineExcel'; // 설비 엑셀 훅
import ExcelPreviewModal from '../components/common/ExcelPreviewModal';
import SearchableSelect from '../components/common/SearchableSelect';

interface FilterOption { id: string; uniqueKey: string; name: string; parentId?: number; }

const MachineList = () => {
    const { t, language } = useLanguage();

    // States
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);
    const [propValues, setPropValues] = useState<Record<string, any>>({});
    const [dynamicHeaders, setDynamicHeaders] = useState<any[]>([]);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]); // 계층형 필터용
    const [includeReference, setIncludeReference] = useState(false);

    const [allGroups, setAllGroups] = useState<FilterOption[]>([]); // 트리 데이터

    // Pagination
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Excel Hook
    const excel = useMachineExcel(language);

    // Filter Params Object
    const filterParams = {
        searchText,
        classKey: '', // 필요하면 추가
        groupKey: selectedGroups.length > 0 ? selectedGroups[selectedGroups.length - 1] : '',
        includeRef: includeReference
    };

    // 1. 초기 그룹 트리 로드
    useEffect(() => {
        const fetchOptions = async () => {
            const res = await MachineService.getMachineGroupTree(language);
            if (res.success) {
                setAllGroups(res.data.map((i: any) => ({
                    id: i.Id, parentId: i.ParentId, uniqueKey: i.UniqueKey, name: i.Name
                })));
            }
        };
        fetchOptions();
    }, [language]);

    // 2. 데이터 조회
    useEffect(() => {
        const timer = setTimeout(() => fetchData(currentPage), 300);
        return () => clearTimeout(timer);
    }, [currentPage, searchText, selectedGroups, includeReference]);

    const fetchData = async (page: number) => {
        setLoading(true);
        try {
            // (1) 리스트 조회
            const { total, data: rows } = await MachineService.getList(page, itemsPerPage, filterParams, language);
            setTotalItems(total);

            if (rows.length > 0) {
                setData(rows);
                // (2) 동적 속성 조회
                const ids = rows.map((r: any) => `${r.AssetId}`).join(',');
                if (ids) {
                    const valRes = await MachineService.getPropertyValues(ids, language);
                    if (valRes.success) {
                        const valMap: Record<string, any> = {};
                        const headersMap = new Map();
                        valRes.data.forEach((v: any) => {
                            valMap[`${v.AssetId}_${v.PropertyId}`] = v.Value;
                            if (!headersMap.has(v.PropertyId)) {
                                headersMap.set(v.PropertyId, { id: v.PropertyId, name: v.PropertyName, unit: v.UnitName });
                            }
                        });
                        setPropValues(valMap);
                        setDynamicHeaders(Array.from(headersMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
                    }
                }
            } else {
                setData([]);
                setPropValues({});
                setDynamicHeaders([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // 계층형 필터 렌더링 로직 (Material과 동일)
    const renderGroupFilters = () => {
        const dropdowns = [];
        let currentParentId = 19; // Root ID

        for (let i = 0; i <= selectedGroups.length; i++) {
            // @ts-ignore (parentId 타입 불일치 해결용)
            const childOptions = allGroups.filter(g => g.parentId === currentParentId);
            if (childOptions.length === 0) break;

            const displayOptions = [{ id: 'clear', uniqueKey: '', name: '- All -' }, ...childOptions];
            const currentVal = selectedGroups[i] || '';

            dropdowns.push(
                <div key={i} className="flex flex-col gap-1 min-w-[150px]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        {i === 0 ? "Machine Group" : `Sub Group ${i}`}
                    </span>
                    <SearchableSelect
                        options={displayOptions}
                        value={currentVal}
                        onChange={(val) => {
                            const newGroups = [...selectedGroups];
                            if (val) { newGroups[i] = val; newGroups.splice(i + 1); }
                            else { newGroups.splice(i); }
                            setSelectedGroups(newGroups);
                            setCurrentPage(1);
                        }}
                        getLabel={(opt) => opt.name}
                        placeholder="Select..."
                    />
                </div>
            );

            if (currentVal) {
                const selected = allGroups.find(g => g.uniqueKey === currentVal);
                // @ts-ignore
                if (selected) currentParentId = selected.id;
                else break;
            } else break;
        }
        return dropdowns;
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 relative"> {/* ★ 배경색 및 패딩 추가 */}

            {/* ★ [1. 상단 타이틀 섹션] MaterialPage와 동일한 스타일 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FiCpu className="text-teal-600" /> {/* ★ 설비 아이콘 */}
                            {t('menu_machine') || 'Machine Management'}
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Master Data Management</p>
                    </div>
                </div>
            </div>

            {/* ★ [2. 컨텐츠 영역] 필터 + 그리드 */}
            <div className="flex-1 flex flex-col min-h-0">

                {/* 필터 박스 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-4 items-end border-b border-gray-100 pb-4">
                            {renderGroupFilters()}
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="relative flex items-center w-96">
                                <FiSearch className="absolute left-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                    placeholder="Search Machine Key or Name..."
                                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-teal-500 transition-colors"
                                />
                            </div>

                        </div>
                    </div>
                </div>
                <div className="flex justify-end mb-2 gap-2">
                    <button
                        className="flex items-center px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm text-sm font-medium">
                        <FiUpload className="mr-2" /> {t('plant_upload')}
                    </button>

                    {/* 엑셀 버튼: Hook 연결 */}
                    <button
                        onClick={excel.prepareData.bind(null, filterParams)}
                        disabled={loading}
                        className="flex items-center px-4 py-2.5 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors shadow-sm text-sm font-medium"
                    >
                        <FiDownload className="mr-2" /> {t('plant_download')}
                    </button>
                </div>

                {/* 그리드 박스 */}
                <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold text-[10px] sticky top-0 backdrop-blur-sm border-b border-gray-100 z-10">
                                <tr>
                                    <th className="px-6 py-4 w-14 text-center bg-gray-50/90 sticky left-0 z-20">No</th>
                                    <th className="px-6 py-4 bg-gray-50/90 sticky left-14 z-20 border-r border-gray-100">Key</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4 text-right">Invest</th>
                                    <th className="px-6 py-4 text-center">Plant</th>
                                    {dynamicHeaders.map(h => (
                                        <th key={h.id} className="px-6 py-4 text-right whitespace-nowrap bg-teal-50/30 text-teal-800 border-l border-dashed border-teal-100">
                                            {h.name} <span className="text-[9px] text-gray-400">({h.unit})</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={5 + dynamicHeaders.length} className="text-center py-20 text-gray-400">Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr><td colSpan={5 + dynamicHeaders.length} className="text-center py-20 text-gray-400">No data found</td></tr>
                                ) : data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-teal-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-center text-gray-400 text-xs bg-white group-hover:bg-teal-50/30 sticky left-0 z-10">
                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-gray-600 bg-white group-hover:bg-teal-50/30 sticky left-14 z-10 border-r border-gray-100">
                                            {row.UniqueKey}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 font-medium">{row.Name}</td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-600">
                                            {row.Invest?.toLocaleString()}
                                            <span className="text-[10px] text-gray-400 ml-1">{row.CurrencyName}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-500 text-xs">{row.PlantName}</td>
                                        {dynamicHeaders.map(h => (
                                            <td key={h.id} className="px-6 py-4 text-right border-l border-dashed border-gray-100 text-gray-600">
                                                {propValues[`${row.AssetId}_${h.id}`] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* 페이지네이션 (간단 구현) */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div className="text-xs text-gray-500">Total <span className="font-bold text-teal-600">{totalItems.toLocaleString()}</span> items</div>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-30"><FiChevronLeft /></button>
                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={data.length < itemsPerPage} className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-30"><FiChevronRight /></button>
                        </div>
                    </div>
                </div>
            </div>

            <ExcelPreviewModal
                isOpen={excel.isOpen}
                onClose={excel.close}
                onConfirm={excel.saveFile}
                data={excel.exportData}
                loading={excel.isPreparing}
                saving={excel.isSaving}
                totalCount={excel.exportData.length}
            />
        </div>
    );
};

export default MachineList;