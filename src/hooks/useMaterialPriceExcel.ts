import { useState } from 'react';
import * as XLSX from 'xlsx';
import { MaterialPriceService } from '../services/MaterialPriceService';

export const useMaterialPriceExcel = (language: string) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [exportData, setExportData] = useState<any[]>([]);

    const prepareData = async (filters: any) => {
        setIsOpen(true);
        setIsPreparing(true);
        setExportData([]);

        try {
            const res = await MaterialPriceService.getExcelData(filters);
            if (!res.success || res.data.length === 0) throw new Error("No data");

            // 데이터 포맷팅 (Price 전용 컬럼)
            const formattedData = res.data.map((row: any, idx: number) => ({
                'No': idx + 1,
                'Valid From': row.validFrom,
                'Region': row.region,
                'Key': row.uniqueKey,
                'Name': language === 'ko' ? (row.nameKo || row.nameEn) : (row.nameEn || row.nameKo),
                'Revision': row.revisionName,
                'Currency': row.currency,
                'Unit': row.unit,
                'Price': row.price,
                'Scrap Price': row.scrapPrice
            }));

            setExportData(formattedData);
        } catch (e) {
            console.error(e);
            setExportData([]); // 에러 시 빈 배열
        } finally {
            setIsPreparing(false);
        }
    };

    const saveFile = async () => {
        if (exportData.length === 0) return;
        setIsSaving(true);
        await new Promise(r => setTimeout(r, 100));

        try {
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const wscols = Object.keys(exportData[0]).map(k => ({ wch: 15 }));
            worksheet['!cols'] = wscols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Material_Prices");
            XLSX.writeFile(workbook, `Material_Prices_${new Date().toISOString().slice(0, 10)}.xlsx`);

            setIsOpen(false);
        } catch (e) {
            console.error(e);
            alert("Export failed");
        } finally {
            setIsSaving(false);
        }
    };

    return { isOpen, close: () => setIsOpen(false), prepareData, saveFile, isPreparing, isSaving, exportData };
};