import { Module } from '@nestjs/common';

import { PerfilesTecnicosModule } from './perfiles-tecnicos/perfiles-tecnicos.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { RecursosModule } from './recursos/recursos.module';
import { ServiciosModule } from './servicios/servicios.module';

@Module({
  imports: [
    ProveedoresModule,
    PerfilesTecnicosModule,
    RecursosModule,
    ServiciosModule,
  ],
})
export class CatalogoModule {}
