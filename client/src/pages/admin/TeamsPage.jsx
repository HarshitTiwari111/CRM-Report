import SimpleCrudPage from '../../features/metadata/SimpleCrudPage';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../../api/metadata';

export default function TeamsPage() {
  return (
    <SimpleCrudPage
      title="Teams"
      subtitle="Manage teams within departments"
      queryKey="teams"
      listFn={getTeams}
      createFn={createTeam}
      updateFn={updateTeam}
      deleteFn={deleteTeam}
    />
  );
}
