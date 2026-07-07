import SimpleCrudPage from '../../features/metadata/SimpleCrudPage';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/metadata';

export default function DepartmentsPage() {
  return (
    <SimpleCrudPage
      title="Departments"
      subtitle="Manage company departments"
      queryKey="departments"
      listFn={getDepartments}
      createFn={createDepartment}
      updateFn={updateDepartment}
      deleteFn={deleteDepartment}
    />
  );
}
