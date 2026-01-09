import { useState } from 'react';
import * as XLSX from 'xlsx';
import { MachineService, type MachineFilters } from '../services/MachineService';

export const useMachineExcel = (language: string) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [exportData, setExportData] = useState<any[]>([]);

    const prepareData = async (filters: MachineFilters) => {
        setIsOpen(true);
        setIsPreparing(true);
        setExportData([]);

        try {
            // 1. 기본 데이터 (Header + Details 전체)
            const rowRes = await MachineService.getExcelData(filters, language);
            if (!rowRes.success || rowRes.data.length === 0) throw new Error("No data");
            const rows = rowRes.data;

            // 2. 동적 속성 데이터
            const ids = rows.map((r: any) => r.AssetId).join(',');
            const valMap: Record<string, string> = {};
            const headerMap = new Map<string, string>();

            if (ids) {
                const valRes = await MachineService.getPropertyValues(ids, language);
                if (valRes.success) {
                    valRes.data.forEach((v: any) => {
                        valMap[`${v.AssetId}_${v.PropertyId}`] = v.Value;
                        if (!headerMap.has(v.PropertyId)) {
                            headerMap.set(v.PropertyId, v.PropertyName);
                        }
                    });
                }
            }

            // 3. 데이터 병합
            const dynamicKeys = Array.from(headerMap.keys()).sort((a, b) =>
                (headerMap.get(a) || '').localeCompare(headerMap.get(b) || '')
            );

            const finalData = rows.map((row: any, idx: number) => {
                // ★ 설비 전용 고정 컬럼 매핑 (MDAssetDetails 컬럼들)
                const excelRow: any = {
                    'No': idx + 1,
                    'Key': row.UniqueKey,
                    'Name': row.Name,
                    'Plant': row.PlantName,
                    'Invest': row.Invest,
                    'Currency': row.CurrencyName,
                    'Depreciation (Y)': row.DepreciationTime,
                    'Power On Rate (%)': row.PowerOnTimeRate ? (row.PowerOnTimeRate * 100) : '',
                    'Space Net': row.RequiredSpaceNet,
                    // 필요시 d.* 로 가져온 다른 상세 컬럼들도 여기에 추가
                    'Created': row.CreationDate ? new Date(row.CreationDate).toLocaleDateString() : '',
                };

                // 동적 컬럼 매핑
                dynamicKeys.forEach(keyId => {
                    const colName = headerMap.get(keyId) || keyId;
                    const value = valMap[`${row.AssetId}_${keyId}`];
                    excelRow[colName] = value || '-';
                });

                return excelRow;
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
        try {
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Machine_List");
            XLSX.writeFile(workbook, `Machine_List_${new Date().toISOString().slice(0, 10)}.xlsx`);
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