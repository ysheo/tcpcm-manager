import { api } from './ApiService';
import { AppConfig } from '../config/AppConfig';
import { getNameSql } from '../utils/SqlHelper'; // ★ 방금 만든 파일 Import

// SQL WHERE절 빌더
const buildWhereClause = (filters: any) => {
    let where = `WHERE d.Obsolete IS NULL AND r.Obsolete IS NULL`;

    if (!filters.includeReference) where += ` AND d.ExternallyManaged = 0`;
    if (filters.region) where += ` AND reg.UniqueKey = N'${filters.region}'`;
    if (filters.classKey) where += ` AND cls.UniqueKey = N'${filters.classKey}'`;

    if (!filters.isAllPeriod) {
        if (filters.startDate) where += ` AND d.DateValidFrom >= '${filters.startDate}'`;
        if (filters.endDate) where += ` AND d.DateValidFrom <= '${filters.endDate} 23:59:59'`;
    }

    if (filters.searchText) {
        where += ` AND (h.UniqueKey LIKE N'%${filters.searchText}%' OR CAST(h.Name_LOC AS NVARCHAR(MAX)) LIKE N'%${filters.searchText}%')`;
    }

    return where;
};

export const MaterialPriceService = {
    // 1. 옵션 조회 (지역, 분류)
    getOptions: async (lang: string) => {
        const qRegion = `
            SELECT DISTINCT reg.UniqueKey
                , ${getNameSql('reg.Name_LOC', lang)} AS Name
            FROM [${AppConfig.DB.PCM}].[dbo].[MDMaterialDetails] d
            JOIN [${AppConfig.DB.PCM}].[dbo].[BDRegions] reg ON d.RegionId = reg.Id
            WHERE d.Obsolete IS NULL ORDER BY reg.UniqueKey
        `;
        const qClass = `
            SELECT c.UniqueKey,
                 ${getNameSql('c.Name_LOC', lang)} AS Name
            FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c
            WHERE c.UniqueKey NOT LIKE '%Scrap%'
            AND EXISTS (
                SELECT 1 FROM [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaderRevisions] r
                JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialDetails] d ON r.Id = d.MaterialHeaderRevisionId
                WHERE r.ClassId = c.Id AND r.Obsolete IS NULL AND d.Obsolete IS NULL
            ) ORDER BY c.UniqueKey
        `;
        return Promise.all([
            api.executeQuery(qRegion, AppConfig.DB.PCM),
            api.executeQuery(qClass, AppConfig.DB.PCM)
        ]);
    },

    // 2. 리스트 조회 (카운트 + 페이징)
    getList: async (page: number, itemsPerPage: number, filters: any, lang: string) => {
        const where = buildWhereClause(filters);
        const needHeaderJoin = !!filters.searchText;

        // (1) 카운트
        const countQuery = `
            SELECT COUNT(*) as total
            FROM [${AppConfig.DB.PCM}].[dbo].[MDMaterialDetails] d
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaderRevisions] r ON d.MaterialHeaderRevisionId = r.Id
            ${needHeaderJoin ? `JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaders] h ON r.MaterialHeaderId = h.Id` : ''}
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[BDRegions] reg ON d.RegionId = reg.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON r.ClassId = cls.Id 
            ${where}
            AND NOT EXISTS (SELECT 1 FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c WHERE c.Id = r.ClassId AND c.UniqueKey LIKE '%Scrap%')
        `;

        // (2) 데이터
        const dataQuery = `
            WITH PagedIDs AS (
                SELECT d.Id
                FROM [${AppConfig.DB.PCM}].[dbo].[MDMaterialDetails] d
                JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaderRevisions] r ON d.MaterialHeaderRevisionId = r.Id
                ${needHeaderJoin ? `JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaders] h ON r.MaterialHeaderId = h.Id` : ''}
                LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON r.ClassId = cls.Id 
                LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[BDRegions] reg ON d.RegionId = reg.Id
                ${where}
                AND NOT EXISTS (SELECT 1 FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c WHERE c.Id = r.ClassId AND c.UniqueKey LIKE '%Scrap%')
                ORDER BY d.DateValidFrom DESC, d.Id DESC
                OFFSET ${(page - 1) * itemsPerPage} ROWS FETCH NEXT ${itemsPerPage} ROWS ONLY
            )
            SELECT 
                 d.Id AS id
                ,h.UniqueKey AS uniqueKey
                ,r.Number AS revisionName
                ,${getNameSql('h.Name_LOC', lang)} AS name
                ,FORMAT(d.DateValidFrom, 'yyyy-MM-dd') AS validFrom
                ,ISNULL(reg.UniqueKey, '') AS region
                ,ISNULL(c.IsoCode, '') AS currency
                ,d.Price AS price
                ,ISNULL((
                    SELECT TOP 1 s_d.Price 
                    FROM [${AppConfig.DB.PCM}].[dbo].[MDMaterialDetails] s_d 
                    JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaderRevisions] s_r ON s_d.MaterialHeaderRevisionId = s_r.Id
                    JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] s_cls ON s_r.ClassId = s_cls.Id
                    WHERE s_r.SubstanceId = r.SubstanceId 
                        AND (ISNULL(s_d.RegionId, 0) = ISNULL(d.RegionId, 0))
                        AND s_d.DateValidFrom <= d.DateValidFrom
                        AND s_cls.UniqueKey LIKE '%Scrap%'
                        AND s_d.Obsolete IS NULL AND s_r.Obsolete IS NULL 
                    ORDER BY s_d.DateValidFrom DESC
                ), 0) AS scrapPrice
                ,ISNULL(u.Name, '') AS unit
            FROM PagedIDs p
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialDetails] d ON p.Id = d.Id
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaderRevisions] r ON d.MaterialHeaderRevisionId = r.Id
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaders] h ON r.MaterialHeaderId = h.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Currencies] c ON d.CurrencyId = c.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON d.UnitId = u.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[BDRegions] reg ON d.RegionId = reg.Id
            ORDER BY d.DateValidFrom DESC, d.Id DESC
        `;

        return Promise.all([
            api.executeQuery(countQuery, AppConfig.DB.PCM),
            api.executeQuery(dataQuery, AppConfig.DB.PCM)
        ]);
    },

    // 3. 엑셀 다운로드용 전체 데이터
    getExcelData: async (filters: any, lang: string) => {
        const where = buildWhereClause(filters);

        // *참고: 엑셀 다운로드 시 ScrapPrice 계산은 성능 이슈로 0 처리하거나, 
        // 꼭 필요하면 서브쿼리를 포함해야 합니다. (요청주신 코드에서는 0 처리 로직이 있어 그대로 반영)
        const query = `
            SELECT 
                 FORMAT(d.DateValidFrom, 'yyyy-MM-dd') AS validFrom
                ,ISNULL(reg.UniqueKey, '') AS region
                ,h.UniqueKey AS uniqueKey
                ,r.Number AS revisionName
                , ${getNameSql('h.Name_LOC', lang)} AS Name
                ,c.IsoCode AS currency
                ,u.Name AS unit
                ,d.Price AS price
                ,0 AS scrapPrice -- Performance optimization for bulk export
            FROM [${AppConfig.DB.PCM}].[dbo].[MDMaterialDetails] d
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaderRevisions] r ON d.MaterialHeaderRevisionId = r.Id
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDMaterialHeaders] h ON r.MaterialHeaderId = h.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Currencies] c ON d.CurrencyId = c.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON d.UnitId = u.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[BDRegions] reg ON d.RegionId = reg.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON r.ClassId = cls.Id
            ${where}
            AND NOT EXISTS (
                SELECT 1 FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c 
                WHERE c.Id = r.ClassId AND c.UniqueKey LIKE '%Scrap%'
            )
            ORDER BY d.DateValidFrom DESC, d.Id DESC
        `;
        return api.executeQuery(query, AppConfig.DB.PCM);
    }
};