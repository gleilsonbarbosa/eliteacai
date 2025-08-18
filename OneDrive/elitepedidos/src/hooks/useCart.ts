import { useState, useCallback } from 'react';
import { CartItem, Product, ProductSize, SelectedComplement } from '../types/product';

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addToCart = useCallback((
    product: Product, 
    selectedSize?: ProductSize, 
    quantity: number = 1,
    observations?: string,
    selectedComplements: SelectedComplement[] = []
  ) => {
    const basePrice = selectedSize ? selectedSize.price : product.price;
    const complementsPrice = selectedComplements.reduce((total, selected) => total + selected.complement.price, 0);
    const totalPrice = (basePrice + complementsPrice) * quantity;
    
    const newItem: CartItem = {
      id: `${product.id}-${selectedSize?.id || 'default'}-${Date.now()}`,
      product,
      selectedSize,
      selectedComplements,
      quantity,
      totalPrice,
      observations
    };

    setItems(prev => [...prev, newItem]);
    setIsOpen(true);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const basePrice = item.selectedSize ? item.selectedSize.price : item.product.price;
        const complementsPrice = item.selectedComplements.reduce((total, selected) => total + selected.complement.price, 0);
        return {
          ...item,
          quantity,
          totalPrice: (basePrice + complementsPrice) * quantity
        };
      }
      return item;
    }));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    setIsOpen(false);
  }, []);

  const getTotalPrice = useCallback(() => {
    return items.reduce((total, item) => total + item.totalPrice, 0);
  }, [items]);

  const getTotalItems = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  return {
    items,
    isOpen,
    setIsOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems
  };
};