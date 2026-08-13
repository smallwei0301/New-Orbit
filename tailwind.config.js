/**
 * Orbit design-system — Tailwind theme
 * ------------------------------------
 * All values below were reverse-engineered 1:1 from the production bundle
 * (compiled Tailwind in assets/index-*.css). The custom `orbit-*` palette,
 * the overridden radius scale (lg=20px / xl=24px / 2xl=35px) and the tinted
 * shadow scale are what give the product its "warm earth-tone" look.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        orbit: {
          // ---- brand / surface ----
          primary: '#a08060',        // 主色 / 按鈕            rgb(160 128 96)
          'primary-hover': '#8b6e50',// 主色（滑過）
          'primary-light': '#d4c4b0',// 主色（淺）             rgb(212 196 176)
          bg: '#faf7f2',             // 頁面底色 / muted        rgb(250 247 242)
          muted: '#faf7f2',          // 次要底色
          warm: '#f5f0e8',           // 卡片強調 / active nav   rgb(245 240 232)
          card: '#ffffff',           // 卡片底色
          border: '#ede8e0',         // 邊框                   rgb(237 232 224)
          // ---- text scale (warm greys) ----
          300: '#b8a99a',            // 最淺文字
          400: '#9c8e7c',            // 次要文字
          500: '#7a6e5e',            // 一般文字
          700: '#5c4f3d',            // 深文字
          900: '#3d3528',            // 標題文字
          // ---- semantic ----
          success: '#6b8f71',        // 成功綠                 rgb(107 143 113)
          'success-bg': '#e8f0e8',
          danger: '#c45d4e',         // 警示紅                 rgb(196 93 78)
          'info-bg': '#fff8f0',
          'info-border': '#f0e0cc',
        },
      },
      borderRadius: {
        // NOTE: the product overrides Tailwind defaults — cards use very round corners
        md: '0.375rem',
        lg: '20px',
        xl: '24px',
        '2xl': '35px',
        '3xl': '1.5rem',
      },
      boxShadow: {
        // tinted with the primary colour (#a08060) rather than neutral black
        'orbit-sm': '0 1px 3px #a0806014',
        'orbit-card': '0 1px 3px #a0806014',
        'orbit-hover': '0 8px 24px #a080601f',
        'orbit-nav': '2px 0 8px rgba(160,128,96,0.12)',
      },
      fontFamily: {
        // Google Fonts loaded in index.html
        sans: ['"Noto Sans TC"', '"Zen Maru Gothic"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif TC"', 'ui-serif', 'Georgia', 'serif'],
        logo: ['Outfit', '"Zen Kaku Gothic New"', 'sans-serif'],
      },
      keyframes: {
        'orbit-dropdown-in': {
          '0%': { opacity: 0, transform: 'translateY(-4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        breathe: {
          '0%,100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(0.85)' },
        },
      },
      animation: {
        'dropdown-in': 'orbit-dropdown-in 0.15s ease-out',
        breathe: 'breathe 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
