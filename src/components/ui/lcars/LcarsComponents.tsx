import { LCARS_COLORS } from './LCARSColors';
import { useAudio } from '@/hooks/useAudio';

export function LcarsFrame({ 
  children, 
  title,
  color = LCARS_COLORS.orange,
  className = "" 
}: { 
  children: React.ReactNode; 
  title: string;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`relative p-1 ${className}`}>
      {/* Top Bar with Elbow */}
      <div className="flex items-stretch h-8 mb-1 flex-shrink-0">
        {/* Elbow */}
        <div 
            className="w-16 rounded-tl-2xl rounded-bl-none border-b-0 flex-shrink-0"
            style={{ backgroundColor: color }}
        />
        {/* Title Bar */}
        <div 
            className="flex-1 ml-1 flex items-center px-2"
            style={{ backgroundColor: color }}
        >
            <span className="text-black font-bold uppercase tracking-widest text-sm text-right w-full">
                {title}
            </span>
        </div>
        {/* End Cap */}
        <div 
            className="w-4 ml-1 rounded-r-full flex-shrink-0"
            style={{ backgroundColor: color }}
        />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <div className="flex flex-col w-16 mr-1 flex-shrink-0">
            <div className="flex-1" style={{ backgroundColor: color }}></div>
            <div className="h-16 mt-1 rounded-bl-2xl flex-shrink-0" style={{ backgroundColor: color }}></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-black/80 p-2 min-h-[100px] border border-white/10 rounded-br-xl flex flex-col min-w-0">
            {children}
        </div>
      </div>
    </div>
  );
}

export function LcarsButton({
    label,
    onClick,
    color = LCARS_COLORS.gold,
    active = false,
    className = ""
}: {
    label: string;
    onClick?: () => void;
    color?: string;
    active?: boolean;
    className?: string;
}) {
    const { playSound } = useAudio();

    const handleClick = () => {
        playSound('uiClick');
        onClick?.();
    };

    const handleMouseEnter = () => {
        playSound('uiHover');
    };

    return (
        <button
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            className={`
                h-8 px-4 rounded-full flex items-center justify-end
                transition-all duration-200 active:scale-95
                uppercase font-bold text-xs tracking-wider text-black
                ${className}
            `}
            style={{ 
                backgroundColor: active ? '#ffffff' : color,
                color: 'black'
            }}
        >
            {label}
        </button>
    )
}
