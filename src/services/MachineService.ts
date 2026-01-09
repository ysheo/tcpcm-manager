import { api } from './ApiService';
import { AppConfig } from '../config/AppConfig';
import { getNameSql } from '../utils/SqlHelper';

// 설비 필터 타입 정의
export interface MachineFilters {
    searchText: string;
    classKey: string;
    groupKey: string;     // 설비 그룹 (ID 19 하위)
    includeRef: boolean;
}

export const MachineService = {

    // 1. 설비 그룹 트리 조회 (Root ID = 19)
    getMachineGroupTree: async (lang: string) => {
        const query = `
            WITH TreeCTE AS (
                SELECT Id, ParentClassificationId, UniqueKey, Name_LOC
                FROM [${AppConfig.DB.PCM}].[dbo].[Classifications]
                WHERE Id = 19 -- ★ 설비 루트 ID 변경
                UNION ALL
                SELECT c.Id, c.ParentClassificationId, c.UniqueKey, c.Name_LOC
                FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c
                JOIN TreeCTE p ON c.ParentClassificationId = p.Id
            )
            SELECT DISTINCT 
                 t.Id
                ,t.ParentClassificationId AS ParentId
                ,t.UniqueKey
                ,${getNameSql('t.Name_LOC', lang)} AS Name
            FROM TreeCTE t
            WHERE t.Id <> 19
            ORDER BY t.UniqueKey
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    // 2. 쿼리 조립 공통 함수 (CTE + Where)
    makeQueryParts: (filters: MachineFilters) => {
        let where = `WHERE h.Obsolete IS NULL`; // Header 기준
        let cte = "";

        // 참조 데이터 포함 여부
        if (!filters.includeRef) where += ` AND h.ExternallyManaged = 0`;

        // 그룹 필터 (재귀)
        if (filters.groupKey) {
            cte = `
                TargetGroup AS (
                    SELECT Id FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] 
                    WHERE UniqueKey = N'${filters.groupKey}'
                    UNION ALL
                    SELECT c.Id FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c
                    JOIN TargetGroup p ON c.ParentClassificationId = p.Id
                )
            `;
            // AssetHeader의 AssetClassId 컬럼 사용
            where += ` AND h.AssetClassId IN (SELECT Id FROM TargetGroup)`;
        }

        // 검색어
        if (filters.searchText) {
            where += ` AND (h.UniqueKey LIKE N'%${filters.searchText}%' OR h.Name_LOC LIKE N'%${filters.searchText}%')`;
        }

        return { where, cte };
    },

    // 3. 리스트 조회 (Header + Details 조인)
    getList: async (page: number, itemsPerPage: number, filters: MachineFilters, lang: string) => {
        const { where, cte } = MachineService.makeQueryParts(filters);

        const withClause = cte ? `WITH ${cte}, PagedRows AS (` : `WITH PagedRows AS (`;
        const countCte = cte ? `WITH ${cte}` : ``;

        // 카운트 쿼리
        const countQuery = `
            ${countCte}
            SELECT COUNT(DISTINCT h.Id) as total
            FROM [${AppConfig.DB.PCM}].[dbo].[MDAssetHeaders] h
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON h.AssetClassId = cls.Id
            ${where}
        `;

        // 데이터 쿼리 (AssetDetails의 모든 컬럼 포함)
        const rowQuery = `
            ${withClause}
                SELECT h.Id
                FROM [${AppConfig.DB.PCM}].[dbo].[MDAssetHeaders] h
                LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON h.AssetClassId = cls.Id
                ${where}
                ORDER BY h.UniqueKey ASC
                OFFSET ${(page - 1) * itemsPerPage} ROWS FETCH NEXT ${itemsPerPage} ROWS ONLY
            )
            SELECT DISTINCT 
                 h.Id AS AssetId
                ,h.UniqueKey
                ,${getNameSql('h.Name_LOC', lang)} AS Name
                -- ★ AssetDetails의 주요 데이터 조회 (필요 시 d.* 로 변경 가능하지만 명시하는 게 좋음)
                ,d.Invest
                ,d.DepreciationTime
                ,d.PowerOnTimeRate
                ,d.RequiredSpaceNet
                ,cur.Name AS CurrencyName
                ,pl.Name AS PlantName
            FROM PagedRows p
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDAssetHeaders] h ON p.Id = h.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[MDAssetDetails] d ON h.Id = d.AssetHeaderId
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Currencies] cur ON d.CurrencyId = cur.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[BDPlants] pl ON d.PlantId = pl.Id
            ORDER BY h.UniqueKey ASC
        `;

        const [cntRes, listRes] = await Promise.all([
            api.executeQuery(countQuery, AppConfig.DB.PCM),
            api.executeQuery(rowQuery, AppConfig.DB.PCM)
        ]);

        return {
            total: cntRes.success ? cntRes.data[0].total : 0,
            data: listRes.success ? listRes.data : []
        };
    },

    // 4. 엑셀 데이터 조회 (Details의 모든 컬럼 조회)
    getExcelData: async (filters: MachineFilters, lang: string) => {
        const { where, cte } = MachineService.makeQueryParts(filters);
        const prefix = cte ? `WITH ${cte}` : '';

        const query = `
            ${prefix}
            SELECT DISTINCT 
                 h.Id AS AssetId
                ,h.UniqueKey
                ,${getNameSql('h.Name_LOC', lang)} AS Name
                -- ★ 엑셀용: AssetDetails의 모든 정보를 가져옵니다.
                ,d.*
                ,cur.Name AS CurrencyName
                ,pl.Name AS PlantName
            FROM [${AppConfig.DB.PCM}].[dbo].[MDAssetHeaders] h
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON h.AssetClassId = cls.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[MDAssetDetails] d ON h.Id = d.AssetHeaderId
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Currencies] cur ON d.CurrencyId = cur.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[BDPlants] pl ON d.PlantId = pl.Id
            ${where}
            ORDER BY h.UniqueKey ASC
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    // 5. 동적 속성(Property) 값 조회 (설비 전용 테이블 사용)
    getPropertyValues: async (assetIds: string, lang: string) => {
        const query = `
            SELECT 
                 v.AssetHeaderId AS AssetId
                ,CAST(v.ClassificationPropertyId AS NVARCHAR(50)) AS PropertyId
                ,COALESCE(CAST(v.DecimalValue AS NVARCHAR(50)), v.TextValue, v.ListItemValues, FORMAT(v.DateTimeValue, 'yyyy-MM-dd')) AS Value
                ,${getNameSql('cp.Name_LOC', lang)} AS PropertyName
                ,u.Name AS UnitName
            FROM [${AppConfig.DB.PCM}].[dbo].[MDAssetHeaderPropertyValues] v
            JOIN [${AppConfig.DB.PCM}].[dbo].[ClassificationProperties] cp ON v.ClassificationPropertyId = cp.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON cp.UnitId = u.Id
            WHERE v.AssetHeaderId IN (${assetIds})
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    }
};