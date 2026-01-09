import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight, FiUpload, FiDownload } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/ApiService';
import { AppConfig } from '../config/AppConfig';
import { MaterialService } from '../services/MaterialService'; // 서비스 임포트
import { useMaterialExcel } from '../hooks/useMaterialExcel'; // 훅 임포트
import ExcelPreviewModal from '../components/common/ExcelPreviewModal'; // 공통 컴포넌트
import SearchableSelect from '../components/common/SearchableSelect';   // 공통 컴포넌트 (파일 분리 가정)
import SmartSearchInput from '../components/common/SmartSearchInput';
import Pagination from '../components/common/Pagination'; // 임포트

// 타입 정의 (필요하다면 types.ts로 분리 가능)
interface FilterOption {
    id: string;
    uniqueKey: string;
    name: string;
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
    const [filterMaterialType, setFilterMaterialType] = useState('');
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [includeReference, setIncludeReference] = useState(false);
    const [classOptions, setClassOptions] = useState<FilterOption[]>([]);
    const [materialTypeOptions, setMaterialTypeOptions] = useState<FilterOption[]>([]);
    const [allGroups, setAllGroups] = useState<any[]>([]);

    // 페이지네이션
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;


    const filterParams = {
        searchText,
        classKey: filterClass,
        groupKey: selectedGroups.length > 0 ? selectedGroups[selectedGroups.length - 1] : '',
        materialType: filterMaterialType,
        includeRef: includeReference
    };

    // ★ 엑셀 Hook 사용 (한 줄로 기능 연결!)
    const excel = useMaterialExcel(language);

    // 1. 초기 로드 (Service 사용)
    useEffect(() => {
        const fetchOptions = async () => {

            // ★ (1) 신규 필터 옵션 로드 (ID 17 하위 Leaf)
            const resGroup = await MaterialService.getMaterialGroupTree(language);
            if (resGroup.success) {
                // 나중에 필터링하기 쉽게 데이터 저장
                setAllGroups(resGroup.data.map((i: any) => ({
                    id: i.Id,
                    parentId: i.ParentId, // 부모 ID 중요!
                    uniqueKey: i.UniqueKey,
                    name: i.Name
                })));
            }

            const res2 = await MaterialService.getMaterialType(language);
            if (res2.success) {
                setMaterialTypeOptions(res2.data.map((i: any) => ({
                    id: i.Id, uniqueKey: i.UniqueKey, name: i.Name
                })));
            }

            const res = await MaterialService.getClassOptions(language);
            if (res.success) {
                setClassOptions(res.data.map((i: any) => ({
                    id: i.Id, uniqueKey: i.UniqueKey, name: i.Name
                })));
            }
        };
        fetchOptions();
    }, [language]);

    // 데이터 패칭용 useEffect (하나로 통합)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(currentPage);
        }, 300);

        return () => clearTimeout(timer);

    }, [
        currentPage,
        filterClass,
        filterMaterialType,
        selectedGroups,
        includeReference
    ]);

    // 엑셀 버튼 핸들러
    const handleExcelClick = () => {
        excel.prepareData(filterParams);
    };

    const fetchData = async (page: number) => {
        // 분류 선택 안 해도 데이터가 있으면 조회되도록 (필터링 조건에 따라)
        // 만약 분류 필수라면 if (!filterClass) return; 유지

        setLoading(true);
        console.time("🚀 Load Prop Data");

        try {
            const { total, data: rows } = await MaterialService.getList(page, itemsPerPage, filterParams);

            setTotalItems(total);

            if (rows.length > 0) {
                setData(rows);

                // --- 4. 값(Value) + 헤더 정보(Meta) 동시 조회 ---
                const ids = rows.map((r: any) => `'${r.SubstanceId}'`).join(',');

                if (ids) {
                    // 값을 가져올 때 [물성 이름]과 [단위]도 같이 JOIN해서 가져옵니다.
                    const valRes = await MaterialService.getPropertyValues(ids, language);
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
                        const sortedHeaders = Array.from(headersMap.values()).sort((a: any, b: any) => {
                            // ID가 'STD_'로 시작하는지 확인 (규격인지 물성인지 판별)
                            const isAStd = String(a.PropertyId).startsWith('STD_');
                            const isBStd = String(b.PropertyId).startsWith('STD_');

                            // [우선순위 1] 둘 중 하나만 규격(STD)이면, 규격을 앞으로(-1) 보냄
                            if (isAStd && !isBStd) return -1;
                            if (!isAStd && isBStd) return 1;

                            // [우선순위 2] 둘 다 규격이거나, 둘 다 물성이면 -> 이름(DisplayName) 가나다순 정렬
                            // (에러 방지용 빈 문자열 처리 포함)
                            return (a.DisplayName || '').localeCompare(b.DisplayName || '');
                        });

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
    const renderGroupFilters = () => {
        // 1. 레벨별 드롭다운을 담을 배열
        const dropdowns = [];

        // 2. 루트(ID 17)의 직계 자식들 찾기 (ParentId가 17인 애들)
        // ※ 주의: DB에서 17번 ID를 정확히 알아야 함. 혹은 최상위 부모를 찾는 로직 필요.
        // 여기서는 편의상 "ParentId가 17"이라고 가정하거나, 
        // 데이터 중 ParentId가 17인 데이터를 '첫 번째 레벨'로 봅니다.
        let currentLevelOptions = allGroups.filter(g => g.parentId === 17);

        // 3. 루프를 돌면서 드롭다운 생성
        // (선택된 개수 + 1)만큼 드롭다운을 보여줍니다. (마지막 선택의 자식들을 보여주기 위해)
        for (let i = 0; i <= selectedGroups.length; i++) {

            // 더 이상 보여줄 하위 옵션이 없으면 종료
            if (currentLevelOptions.length === 0) break;

            const currentVal = selectedGroups[i] || ''; // 현재 레벨의 선택값

            dropdowns.push(
                <div key={i} className="flex flex-col gap-1 min-w-[150px]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        {i === 0 ? "Material Group" : `Sub Group ${i}`}
                    </span>
                    <SearchableSelect
                        options={currentLevelOptions}
                        value={currentVal}
                        onChange={(newVal) => handleGroupChange(i, newVal)}
                        getLabel={(opt) => opt.name}
                        placeholder={i === 0 ? "Select Group..." : "Select Sub..."}
                    />
                </div>
            );

            // 다음 레벨을 위해 옵션 갱신
            // 현재 선택된 값(UniqueKey)을 가진 항목의 ID를 찾아서, 그 ID를 부모로 가진 애들을 찾음
            if (currentVal) {
                const selectedItem = allGroups.find(g => g.uniqueKey === currentVal);
                if (selectedItem) {
                    currentLevelOptions = allGroups.filter(g => g.parentId === selectedItem.id);
                } else {
                    currentLevelOptions = [];
                }
            } else {
                // 선택 안 했으면 다음 레벨 없음
                currentLevelOptions = [];
            }
        }

        return dropdowns;
    };

    // 그룹 변경 핸들러
    const handleGroupChange = (level: number, newVal: string) => {
        const newGroups = [...selectedGroups];

        if (newVal) {
            // 해당 레벨 값을 변경하고, 그 뒤에 있던 하위 선택들은 다 날림 (다시 선택해야 하니까)
            newGroups[level] = newVal;
            newGroups.splice(level + 1);
        } else {
            // 선택 취소하면 해당 레벨부터 싹 날림
            newGroups.splice(level);
        }

        setSelectedGroups(newGroups);
    };

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex flex-col gap-4">

                    {/* ★ [1행] 동적 그룹 필터 영역 */}
                    {/* 그룹이 선택될 때마다 옆으로 늘어나며, 공간 부족하면 다음 줄로 넘어감 */}
                    <div className="flex flex-wrap gap-4 items-end border-b border-gray-100 pb-4">
                        {renderGroupFilters()}

                        {/* 그룹 선택이 하나도 없을 때 안내 문구 (선택사항) */}
                        {selectedGroups.length === 0 && (
                            <span className="text-xs text-gray-400 py-3">
                                Please select a material group to proceed.
                            </span>
                        )}
                    </div>

                    {/* ★ [2행] 나머지 고정 필터 영역 (Grid 사용 추천) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* Select Box (공통 컴포넌트 사용) */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Material Type</span>
                            <SearchableSelect
                                options={materialTypeOptions}
                                value={filterMaterialType}
                                onChange={setFilterMaterialType}
                                getLabel={(opt) => opt.name}
                                placeholder="Type to search..."
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Classification</span>
                            <SearchableSelect
                                options={classOptions}
                                value={filterClass}
                                onChange={setFilterClass}
                                getLabel={(opt) => opt.name}
                                placeholder="Type to search..."
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <SmartSearchInput
                                // 1. 기본 설정
                                label={t("mat_label_smart_search")}
                                value={searchText}
                                onChange={setSearchText}
                                // ★ [수정] 새로고침 로직 변경
                                onRefresh={() => {
                                    if (currentPage === 1) {
                                        fetchData(1); // 이미 1페이지면 강제 조회
                                    } else {
                                        setCurrentPage(1); // 아니면 1페이지로 이동 (-> useEffect가 조회함)
                                    }
                                }}
                                loading={loading}
                                placeholder="XML & Key Search..."

                                // 2. 옵션(지멘스 포함) 활성화
                                showOption={true}
                                optionLabel={t("mat_label_include_siemens")}
                                optionChecked={includeReference}
                                onOptionChange={setIncludeReference}
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
                                            <td className="px-6 py-4 text-center text-gray-400 text-xs bg-white group-hover:bg-teal-50/40 left-0 z-10">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                            <td className="px-6 py-4 font-mono text-gray-500 font-bold bg-white group-hover:bg-teal-50/40 left-14 z-10 border-r border-gray-100">{row.UniqueKey}</td>
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
                <Pagination
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
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