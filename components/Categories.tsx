
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { Category, TransactionType, SubCategory } from '../types';
import { supabase } from '../lib/supabase';

interface CategoriesProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const Categories: React.FC<CategoriesProps> = ({ categories, setCategories }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    type: 'INCOME' as TransactionType,
    color: '#3b82f6'
  });
  const [subFormData, setSubFormData] = useState({
    name: ''
  });

  const toggleCategory = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from('Categoria')
          .update({
            Categoria: formData.name,
            etiquetas: formData.type === 'INCOME' ? 'entrada' : 'saída',
            cor: formData.color
          })
          .eq('id', editingId)
          .select();

        if (error) throw error;
        setCategories(prev => prev.map(c => c.id === editingId ? { ...c, name: formData.name, type: formData.type, color: formData.color } : c));
      } else {
        const { data, error } = await supabase
          .from('Categoria')
          .insert([{
            Categoria: formData.name,
            etiquetas: formData.type === 'INCOME' ? 'entrada' : 'saída',
            cor: formData.color
          }])
          .select();

        if (error) throw error;
        const newCat: Category = {
          id: data[0].id,
          name: formData.name,
          type: formData.type,
          subCategories: [],
          color: formData.color
        };
        setCategories(prev => [...prev, newCat]);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', type: 'INCOME', color: '#3b82f6' });
    } catch (error: any) {
      console.error("Erro ao salvar categoria:", error);
      alert(`Erro: ${error.message || 'Falha na conexão'}`);
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return;

    try {
      // Salvar subcategoria no Supabase
      const { data, error } = await supabase
        .from('Subcategoria')
        .insert([{
          nome: subFormData.name,
          categoria_id: selectedCategoryId
        }])
        .select();

      if (error) throw error;

      const newSubCategory: SubCategory = {
        id: data[0].id,
        name: data[0].nome
      };

      setCategories(prev => prev.map(cat =>
        cat.id === selectedCategoryId
          ? { ...cat, subCategories: [...cat.subCategories, newSubCategory] }
          : cat
      ));

      setIsSubModalOpen(false);
      setSubFormData({ name: '' });
    } catch (error: any) {
      console.error("Erro ao salvar subcategoria:", error);
      alert(`Erro: ${error.message || 'Falha ao salvar subcategoria'}`);
    }
  };

  const deleteCategory = async (id: string) => {
    if (confirm('Deseja excluir esta categoria?')) {
      try {
        const { error } = await supabase.from('Categoria').delete().eq('id', id);
        if (error) throw error;
        setCategories(prev => prev.filter(c => c.id !== id));
      } catch (error) {
        alert('Erro ao deletar categoria');
      }
    }
  };

  const deleteSubCategory = async (categoryId: string, subId: string) => {
    console.log('🗑️ Tentando deletar subcategoria:', { categoryId, subId });

    if (confirm('Deseja excluir esta subcategoria?')) {
      console.log('✅ Confirmação aceita pelo usuário');
      try {
        console.log('📡 Enviando requisição DELETE para Supabase...');
        const { error } = await supabase.from('Subcategoria').delete().eq('id', subId);

        if (error) {
          console.error('❌ Erro do Supabase:', error);
          throw error;
        }

        console.log('✅ Subcategoria deletada do banco de dados');

        setCategories(prev => prev.map(cat =>
          cat.id === categoryId
            ? { ...cat, subCategories: cat.subCategories.filter(sub => sub.id !== subId) }
            : cat
        ));

        console.log('✅ Estado local atualizado');
        alert('Subcategoria excluída com sucesso!');
      } catch (error: any) {
        console.error('❌ Erro ao deletar subcategoria:', error);
        alert(`Erro ao deletar subcategoria: ${error.message || 'Erro desconhecido'}`);
      }
    } else {
      console.log('❌ Usuário cancelou a exclusão');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', type: 'INCOME', color: '#3b82f6' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={18} />
          Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receitas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-green-600 px-5 py-3">
            <h2 className="text-lg font-bold text-white">🟢 Receitas</h2>
          </div>
          <div className="p-4 space-y-2">
            {categories.filter(c => c.type === 'INCOME').map(category => (
              <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {expandedCategories.has(category.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div className="w-4 h-4 rounded-full shadow-inner border border-white" style={{ backgroundColor: category.color || '#e2e8f0' }}></div>
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <span className="text-xs text-gray-500">({category.subCategories.length})</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setIsSubModalOpen(true);
                      }}
                      className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                      title="Adicionar subcategoria"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(category.id);
                        setFormData({ name: category.name, type: category.type, color: category.color || '#3b82f6' });
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expandedCategories.has(category.id) && category.subCategories.length > 0 && (
                  <div className="bg-white p-3 pl-10 space-y-1 border-t border-gray-200">
                    {category.subCategories.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded group">
                        <span className="text-sm text-gray-700">→ {sub.name}</span>
                        <button
                          onClick={() => deleteSubCategory(category.id, sub.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {categories.filter(c => c.type === 'INCOME').length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma categoria de receita</p>
            )}
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-red-600 px-5 py-3">
            <h2 className="text-lg font-bold text-white">🔴 Despesas</h2>
          </div>
          <div className="p-4 space-y-2">
            {categories.filter(c => c.type === 'EXPENSE').map(category => (
              <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {expandedCategories.has(category.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div className="w-4 h-4 rounded-full shadow-inner border border-white" style={{ backgroundColor: category.color || '#e2e8f0' }}></div>
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <span className="text-xs text-gray-500">({category.subCategories.length})</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setIsSubModalOpen(true);
                      }}
                      className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                      title="Adicionar subcategoria"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(category.id);
                        setFormData({ name: category.name, type: category.type, color: category.color || '#3b82f6' });
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expandedCategories.has(category.id) && category.subCategories.length > 0 && (
                  <div className="bg-white p-3 pl-10 space-y-1 border-t border-gray-200">
                    {category.subCategories.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded group">
                        <span className="text-sm text-gray-700">→ {sub.name}</span>
                        <button
                          onClick={() => deleteSubCategory(category.id, sub.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {categories.filter(c => c.type === 'EXPENSE').length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma categoria de despesa</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Categoria */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Salário, Aluguel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as TransactionType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INCOME">Receita</option>
                  <option value="EXPENSE">Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor no Gráfico</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer overflow-hidden p-0"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                    setFormData({ name: '', type: 'INCOME', color: '#3b82f6' });
                  }}
                  className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Subcategoria */}
      {
        isSubModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Nova Subcategoria</h2>
              <form onSubmit={handleSubSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Subcategoria</label>
                  <input
                    type="text"
                    required
                    value={subFormData.name}
                    onChange={e => setSubFormData({ name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Freelance, Aluguel Comercial"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubModalOpen(false);
                      setSubFormData({ name: '' });
                    }}
                    className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Categories;
