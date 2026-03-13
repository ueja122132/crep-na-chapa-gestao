import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, DollarSign, ListChecks } from 'lucide-react';
import { Product, ProductType } from '../types';

export default function MenuManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('crepe');
  const [price, setPrice] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type,
        price: parseFloat(price),
        ingredients
      })
    });

    setName('');
    setPrice('');
    setIngredients([]);
    fetchProducts();
  };

  const deleteProduct = async (id: number) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-500" />
            Novo Item no Cardápio
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Nome do Sabor</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="Ex: Frango com Catupiry"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ProductType)}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                >
                  <option value="crepe">Crepe</option>
                  <option value="churrasco">Churrasco Grego</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Ingredientes</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                  className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Adicionar ingrediente..."
                />
                <button
                  type="button"
                  onClick={addIngredient}
                  className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ing, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-md border border-orange-100">
                    {ing}
                    <button type="button" onClick={() => removeIngredient(i)} className="hover:text-orange-900">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 mt-4"
            >
              Salvar no Cardápio
            </button>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Itens Cadastrados</h2>
            <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">{products.length} Itens</span>
          </div>
          
          <div className="divide-y divide-stone-100">
            {products.map((product) => (
              <div key={product.id} className="p-6 hover:bg-stone-50 transition-colors group">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl ${product.type === 'crepe' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-stone-800">{product.name}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded ${
                          product.type === 'crepe' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {product.type === 'crepe' ? 'Crepe' : 'Churrasco'}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 mb-2">
                        {product.ingredients.join(', ') || 'Sem ingredientes listados'}
                      </p>
                      <div className="flex items-center gap-1 text-orange-600 font-bold">
                        <DollarSign className="w-4 h-4" />
                        <span>{product.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="p-2 text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="p-12 text-center text-stone-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum item cadastrado ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClipboardList(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
