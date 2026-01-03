import { IndianRupee, Download, Calendar, TrendingUp, Wallet } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, useMyProfile } from '@/hooks/useProfiles';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const statusStyles = {
  paid: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  processing: 'bg-info/10 text-info',
};

export default function Payroll() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';

  const { data: allProfiles, isLoading: profilesLoading } = useProfiles();
  const { data: myProfile, isLoading: myProfileLoading } = useMyProfile();

  const isLoading = isHR ? profilesLoading : myProfileLoading;

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalPayroll = allProfiles?.reduce((sum, p) => sum + (p.salary || 0), 0) || 0;
  const employeeCount = allProfiles?.length || 0;

  // Simulated payroll records for employees
  const payrollRecords = isHR
    ? allProfiles?.map(p => ({
      id: p.id,
      employee: p.full_name,
      department: p.department || 'Not assigned',
      baseSalary: p.salary || 0,
      deductions: Math.round((p.salary || 0) * 0.13), // ~13% deductions
      bonus: 0,
      netPay: Math.round((p.salary || 0) * 0.87),
      status: 'processing' as const,
      avatar_url: p.avatar_url,
    })) || []
    : myProfile ? [{
      id: myProfile.id,
      employee: myProfile.full_name,
      department: myProfile.department || 'Not assigned',
      baseSalary: myProfile.salary || 0,
      deductions: Math.round((myProfile.salary || 0) * 0.13),
      bonus: 0,
      netPay: Math.round((myProfile.salary || 0) * 0.87),
      status: 'processing' as const,
      avatar_url: myProfile.avatar_url,
    }] : [];

  const mySalary = myProfile?.salary || 0;
  const myDeductions = Math.round(mySalary * 0.13);
  const myNetPay = mySalary - myDeductions;

  return (
    <DashboardLayout
      title="Payroll"
      subtitle={isHR ? "Manage employee salaries and payments" : "View your salary details"}
    >
      {!isHR && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => alert("Payslip PDF download coming soon!")}>
            <Download className="h-4 w-4 mr-2" />
            Download Slip
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </>
        ) : isHR ? (
          <>
            <StatCard
              title="Total Payroll"
              value={formatCurrency(totalPayroll)}
              subtitle={format(new Date(), 'MMMM yyyy')}
              icon={IndianRupee}
            />
            <StatCard
              title="Employees"
              value={employeeCount}
              subtitle="On payroll"
              icon={TrendingUp}
              iconClassName="bg-success/10 text-success"
            />
            <StatCard
              title="Processing"
              value={employeeCount}
              subtitle="Pending disbursement"
              icon={Calendar}
              iconClassName="bg-warning/10 text-warning"
            />
            <StatCard
              title="Total Deductions"
              value={formatCurrency(Math.round(totalPayroll * 0.13))}
              subtitle="Tax & PF"
              icon={Wallet}
              iconClassName="bg-info/10 text-info"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Net Salary"
              value={formatCurrency(myNetPay)}
              subtitle={format(new Date(), 'MMMM yyyy')}
              icon={IndianRupee}
            />
            <StatCard
              title="Base Salary"
              value={formatCurrency(mySalary)}
              subtitle="Monthly"
              icon={Wallet}
              iconClassName="bg-info/10 text-info"
            />
            <StatCard
              title="Deductions"
              value={formatCurrency(myDeductions)}
              subtitle="Tax & PF"
              icon={TrendingUp}
              iconClassName="bg-warning/10 text-warning"
            />
            <StatCard
              title="Bonus"
              value="₹0"
              subtitle="This month"
              icon={Calendar}
              iconClassName="bg-success/10 text-success"
            />
          </>
        )}
      </div>

      {/* Salary Breakdown for Employee */}
      {!isHR && myProfile && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Salary Breakdown</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Basic Salary</p>
              <p className="text-xl font-semibold mt-1">{formatCurrency(Math.round(mySalary * 0.5))}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">HRA</p>
              <p className="text-xl font-semibold mt-1">{formatCurrency(Math.round(mySalary * 0.25))}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Travel Allowance</p>
              <p className="text-xl font-semibold mt-1">{formatCurrency(Math.round(mySalary * 0.15))}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Special Allowance</p>
              <p className="text-xl font-semibold mt-1">{formatCurrency(Math.round(mySalary * 0.1))}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Net Pay This Month</p>
                <p className="text-2xl font-semibold text-primary mt-1">{formatCurrency(myNetPay)}</p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Pay Slip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters for Admin */}
      {isHR && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="flex items-center gap-3">
            <Select defaultValue="current">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">{format(new Date(), 'MMMM yyyy')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => {
              if (!payrollRecords) return;
              const exportData = payrollRecords.map(record => ({
                Employee: record.employee,
                Department: record.department,
                'Base Salary': record.baseSalary,
                Deductions: record.deductions,
                Bonus: record.bonus,
                'Net Pay': record.netPay,
                Status: record.status
              }));
              import('@/utils/export').then(mod => mod.exportToExcel(exportData, `Payroll_Report_${format(new Date(), 'yyyy-MM-dd')}`, 'Payroll'));
            }}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button>Run Payroll</Button>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'employee',
              header: 'Employee',
              render: (record) => (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={record.avatar_url || undefined} alt={record.employee} />
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {record.employee.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{record.employee}</p>
                    <p className="text-xs text-muted-foreground">{record.department}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'baseSalary',
              header: 'Base Salary',
              render: (record) => formatCurrency(record.baseSalary),
            },
            {
              key: 'deductions',
              header: 'Deductions',
              render: (record) => formatCurrency(record.deductions),
            },
            {
              key: 'bonus',
              header: 'Bonus',
              render: (record) => formatCurrency(record.bonus),
            },
            {
              key: 'netPay',
              header: 'Net Pay',
              render: (record) => (
                <span className="font-semibold text-foreground">{formatCurrency(record.netPay)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (record) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[record.status]}`}>
                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </span>
              ),
            },
            ...(isHR ? [{
              key: 'actions',
              header: '',
              render: () => (
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              ),
            }] : []),
          ]}
          data={payrollRecords}
          keyExtractor={(record) => record.id}
          emptyMessage="No payroll records found"
        />
      )}
    </DashboardLayout>
  );
}
