import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, ShoppingCart, Check } from 'lucide-react';
import { Product, ProductSize, ComplementGroup, SelectedComplement, Complement } from '../../types/product';
import { isProductAvailable, getAvailabilityMessage } from '../../utils/availability';
import { useImageUpload } from '../../hooks/useImageUpload';

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, selectedSize?: ProductSize, quantity: number, observations?: string, selectedComplements?: SelectedComplement[]) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ 
  product, 
  isOpen, 
  onClose, 
  onAddToCart 
}) => {
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(
    product.sizes ? product.sizes[0] : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [selectedComplements, setSelectedComplements] = useState<SelectedComplement[]>([]);
  const [productImage, setProductImage] = useState<string | null>(null);
  const hasSetCustomImage = useRef<boolean>(false);

  const { getProductImage } = useImageUpload();
  
  // Fetch product image when component mounts or product changes
  useEffect(() => {
    const loadProductImage = async () => {
      try {
        const image = await getProductImage(product.id);
        // Only set the image if we haven't set a custom image yet
        if (image && !hasSetCustomImage.current) {
          setProductImage(image);
          hasSetCustomImage.current = true;
        }
      } catch (error) {
        console.error('Error loading product image:', error);
      }
    };
    
    loadProductImage();
  }, [product.id, getProductImage]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getCurrentPrice = () => {
    return selectedSize ? selectedSize.price : product.price;
  };

  const getComplementsPrice = () => {
    return selectedComplements.reduce((total, selected) => total + selected.complement.price, 0);
  };

  const getTotalPrice = () => {
    return (getCurrentPrice() + getComplementsPrice()) * quantity;
  };

  const handleComplementChange = (group: ComplementGroup, complementId: string, checked: boolean) => {
    setSelectedComplements(prev => {
      const groupSelections = prev.filter(s => s.groupId === group.id);
      
      if (checked) {
        // Verificar se pode adicionar mais itens
        if (groupSelections.length >= group.maxItems) {
          return prev;
        }
        
        const complement = group.complements.find(c => c.id === complementId);
        if (complement) {
          return [...prev, {
            groupId: group.id,
            complementId,
            complement
          }];
        }
      } else {
        // Remover item
        return prev.filter(s => !(s.groupId === group.id && s.complementId === complementId));
      }
      
      return prev;
    });
  };

  const handleRadioComplementChange = (group: ComplementGroup, complementId: string) => {
    setSelectedComplements(prev => {
      // Remove todas as seleções do grupo
      const withoutGroup = prev.filter(s => s.groupId !== group.id);
      
      const complement = group.complements.find(c => c.id === complementId);
      if (complement) {
        return [...withoutGroup, {
          groupId: group.id,
          complementId,
          complement
        }];
      }
      
      return withoutGroup;
    });
  };

  const isComplementSelected = (groupId: string, complementId: string) => {
    return selectedComplements.some(s => s.groupId === groupId && s.complementId === complementId);
  };

  const getGroupSelectionCount = (groupId: string) => {
    return selectedComplements.filter(s => s.groupId === groupId).length;
  };

  const canAddToCart = () => {
    if (!product.complementGroups) return true;
    
    return product.complementGroups.every(group => {
      const selectionCount = getGroupSelectionCount(group.id);
      return selectionCount >= group.minItems && selectionCount <= group.maxItems;
    });
  };

  const handleAddToCart = () => {
    onAddToCart(product, selectedSize, quantity, observations, selectedComplements);
    onClose();
    setQuantity(1);
    setObservations('');
    setSelectedComplements([]);
  };

  const isAvailable = isProductAvailable(product);
  const availabilityMessage = getAvailabilityMessage(product);

  // Use the fetched image or fall back to the default product image
  // Once we've set a custom image, we'll always use that
  const imageToShow = hasSetCustomImage.current && productImage ? productImage : product.image;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <img
            src={imageToShow}
            alt={product.name}
            className="w-full h-48 object-cover rounded-t-2xl"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors"
          >
            <X size={20} />
          </button>
          
          {product.originalPrice && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              PROMOÇÃO
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h2>
            <p className="text-gray-600 mb-2">{product.description}</p>
            
            {/* Status de Disponibilidade */}
            <div className={`flex items-center gap-2 text-sm mb-3 ${
              isAvailable ? 'text-green-600' : 'text-red-600'
            }`}>
              <Check size={16} />
              <span className="font-medium">{availabilityMessage}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">
                {formatPrice(getCurrentPrice())}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-gray-500 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Seleção de Tamanho */}
          {product.sizes && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Escolha o tamanho:</h3>
              <div className="space-y-2">
                {product.sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      selectedSize?.id === size.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <div className="font-medium">{size.name}</div>
                        {size.description && (
                          <div className="text-sm text-gray-500">{size.description}</div>
                        )}
                      </div>
                      <div className="font-bold text-purple-600">
                        {formatPrice(size.price)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grupos de Complementos */}
          {product.complementGroups && product.complementGroups.map((group) => (
            <div key={group.id} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                <span className="text-sm text-gray-500">
                  {getGroupSelectionCount(group.id)}/{group.maxItems}
                </span>
              </div>
              
              {group.required && (
                <p className="text-sm text-red-600 mb-2">* Obrigatório</p>
              )}
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {group.complements.map((complement) => {
                  const isSelected = isComplementSelected(group.id, complement.id);
                  const groupCount = getGroupSelectionCount(group.id);
                  const canSelect = groupCount < group.maxItems || isSelected;
                  const isRadio = group.maxItems === 1;
                  
                  return (
                    <label
                      key={complement.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : canSelect
                          ? 'border-gray-200 hover:border-gray-300'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type={isRadio ? 'radio' : 'checkbox'}
                          name={isRadio ? `group-${group.id}` : undefined}
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={(e) => {
                            if (isRadio) {
                              handleRadioComplementChange(group, complement.id);
                            } else {
                              handleComplementChange(group, complement.id, e.target.checked);
                            }
                          }}
                          className="w-4 h-4 text-green-600"
                        />
                        <div>
                          <div className="font-medium text-gray-800">{complement.name}</div>
                          {complement.description && (
                            <div className="text-sm text-gray-500">{complement.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="font-bold text-green-600">
                        {complement.price > 0 ? formatPrice(complement.price) : 'Grátis'}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Observações */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Observações:</h3>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ex: Sem açúcar, mais granola..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Quantidade */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Quantidade:</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
              >
                <Minus size={20} />
              </button>
              <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Resumo do Preço */}
          {getComplementsPrice() > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Produto base:</span>
                <span>{formatPrice(getCurrentPrice())}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Complementos:</span>
                <span>{formatPrice(getComplementsPrice())}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Quantidade:</span>
                <span>{quantity}x</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>
            </div>
          )}

          {/* Botão Adicionar */}
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart() || !isAvailable}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2 ${
              !canAddToCart() || !isAvailable
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <ShoppingCart size={20} />
            {!canAddToCart() 
              ? 'Complete as opções obrigatórias'
              : `Adicionar - ${formatPrice(getTotalPrice())}`
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;