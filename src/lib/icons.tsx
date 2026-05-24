/**
 * icons.tsx — single source of truth for all icons in Robu Terminal.
 * Every component imports from here, never directly from lucide-react.
 * This keeps the icon family consistent and makes swaps trivial.
 *
 * Family: Lucide React — stroke-based, 24×24 grid, consistent weight.
 */

export {
  // ── Navigation ────────────────────────────────────────────────────────────
  Search,
  Home,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ChevronsUp,
  ChevronsDown,
  X,
  Menu,

  // ── Valuation & Finance ───────────────────────────────────────────────────
  Calculator,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  LineChart,
  Activity,
  Target,
  Scale,
  DollarSign,
  PieChart,

  // ── Analysis & AI ─────────────────────────────────────────────────────────
  Sparkles,
  Brain,
  Zap,
  Lightbulb,
  Eye,
  SlidersHorizontal,
  Pencil,

  // ── People & Company ──────────────────────────────────────────────────────
  Users,
  Building2,

  // ── Data & Table ─────────────────────────────────────────────────────────
  Table2,
  History,
  RefreshCw,
  Clock,

  // ── Status & Quality ─────────────────────────────────────────────────────
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  ShieldAlert,
  Info,
  BadgeCheck,

  // ── Actions ───────────────────────────────────────────────────────────────
  PauseCircle,
  ThumbsUp,
  Bookmark,
  RotateCcw,
  Download,
  Trash2,
  Edit2,
  Check,
  Filter,
  Briefcase,

  // ── Theme ─────────────────────────────────────────────────────────────────
  Sun,
  Moon,

} from 'lucide-react';
