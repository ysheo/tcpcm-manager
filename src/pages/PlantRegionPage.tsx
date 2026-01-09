import React, { useState, useEffect, useMemo } from 'react';
import {
  FiUpload, FiDownload, FiSearch, FiRefreshCw, FiMapPin, FiBox,
  FiChevronLeft, FiChevronRight, FiX, FiCheck, FiGrid, FiAlertCircle
} from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import SearchableSelect from '../components/common/SearchableSelect';
import SmartSearchInput from '../components/common/SmartSearchInput';
import { PlantRegionService, type MasterDataRow } from '../services/PlantRegionService';
import { usePlantRegionExcel } from '../hooks/usePlantRegionExcel';
import Pagination from '../components/common/Pagination';

const PlantRegionPage = () => {
  const { t } = useLanguage();

  // 1. UI States
  const [activeTab, setActiveTab] = useState<'Region' | 'Plant'>('Region');
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [includeReference, setIncludeReference] = useState(false); // 지멘스 포함 여부

  const [dataList, setDataList] = useState<MasterDataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // 2. Data Fetching
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = activeTab === 'Region'
        ? await PlantRegionService.getRegions(includeReference)
        : await PlantRegionService.getPlants(includeReference);

      if (res.success) setDataList(res.data);
      else setDataList([]);
    } catch (e) {
      console.error(e);
      setDataList([]);
    } finally {
      setLoading(false);
    }
  };

  // 3. Effects (요청하신 로직 적용)

  // [로직 A] 검색어, 필터(지역, 지멘스) 변경 시 딜레이 후 조회
  useEffect(() => {
    const timer = setTimeout(() => {
      // ★ 핵심 로직: 현재 이미 1페이지라면 State 변경이 없어 useEffect가 안 돌기 때문에 강제로 조회
      if (currentPage === 1) {
        fetchData();
      } else {
        // 1페이지가 아니라면 1로 초기화 -> [로직 B]가 감지하여 조회 실행됨
        setCurrentPage(1);
      }
    }, 300); // 0.3초 디바운스

    return () => clearTimeout(timer);
    // 의존성: 검색어, 지역선택, 지멘스포함여부
  }, [searchText, selectedRegion, includeReference, activeTab]);


  // [로직 B] 탭 변경이나 페이지 변경 시 조회 (딜레이 없음)
  useEffect(() => {
    // 탭이 바뀌면 필터 초기화 후 조회
    // (여기서 setSearchText 등을 초기화해도 [로직 A]가 돌겠지만, 명시적으로 바로 조회하기 위해 분리)
    fetchData();
    // 주의: activeTab이 바뀔 때 setSearchText('') 등을 하면 [로직 A]도 발동될 수 있으므로
    // 실제 사용 시 탭 변경 핸들러에서 초기화하는 것이 깔끔하지만, 현재 구조상 여기서 처리
  }, [currentPage]);

  // 탭 변경 시 상태 초기화 (별도 핸들러 대신 Effect 활용 시)
  useEffect(() => {
    setSearchText('');
    setSelectedRegion('All');
    setCurrentPage(1);
  }, [activeTab]);


  const excel = usePlantRegionExcel(t, activeTab, fetchData);

  // 4. Filtering & Memoization
  const uniqueRegions = useMemo(() => {
    if (activeTab !== 'Plant') return [];
    return Array.from(new Set(dataList.map(item => item.region).filter((r): r is string => !!r))).sort();
  }, [dataList, activeTab]);

  const filteredData = useMemo(() => {
    return dataList.filter(item => {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText ||
        item.uniqueKey.toLowerCase().includes(searchLower) ||
        item.nameKo.includes(searchText) ||
        item.nameEn.toLowerCase().includes(searchLower);

      const matchesRegion = activeTab === 'Region' || selectedRegion === 'All' || item.region === selectedRegion;

      return matchesSearch && matchesRegion;
    });
  }, [dataList, searchText, selectedRegion, activeTab]);

  // 5. Pagination Logic
  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 relative">
      <input type="file" ref={excel.fileInputRef} onChange={excel.handleFileChange} accept=".xlsx, .xls" className="hidden" />

      {/* 1. 상단 헤더 & 탭 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              {activeTab === 'Region' ? <FiMapPin className="text-teal-600" /> : <FiBox className="text-teal-600" />}
              {t('plant_title')}
            </h2>
            <p className="text-gray-500 text-sm mt-1 mb-4">Master Data Management</p>
            <div className="inline-flex bg-gray-100 p-1.5 rounded-xl">
              {['Region', 'Plant'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab ? 'bg-white text-teal-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t(`plant_tab_${tab.toLowerCase()}` as any)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 필터 영역 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* (1) 지역 필터 (Plant 탭일 때만 표시) */}
          {activeTab === 'Plant' && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{t('plant_header_region')}</span>
              <SearchableSelect
                options={uniqueRegions.map(r => ({ uniqueKey: r, name: r }))}
                value={selectedRegion === 'All' ? '' : selectedRegion}
                onChange={(val) => setSelectedRegion(val || 'All')}
                getLabel={(opt) => opt.name}
                placeholder={t('plant_filter_all')}
              />
            </div>
          )}

          {/* (2) Smart Search (지멘스 포함 체크박스) */}
          <div className="lg:col-span-2">
            <SmartSearchInput
              label={t("mat_label_smart_search") || "Smart Search"}
              value={searchText}
              onChange={setSearchText}
              // onRefresh={() => setCurrentPage(1)} // useEffect 로직 A에서 처리하므로 중복 제거 가능
              onRefresh={() => {
                if (currentPage === 1) fetchData();
                else setCurrentPage(1);
              }}
              loading={loading}
              placeholder={`${t('search')}...`}

              showOption={true}
              optionChecked={includeReference}
              onOptionChange={setIncludeReference}
              optionLabel={t("mat_label_include_siemens")}
            />
          </div>
        </div>
      </div>

      {/* 3. 액션 버튼 */}
      <div className="flex justify-end mb-2 gap-2">
        <button onClick={excel.handleUploadClick} className="flex items-center px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium">
          <FiUpload className="mr-2" /> {t('plant_upload')}
        </button>
        <button onClick={() => excel.handleDownload(filteredData)} className="flex items-center px-4 py-2.5 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors shadow-sm text-sm font-medium">
          <FiDownload className="mr-2" /> {t('plant_download')}
        </button>
      </div>

      {/* 4. 데이터 그리드 */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold text-[10px] sticky top-0 backdrop-blur-sm border-b border-gray-100 z-10">
              <tr>
                <th className="px-6 py-4 w-20 text-center bg-gray-50/90 sticky left-0 z-20">{t('plant_header_no')}</th>
                {activeTab === 'Plant' && <th className="px-6 py-4 w-40">{t('plant_header_region')}</th>}
                <th className="px-6 py-4">{t('plant_header_key')}</th>
                <th className="px-6 py-4">{t('plant_header_ko')}</th>
                <th className="px-6 py-4">{t('plant_header_en')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-32 text-center text-gray-400">{t('loading')}</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-32 text-center text-gray-400">{t('no_data')}</td></tr>
              ) : (
                currentItems.map((item, index) => (
                  <tr key={index} className="hover:bg-teal-50/30 transition-colors group">
                    <td className="px-6 py-4 text-center text-gray-400 text-xs bg-white group-hover:bg-teal-50/30 sticky left-0 z-10">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    {activeTab === 'Region' ? (
                      <>
                        <td className="px-6 py-4 font-mono font-bold text-gray-600">{item.uniqueKey}</td>
                        <td className="px-6 py-4 text-gray-800">{item.nameKo || '-'}</td>
                        <td className="px-6 py-4 text-gray-500">{item.nameEn || '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {item.region || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-600">{item.uniqueKey}</td>
                        <td className="px-6 py-4 text-gray-800">{item.nameKo || '-'}</td>
                        <td className="px-6 py-4 text-gray-500">{item.nameEn || '-'}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* 페이지네이션 */}
        <Pagination
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ★ 5. 엑셀 업로드 모달 (전체 포함) */}
      {excel.isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-teal-600 text-white">
              <h3 className="text-lg font-bold flex items-center"><FiUpload className="mr-2" /> {t('plant_upload')}</h3>
              <button onClick={excel.closeModal} className="hover:bg-teal-700 p-1 rounded-full"><FiX /></button>
            </div>

            {/* 모달 툴바 (시트 선택 등) */}
            <div className="p-4 bg-teal-50 border-b border-teal-100 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-teal-800">{t('plant_msg_uploading', { tab: activeTab })}</span>
                <span className="text-xs text-teal-600 font-bold">Total {excel.previewData.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-700"><FiGrid className="inline mr-1" />Sheet</span>
                <select
                  value={excel.currentSheet}
                  onChange={(e) => excel.setCurrentSheet(e.target.value)}
                  className="text-sm border border-teal-200 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                >
                  {excel.sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* 모달 프리뷰 테이블 */}
            <div className="flex-1 overflow-auto bg-white p-4">
              <table className="w-full text-sm text-left border border-gray-200">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="p-2 w-16 text-center text-gray-600">No</th>
                    <th className="p-2 text-gray-600">Key</th>
                    <th className="p-2 text-gray-600">Name (Ko)</th>
                    {/* Plant 탭일 경우 Region 검증 결과 표시 */}
                    {activeTab === 'Plant' && <th className="p-2 text-gray-600">Region Check</th>}
                  </tr>
                </thead>
                <tbody>
                  {excel.previewData.length === 0 ? (
                    <tr><td colSpan={activeTab === 'Plant' ? 4 : 3} className="p-8 text-center text-gray-400">No data found in this sheet</td></tr>
                  ) : (
                    excel.previewData.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${!row.isValidRegion && activeTab === 'Plant' ? 'bg-red-50' : ''}`}>
                        <td className="p-2 text-center text-gray-400">{i + 1}</td>
                        <td className="p-2 font-mono text-gray-700">{row.uniqueKey}</td>
                        <td className="p-2 text-gray-800">{row.nameKo}</td>
                        {activeTab === 'Plant' && (
                          <td className="p-2">
                            {!row.isValidRegion ? (
                              <span className="text-xs text-red-500 flex items-center"><FiAlertCircle className="mr-1" />Invalid Region</span>
                            ) : (
                              <span className="text-xs text-green-500 flex items-center"><FiCheck className="mr-1" />OK</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 모달 하단 버튼 */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button onClick={excel.closeModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white transition-colors">
                {t('cancel')}
              </button>
              <button
                onClick={excel.handleSave}
                disabled={excel.saving || excel.previewData.length === 0}
                className={`px-4 py-2 bg-teal-600 text-white rounded-lg flex items-center shadow-md hover:bg-teal-700 transition-all ${excel.saving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {excel.saving ? <FiRefreshCw className="animate-spin mr-2" /> : <FiCheck className="mr-2" />}
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantRegionPage;