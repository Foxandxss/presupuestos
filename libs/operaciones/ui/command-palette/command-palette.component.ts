import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';
import { Subject, switchMap } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import type { Rol } from '../../dominio';
import { ICONOS, type NombreIcono } from '../iconos';

import { SearchApi } from './search.api';
import { RESULTADO_VACIO, type SearchResult } from './search.types';

interface AccionRapida {
  readonly id: string;
  readonly label: string;
  readonly icono: NombreIcono;
  readonly ruta: string;
  readonly soloAdmin: boolean;
}

interface NavRapida {
  readonly label: string;
  readonly icono: NombreIcono;
  readonly ruta: string;
  readonly soloAdmin: boolean;
}

const ACCIONES_RAPIDAS: readonly AccionRapida[] = [
  {
    id: 'crear-pedido',
    label: 'Crear pedido',
    icono: 'crear',
    ruta: '/pedidos',
    soloAdmin: true,
  },
  {
    id: 'registrar-consumo',
    label: 'Registrar consumo',
    icono: 'consumos',
    ruta: '/consumos',
    soloAdmin: false,
  },
];

const NAVEGACION_RAPIDA: readonly NavRapida[] = [
  { label: 'Inicio', icono: 'inicio', ruta: '/inicio', soloAdmin: false },
  { label: 'Proveedores', icono: 'proveedores', ruta: '/catalogo/proveedores', soloAdmin: false },
  { label: 'Perfiles técnicos', icono: 'perfiles', ruta: '/catalogo/perfiles-tecnicos', soloAdmin: false },
  { label: 'Recursos', icono: 'recursos', ruta: '/catalogo/recursos', soloAdmin: false },
  { label: 'Servicios', icono: 'servicios', ruta: '/catalogo/servicios', soloAdmin: false },
  { label: 'Proyectos', icono: 'proyectos', ruta: '/proyectos', soloAdmin: false },
  { label: 'Pedidos', icono: 'pedidos', ruta: '/pedidos', soloAdmin: false },
  { label: 'Consumos', icono: 'consumos', ruta: '/consumos', soloAdmin: false },
  { label: 'Reportes · Pedidos', icono: 'reportes', ruta: '/reportes/pedidos', soloAdmin: true },
  { label: 'Reportes · Estimadas vs consumidas', icono: 'reportes', ruta: '/reportes/horas', soloAdmin: true },
  { label: 'Reportes · Facturación', icono: 'facturacion', ruta: '/reportes/facturacion', soloAdmin: true },
];

export type ItemPalette =
  | { readonly kind: 'pedido'; readonly id: number; readonly proyectoNombre: string; readonly proveedorNombre: string; readonly ruta: string }
  | { readonly kind: 'proyecto'; readonly id: number; readonly nombre: string; readonly ruta: string }
  | { readonly kind: 'proveedor'; readonly id: number; readonly nombre: string; readonly ruta: string }
  | { readonly kind: 'accion'; readonly accionId: string; readonly label: string; readonly icono: NombreIcono; readonly ruta: string }
  | { readonly kind: 'navegacion'; readonly label: string; readonly icono: NombreIcono; readonly ruta: string };

@Component({
  selector: 'pre-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.css',
})
export class CommandPaletteComponent {
  readonly abierto = input.required<boolean>();
  readonly rol = input.required<Rol>();
  readonly cerrar = output<void>();
  readonly navegar = output<string>();

  @ViewChild('inputBuscar') private inputBuscar?: ElementRef<HTMLInputElement>;

  private readonly searchApi = inject(SearchApi);

  protected readonly icono = ICONOS;
  protected readonly query = signal('');
  protected readonly resultado = signal<SearchResult>(RESULTADO_VACIO);
  protected readonly cargando = signal(false);
  protected readonly indiceActivo = signal(0);

  private readonly queryStream = new Subject<string>();

  protected readonly accionesVisibles = computed<readonly AccionRapida[]>(() =>
    ACCIONES_RAPIDAS.filter((a) => !a.soloAdmin || this.rol() === 'admin'),
  );

  protected readonly navegacionVisible = computed<readonly NavRapida[]>(() =>
    NAVEGACION_RAPIDA.filter((n) => !n.soloAdmin || this.rol() === 'admin'),
  );

  protected readonly tieneQuery = computed(() => this.query().trim().length > 0);

  protected readonly items = computed<readonly ItemPalette[]>(() => {
    if (this.tieneQuery()) {
      const r = this.resultado();
      const items: ItemPalette[] = [];
      for (const p of r.pedidos) {
        items.push({
          kind: 'pedido',
          id: p.id,
          proyectoNombre: p.proyectoNombre,
          proveedorNombre: p.proveedorNombre,
          ruta: `/pedidos/${p.id}`,
        });
      }
      for (const p of r.proyectos) {
        items.push({
          kind: 'proyecto',
          id: p.id,
          nombre: p.nombre,
          ruta: `/proyectos/${p.id}`,
        });
      }
      for (const p of r.proveedores) {
        items.push({
          kind: 'proveedor',
          id: p.id,
          nombre: p.nombre,
          ruta: '/catalogo/proveedores',
        });
      }
      return items;
    }

    const items: ItemPalette[] = [];
    for (const a of this.accionesVisibles()) {
      items.push({
        kind: 'accion',
        accionId: a.id,
        label: a.label,
        icono: a.icono,
        ruta: a.ruta,
      });
    }
    for (const n of this.navegacionVisible()) {
      items.push({
        kind: 'navegacion',
        label: n.label,
        icono: n.icono,
        ruta: n.ruta,
      });
    }
    return items;
  });

  protected readonly hayResultados = computed(() => this.items().length > 0);

  protected readonly itemsPedido = computed(() =>
    this.items().filter((i): i is Extract<ItemPalette, { kind: 'pedido' }> => i.kind === 'pedido'),
  );
  protected readonly itemsProyecto = computed(() =>
    this.items().filter((i): i is Extract<ItemPalette, { kind: 'proyecto' }> => i.kind === 'proyecto'),
  );
  protected readonly itemsProveedor = computed(() =>
    this.items().filter((i): i is Extract<ItemPalette, { kind: 'proveedor' }> => i.kind === 'proveedor'),
  );
  protected readonly itemsAccion = computed(() =>
    this.items().filter((i): i is Extract<ItemPalette, { kind: 'accion' }> => i.kind === 'accion'),
  );
  protected readonly itemsNavegacion = computed(() =>
    this.items().filter((i): i is Extract<ItemPalette, { kind: 'navegacion' }> => i.kind === 'navegacion'),
  );

  constructor() {
    this.queryStream
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length === 0) {
            this.cargando.set(false);
            return [RESULTADO_VACIO];
          }
          this.cargando.set(true);
          return this.searchApi.buscar(q);
        }),
      )
      .subscribe((r) => {
        this.resultado.set(r);
        this.cargando.set(false);
      });

    effect(() => {
      if (this.abierto()) {
        this.query.set('');
        this.resultado.set(RESULTADO_VACIO);
        this.indiceActivo.set(0);
        queueMicrotask(() => this.inputBuscar?.nativeElement.focus());
      }
    });

    effect(() => {
      // Reinicia índice cuando cambia la lista de items
      const total = this.items().length;
      const actual = this.indiceActivo();
      if (actual >= total) {
        this.indiceActivo.set(0);
      }
    });
  }

  protected onQueryChange(valor: string): void {
    this.query.set(valor);
    this.indiceActivo.set(0);
    this.queryStream.next(valor);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrar.emit();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.abierto()) {
      this.cerrar.emit();
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.abierto()) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moverActivo(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moverActivo(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.activarSeleccion();
    }
  }

  protected seleccionar(item: ItemPalette): void {
    this.navegar.emit(item.ruta);
    this.cerrar.emit();
  }

  protected indiceDe(item: ItemPalette): number {
    return this.items().indexOf(item);
  }

  protected esActivo(item: ItemPalette): boolean {
    return this.indiceDe(item) === this.indiceActivo();
  }

  protected iconoItem(nombre: NombreIcono): LucideIconData {
    return this.icono[nombre] as LucideIconData;
  }

  private moverActivo(delta: number): void {
    const total = this.items().length;
    if (total === 0) return;
    const actual = this.indiceActivo();
    const proximo = (actual + delta + total) % total;
    this.indiceActivo.set(proximo);
  }

  private activarSeleccion(): void {
    const items = this.items();
    const actual = this.indiceActivo();
    const item = items[actual];
    if (item) {
      this.seleccionar(item);
    }
  }
}
