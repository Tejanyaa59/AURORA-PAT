declare module "lucide-react" {
  import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";
  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    className?: string;
    absoluteStrokeWidth?: boolean;
  }
  export type LucideIcon = ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;

  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Camera: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronDownIcon: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronLeftIcon: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronRightIcon: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Circle: LucideIcon;
  export const CircleDot: LucideIcon;
  export const Clock: LucideIcon;
  export const Compass: LucideIcon;
  export const Copy: LucideIcon;
  export const Cpu: LucideIcon;
  export const Crosshair: LucideIcon;
  export const Download: LucideIcon;
  export const Eye: LucideIcon;
  export const FileText: LucideIcon;
  export const Film: LucideIcon;
  export const Gauge: LucideIcon;
  export const GitCommit: LucideIcon;
  export const Globe: LucideIcon;
  export const GripVertical: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Loader2: LucideIcon;
  export const Maximize2: LucideIcon;
  export const Menu: LucideIcon;
  export const Minimize2: LucideIcon;
  export const Minus: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const Navigation: LucideIcon;
  export const PanelLeft: LucideIcon;
  export const Pause: LucideIcon;
  export const Play: LucideIcon;
  export const Plug: LucideIcon;
  export const Printer: LucideIcon;
  export const Radio: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Search: LucideIcon;
  export const Server: LucideIcon;
  export const Settings: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Sliders: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Square: LucideIcon;
  export const StepForward: LucideIcon;
  export const Target: LucideIcon;
  export const Terminal: LucideIcon;
  export const Trash2: LucideIcon;
  export const Upload: LucideIcon;
  export const Vibrate: LucideIcon;
  export const Video: LucideIcon;
  export const Wifi: LucideIcon;
  export const Wind: LucideIcon;
  export const X: LucideIcon;
  export const Zap: LucideIcon;

  const icons: Record<string, LucideIcon>;
  export default icons;
}
