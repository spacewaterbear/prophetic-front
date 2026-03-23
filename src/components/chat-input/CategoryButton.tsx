"use client";

export const CARD_BUTTON_STYLES =
  "p-4 bg-white dark:bg-[#1e1f20] text-gray-900 dark:text-white text-sm font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer border border-gray-400/60 dark:border-gray-600/60";

const MODE_CARD_BASE_STYLES =
  "mb-4 p-4 bg-white dark:bg-[#1e1f20] rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border border-gray-400/60 dark:border-gray-600/60";

interface CategoryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
}

export const CategoryButton: React.FC<CategoryButtonProps> = ({
  children,
  onClick,
  isActive = false,
  isDisabled = false,
}) => {
  const activeStyles = isActive ? "ring-2 ring-blue-500" : "";

  const buttonStyles = isDisabled
    ? "p-4 bg-white dark:bg-[#1e1f20] text-gray-900 dark:text-white text-sm font-semibold rounded-2xl border border-gray-400/60 dark:border-gray-600/60 opacity-50 cursor-not-allowed"
    : `${CARD_BUTTON_STYLES}`;

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      className={`${buttonStyles} ${activeStyles}`}
      onClick={handleClick}
      disabled={isDisabled}
    >
      {children}
    </button>
  );
};

interface ModeCardProps {
  title: string;
  price: string;
  description: string;
  isActive: boolean;
  isAvailable: boolean;
  onClick: () => void;
  isMobile?: boolean;
}

export const ModeCard: React.FC<ModeCardProps> = ({
  title,
  price,
  description,
  isActive,
  isAvailable,
  onClick,
  isMobile = false,
}) => {
  const availabilityStyles = !isAvailable
    ? "opacity-60 cursor-not-allowed"
    : "cursor-pointer";
  const activeStyles = isActive ? "ring-2 ring-blue-500" : "";
  const mobileStyles = isMobile
    ? "active:scale-95 active:brightness-95 transition-all duration-150"
    : "";

  const handleClick = (e: React.MouseEvent) => {
    if (isMobile && isAvailable) {
      const element = e.currentTarget as HTMLElement;
      element.style.transform = "scale(0.95)";
      setTimeout(() => {
        element.style.transform = "";
        onClick();
      }, 100);
    } else if (isAvailable) {
      onClick();
    }
  };

  return (
    <div
      className={`${MODE_CARD_BASE_STYLES} ${availabilityStyles} ${activeStyles} ${mobileStyles}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-900 dark:text-white font-semibold text-base">
            {title} - {price}
          </span>
        </div>
        {isAvailable ? (
          isActive && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                Active
              </span>
            </div>
          )
        ) : (
          <button
            className="px-4 py-1.5 bg-[#352ee8] text-white text-sm font-medium rounded-full hover:bg-[#2920c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#352ee8]"
            disabled={process.env.NEXT_PUBLIC_APP_ENV !== "staging"}
            onClick={(e) => { e.stopPropagation(); window.location.href = "/pricing"; }}
          >
            Upgrade
          </button>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
        {description}
      </p>
    </div>
  );
};
