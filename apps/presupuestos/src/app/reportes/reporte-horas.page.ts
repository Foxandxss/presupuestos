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
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import {
  PerfilesTecnicosApi,
  ProveedoresApi,
} from '../catalogo/catalogo.api';
import type { PerfilTecnico, Proveedor } from '../catalogo/catalogo.types';
import { ProyectosApi } from '../proyectos/proyectos.api';
import type { Proyecto } from '../proyectos/proyectos.types';
import { descargarCsv } from './descargar-csv';
import { ReportesApi } from './reportes.api';
import type {
  DesgloseHoras,
  FilaReporteHoras,
  ReporteHorasFiltros,
} from './reportes.types';

const DESGLOSES: { label: string; value: DesgloseHoras }[] = [
  { value: 'proyecto-perfil', label: 'Proyecto + Perfil' },
  { value: 'perfil', label: 'Perfil (cross-proyecto)' },
  { value: 'proveedor', label: 'Proveedor' },
];

@Component({
  selector: 'app-reporte-horas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    SelectModule,
    ButtonModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './reporte-horas.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteHorasPage {
  private readonly api = inject(ReportesApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly proyectosApi = inject(ProyectosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);

  protected readonly filas = signal<FilaReporteHoras[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly desgloses = DESGLOSES;

  protected readonly form = this.fb.group({
    proyectoId: [null as number | null],
    proveedorId: [null as number | null],
    perfilTecnicoId: [null as number | null],
    desglose: ['proyecto-perfil' as DesgloseHoras],
  });

  protected readonly proveedoresOpciones = computed(() =>
    this.proveedores().map((p) => ({ label: p.nombre, value: p.id })),
  );
  protected readonly perfilesOpciones = computed(() =>
    this.perfiles().map((p) => ({ label: p.nombre, value: p.id })),
  );
  protected readonly proyectosOpciones = computed(() =>
    this.proyectos().map((p) => ({ label: p.nombre, value: p.id })),
  );
  protected readonly desglose = computed<DesgloseHoras>(
    () => (this.form.value.desglose as DesgloseHoras) ?? 'proyecto-perfil',
  );

  constructor() {
    forkJoin({
      proveedores: this.proveedoresApi.list(),
      perfiles: this.perfilesApi.list(),
      proyectos: this.proyectosApi.list(),
    }).subscribe({
      next: ({ proveedores, perfiles, proyectos }) => {
        this.proveedores.set(proveedores);
        this.perfiles.set(perfiles);
        this.proyectos.set(proyectos);
      },
    });
    this.aplicar();
  }

  aplicar(): void {
    this.cargando.set(true);
    this.api.horas(this.filtros()).subscribe({
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
      proyectoId: null,
      proveedorId: null,
      perfilTecnicoId: null,
      desglose: 'proyecto-perfil',
    });
    this.aplicar();
  }

  exportarCsv(): void {
    this.api.horasCsv(this.filtros()).subscribe({
      next: (blob) => descargarCsv(blob, 'reporte-horas.csv'),
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo exportar',
          detail: err.message,
        });
      },
    });
  }

  private filtros(): ReporteHorasFiltros {
    const v = this.form.value;
    return {
      proyectoId: v.proyectoId ?? undefined,
      proveedorId: v.proveedorId ?? undefined,
      perfilTecnicoId: v.perfilTecnicoId ?? undefined,
      desglose: (v.desglose as DesgloseHoras) ?? 'proyecto-perfil',
    };
  }
}
