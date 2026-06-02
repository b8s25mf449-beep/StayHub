import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TotpVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 8)
  code: string;
}

export class TotpBackupCodeDto {
  @ApiProperty({ example: 'ABCD-EFGH-1234' })
  @IsString()
  backupCode: string;
}
