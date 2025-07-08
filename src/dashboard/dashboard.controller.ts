import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ValidationService } from 'src/common/validation.service';
import { Roles } from 'src/user/decorator/roles.decorator';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { RolesGuard } from 'src/user/roles.guard';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { MonthlyReportQuery, MonthlyReportQuerySchema } from './dashboard.validation';

@Controller('/api/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private validationService: ValidationService
  ) { }

  @Get('/agent/statistics')
  @Roles('agent')
  async getAgentStatistics(@CurrentUser() user: any) {
    return this.dashboardService.getAgentStatistic(user.sub);
  }

  @Get('/agent/monthly-report')
  @Roles('agent')
  async getAgentMonthlyReport(
    @CurrentUser() user: any,
    @Query() query: MonthlyReportQuery
  ) {
    const validatedQuery = this.validationService.validate(
      MonthlyReportQuerySchema as any,
      query
    ) as MonthlyReportQuery

    return this.dashboardService.getAgentMonthlyReport(
      user.sub,
      validatedQuery.year,
      validatedQuery.month
    );
  }

  @Get('/agent/packages')
  @Roles('agent')
  async getAgentPackages(@CurrentUser() user: any) {
    return this.dashboardService.getAgentPackages(user.sub);
  }

  @Get('/admin/statistics')
  @Roles('admin')
  async getAdminStatistics() {
    return this.dashboardService.getAdminStatistics();
  }

  @Get('/admin/monthly-report')
  @Roles('admin')
  async getAdminMonthlyReport(@Query() query: any) {
    const validatedQuery = this.validationService.validate(
      MonthlyReportQuerySchema as any,
      query
    ) as MonthlyReportQuery;

    return this.dashboardService.getAdminMonthlyReport(
      validatedQuery.year,
      validatedQuery.month
    );
  }

  @Get('/admin/agent-performances')
  @Roles('admin')
  async getAgentPerformances() {
    return this.dashboardService.getAgentPerformances();
  }

}
