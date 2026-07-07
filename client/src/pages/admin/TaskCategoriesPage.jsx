import SimpleCrudPage from '../../features/metadata/SimpleCrudPage';
import { getTaskCategories, createTaskCategory, updateTaskCategory, deleteTaskCategory } from '../../api/metadata';

export default function TaskCategoriesPage() {
  return (
    <SimpleCrudPage
      title="Task Categories"
      subtitle="Manage task categories"
      queryKey="task-categories"
      listFn={getTaskCategories}
      createFn={createTaskCategory}
      updateFn={updateTaskCategory}
      deleteFn={deleteTaskCategory}
    />
  );
}
