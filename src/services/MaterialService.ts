import { api } from './ApiService';
import { AppConfig } from '../config/AppConfig';
import { getNameSql } from '../utils/SqlHelper'; // ★ 방금 만든 파일 Import

export const MaterialService = {
    // 1. 분류(Classification) 조회
    getClassOptions: async (lang: string) => {
        const query = `
            SELECT DISTINCT c.Id, c.UniqueKey,
                ${getNameSql('c.Name_LOC', lang)} AS Name

            FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s ON c.Id = s.ClassId
            WHERE c.UniqueKey NOT LIKE '%Scrap%' AND s.Obsolete IS NULL 
            ORDER BY c.UniqueKey
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    getMaterialType: async (lang: string) => {
        const query = `
            SELECT DISTINCT c.Id, c.UniqueKey,
                ${getNameSql('c.Name_LOC', lang)} AS Name

            FROM [${AppConfig.DB.PCM}].[dbo].[ClassificationPropertyListItem] as c
            where [ClassificationPropertyId] = 28
            ORDER BY c.UniqueKey
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    // 2. 엑셀용 데이터 전체 조회
    getExcelData: async (whereClause: string) => {
        const query = `
            SELECT distinct s.Id AS SubstanceId, s.UniqueKey, s.Density, u.Name AS DensityUnit
            FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON s.ClassId = cls.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON s.DensityUnitId = u.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstanceStandardNames] std_n ON s.Id = std_n.SubstanceId
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[BDSubstanceStandards] std_b ON std_n.SubstanceStandardId = std_b.Id
            ${whereClause}
            ORDER BY s.UniqueKey ASC
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    // 3. 물성(Property) 값 조회
    getPropertyValues: async (ids: string, lang: string) => {
        const query = `                   

                    -- 2. 규격 이름 (Standard Names) -> 이것도 동적 컬럼으로 취급!
                    SELECT 
                        sn.SubstanceId
                        ,'STD_' + CAST(sn.SubstanceStandardId AS NVARCHAR(50)) AS PropertyId -- 키 충돌 방지용 접두사
                        ,${getNameSql('sn.Name_LOC', lang)} AS Value -- 규격 이름 (예: PESU GF20)
                        ,${getNameSql('bs.Name_LOC', lang)} AS PropertyName -- 규격 타입 (예: DIN, ISO)
                        ,'' AS UnitName
                    FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstanceStandardNames] sn
                    JOIN [${AppConfig.DB.PCM}].[dbo].[BDSubstanceStandards] bs ON sn.SubstanceStandardId = bs.Id
                    WHERE sn.SubstanceId IN (${ids})

                    UNION ALL

                    SELECT 
                         v.SubstanceId
                        ,CAST(v.ClassificationPropertyId AS NVARCHAR(50)) AS PropertyId
                        ,COALESCE(CAST(v.DecimalValue AS NVARCHAR(50)), v.TextValue, v.ListItemValues, FORMAT(v.DateTimeValue, 'yyyy-MM-dd')) AS Value
                        -- 헤더 생성을 위한 정보 추가
                        , ${getNameSql('cp.Name_LOC', lang)} AS PropertyName
                        ,u.Name AS UnitName
                    FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstancePropertyValues] v
                    JOIN [${AppConfig.DB.PCM}].[dbo].[ClassificationProperties] cp ON v.ClassificationPropertyId = cp.Id
                    LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON cp.UnitId = u.Id
                    WHERE v.SubstanceId IN (${ids})

                `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    }
};