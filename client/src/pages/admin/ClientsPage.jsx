import SimpleCrudPage from '../../features/metadata/SimpleCrudPage';
import { getClients, createClient, updateClient, deleteClient } from '../../api/metadata';

export default function ClientsPage() {
  return (
    <SimpleCrudPage
      title="Clients"
      subtitle="Manage clients"
      queryKey="clients"
      listFn={getClients}
      createFn={createClient}
      updateFn={updateClient}
      deleteFn={deleteClient}
    />
  );
}
