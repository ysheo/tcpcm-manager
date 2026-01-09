import { api } from './ApiService';
import { AppConfig } from '../config/AppConfig';

export interface MasterDataRow {
    id?: number;
    uniqueKey: string;
    nameKo: string;
    nameEn: string;
    region?: string;
    isValidRegion?: boolean;
}

export const PlantRegionService = {
    // 1. 지역(Region) 목록 조회
    getRegions: async (includeRef: boolean) => {
        let where = "";
        // 체크 해제 시: 외부 관리(ExternallyManaged = 1) 데이터 제외
        if (!includeRef) where = "WHERE ExternallyManaged = 0";

        const query = `
            SELECT 
                  Id AS id
                , UniqueKey AS uniqueKey
                , [dbo].[GetSingleTranslation](Name_LOC, N'ko-KR', N'') AS nameKo
                , [dbo].[GetSingleTranslation](Name_LOC, N'en-US', N'') AS nameEn
            FROM [dbo].[BDRegions]
            ${where}
            ORDER BY UniqueKey
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    // 2. 공장(Plant) 목록 조회
    getPlants: async (includeRef: boolean) => {
        let where = "";
        // 체크 해제 시: P.ExternallyManaged = 0
        if (!includeRef) where = "WHERE P.ExternallyManaged = 0";

        const query = `
            SELECT 
                  P.Id AS id
                , P.UniqueKey AS uniqueKey
                , [dbo].[GetSingleTranslation](P.Name_LOC, N'ko-KR', N'') AS nameKo
                , [dbo].[GetSingleTranslation](P.Name_LOC, N'en-US', N'') AS nameEn
                , R.UniqueKey AS region
            FROM [dbo].[BDPlants] AS P
            LEFT JOIN [dbo].[BDRegions] AS R ON P.RegionId = R.Id
            ${where}
            ORDER BY P.UniqueKey
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    // 3. 유효한 지역 코드 목록 조회
    getValidRegionKeys: async () => {
        const query = `SELECT UniqueKey FROM [dbo].[BDRegions]`;
        const result = await api.executeQuery(query, AppConfig.DB.PCM);
        if (result && result.success) {
            return new Set(result.data.map((item: any) => (item.UniqueKey || '').toString().trim()));
        }
        return new Set<string>();
    },

    // 4. 데이터 저장
    saveData: async (data: any[], type: 'Region' | 'Plant') => {
        const importData = data.map(item => {
            const row: any = {
                "Number": item.uniqueKey,
                "Designation": item.nameKo,
                "영문명": item.nameEn.startsWith("(DYA)") ? item.nameEn : `(DYA)${item.nameEn}`
            };
            if (type === 'Plant') {
                row["지역"] = item.region;
            }
            return row;
        });

        return await api.importMasterData(importData, "Category", type);
    }
};