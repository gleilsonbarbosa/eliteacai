import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit3, Trash2, Search, Eye, EyeOff, Lock, Save } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import PermissionGuard from '../PermissionGuard';
import { supabase } from '../../lib/supabase';
import { PDVOperator } from '../../types/pdv';

const PDVOperators: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [operators, setOperators] = useState<PDVOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOperator, setEditingOperator] = useState<PDVOperator | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pdv_operators')
        .select('*')
        .order('name');

      if (error) throw error;
      setOperators(data || []);
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
      alert('Erro ao carregar operadores');
    } finally {
      setLoading(false);
    }
  };

  const filteredOperators = searchTerm
    ? operators.filter(op => 
        op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : operators;

  const handleCreate = () => {
    setEditingOperator({
      id: '',
      name: 'Novo Operador',
      code: 'OP' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      password_hash: '',
      is_active: true,
      permissions: {
        can_discount: true,
        can_cancel: true,
        can_manage_products: false
      },
      created_at: '',
      updated_at: ''
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingOperator) return;

    if (!editingOperator.name.trim() || !editingOperator.code.trim()) {
      alert('Nome e código são obrigatórios');
      return;
    }

    if (isCreating && !editingOperator.password_hash.trim()) {
      alert('Senha é obrigatória para novos operadores');
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const { data, error } = await supabase
          .from('pdv_operators')
          .insert([{
            name: editingOperator.name,
            code: editingOperator.code,
            password_hash: editingOperator.password_hash,
            is_active: editingOperator.is_active,
            permissions: editingOperator.permissions
          }])
          .select()
          .single();

        if (error) throw error;
        setOperators(prev => [...prev, data]);
      } else {
        const updates: Partial<PDVOperator> = {
          name: editingOperator.name,
          code: editingOperator.code,
          is_active: editingOperator.is_active,
          permissions: editingOperator.permissions
        };

        // Só incluir senha se foi alterada
        if (editingOperator.password_hash) {
          updates.password_hash = editingOperator.password_hash;
        }

        const { data, error } = await supabase
          .from('pdv_operators')
          .update(updates)
          .eq('id', editingOperator.id)
          .select()
          .single();

        if (error) throw error;
        setOperators(prev => prev.map(op => op.id === data.id ? data : op));
      }
      
      setEditingOperator(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Erro ao salvar operador:', error);
      alert('Erro ao salvar operador');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o operador "${name}"?`)) {
      try {
        const { error } = await supabase
          .from('pdv_operators')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setOperators(prev => prev.filter(op => op.id !== id));
      } catch (error) {
        console.error('Erro ao excluir operador:', error);
        alert('Erro ao excluir operador');
      }
    }
  };

  const handleToggleActive = async (operator: PDVOperator) => {
    try {
      const { data, error } = await supabase
        .from('pdv_operators')
        .update({ is_active: !operator.is_active })
        .eq('id', operator.id)
        .select()
        .single();

      if (error) throw error;
      setOperators(prev => prev.map(op => op.id === data.id ? data : op));
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Carregando operadores...</span>
      </div>
    );
  }

  return (
    <PermissionGuard hasPermission={hasPermission('can_view_operators')} showMessage={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Users size={24} className="text-orange-600" />
              Gerenciar Operadores
            </h2>
            <p className="text-gray-600">Configure os operadores do PDV</p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Operador
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
            placeholder="Buscar operadores..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Operators Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Código</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Nome</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Permissões</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOperators.map((operator) => (
                <tr key={operator.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <span className="font-mono text-sm">{operator.code}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-800">{operator.name}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                        operator.permissions.can_discount ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {operator.permissions.can_discount ? 'Pode dar desconto' : 'Sem desconto'}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ml-1 ${
                        operator.permissions.can_cancel ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {operator.permissions.can_cancel ? 'Pode cancelar' : 'Sem cancelamento'}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ml-1 ${
                        operator.permissions.can_manage_products ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {operator.permissions.can_manage_products ? 'Gerencia produtos' : 'Sem gestão de produtos'}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ml-1 ${
                        operator.permissions.can_view_cash_register ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {operator.permissions.can_view_cash_register ? 'Acesso ao Caixa' : 'Sem acesso ao Caixa'}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleActive(operator)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        operator.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {operator.is_active ? (
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
                        disabled={operator.code === 'ADMIN'}
                        onClick={() => {
                          setEditingOperator({...operator, password_hash: ''});
                          setIsCreating(false);
                        }}
                        className={`p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors ${
                          operator.code === 'ADMIN' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Editar operador"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        disabled={operator.code === 'ADMIN'}
                        onClick={() => handleDelete(operator.id, operator.name)}
                        className={`p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors ${
                          operator.code === 'ADMIN' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Excluir operador"
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

        {filteredOperators.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'Nenhum operador encontrado' : 'Nenhum operador cadastrado'}
            </p>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {editingOperator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {isCreating ? 'Novo Operador' : 'Editar Operador'}
              </h2>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={editingOperator.name}
                  onChange={(e) => setEditingOperator({
                    ...editingOperator,
                    name: e.target.value
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Nome do operador"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  value={editingOperator.code}
                  onChange={(e) => setEditingOperator({
                    ...editingOperator,
                    code: e.target.value
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: OP001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {isCreating ? '*' : '(deixe em branco para manter a atual)'}
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={editingOperator.password_hash}
                    onChange={(e) => setEditingOperator({
                      ...editingOperator,
                      password_hash: e.target.value
                    })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={isCreating ? "Senha" : "Nova senha (opcional)"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permissões Básicas
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingOperator.permissions.can_discount}
                      onChange={(e) => setEditingOperator({
                        ...editingOperator,
                        permissions: {
                          ...editingOperator.permissions,
                          can_discount: e.target.checked
                        }
                      })}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="text-sm text-gray-700">
                      Pode aplicar descontos
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingOperator.permissions.can_cancel}
                      onChange={(e) => setEditingOperator({
                        ...editingOperator,
                        permissions: {
                          ...editingOperator.permissions,
                          can_cancel: e.target.checked
                        }
                      })}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="text-sm text-gray-700">
                      Pode cancelar vendas
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingOperator.permissions.can_manage_products}
                      onChange={(e) => setEditingOperator({
                        ...editingOperator,
                        permissions: {
                          ...editingOperator.permissions,
                          can_manage_products: e.target.checked
                        }
                      })}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="text-sm text-gray-700">
                      Pode gerenciar produtos
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissões de Acesso aos Menus
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Operações */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2 text-sm">Operações</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_sales ?? true}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_sales: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Vendas
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_cash_register ?? true}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_cash_register: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Caixas
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_products ?? true}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_products: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Produtos
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_orders ?? true}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_orders: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Pedidos
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Relatórios */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2 text-sm">Relatórios</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_reports ?? true}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_reports: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Gráficos
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_sales_report ?? true}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_sales_report: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Vendas
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_cash_report ?? true}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_cash_report: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Caixa Diário
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_operators ?? false}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_operators: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Operadores
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_cash_report ?? true}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_cash_report: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Caixa por Período
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_cash_report ?? true}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_cash_report: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Histórico de Caixas
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Gerenciamento */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2 text-sm">Gerenciamento</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_view_operators ?? false}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_view_operators: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Operadores
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingOperator.permissions.can_manage_products ?? false}
                          onChange={(e) => setEditingOperator({
                            ...editingOperator,
                            permissions: {
                              ...editingOperator.permissions,
                              can_manage_products: e.target.checked
                            }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm text-gray-700">
                          Configurações
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingOperator.is_active}
                    onChange={(e) => setEditingOperator({
                      ...editingOperator,
                      is_active: e.target.checked
                    })}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Operador ativo
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setEditingOperator(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingOperator.name.trim() || !editingOperator.code.trim()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {isCreating ? 'Criar Operador' : 'Salvar Alterações'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PermissionGuard>
  );
};

export default PDVOperators;