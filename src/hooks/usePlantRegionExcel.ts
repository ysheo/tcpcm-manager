import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { PlantRegionService, type MasterDataRow } from '../services/PlantRegionService';

export const usePlantRegionExcel = (t: any, activeTab: 'Region' | 'Plant', refreshData: () => void) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState<MasterDataRow[]>([]);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [currentSheet, setCurrentSheet] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // 엑셀 헤더 파싱 및 매핑
    const parseSheet = (wb: XLSX.WorkBook, sheetName: string, validRegions: Set<string> | null) => {
        const ws = wb.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        return data.map((row) => {
            const findVal = (keys: string[]) => {
                for (const k of keys) if (row[k] !== undefined) return (row[k] || '').toString().trim();
                return '';
            };

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

            if (activeTab === 'Region') return common;

            const regionCode = findVal(keys_region);
            let isValid = true;
            if (validRegions) isValid = validRegions.has(regionCode);

            return { ...common, region: regionCode, isValidRegion: isValid };
        });
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let validRegions: Set<string> | null = null;
        if (activeTab === 'Plant') {
            validRegions = await PlantRegionService.getValidRegionKeys();
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
                setPreviewData(parseSheet(wb, firstSheet, validRegions));
                setIsModalOpen(true);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleSave = async () => {
        if (activeTab === 'Plant') {
            const invalidCount = previewData.filter(i => !i.isValidRegion && i.region).length;
            if (invalidCount > 0 && !window.confirm(t('plant_msg_valid_region') + "?")) return;
        }

        setSaving(true);
        try {
            const res = await PlantRegionService.saveData(previewData, activeTab);
            if (res.success) {
                alert(t('save') + ' ' + t('confirm'));
                setIsModalOpen(false);
                refreshData();
            } else {
                throw new Error(res.message);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDownload = (data: any[]) => {
        const exportData = data.map((item, index) => {
            const row: any = {};
            row[t('plant_header_no')] = index + 1;
            if (activeTab === 'Plant') row[t('plant_header_region')] = item.region || '';
            row[t('plant_header_key')] = item.uniqueKey;
            row[t('plant_header_ko')] = item.nameKo;
            row[t('plant_header_en')] = item.nameEn;
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const wscols = [{ wch: 6 }, activeTab === 'Plant' ? { wch: 25 } : { wch: 1 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
        worksheet['!cols'] = wscols;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, activeTab);
        XLSX.writeFile(workbook, `${activeTab}_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return {
        fileInputRef,
        isModalOpen,
        closeModal: () => setIsModalOpen(false),
        previewData,
        sheetNames,
        currentSheet,
        setCurrentSheet,
        handleUploadClick,
        handleFileChange,
        handleSave,
        handleDownload,
        saving
    };
};