import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight, FiUpload, FiDownload } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/ApiService';
import { AppConfig } from '../config/AppConfig';
import { MaterialService } from '../services/MaterialService'; // 서비스 임포트
import { useMaterialExcel } from '../hooks/useMaterialExcel'; // 훅 임포트
import ExcelPreviewModal from '../components/common/ExcelPreviewModal'; // 공통 컴포넌트
import SearchableSelect from '../components/common/SearchableSelect';   // 공통 컴포넌트 (파일 분리 가정)

// 타입 정의 (필요하다면 types.ts로 분리 가능)
interface FilterOption {
    id: string;
    uniqueKey: string;
    nameEn: string;
    nameKo: string;
}

const MaterialList_Property = () => {
    const { t, language } = useLanguage();

    // --- State ---
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);
    const [propValues, setPropValues] = useState<Record<string, any>>({});
    const [dynamicHeaders, setDynamicHeaders] = useState<any[]>([]);

    // 필터
    const [searchText, setSearchText] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [includeReference, setIncludeReference] = useState(false);
    const [classOptions, setClassOptions] = useState<FilterOption[]>([]);

    // 페이지네이션
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const itemsPerPage = 15;
    const lastSearchRef = useRef('');

    // ★ 엑셀 Hook 사용 (한 줄로 기능 연결!)
    const excel = useMaterialExcel(language);

    // 1. 초기 로드 (Service 사용)
    useEffect(() => {
        const fetchOptions = async () => {
            const res = await MaterialService.getClassOptions();
            if (res.success) {
                setClassOptions(res.data.map((i: any) => ({
                    id: i.Id, uniqueKey: i.UniqueKey, nameEn: i.NameEn, nameKo: i.NameKo
                })));
            }
        };
        fetchOptions();
    }, []);

    // [Helper] 라벨 표시 함수
    const getOptionLabel = (option: FilterOption) => {
        const targetName = language === 'ko' ? option.nameKo : option.nameEn;
        if (targetName && targetName.trim() !== '') return targetName;
        if (option.nameEn && option.nameEn.trim() !== '') return option.nameEn;
        if (option.nameKo && option.nameKo.trim() !== '') return option.nameKo;
        return option.uniqueKey;
    };

    useEffect(() => {
        const timer = setTimeout(() => fetchData(currentPage), 300);
        setPageInput(currentPage.toString());
        return () => clearTimeout(timer);
    }, [currentPage, searchText, filterClass, includeReference]);

    // 엑셀 버튼 핸들러
    const handleExcelClick = () => {
        excel.prepareData({ text: searchText, classKey: filterClass, includeRef: includeReference });
    };

    const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const p = parseInt(pageInput);
            if (!isNaN(p) && p > 0 && p <= Math.ceil(totalItems / itemsPerPage)) setCurrentPage(p);
        }
    };
    const fetchData = async (page: number) => {
        // 분류 선택 안 해도 데이터가 있으면 조회되도록 (필터링 조건에 따라)
        // 만약 분류 필수라면 if (!filterClass) return; 유지

        setLoading(true);
        console.time("🚀 Load Prop Data");

        try {
            const currentSearchKey = `PROP-${searchText}-${filterClass}-${includeReference}`;

            // --- 1. 기본 WHERE 조건 ---
            let baseWhere = `WHERE s.Obsolete IS NULL`;
            if (!includeReference) baseWhere += ` AND s.ExternallyManaged = 0`;
            if (filterClass) baseWhere += ` AND cls.UniqueKey = N'${filterClass}'`;
            if (searchText) {
                baseWhere += ` AND (s.UniqueKey LIKE N'%${searchText}%' OR std_n.Name_LOC LIKE N'%${searchText}%')`;
            }

            // --- 2. 카운트 쿼리 (기존과 동일) ---
            if (lastSearchRef.current !== currentSearchKey) {
                const countQuery = `
                SELECT COUNT(*) as total
                FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s
                LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON s.ClassId = cls.Id
                LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstanceStandardNames] std_n ON s.Id = std_n.SubstanceId
                ${baseWhere}
            `;
                const res = await api.executeQuery(countQuery, AppConfig.DB.PCM);
                if (res.success) {
                    setTotalItems(res.data[0].total);
                    lastSearchRef.current = currentSearchKey;
                }
            }

            // --- 3. 물질 목록(Row) 조회 ---
            const rowQuery = `
            WITH PagedRows AS (
                SELECT s.Id
                FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s
                LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON s.ClassId = cls.Id
                LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstanceStandardNames] std_n ON s.Id = std_n.SubstanceId
                ${baseWhere}
                ORDER BY s.UniqueKey ASC
                OFFSET ${(page - 1) * itemsPerPage} ROWS FETCH NEXT ${itemsPerPage} ROWS ONLY
            )
            SELECT 
                 s.Id AS SubstanceId
                ,s.UniqueKey
                ,s.Density
                ,u.Name AS DensityUnit
                ,[dbo].[GetSingleTranslation](std_n.Name_LOC, N'ko-KR', '') AS StandardName
                ,[dbo].[GetSingleTranslation](std_b.Name_LOC, N'ko-KR', '') AS StandardType
            FROM PagedRows p
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s ON p.Id = s.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON s.ClassId = cls.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON s.DensityUnitId = u.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstanceStandardNames] std_n ON s.Id = std_n.SubstanceId
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[BDSubstanceStandards] std_b ON std_n.SubstanceStandardId = std_b.Id
            ORDER BY s.UniqueKey ASC
        `;

            const rowRes = await api.executeQuery(rowQuery, AppConfig.DB.PCM);

            if (rowRes.success && rowRes.data.length > 0) {
                const rows = rowRes.data;
                setData(rows);

                // --- 4. 값(Value) + 헤더 정보(Meta) 동시 조회 ---
                const ids = rows.map((r: any) => `'${r.SubstanceId}'`).join(',');

                if (ids) {
                    // 값을 가져올 때 [물성 이름]과 [단위]도 같이 JOIN해서 가져옵니다.
                    const valueQuery = `
                    SELECT 
                         v.SubstanceId
                        ,v.ClassificationPropertyId AS PropertyId
                        ,COALESCE(CAST(v.DecimalValue AS NVARCHAR(50)), v.TextValue, v.ListItemValues, FORMAT(v.DateTimeValue, 'yyyy-MM-dd')) AS Value
                        -- 헤더 생성을 위한 정보 추가
                        ,[dbo].[GetSingleTranslation](cp.Name_LOC, N'${language === 'ko' ? 'ko-KR' : 'en-US'}', '') AS PropertyName
                        ,u.Name AS UnitName
                    FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstancePropertyValues] v
                    JOIN [${AppConfig.DB.PCM}].[dbo].[ClassificationProperties] cp ON v.ClassificationPropertyId = cp.Id
                    LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON cp.UnitId = u.Id
                    WHERE v.SubstanceId IN (${ids})
                `;

                    const valRes = await api.executeQuery(valueQuery, AppConfig.DB.PCM);

                    if (valRes.success) {
                        const valMap: Record<string, any> = {};
                        const headersMap = new Map(); // 중복 제거를 위해 Map 사용

                        valRes.data.forEach((v: any) => {
                            // 1. 값 매핑 (기존 로직)
                            valMap[`${v.SubstanceId}_${v.PropertyId}`] = v.Value;

                            // 2. 동적 헤더 생성 (데이터에 있는 것만)
                            if (!headersMap.has(v.PropertyId)) {
                                headersMap.set(v.PropertyId, {
                                    PropertyId: v.PropertyId,
                                    DisplayName: v.PropertyName, // 쿼리에서 가져온 번역명
                                    UnitName: v.UnitName
                                });
                            }
                        });

                        setPropValues(valMap);

                        // Map을 배열로 변환하고 이름순 정렬 (안 하면 뒤죽박죽 섞임)
                        const sortedHeaders = Array.from(headersMap.values()).sort((a: any, b: any) =>
                            a.DisplayName.localeCompare(b.DisplayName)
                        );
                        setDynamicHeaders(sortedHeaders);
                    }
                } else {
                    setPropValues({});
                    setDynamicHeaders([]); // 데이터 없으면 헤더도 비움
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
            console.timeEnd("🚀 Load Prop Data");
        }
    };

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Select Box (공통 컴포넌트 사용) */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Classification (Required)</span>
                        <SearchableSelect
                            options={classOptions}
                            value={filterClass}
                            onChange={setFilterClass}
                            getLabel={(opt) => language === 'ko' ? opt.nameKo || opt.nameEn : opt.nameEn || opt.nameKo}
                            placeholder="Type to search..."
                        />
                    </div>
                    <div></div>
                    {/* Search Input */}
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
                            <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Key or Standard Name..." className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                            <button onClick={() => fetchData(1)} className="absolute right-2 p-2 text-gray-400 hover:text-teal-600"><FiRefreshCw className={loading ? "animate-spin" : ""} /></button>
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
                    onClick={handleExcelClick}
                    disabled={loading}
                    className="flex items-center px-4 py-2.5 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors shadow-sm text-sm font-medium"
                >
                    <FiDownload className="mr-2" /> {t('plant_download')}
                </button>
            </div>

            {/* 그리드 */}
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold text-[10px] sticky top-0 backdrop-blur-sm border-b border-gray-100 z-10">
                            <tr>
                                <th className="px-6 py-4 text-center w-14 bg-gray-50/90 sticky left-0 z-20">No</th>
                                <th className="px-6 py-4 min-w-[120px] bg-gray-50/90 sticky left-14 z-20 border-r border-gray-100">{t('plant_header_key')}</th>
                                <th className="px-6 py-4 min-w-[150px]">Standard Name</th>
                                <th className="px-6 py-4 text-right">Density</th>
                                {dynamicHeaders.map(h => (
                                    <th key={h.PropertyId} className="px-6 py-4 text-right whitespace-nowrap bg-teal-50/30 text-teal-800 border-l border-dashed border-teal-100">
                                        {h.DisplayName || h.NameXml} {h.UnitName && <span className="block text-[9px] text-gray-400 normal-case">({h.UnitName})</span>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={5 + dynamicHeaders.length} className="text-center py-20">{t('loading')}</td></tr> :
                                data.length === 0 ? <tr><td colSpan={5 + dynamicHeaders.length} className="text-center py-20">{t('no_data')}</td></tr> :
                                    data.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-teal-50/40 group">
                                            <td className="px-6 py-4 text-center text-gray-400 text-xs bg-white group-hover:bg-teal-50/40 sticky left-0 z-10">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                            <td className="px-6 py-4 font-mono text-gray-500 font-bold bg-white group-hover:bg-teal-50/40 sticky left-14 z-10 border-r border-gray-100">{row.UniqueKey}</td>
                                            <td className="px-6 py-4"><div className="flex flex-col"><span className="text-gray-800 font-medium">{row.StandardName || '-'}</span><span className="text-[10px] text-gray-400">{row.StandardType}</span></div></td>
                                            <td className="px-6 py-4 text-right font-mono text-gray-600">{row.Density} <span className="text-[9px] text-gray-400">{row.DensityUnit}</span></td>
                                            {dynamicHeaders.map(h => {
                                                const valKey = `${row.SubstanceId}_${h.PropertyId}`;
                                                return <td key={h.PropertyId} className="px-6 py-4 text-right text-gray-700 font-medium border-l border-dashed border-gray-100">{propValues[valKey] || '-'}</td>;
                                            })}
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-xs text-gray-500">Total <span className="font-bold text-teal-600">{totalItems.toLocaleString()}</span> items</div>
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"><FiChevronLeft /></button>
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm font-medium text-gray-700 shadow-sm">
                            <span className="text-gray-400 mr-2 text-[10px] uppercase font-bold">Page</span>
                            <input type="text" value={pageInput} onChange={e => setPageInput(e.target.value)} onKeyDown={handlePageInput} className="w-8 text-center bg-transparent outline-none text-teal-700 font-bold" />
                            <span className="text-gray-300 ml-2">/ {Math.ceil(totalItems / itemsPerPage) || 1}</span>
                        </div>
                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"><FiChevronRight /></button>
                    </div>
                </div>
            </div>

            {/* ★ 모달: Hook에서 상태와 함수를 전달 */}
            <ExcelPreviewModal
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

export default MaterialList_Property;