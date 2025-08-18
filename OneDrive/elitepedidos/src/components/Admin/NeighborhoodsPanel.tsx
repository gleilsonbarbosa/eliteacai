import React, { useState } from 'react';
import { useNeighborhoods } from '../../hooks/useNeighborhoods';
import { DeliveryNeighborhood } from '../../types/delivery';
import { 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  Search
} from 'lucide-react';

const NeighborhoodsPanel: React.FC = () => {
  const { 
    neighborhoods, 
    loading, 
    createNeighborhood, 
    updateNeighborhood, 
    deleteNeighborhood,
    fetchAllNeighborhoods
  } = useNeighborhoods();

  const [editingNeighborhood, setEditingNeighborhood] = useState<DeliveryNeighborhood | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    fetchAllNeighborhoods();
  }, [fetchAllNeighborhoods]);

  const filteredNeighborhoods = neighborhoods.filter(neighborhood =>
    neighborhood.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleCreate = () => {
    setEditingNeighborhood({
      id: '',
      name: '',
      delivery_fee: 5.00,
      delivery_time: 50,
      is_active: true,
      created_at: '',
      updated_at: ''
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingNeighborhood) return;

    setSaving(true);
    try {
      if (isCreating) {
        await createNeighborhood({
          name: editingNeighborhood.name,
          delivery_fee: editingNeighborhood.delivery_fee,
          delivery_time: editingNeighborhood.delivery_time,
          is_active: editingNeighborhood.is_active
        });
      } else {
        await updateNeighborhood(editingNeighborhood.id, {
          name: editingNeighborhood.name,
          delivery_fee: editingNeighborhood.delivery_fee,
          delivery_time: editingNeighborhood.delivery_time,
          is_active: editingNeighborhood.is_active
        });
      }
      
      setEditingNeighborhood(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Erro ao salvar bairro:', error);
      alert('Erro ao salvar bairro. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingNeighborhood(null);
    setIsCreating(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o bairro "${name}"?`)) {
      try {
        await deleteNeighborhood(id);
      } catch (error) {
        console.error('Erro ao excluir bairro:', error);
        alert('Erro ao excluir bairro. Tente novamente.');
      }
    }
  };

  const handleToggleActive = async (neighborhood: DeliveryNeighborhood) => {
    try {
      await updateNeighborhood(neighborhood.id, {
        is_active: !neighborhood.is_active
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Carregando bairros...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <MapPin size={24} className="text-purple-600" />
            Gerenciar Bairros
          </h2>
          <p className="text-gray-600">Configure taxas e tempos de entrega por bairro</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Bairro
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar bairro..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Neighborhoods List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Bairro</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Taxa de Entrega</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Tempo de Entrega</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredNeighborhoods.map((neighborhood) => (
                <tr key={neighborhood.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-800">{neighborhood.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-green-600" />
                      <span className="font-semibold text-green-600">
                        {formatPrice(neighborhood.delivery_fee)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-600" />
                      <span className="text-gray-700">{neighborhood.delivery_time} min</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleActive(neighborhood)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        neighborhood.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {neighborhood.is_active ? (
                        <>
                          <Eye size={12} />
                          Ativo
                        </>
                      ) : (
                        <>
                          <EyeOff size={12} />
                          Inativo
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingNeighborhood(neighborhood)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Editar bairro"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(neighborhood.id, neighborhood.name)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Excluir bairro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredNeighborhoods.length === 0 && (
          <div className="text-center py-12">
            <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'Nenhum bairro encontrado' : 'Nenhum bairro cadastrado'}
            </p>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {editingNeighborhood && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  {isCreating ? 'Novo Bairro' : 'Editar Bairro'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Bairro *
                </label>
                <input
                  type="text"
                  value={editingNeighborhood.name}
                  onChange={(e) => setEditingNeighborhood({
                    ...editingNeighborhood,
                    name: e.target.value
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taxa de Entrega (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingNeighborhood.delivery_fee}
                  onChange={(e) => setEditingNeighborhood({
                    ...editingNeighborhood,
                    delivery_fee: parseFloat(e.target.value) || 0
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="5.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tempo de Entrega (minutos) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingNeighborhood.delivery_time}
                  onChange={(e) => setEditingNeighborhood({
                    ...editingNeighborhood,
                    delivery_time: parseInt(e.target.value) || 50
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="50"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingNeighborhood.is_active}
                    onChange={(e) => setEditingNeighborhood({
                      ...editingNeighborhood,
                      is_active: e.target.checked
                    })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Bairro ativo (disponível para entrega)
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingNeighborhood.name.trim()}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {isCreating ? 'Criar Bairro' : 'Salvar Alterações'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeighborhoodsPanel;