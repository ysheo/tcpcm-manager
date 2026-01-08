import { useState } from 'react';
import * as XLSX from 'xlsx';
import { MaterialService } from '../services/MaterialService'; // 위에서 만든 Service

export const useMaterialExcel = (language: string) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [exportData, setExportData] = useState<any[]>([]);

    const prepareData = async (filters: { text: string, classKey: string, includeRef: boolean }) => {
        setIsOpen(true);
        setIsPreparing(true);
        setExportData([]);

        try {
            // WHERE 절 생성
            let where = `WHERE s.Obsolete IS NULL`;
            if (!filters.includeRef) where += ` AND s.ExternallyManaged = 0`;
            if (filters.classKey) where += ` AND cls.UniqueKey = N'${filters.classKey}'`;
            if (filters.text) where += ` AND (s.UniqueKey LIKE N'%${filters.text}%' OR std_n.Name_LOC LIKE N'%${filters.text}%')`;

            // 데이터 조회
            const rowRes = await MaterialService.getExcelData(where);
            if (!rowRes.success || rowRes.data.length === 0) throw new Error("No data");

            const allRows = rowRes.data;
            const ids = allRows.map((r: any) => r.SubstanceId);
            const langCode = language === 'ko' ? 'ko-KR' : 'en-US';

            // 물성 조회
            const valRes = await MaterialService.getPropertyValues(ids, langCode);

            // 데이터 병합 (Flattening)
            let valueMap: Record<string, any> = {};
            let headerMap = new Map<string, string>();

            if (valRes.success) {
                valRes.data.forEach((v: any) => {
                    valueMap[`${v.SubstanceId}_${v.PropertyId}`] = v.Value;
                    if (!headerMap.has(v.PropertyId)) {
                        headerMap.set(v.PropertyId, v.UnitName ? `${v.PropertyName} (${v.UnitName})` : v.PropertyName);
                    }
                });
            }

            const sortedHeaders = Array.from(headerMap.keys()).sort((a, b) =>
                (headerMap.get(a) || '').localeCompare(headerMap.get(b) || '')
            );

            const finalData = allRows.map((row: any, idx: number) => {
                const flatRow: any = {
                    'No': idx + 1,
                    'Key': row.UniqueKey,
                    'Standard Name': row.StandardName,
                    'Standard Type': row.StandardType,
                    'Density': row.Density ? `${row.Density} ${row.DensityUnit || ''}` : ''
                };
                sortedHeaders.forEach(pid => {
                    flatRow[headerMap.get(pid)!] = valueMap[`${row.SubstanceId}_${pid}`] || '';
                });
                return flatRow;
            });

            setExportData(finalData);
        } catch (e) {
            console.error(e);
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
            const wscols = Object.keys(exportData[0]).map(k => ({ wch: Math.max(k.length + 5, 15) }));
            worksheet['!cols'] = wscols;
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Material_List");
            XLSX.writeFile(workbook, `Material_List_${new Date().toISOString().slice(0, 10)}.xlsx`);
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