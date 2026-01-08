import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FiUpload, FiDownload, FiSearch, FiRefreshCw, FiFilter, FiMapPin, FiBox,
  FiChevronLeft, FiChevronRight, FiChevronDown, FiX, FiCheck, FiGrid, FiAlertCircle
} from 'react-icons/fi';
import { api } from '../services/ApiService';
import * as XLSX from 'xlsx';
import { useLanguage } from '../contexts/LanguageContext';
import { AppConfig } from '../config/AppConfig';

interface MasterDataRow {
  id?: number;
  uniqueKey: string;
  nameKo: string;
  nameEn: string;
  region?: string;
  isValidRegion?: boolean;
}

const PlantRegionPage = () => {
  const { t } = useLanguage();

  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'Region' | 'Plant'>('Region');
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [dataList, setDataList] = useState<MasterDataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [regionSearchText, setRegionSearchText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadPreviewData, setUploadPreviewData] = useState<MasterDataRow[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>('');
  const [validRegionKeys, setValidRegionKeys] = useState<Set<string>>(new Set());

  // --- 데이터 조회 ---
  const fetchData = async () => {
    setLoading(true);
    try {
      let query = '';
      if (activeTab === 'Region') {
        query = `
          SELECT 
              Id AS id
            , UniqueKey AS uniqueKey
            , [dbo].[GetSingleTranslation](Name_LOC, N'ko-KR', N'') AS nameKo
            , [dbo].[GetSingleTranslation](Name_LOC, N'en-US', N'') AS nameEn
          FROM [dbo].[BDRegions]
          ORDER BY UniqueKey
        `;
      } else {
        query = `
          SELECT 
              P.Id AS id
            , P.UniqueKey AS uniqueKey
            , [dbo].[GetSingleTranslation](P.Name_LOC, N'ko-KR', N'') AS nameKo
            , [dbo].[GetSingleTranslation](P.Name_LOC, N'en-US', N'') AS nameEn
            , R.UniqueKey AS region
          FROM [dbo].[BDPlants] AS P
          LEFT JOIN [dbo].[BDRegions] AS R ON P.RegionId = R.Id
          ORDER BY P.UniqueKey
        `;
      }

      const result = await api.executeQuery(query, AppConfig.DB.PCM);
      if (result && result.success && Array.isArray(result.data)) {
        setDataList(result.data);
      } else {
        setDataList([]);
      }
    } catch (error) {
      console.error("데이터 조회 실패:", error);
      setDataList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchText('');
    setSelectedRegion('All');
    setCurrentPage(1);
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedRegion]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchValidRegions = async () => {
    try {
      const query = `SELECT UniqueKey FROM [dbo].[BDRegions]`;
      const result = await api.executeQuery(query, AppConfig.DB.PCM);
      if (result && result.success && Array.isArray(result.data)) {
        const keys = new Set(
          result.data.map((item: any) => (item.UniqueKey || '').toString().trim())
        );
        setValidRegionKeys(keys);
        return keys;
      }
      return new Set<string>();
    } catch (e) {
      console.error("지역 코드 조회 실패", e);
      return new Set<string>();
    }
  };

  const parseSheetData = (wb: XLSX.WorkBook, sheetName: string, validRegions: Set<string> | null) => {
    const ws = wb.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(ws);
    const missingRegions: string[] = [];

    const mapped = data.map((row) => {
      // 헬퍼 함수: 여러 키 중 값이 있는 것을 찾아 Trim 해서 반환
      const findVal = (keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined) return (row[k] || '').toString().trim();
        }
        return '';
      };

      // 헤더 매핑
      const keys_key = ['Key', 'UniqueKey', '키 (Key)', '코드 (Key)', t('plant_header_key')];
      const keys_ko = ['NameKo', '국문명', 'Name (KR)', t('plant_header_ko')];
      const keys_en = ['NameEn', '영문명', 'Name (EN)', t('plant_header_en')];
      const keys_region = ['Region', '지역', '지역 코드', 'Region Code', t('plant_header_region')];

      const common = {
        id: -1,
        uniqueKey: findVal(keys_key),
        nameKo: findVal(keys_ko),
        nameEn: findVal(keys_en),
      };

      if (activeTab === 'Region') {
        return common;
      } else {
        const regionCode = findVal(keys_region);
        let isValid = true;
        if (validRegions) {
          isValid = validRegions.has(regionCode);
          if (!isValid && regionCode) {
            missingRegions.push(regionCode);
          }
        }
        return { ...common, region: regionCode, isValidRegion: isValid };
      }
    });

    if (missingRegions.length > 0) {
      alert(t('plant_msg_valid_region') || 'Invalid Region Codes Found');
    }
    return mapped;
  };

  const handleExcelUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let currentValidRegions: Set<string> | null = null;
    if (activeTab === 'Plant') {
      currentValidRegions = await fetchValidRegions();
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (!bstr) return;
      const wb = XLSX.read(bstr, { type: 'binary' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      if (wb.SheetNames.length > 0) {
        const firstSheet = wb.SheetNames[0];
        setCurrentSheet(firstSheet);
        const mappedData = parseSheetData(wb, firstSheet, currentValidRegions);
        setUploadPreviewData(mappedData);
        setIsUploadModalOpen(true);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSheetName = e.target.value;
    setCurrentSheet(newSheetName);
    if (workbook) {
      const mappedData = parseSheetData(workbook, newSheetName, activeTab === 'Plant' ? validRegionKeys : null);
      setUploadPreviewData(mappedData);
    }
  };

  const handleSaveUploadData = async () => {
    if (activeTab === 'Plant') {
      const invalidItems = uploadPreviewData.filter(item => !item.isValidRegion && item.region);
      if (invalidItems.length > 0) {
        if (!window.confirm(t('plant_msg_valid_region') + "?")) {
          return;
        }
      }
    }

    setSaving(true);
    try {
      const importData = uploadPreviewData.map(item => {
        const row: any = {
          "Number": item.uniqueKey,
          "Designation": item.nameKo,
          "영문명": item.nameEn.startsWith("(DYA)") ? item.nameEn : `(DYA)${item.nameEn}`
        };
        if (activeTab === 'Plant') {
          row["지역"] = item.region;
        }
        return row;
      });

      const className = "Category";
      const configName = activeTab;
      const response = await api.importMasterData(importData, className, configName);

      if (response && response.success) {
        alert(t('save') + ' ' + t('confirm'));
        setIsUploadModalOpen(false);
        setWorkbook(null);
        fetchData();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExcelDownload = () => {
    const exportData = filteredData.map((item, index) => {
      const row: any = {};
      row[t('plant_header_no')] = index + 1;

      if (activeTab === 'Plant') {
        row[t('plant_header_region')] = item.region || '';
      }

      row[t('plant_header_key')] = item.uniqueKey;
      row[t('plant_header_ko')] = item.nameKo;
      row[t('plant_header_en')] = item.nameEn;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const wscols = [
      { wch: 6 },
      activeTab === 'Plant' ? { wch: 25 } : { wch: 1 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
    ];
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(workbook, `${activeTab}_Master_${dateStr}.xlsx`);
  };

  const uniqueRegions = useMemo(() => {
    if (activeTab !== 'Plant') return [];
    const regions = dataList.map(item => item.region).filter((r): r is string => !!r);
    return Array.from(new Set(regions)).sort();
  }, [dataList, activeTab]);

  const filteredDropdownOptions = useMemo(() => {
    return uniqueRegions.filter(region => region.toLowerCase().includes(regionSearchText.toLowerCase()));
  }, [uniqueRegions, regionSearchText]);

  const filteredData = useMemo(() => {
    return dataList.filter(item => {
      const searchLower = searchText.toLowerCase();
      const matchesSearch =
        !searchText ||
        item.uniqueKey.toLowerCase().includes(searchLower) ||
        item.nameKo.includes(searchText) ||
        item.nameEn.toLowerCase().includes(searchLower);
      const matchesRegion =
        activeTab === 'Region' || selectedRegion === 'All' || item.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [dataList, searchText, selectedRegion, activeTab]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />

      {/* 상단 컨트롤러 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              {activeTab === 'Region' ? <FiMapPin className="text-teal-600" /> : <FiBox className="text-teal-600" />}
              {t('plant_title')}
            </h2>
            <p className="text-gray-500 text-sm mt-1 mb-4">Master Data Management</p>
            <div className="inline-flex bg-gray-100 p-1.5 rounded-xl">
              <button onClick={() => setActiveTab('Region')} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'Region' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                {t('plant_tab_region')}
              </button>
              <button onClick={() => setActiveTab('Plant')} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'Plant' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                {t('plant_tab_plant')}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExcelUploadClick}
              className="flex items-center px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm text-sm font-medium">
              <FiUpload className="mr-2" /> {t('plant_upload')}
            </button>
            <button onClick={handleExcelDownload}
              className="flex items-center px-4 py-2.5 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors shadow-sm text-sm font-medium"
            >
              <FiDownload className="mr-2" /> {t('plant_download')}
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 my-6"></div>

        {/* 검색 및 필터바 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-3.5 text-gray-400 text-lg" />
            <input type="text" placeholder={`${t('search')}...`} value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder-gray-400 text-sm" />
          </div>

          {activeTab === 'Plant' && (
            <div className="relative w-[450px]" ref={dropdownRef}>
              <button onClick={() => { setIsDropdownOpen(!isDropdownOpen); setRegionSearchText(''); }} className={`w-full text-left pl-10 pr-10 py-3 bg-white border rounded-xl outline-none text-sm text-gray-700 shadow-sm transition-all flex items-center justify-between ${isDropdownOpen ? 'border-teal-500 ring-2 ring-teal-100' : 'border-gray-200 hover:border-gray-300'}`}>
                <FiFilter className="absolute left-3.5 text-gray-500" />
                {/* ★ [수정] '모든 지역 보기' -> t('plant_filter_all') */}
                <span className="truncate block">{selectedRegion === 'All' ? t('plant_filter_all') : selectedRegion}</span>
                <FiChevronDown className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fadeIn">
                  <div className="p-2 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                      <input autoFocus type="text" placeholder={`${t('search')}...`} value={regionSearchText} onChange={(e) => setRegionSearchText(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {/* ★ [수정] '모든 지역 보기' -> t('plant_filter_all') */}
                    <div onClick={() => { setSelectedRegion('All'); setIsDropdownOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-teal-50 transition-colors flex items-center justify-between ${selectedRegion === 'All' ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}`}>
                      <span>{t('plant_filter_all')}</span>
                      {selectedRegion === 'All' && <span className="w-2 h-2 rounded-full bg-teal-500"></span>}
                    </div>
                    {filteredDropdownOptions.map(region => (
                      <div key={region} onClick={() => { setSelectedRegion(region); setIsDropdownOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-teal-50 transition-colors flex items-center justify-between border-t border-gray-50 ${selectedRegion === region ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}`}>
                        <span className="truncate" dangerouslySetInnerHTML={{ __html: region.replace(new RegExp(`(${regionSearchText})`, 'gi'), (match) => `<span class="text-teal-600 font-bold bg-teal-100/50">${match}</span>`) }} />
                        {selectedRegion === region && <span className="w-2 h-2 rounded-full bg-teal-500"></span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={fetchData} className="p-3 bg-white border border-gray-200 text-gray-500 rounded-xl hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all shadow-sm"><FiRefreshCw className={`text-lg ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {/* 그리드 영역 */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold text-xs sticky top-0 backdrop-blur-sm z-10 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 w-20 text-center">{t('plant_header_no')}</th>
                {activeTab === 'Plant' && <th className="px-6 py-4 w-40">{t('plant_header_region')}</th>}
                <th className="px-6 py-4">{t('plant_header_key')}</th>
                <th className="px-6 py-4">{t('plant_header_ko')}</th>
                <th className="px-6 py-4">{t('plant_header_en')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={5} className="px-6 py-32 text-center text-gray-400">{t('loading')}</td></tr> :
                currentItems.length === 0 ? <tr><td colSpan={5} className="px-6 py-32 text-center text-gray-400">{t('no_data')}</td></tr> :
                  currentItems.map((item, index) => (
                    <tr key={index} className="hover:bg-teal-50/40 transition-colors">
                      <td className="px-6 py-4 text-gray-400 text-center font-mono text-xs">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      {activeTab === 'Region' ? (
                        <>
                          <td className="px-6 py-4 font-semibold text-gray-700 font-mono">{item.uniqueKey}</td>
                          <td className="px-6 py-4 text-gray-800">{item.nameKo || '-'}</td>
                          <td className="px-6 py-4 text-gray-500">{item.nameEn || '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">{item.region || 'Unknown'}</span></td>
                          <td className="px-6 py-4 font-semibold text-gray-700 font-mono">{item.uniqueKey}</td>
                          <td className="px-6 py-4 text-gray-800">{item.nameKo || '-'}</td>
                          <td className="px-6 py-4 text-gray-500">{item.nameEn || '-'}</td>
                        </>
                      )}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 푸터 */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-gray-500">Total <span className="font-bold text-teal-600">{totalItems}</span> items</div>
          <div className="flex items-center space-x-1">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><FiChevronLeft /></button>
            <span className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm">Page {currentPage} / {totalPages || 1}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><FiChevronRight /></button>
          </div>
        </div>
      </div>

      {/* 엑셀 업로드 모달 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-teal-600 text-white">
              <h3 className="text-lg font-bold flex items-center"><FiUpload className="mr-2" /> {t('plant_upload')}</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="hover:bg-teal-700 p-1 rounded-full"><FiX /></button>
            </div>

            <div className="p-4 bg-teal-50 border-b border-teal-100 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="text-sm text-teal-800">
                  {t('plant_msg_uploading', { tab: activeTab === 'Region' ? t('plant_tab_region') : t('plant_tab_plant') })}
                </div>
                <div className="text-xs text-teal-600">Total <span className="font-bold">{uploadPreviewData.length}</span> items</div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-teal-700 flex items-center"><FiGrid className="mr-1" /> {t('plant_sheet_select')}</span>
                <select value={currentSheet} onChange={handleSheetChange} className="px-3 py-1.5 rounded-lg border border-teal-200 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white text-gray-700 font-medium">
                  {sheetNames.map(sheet => <option key={sheet} value={sheet}>{sheet}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-2 border-b w-16 text-center">{t('plant_header_no')}</th>
                    {activeTab === 'Plant' && <th className="px-4 py-2 border-b text-blue-700 bg-blue-50/50">{t('plant_header_region')}</th>}
                    <th className="px-4 py-2 border-b">{t('plant_header_key')}</th>
                    <th className="px-4 py-2 border-b">{t('plant_header_ko')}</th>
                    <th className="px-4 py-2 border-b">{t('plant_header_en')}</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadPreviewData.length === 0 ? (
                    <tr><td colSpan={5} className="py-20 text-center text-gray-400">{t('no_data')}</td></tr>
                  ) : (
                    uploadPreviewData.map((row, idx) => (
                      <tr key={idx} className={`border-b hover:bg-gray-50 ${!row.isValidRegion && activeTab === 'Plant' ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-2 text-gray-400 text-xs text-center">{idx + 1}</td>
                        {activeTab === 'Plant' && (
                          <td className="px-4 py-2 text-xs font-bold">
                            {row.isValidRegion ? (
                              <span className="text-blue-600 flex items-center"><FiCheck className="mr-1" /> {row.region}</span>
                            ) : (
                              <span className="text-red-500 flex items-center" title="Invalid"><FiAlertCircle className="mr-1" /> {row.region || 'Empty'}</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-gray-700">{row.uniqueKey || <span className="text-red-300 italic">Empty</span>}</td>
                        <td className="px-4 py-2">{row.nameKo}</td>
                        <td className="px-4 py-2">{row.nameEn}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsUploadModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-100 transition-colors">{t('cancel')}</button>
              <button onClick={handleSaveUploadData} disabled={saving} className={`px-5 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all flex items-center ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-200'}`}>
                {saving ? <><FiRefreshCw className="mr-2 animate-spin" /> {t('loading')}</> : <><FiCheck className="mr-2" /> {t('plant_save_db')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantRegionPage;