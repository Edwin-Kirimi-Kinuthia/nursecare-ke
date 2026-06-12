interface VerifiedBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeMap = {
  xs: "w-3.5 h-3.5",
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export default function VerifiedBadge({ size = "md", showLabel = false }: VerifiedBadgeProps) {
  return (
    <div className="flex items-center gap-1.5" title="Verified Healthcare Professional — Identity and credentials confirmed by NurseCare Kenya">
      <div
        className={`${sizeMap[size]} rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 shadow-sm`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-[60%] h-[60%]"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {showLabel && (
        <span className="text-sky-600 text-xs font-semibold">Verified</span>
      )}
    </div>
  );
}
