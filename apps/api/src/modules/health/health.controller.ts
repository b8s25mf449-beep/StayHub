import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check — DB connectivity' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — process is alive' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
