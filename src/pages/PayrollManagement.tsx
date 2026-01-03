import { useState } from 'react';
import { DollarSign, TrendingUp, Users, Calendar, Download, Eye, Edit, Save, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProfiles, useUpdateProfile } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function PayrollManagement() {
    const { user, session } = useAuth();
    const { data: employees, isLoading } = useProfiles();
    const updateProfile = useUpdateProfile();

    const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState({
        salary: '',
        position: '',
        department: '',
    });
    const [filterDepartment, setFilterDepartment] = useState<string>('all');

    const isHR = user?.role === 'hr';
    const myProfile = employees?.find(emp => emp.user_id === session?.user?.id);

    const filteredEmployees = employees?.filter(emp => {
        if (!isHR && emp.user_id !== session?.user?.id) return false;
        if (filterDepartment !== 'all' && emp.department !== filterDepartment) return false;
        return true;
    }) || [];

    const calculatePayrollStats = () => {
        const totalSalary = filteredEmployees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
        const avgSalary = filteredEmployees.length > 0 ? totalSalary / filteredEmployees.length : 0;
        const activeEmployees = filteredEmployees.filter(emp => emp.status === 'active').length;

        return {
            totalSalary,
            avgSalary,
            activeEmployees,
            totalEmployees: filteredEmployees.length,
        };
    };

    const stats = calculatePayrollStats();

    const handleEdit = (employee: any) => {
        setEditingEmployee(employee.user_id);
        setEditFormData({
            salary: employee.salary?.toString() || '',
            position: employee.position || '',
            department: employee.department || '',
        });
    };

    const handleSave = (employeeId: string) => {
        updateProfile.mutate({
            userId: employeeId,
            updates: {
                salary: parseFloat(editFormData.salary) || null,
                position: editFormData.position,
                department: editFormData.department,
            },
        });
        setEditingEmployee(null);
    };

    const handleCancel = () => {
        setEditingEmployee(null);
        setEditFormData({ salary: '', position: '', department: '' });
    };

    const formatCurrency = (amount: number | null) => {
        if (!amount) return 'Not set';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const exportPayroll = () => {
        const csvContent = [
            ['Employee Name', 'Email', 'Department', 'Position', 'Salary', 'Status'],
            ...filteredEmployees.map(emp => [
                emp.full_name,
                emp.email,
                emp.department || 'Not assigned',
                emp.position || 'Not assigned',
                emp.salary?.toString() || '0',
                emp.status || 'unknown',
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (!isHR && !myProfile) {
        return (
            <DashboardLayout title="Payroll" subtitle="Access Denied">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Unable to access payroll information.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title={isHR ? "Payroll Management" : "My Salary"}
            subtitle={isHR ? "Manage employee compensation" : "View your salary details"}
        >

            {/* Statistics Cards */}
            {isHR && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Payroll</p>
                                    <p className="text-2xl font-bold">{formatCurrency(stats.totalSalary)}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Average Salary</p>
                                    <p className="text-2xl font-bold">{formatCurrency(stats.avgSalary)}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Employees</p>
                                    <p className="text-2xl font-bold">{stats.activeEmployees}</p>
                                </div>
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                                    <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                                </div>
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Employee View - Single Salary Card */}
            {!isHR && myProfile && (
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            My Salary Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-green-600 mb-2">
                                    {formatCurrency(myProfile.salary)}
                                </div>
                                <p className="text-muted-foreground">Monthly Salary</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Position</Label>
                                    <p className="text-lg">{myProfile.position || 'Not assigned'}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                                    <p className="text-lg">{myProfile.department || 'Not assigned'}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Employment Status</Label>
                                    <Badge className={myProfile.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                        {myProfile.status}
                                    </Badge>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Join Date</Label>
                                    <p className="text-lg">
                                        {myProfile.join_date ? format(new Date(myProfile.join_date), 'MMM d, yyyy') : 'Not set'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    💡 <strong>Note:</strong> This is a read-only view. For any salary-related inquiries, please contact HR.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* HR View - Employee Table */}
            {isHR && (
                <>
                    {/* Filters and Actions */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="department-filter">Filter by department:</Label>
                                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        <SelectItem value="Engineering">Engineering</SelectItem>
                                        <SelectItem value="Sales">Sales</SelectItem>
                                        <SelectItem value="Marketing">Marketing</SelectItem>
                                        <SelectItem value="HR">Human Resources</SelectItem>
                                        <SelectItem value="Finance">Finance</SelectItem>
                                        <SelectItem value="Operations">Operations</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button onClick={exportPayroll} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>

                    {/* Employee Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Employee Payroll</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">Loading payroll data...</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Position</TableHead>
                                            <TableHead>Salary</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredEmployees.map((employee) => (
                                            <TableRow key={employee.user_id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{employee.full_name}</div>
                                                        <div className="text-sm text-muted-foreground">{employee.email}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {editingEmployee === employee.user_id ? (
                                                        <Select value={editFormData.department} onValueChange={(value) => setEditFormData(prev => ({ ...prev, department: value }))}>
                                                            <SelectTrigger className="w-32">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Engineering">Engineering</SelectItem>
                                                                <SelectItem value="Sales">Sales</SelectItem>
                                                                <SelectItem value="Marketing">Marketing</SelectItem>
                                                                <SelectItem value="HR">Human Resources</SelectItem>
                                                                <SelectItem value="Finance">Finance</SelectItem>
                                                                <SelectItem value="Operations">Operations</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span>{employee.department || 'Not assigned'}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {editingEmployee === employee.user_id ? (
                                                        <Input
                                                            value={editFormData.position}
                                                            onChange={(e) => setEditFormData(prev => ({ ...prev, position: e.target.value }))}
                                                            className="w-32"
                                                        />
                                                    ) : (
                                                        <span>{employee.position || 'Not assigned'}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {editingEmployee === employee.user_id ? (
                                                        <Input
                                                            type="number"
                                                            value={editFormData.salary}
                                                            onChange={(e) => setEditFormData(prev => ({ ...prev, salary: e.target.value }))}
                                                            className="w-32"
                                                        />
                                                    ) : (
                                                        <span className="font-medium">{formatCurrency(employee.salary)}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                        {employee.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {editingEmployee === employee.user_id ? (
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={() => handleSave(employee.user_id)} disabled={updateProfile.isPending}>
                                                                <Save className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={handleCancel}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button size="sm" variant="outline" onClick={() => handleEdit(employee)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </DashboardLayout>
    );
}
