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
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import { ProveedoresApi } from '../catalogo/catalogo.api';
import type { Proveedor } from '../catalogo/catalogo.types';
import type { EstadoPedido } from '../pedidos/pedidos.types';
import { ProyectosApi } from '../proyectos/proyectos.api';
import type { Proyecto } from '../proyectos/proyectos.types';
import { descargarCsv } from './descargar-csv';
import { ReportesApi } from './reportes.api';
import type {
  FilaReportePedido,
  ReportePedidosFiltros,
} from './reportes.types';

const ESTADOS: { label: string; value: EstadoPedido }[] = [
  { value: 'Borrador', label: 'Borrador' },
  { value: 'Solicitado', label: 'Solicitado' },
  { value: 'Aprobado', label: 'Aprobado' },
  { value: 'EnEjecucion', label: 'En ejecución' },
  { value: 'Consumido', label: 'Consumido' },
  { value: 'Rechazado', label: 'Rechazado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

@Component({
  selector: 'app-reporte-pedidos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    SelectModule,
    ButtonModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './reporte-pedidos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportePedidosPage {
  private readonly api = inject(ReportesApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly proyectosApi = inject(ProyectosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);

  protected readonly filas = signal<FilaReportePedido[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly estados = ESTADOS;

  protected readonly form = this.fb.group({
    estado: [null as EstadoPedido | null],
    proveedorId: [null as number | null],
    proyectoId: [null as number | null],
  });

  protected readonly proveedoresOpciones = computed(() =>
    this.proveedores().map((p) => ({ label: p.nombre, value: p.id })),
  );
  protected readonly proyectosOpciones = computed(() =>
    this.proyectos().map((p) => ({ label: p.nombre, value: p.id })),
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
    this.api.pedidos(this.filtros()).subscribe({
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
    this.form.reset({ estado: null, proveedorId: null, proyectoId: null });
    this.aplicar();
  }

  exportarCsv(): void {
    this.api.pedidosCsv(this.filtros()).subscribe({
      next: (blob) => descargarCsv(blob, 'reporte-pedidos.csv'),
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo exportar',
          detail: err.message,
        });
      },
    });
  }

  severidadEstado(
    estado: EstadoPedido,
  ): 'info' | 'success' | 'danger' | 'warn' | 'secondary' {
    switch (estado) {
      case 'Aprobado':
      case 'Consumido':
        return 'success';
      case 'EnEjecucion':
        return 'info';
      case 'Rechazado':
      case 'Cancelado':
        return 'danger';
      case 'Solicitado':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  private filtros(): ReportePedidosFiltros {
    const v = this.form.value;
    return {
      estado: v.estado ?? undefined,
      proveedorId: v.proveedorId ?? undefined,
      proyectoId: v.proyectoId ?? undefined,
    };
  }
}
