interface KojiMarkProps {
  className?: string;
}

export function KojiMark({ className = "size-5" }: KojiMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="koji"
    >
      <circle cx="100" cy="108" r="74" fill="#1A1715" />
      <ellipse cx="78" cy="106" rx="5" ry="7" fill="#F2EDE4" />
      <ellipse cx="122" cy="106" rx="5" ry="7" fill="#F2EDE4" />
      <path
        d="M 88 134 Q 100 144 112 134"
        fill="none"
        stroke="#F2EDE4"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
