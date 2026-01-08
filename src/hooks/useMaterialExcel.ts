import { useState } from 'react';
import * as XLSX from 'xlsx';
import { MaterialService } from '../services/MaterialService'; // 위에서 만든 Service
import { AppConfig } from '../config/AppConfig';

export const useMaterialExcel = (language: string) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [exportData, setExportData] = useState<any[]>([]);

    const prepareData = async (filters: { text: string, classKey: string, includeRef: boolean, materialType: string }) => {
        setIsOpen(true);
        setIsPreparing(true);
        setExportData([]);

        try {
            // WHERE 절 생성
            let where = `WHERE s.Obsolete IS NULL`;
            if (!filters.includeRef) where += ` AND s.ExternallyManaged = 0`;
            if (filters.classKey) where += ` AND cls.UniqueKey = N'${filters.classKey}'`;
            if (filters.text) where += ` AND (s.UniqueKey LIKE N'%${filters.text}%' OR std_n.Name_LOC LIKE N'%${filters.text}%')`;

            if (filters.materialType) {
                where += `
                    AND EXISTS (
                        SELECT 1 
                        FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstancePropertyValues] pv
                        WHERE pv.SubstanceId = s.Id 
                          AND pv.ClassificationPropertyId = 28 
                          AND pv.ListItemValues = N'${filters.materialType}'
                    )
                `;
            }
            // 데이터 조회
            const rowRes = await MaterialService.getExcelData(where);
            if (!rowRes.success || rowRes.data.length === 0) throw new Error("No data");

            const rows = rowRes.data;

            // ---------------------------------------------------------------
            // ★ [단계 2] 물성 값(Value) 조회 (화면 로직과 동일!)
            // ---------------------------------------------------------------
            const ids = rows.map((r: any) => r.SubstanceId);

            // 아까 만든 getPropertyValues 호출 (규격 + 물성 모두 가져옴)
            const valRes = await MaterialService.getPropertyValues(ids, language);

            // 값을 쉽게 찾기 위해 Map으로 변환: { "SubstanceId_PropertyId": "Value" }
            const valMap: Record<string, string> = {};
            const headerMap = new Map<string, string>(); // 헤더 이름 저장용 (KeyId -> DisplayName)

            if (valRes.success) {
                valRes.data.forEach((v: any) => {
                    // 값 저장
                    valMap[`${v.SubstanceId}_${v.PropertyId}`] = v.Value;

                    // 헤더 이름 저장 (엑셀 컬럼명용)
                    if (!headerMap.has(v.PropertyId)) {
                        headerMap.set(v.PropertyId, v.PropertyName);
                    }
                });
            }

            // ---------------------------------------------------------------
            // ★ [단계 3] 데이터 병합 (Rows + Values) -> 엑셀용 객체 생성
            // ---------------------------------------------------------------

            // 동적 헤더 목록 준비 (정렬: 규격(STD_) 먼저, 그 다음 물성)
            const dynamicKeys = Array.from(headerMap.keys()).sort((a, b) => {
                const isAStd = String(a).startsWith('STD_');
                const isBStd = String(b).startsWith('STD_');
                if (isAStd && !isBStd) return -1;
                if (!isAStd && isBStd) return 1;
                return (headerMap.get(a) || '').localeCompare(headerMap.get(b) || '');
            });

            const finalData = rows.map((row: any, idx: number) => {
                // 1. 기본 컬럼 (고정)
                const excelRow: any = {
                    'No': idx + 1,
                    'Key': row.UniqueKey,
                    'Name': row.Name,
                    'Density': row.Density ? `${row.Density} ${row.DensityUnit || ''}` : '',
                };

                // 2. 동적 컬럼 (규격 + 물성)
                dynamicKeys.forEach(keyId => {
                    const colName = headerMap.get(keyId) || keyId; // 컬럼 제목 (예: "DIN", "Tensile Strength")
                    const value = valMap[`${row.SubstanceId}_${keyId}`]; // 값 찾기

                    excelRow[colName] = value || '-'; // 값 넣기 (없으면 -)
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