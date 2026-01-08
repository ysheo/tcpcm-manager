// src/config/AppConfig.ts

// 환경 변수 가져오기 (없으면 기본값 사용)
const SERVER_URL_ENV = import.meta.env.REACT_APP_SERVER_URL || 'http://localhost';
const API_PATH_ENV = import.meta.env.REACT_APP_API_PATH || '/tcpcm';

export const AppConfig = {
  // 1. 서버 주소 (DB 연결 등 원본 주소가 필요할 때 사용)
  SERVER_URL: SERVER_URL_ENV,

  // 2. API 기본 주소 (Axios 등 API 통신용) -> http://localhost/tcpcm
  get API_BASE() {
    return `${this.SERVER_URL}${API_PATH_ENV}`;
  },

  // 3. 데이터베이스 이름
  DB: {
    PCM: import.meta.env.REACT_APP_DB_PCM || 'TcPCM_Test',
    CONSOLE: import.meta.env.REACT_APP_DB_CONSOLE || 'TcPCM_Console'
  }
};