import { api } from './ApiService';
import { AppConfig } from '../config/AppConfig';

export const MaterialService = {
    // 1. 분류(Classification) 조회
    getClassOptions: async () => {
        const query = `
            SELECT DISTINCT c.Id, c.UniqueKey,
                [dbo].[GetSingleTranslation](c.Name_LOC, N'en-US', '') AS NameEn,
                [dbo].[GetSingleTranslation](c.Name_LOC, N'ko-KR', '') AS NameKo
            FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s ON c.Id = s.ClassId
            WHERE c.UniqueKey NOT LIKE '%Scrap%' AND s.Obsolete IS NULL 
            ORDER BY c.UniqueKey
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    // 2. 엑셀용 데이터 전체 조회
    getExcelData: async (whereClause: string) => {
        const query = `
            SELECT s.Id AS SubstanceId, s.UniqueKey, s.Density, u.Name AS DensityUnit,
                   [dbo].[GetSingleTranslation](std_n.Name_LOC, N'ko-KR', '') AS StandardName,
                   [dbo].[GetSingleTranslation](std_b.Name_LOC, N'ko-KR', '') AS StandardType
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
    getPropertyValues: async (ids: string[], lang: string) => {
        const idString = ids.map(id => `'${id}'`).join(',');
        const query = `
            SELECT v.SubstanceId, v.ClassificationPropertyId AS PropertyId,
                   COALESCE(CAST(v.DecimalValue AS NVARCHAR(50)), v.TextValue, v.ListItemValues, FORMAT(v.DateTimeValue, 'yyyy-MM-dd')) AS Value,
                   [dbo].[GetSingleTranslation](cp.Name_LOC, N'${lang}', '') AS PropertyName,
                   u.Name AS UnitName
            FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstancePropertyValues] v
            JOIN [${AppConfig.DB.PCM}].[dbo].[ClassificationProperties] cp ON v.ClassificationPropertyId = cp.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON cp.UnitId = u.Id
            WHERE v.SubstanceId IN (${idString})
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    }
};