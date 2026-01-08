/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // 스크롤바 숨김 플러그인 에러나면 이 줄 지우셔도 됩니다.
    // require('tailwind-scrollbar-hide'), 
  ],
}