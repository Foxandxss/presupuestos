import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';

import { ICONOS } from '../iconos';

export type DensidadLista = 'estandar' | 'compacta';

@Component({
  selector: 'pre-list-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './list-toolbar.component.html',
  styleUrl: './list-toolbar.component.css',
})
export class ListToolbarComponent {
  readonly query = input<string>('');
  readonly placeholder = input<string>('Buscar...');
  readonly mostrarSearch = input<boolean>(true);
  readonly densidad = input<DensidadLista>('estandar');
  readonly hayFiltros = input<boolean>(false);
  readonly resumen = input<string | null>(null);

  readonly queryChange = output<string>();
  readonly limpiarFiltros = output<void>();
  readonly densidadChange = output<DensidadLista>();

  protected readonly icono = ICONOS;

  protected readonly densidadIcon = computed<LucideIconData>(
    () =>
      (this.densidad() === 'estandar'
        ? this.icono.contraerSidebar
        : this.icono.expandirSidebar) as LucideIconData,
  );

  protected onQueryInput(valor: string): void {
    this.queryChange.emit(valor);
  }

  protected toggleDensidad(): void {
    this.densidadChange.emit(
      this.densidad() === 'estandar' ? 'compacta' : 'estandar',
    );
  }

  protected emitirLimpiar(): void {
    this.limpiarFiltros.emit();
  }

  protected iconoBuscar(): LucideIconData {
    return this.icono.buscar as LucideIconData;
  }

  protected iconoCerrar(): LucideIconData {
    return this.icono.cerrar as LucideIconData;
  }
}
