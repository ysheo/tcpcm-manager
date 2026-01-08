import axios, { type AxiosInstance } from 'axios';
import { AppConfig } from '../config/AppConfig';

// --- 설정 정보 (Global 변수 대체) ---
const SERVER_URL = 'http://localhost'; // 실제 서버 주소로 변경 필요 (예: https://pcm.example.com)
const API_BASE = `${SERVER_URL}/tcpcm`;      // 필요시 /tcpcm 등 경로 추가
const CLIENT_ID = "TcPCM";
const CLIENT_SECRET = "A980B6F5-A7F1-4F0B-A3EE-BAAF575CA912";

// --- 타입 정의 ---
export interface QueryResult {
  success: boolean;
  data: any[];
  rowsAffected: number;
  message?: string;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // [Interceptor] 요청 보낼 때마다 토큰이 있으면 자동으로 헤더에 붙임
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // --- 1. 로그인 (GetAuthorizationToken 대체) ---
  public async login(username: string, password: string): Promise<boolean> {
    try {
      // x-www-form-urlencoded 형식으로 데이터 변환
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('authenticatorId', 'Siemens.TCPCM.AuthenticationMethod.TcPCM');
      params.append('client_id', CLIENT_ID);
      params.append('client_secret', CLIENT_SECRET);
      params.append('username', username);
      params.append('password', password);

      const res = await axios.post(`${API_BASE}/token`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (res.data && res.data.access_token) {
        // 토큰 저장
        localStorage.setItem('accessToken', res.data.access_token);
        localStorage.setItem('refreshToken', res.data.refresh_token);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Login Failed:", err);
      return false;
    }
  }

  // --- 2. 로그아웃 (LogOut 대체) ---
  public async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await this.client.get(`/api/v1/Account/Logout?refreshTokenId=${refreshToken}`);
      }
    } catch (err) {
      console.warn("Logout API Error:", err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // window.location.href = '/'; // 필요 시 주석 해제하여 로그인 페이지로 강제 이동
    }
  }
    
  public async getConfigGuid(className: string, configName: string): Promise<string | null> {
    try {
      // TB_MNG_CONFIG 테이블에서 Class와 Name으로 GUID 조회
      const query = `SELECT TOP 1 GUID FROM TB_MNG_CONFIG WHERE Class = N'${className}' AND Name = N'${configName}'`;
      
      const result = await this.executeQuery(query, AppConfig.DB.CONSOLE); // 설정용 DB

      if (result.success && result.data.length > 0) {
        return result.data[0].GUID; // GUID 반환
      } else {
        console.warn(`GUID not found for Class: ${className}, Name: ${configName}`);
        return null;
      }
    } catch (err) {
      console.error("GetConfigGuid Error:", err);
      return null;
    }
  }

  // --- 3. 일반 POST 요청 (POST 대체) ---
  public async post(url: string, data: any): Promise<any> {
    try {
      const res = await this.client.post(url, data);
      return res.data;
    } catch (err: any) {
      console.error(`API Error (${url}):`, err);
      return { success: false, message: err.message };
    }
  }

  public async importMasterData(data: any, className: string, configName: string): Promise<any> {
    try {
      // 1. GUID 조회 (GetConfig)
      const guid = await this.getConfigGuid(className, configName);
      
      if (!guid) {
        return { success: false, message: `Configuration GUID를 찾을 수 없습니다. (${className} / ${configName})` };
      }

      // 2. API 호출 URL 구성
      // global.version 등이 필요하다면 상수로 정의해서 사용
      const url = `${API_BASE}/api/v1/MasterData/Import`; 

      // 3. POST 데이터 구성 (C#의 JObject 부분)
      const payload = {
        Data: data,             // 실제 데이터 (category 등)
        ConfigurationGuid: guid // 조회한 GUID
      };

      // 4. 전송
      const res = await this.client.post(url, payload);
      return { success: true, data: res.data };

    } catch (err: any) {
      console.error("Import Master Data Failed:", err);
      // 에러 메시지 처리 (C#의 ErrorCheck 로직과 유사하게)
      return { success: false, message: err.response?.data?.Message || err.message };
    }
  }

  // --- 4. DB 쿼리 실행 (UserPage, ConfigPage 등에서 사용) ---
  public async executeQuery(query: string, dbName: string = AppConfig.DB.CONSOLE): Promise<QueryResult> {
    try {
      const url = `${SERVER_URL}/api/execute`; 
      
      const res = await this.client.post(url, {
        dbName: dbName,
        query: query
      });
    

      if (res.data && res.data.success) {
        return { 
          success: true, 
          data: res.data.data || [], 
          rowsAffected: res.data.rowsAffected 
        };
      } else {
        return { 
          success: false, 
          data: [], 
          rowsAffected: 0, 
          message: res.data?.message || "DB Error" 
        };
      }
    } catch (err: any) {
      console.error("Query Execution Error:", err);
      return { 
        success: false, 
        data: [], 
        rowsAffected: 0, 
        message: "Server Communication Failed" 
      };
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const api = new ApiService();