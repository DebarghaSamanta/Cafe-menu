export default function ArtisanLogo({ size = 24, color = "currentColor", className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="The Artisan Café Logo"
    >
      {/* Outer Fine Circle */}
      <circle
        cx="24"
        cy="24"
        r="22"
        stroke={color}
        strokeWidth="1.2"
        strokeDasharray="1.5 2.5"
        opacity="0.6"
      />
      {/* Inner Ring */}
      <circle
        cx="24"
        cy="24"
        r="19"
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Delicate Coffee Cup Silhouette */}
      <path
        d="M16 23C16 28 19.5 32 24 32C28.5 32 32 28 32 23H16Z"
        fill={color}
        fillOpacity="0.15"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Cup Saucer Base */}
      <path
        d="M14 34.5H34"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Cup Handle */}
      <path
        d="M32 24.5C34.5 24.5 36 26 36 27.5C36 29 34.5 30.5 32 30.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Rising Botanical Steam Ribbons */}
      <path
        d="M21 18C20.5 15.5 22 14 21.5 12"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M24 19C23.5 16 25 14.5 24.5 11.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M27 18C26.5 15.5 28 14 27.5 12"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Star Accent */}
      <circle cx="24" cy="7.5" r="1" fill={color} />
    </svg>
  );
}
