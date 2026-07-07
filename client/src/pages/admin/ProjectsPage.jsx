import SimpleCrudPage from '../../features/metadata/SimpleCrudPage';
import { getProjects, createProject, updateProject, deleteProject } from '../../api/metadata';

export default function ProjectsPage() {
  return (
    <SimpleCrudPage
      title="Projects"
      subtitle="Manage client projects"
      queryKey="projects"
      listFn={getProjects}
      createFn={createProject}
      updateFn={updateProject}
      deleteFn={deleteProject}
    />
  );
}
