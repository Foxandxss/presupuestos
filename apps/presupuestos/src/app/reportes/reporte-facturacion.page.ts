import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import { ProveedoresApi } from '../catalogo/catalogo.api';
import type { Proveedor } from '../catalogo/catalogo.types';
import { ProyectosApi } from '../proyectos/proyectos.api';
import type { Proyecto } from '../proyectos/proyectos.types';
import { descargarCsv } from './descargar-csv';
import { ReportesApi } from './reportes.api';
import type {
  FilaReporteFacturacion,
  ReporteFacturacionFiltros,
} from './reportes.types';

const MESES = [
  { value: 1, label: '01 — Enero' },
  { value: 2, label: '02 — Febrero' },
  { value: 3, label: '03 — Marzo' },
  { value: 4, label: '04 — Abril' },
  { value: 5, label: '05 — Mayo' },
  { value: 6, label: '06 — Junio' },
  { value: 7, label: '07 — Julio' },
  { value: 8, label: '08 — Agosto' },
  { value: 9, label: '09 — Septiembre' },
  { value: 10, label: '10 — Octubre' },
  { value: 11, label: '11 — Noviembre' },
  { value: 12, label: '12 — Diciembre' },
];

const NOMBRE_MES: Record<number, string> = Object.fromEntries(
  MESES.map((m) => [m.value, m.label]),
);

@Component({
  selector: 'app-reporte-facturacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    SelectModule,
    InputNumberModule,
    ButtonModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './reporte-facturacion.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteFacturacionPage {
  private readonly api = inject(ReportesApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly proyectosApi = inject(ProyectosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);

  protected readonly filas = signal<FilaReporteFacturacion[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly meses = MESES;
  protected readonly expanded = signal<Record<string, boolean>>({});

  protected readonly form = this.fb.group({
    mesDesde: [null as number | null],
    anioDesde: [null as number | null],
    mesHasta: [null as number | null],
    anioHasta: [null as number | null],
    anio: [null as number | null],
    proveedorId: [null as number | null],
    proyectoId: [null as number | null],
  });

  protected readonly proveedoresOpciones = computed(() =>
    this.proveedores().map((p) => ({ label: p.nombre, value: p.id })),
  );
  protected readonly proyectosOpciones = computed(() =>
    this.proyectos().map((p) => ({ label: p.nombre, value: p.id })),
  );
  protected readonly totalGeneral = computed(() =>
    this.filas().reduce((sum, f) => sum + f.totalEur, 0),
  );

  constructor() {
    forkJoin({
      proveedores: this.proveedoresApi.list(),
      proyectos: this.proyectosApi.list(),
    }).subscribe({
      next: ({ proveedores, proyectos }) => {
        this.proveedores.set(proveedores);
        this.proyectos.set(proyectos);
      },
    });
    this.aplicar();
  }

  aplicar(): void {
    this.cargando.set(true);
    this.api.facturacion(this.filtros()).subscribe({
      next: (filas) => {
        this.filas.set(filas);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Error al cargar el reporte',
          detail: err.message,
        });
      },
    });
  }

  limpiar(): void {
    this.form.reset({
      mesDesde: null,
      anioDesde: null,
      mesHasta: null,
      anioHasta: null,
      anio: null,
      proveedorId: null,
      proyectoId: null,
    });
    this.aplicar();
  }

  exportarCsv(): void {
    this.api.facturacionCsv(this.filtros()).subscribe({
      next: (blob) => descargarCsv(blob, this.nombreCsv()),
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo exportar',
          detail: err.message,
        });
      },
    });
  }

  toggleDetalle(fila: FilaReporteFacturacion): void {
    const key = this.claveFila(fila);
    this.expanded.update((m) => ({ ...m, [key]: !m[key] }));
  }

  estaExpandida(fila: FilaReporteFacturacion): boolean {
    return Boolean(this.expanded()[this.claveFila(fila)]);
  }

  nombreMes(mes: number): string {
    return NOMBRE_MES[mes] ?? String(mes);
  }

  private claveFila(fila: FilaReporteFacturacion): string {
    return `${fila.anio}-${fila.mes}-${fila.proveedorId}`;
  }

  private nombreCsv(): string {
    const v = this.form.value;
    if (v.anio) return `facturacion-${v.anio}.csv`;
    if (v.anioDesde && v.mesDesde) {
      const mm = String(v.mesDesde).padStart(2, '0');
      return `facturacion-${v.anioDesde}-${mm}.csv`;
    }
    return 'facturacion.csv';
  }

  private filtros(): ReporteFacturacionFiltros {
    const v = this.form.value;
    return {
      mesDesde: v.mesDesde ?? undefined,
      anioDesde: v.anioDesde ?? undefined,
      mesHasta: v.mesHasta ?? undefined,
      anioHasta: v.anioHasta ?? undefined,
      anio: v.anio ?? undefined,
      proveedorId: v.proveedorId ?? undefined,
      proyectoId: v.proyectoId ?? undefined,
    };
  }
}
