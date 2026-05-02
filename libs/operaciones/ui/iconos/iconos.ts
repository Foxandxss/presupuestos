import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Ban,
  BarChart3,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Command,
  Eye,
  FileQuestion,
  FileText,
  Filter,
  FolderOpen,
  Home,
  Inbox,
  KeyRound,
  Layers,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Save,
  Search,
  SearchX,
  Send,
  Settings,
  Sun,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  X,
  XCircle,
} from 'lucide-angular';

/**
 * Mapping canónico de iconos del sistema de diseño.
 *
 * Cualquier `<lucide-angular>` que use un nombre fuera de este map debe
 * añadirse aquí primero — así garantizamos vocabulario visual consistente
 * entre páginas.
 */
export const ICONOS = {
  // Acciones genéricas
  crear: Plus,
  editar: Pencil,
  eliminar: Trash2,
  guardar: Save,
  ver: Eye,
  buscar: Search,
  filtrar: Filter,
  cerrar: X,
  mas: MoreHorizontal,
  cargando: Loader2,
  expandir: ChevronRight,

  // Acciones de Pedido (máquina de estados)
  solicitar: Send,
  aprobar: Check,
  rechazar: X,
  cancelar: Ban,

  // Estados (semánticos, complementan al color)
  exito: CheckCircle2,
  error: XCircle,
  advertencia: AlertTriangle,

  // Estados vacíos / error
  vacio: Inbox,
  vacioFiltros: SearchX,
  recursoNoEncontrado: FileQuestion,
  errorGenerico: AlertOctagon,
  errorCarga: AlertCircle,

  // Sidebar / navegación
  inicio: Home,
  catalogo: Package,
  proveedores: Briefcase,
  perfiles: Layers,
  recursos: Users,
  servicios: FileText,
  proyectos: FolderOpen,
  pedidos: FileText,
  consumos: Clock,
  reportes: BarChart3,
  facturacion: TrendingUp,
  actividad: Activity,
  configuracion: Settings,
  usuariosAdmin: UserCog,
  calendario: Calendar,
  contraerSidebar: PanelLeftClose,
  expandirSidebar: PanelLeftOpen,
  cerrarSesion: LogOut,
  cambiarContrasena: KeyRound,
  comando: Command,

  // Tema
  temaLight: Sun,
  temaDark: Moon,
  temaSystem: Monitor,
} as const;

export type NombreIcono = keyof typeof ICONOS;
