module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        "primary-dark": "#1D4ED8",
        "primary-light": "#EFF6FF",
        "text-primary": "#1A1A1A",
        "text-secondary": "#555555",
        "text-tertiary": "#888888",
        "surface-page": "#F8FAFC",
        "surface-card": "#FFFFFF",
        "surface-muted": "#F1F5F9",
        border: "#E2E8F0",
        danger: "#DC2626",
        "danger-light": "#FEECEC",
        success: "#16A34A",
        "success-light": "#EAF6EE",
        warning: "#D97706",
        "warning-light": "#FDF3E7"
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"]
      },
      fontSize: {
        display: ["28px", { lineHeight: "34px", fontWeight: "700" }],
        title: ["20px", { lineHeight: "26px", fontWeight: "600" }],
        body: ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-bold": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        label: ["14px", { lineHeight: "20px", fontWeight: "500" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }]
      },
      spacing: {
        zero: "0px",
        xxxs: "4px",
        xxs: "8px",
        xs: "12px",
        s: "16px",
        m: "24px",
        l: "32px",
        xl: "48px"
      },
      borderRadius: {
        sm: "6px",
        m: "10px",
        l: "16px",
        full: "999px"
      }
    }
  }
};
