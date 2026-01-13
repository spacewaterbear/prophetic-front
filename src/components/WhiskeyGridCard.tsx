import Image from "next/image";
import { memo } from "react";

interface WhiskeyItem {
    title: string;
    subtitle?: string;
    image_url: string;
}

interface WhiskeyGridData {
    items: WhiskeyItem[];
}

interface WhiskeyGridCardProps {
    data: WhiskeyGridData;
}

/**
 * WhiskeyGridCard - Refined premium component matching "Photographie / Art Nouveau" formalism
 *
 * Formalism requirements:
 * - Title: Inter size 14 bold (centered)
 * - Subtitle: Inter size 12 Light Italic (centered)
 * - Specific visual style: rounded-[24px], bg-[#e6e6e6]
 */
export const WhiskeyGridCard = memo(({ data }: WhiskeyGridCardProps) => {
    const { items = [] } = data;

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="w-full">
            {/* Whiskey Grid - 2x2 on all screen sizes */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="group"
                    >
                        <div className="overflow-hidden border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                            {/* Image Container */}
                            <div className="relative w-full aspect-square rounded-[24px] overflow-hidden bg-white dark:bg-black p-3 mb-2">
                                <div className="relative w-full h-full">
                                    <Image
                                        src={item.image_url}
                                        alt={item.title}
                                        fill
                                        className="object-contain transition-transform duration-500 group-hover:scale-110"
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="flex flex-col px-1 text-center">
                                <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight">
                                    {item.title}
                                </h3>
                                {item.subtitle && (
                                    <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5">
                                        {item.subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

WhiskeyGridCard.displayName = "WhiskeyGridCard";
