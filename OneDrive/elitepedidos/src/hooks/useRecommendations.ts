import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { products } from '../data/products';
import { isProductAvailable } from '../utils/availability';

interface Recommendation {
  productId: string;
  productName: string;
  reason: string;
  confidence: number; // 0-1 score
  imageUrl?: string;
}

interface CustomerPurchaseHistory {
  favoriteProducts: string[];
  favoriteCategories: string[];
  lastOrderDate?: string;
  orderCount: number;
  averageOrderValue: number;
}

export const useRecommendations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [customerHistory, setCustomerHistory] = useState<CustomerPurchaseHistory | null>(null);

  // Get customer purchase history
  const getCustomerHistory = useCallback(async (customerId: string): Promise<CustomerPurchaseHistory | null> => {
    try {
      setLoading(true);
      
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl === 'your_supabase_url_here' || 
          supabaseKey === 'your_supabase_anon_key_here') {
        console.log('⚠️ Supabase not configured, using fallback recommendations');
        return null;
      }

      // Get customer's orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, items')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching customer orders:', ordersError);
        return null;
      }

      if (!orders || orders.length === 0) {
        return null;
      }

      // Process orders to extract favorite products and categories
      const productCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      let totalOrderValue = 0;

      orders.forEach(order => {
        totalOrderValue += order.total_price;
        
        // Process items if they exist
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            // Count product occurrences
            if (item.product_name) {
              productCounts[item.product_name] = (productCounts[item.product_name] || 0) + 1;
            }
            
            // Try to determine category from product name
            let category = 'unknown';
            if (item.product_name.toLowerCase().includes('açaí') || 
                item.product_name.toLowerCase().includes('acai')) {
              category = 'acai';
            } else if (item.product_name.toLowerCase().includes('milk') || 
                       item.product_name.toLowerCase().includes('shake')) {
              category = 'milkshake';
            } else if (item.product_name.toLowerCase().includes('combo')) {
              category = 'combo';
            } else if (item.product_name.toLowerCase().includes('vitamina')) {
              category = 'vitamina';
            }
            
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          });
        }
      });

      // Get favorite products (top 3)
      const favoriteProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([product]) => product);

      // Get favorite categories (top 2)
      const favoriteCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([category]) => category);

      return {
        favoriteProducts,
        favoriteCategories,
        lastOrderDate: orders[0]?.created_at,
        orderCount: orders.length,
        averageOrderValue: totalOrderValue / orders.length
      };
    } catch (err) {
      console.error('Error getting customer history:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get recommendations based on customer history
  const getRecommendations = useCallback(async (
    customerId?: string, 
    currentItems?: string[]
  ): Promise<Recommendation[]> => {
    try {
      setLoading(true);
      setError(null);
      
      // If we have a customer ID, try to get their history
      let history: CustomerPurchaseHistory | null = null;
      if (customerId) {
        history = await getCustomerHistory(customerId);
        setCustomerHistory(history);
      }
      
      // Filter available products
      const availableProducts = products.filter(p => isProductAvailable(p));
      
      // If we have customer history, use it for personalized recommendations
      if (history && history.orderCount > 0) {
        const personalizedRecs: Recommendation[] = [];
        
        // 1. Recommend based on favorite products
        if (history.favoriteProducts.length > 0) {
          // Find products similar to favorites
          const favoriteProduct = history.favoriteProducts[0];
          
          // Find products in the same category as the favorite
          const similarProducts = availableProducts.filter(p => {
            // Don't recommend products already in cart
            if (currentItems?.includes(p.name)) return false;
            
            // Don't recommend the exact same product
            if (p.name === favoriteProduct) return false;
            
            // Find products in same category or with similar names
            return p.name.toLowerCase().includes(favoriteProduct.toLowerCase().split(' ')[0]) ||
                  (p.category === getProductCategory(favoriteProduct));
          });
          
          if (similarProducts.length > 0) {
            // Take a random product from similar ones
            const recommendedProduct = similarProducts[Math.floor(Math.random() * similarProducts.length)];
            personalizedRecs.push({
              productId: recommendedProduct.id,
              productName: recommendedProduct.name,
              reason: `Baseado no seu pedido favorito (${favoriteProduct})`,
              confidence: 0.9,
              imageUrl: recommendedProduct.image
            });
          }
        }
        
        // 2. Recommend based on favorite categories
        if (history.favoriteCategories.length > 0) {
          const favoriteCategory = history.favoriteCategories[0];
          
          // Find products in favorite category not already recommended
          const categoryProducts = availableProducts.filter(p => {
            // Don't recommend products already in recommendations
            if (personalizedRecs.some(rec => rec.productId === p.id)) return false;
            
            // Don't recommend products already in cart
            if (currentItems?.includes(p.name)) return false;
            
            return p.category === favoriteCategory;
          });
          
          if (categoryProducts.length > 0) {
            // Take a random product from category
            const recommendedProduct = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
            personalizedRecs.push({
              productId: recommendedProduct.id,
              productName: recommendedProduct.name,
              reason: `Baseado na sua categoria favorita (${getCategoryName(favoriteCategory)})`,
              confidence: 0.8,
              imageUrl: recommendedProduct.image
            });
          }
        }
        
        // 3. Recommend a combo if average order value is high
        if (history.averageOrderValue > 30 && !personalizedRecs.some(rec => rec.productName.toLowerCase().includes('combo'))) {
          const comboProducts = availableProducts.filter(p => {
            // Don't recommend products already in recommendations
            if (personalizedRecs.some(rec => rec.productId === p.id)) return false;
            
            // Don't recommend products already in cart
            if (currentItems?.includes(p.name)) return false;
            
            return p.category === 'combo';
          });
          
          if (comboProducts.length > 0) {
            const recommendedCombo = comboProducts[Math.floor(Math.random() * comboProducts.length)];
            personalizedRecs.push({
              productId: recommendedCombo.id,
              productName: recommendedCombo.name,
              reason: 'Combos com excelente custo-benefício',
              confidence: 0.7,
              imageUrl: recommendedCombo.image
            });
          }
        }
        
        // If we have personalized recommendations, use them
        if (personalizedRecs.length > 0) {
          setRecommendations(personalizedRecs);
          return personalizedRecs;
        }
      }
      
      // Fallback: recommend popular products
      const popularRecommendations = getPopularRecommendations(availableProducts, currentItems);
      setRecommendations(popularRecommendations);
      return popularRecommendations;
    } catch (err) {
      console.error('Error getting recommendations:', err);
      setError(err instanceof Error ? err.message : 'Erro ao obter recomendações');
      
      // Fallback to popular recommendations
      const availableProducts = products.filter(p => isProductAvailable(p));
      const popularRecommendations = getPopularRecommendations(availableProducts, currentItems);
      setRecommendations(popularRecommendations);
      return popularRecommendations;
    } finally {
      setLoading(false);
    }
  }, [getCustomerHistory]);

  // Get popular recommendations (fallback)
  const getPopularRecommendations = (availableProducts: any[], currentItems?: string[]): Recommendation[] => {
    // Define popular products (hardcoded for demo)
    const popularProductIds = [
      'acai-700g',
      'combo-casal-1kg',
      'acai-500g',
      'milkshake-500ml'
    ];
    
    const recommendations: Recommendation[] = [];
    
    // Add popular products to recommendations
    popularProductIds.forEach(id => {
      const product = availableProducts.find(p => p.id === id);
      if (product && !currentItems?.includes(product.name)) {
        recommendations.push({
          productId: product.id,
          productName: product.name,
          reason: 'Muito popular entre nossos clientes',
          confidence: 0.6,
          imageUrl: product.image
        });
      }
    });
    
    // If we don't have enough recommendations, add some random products
    if (recommendations.length < 3) {
      const remainingProducts = availableProducts.filter(p => 
        !popularProductIds.includes(p.id) && 
        !recommendations.some(rec => rec.productId === p.id) &&
        !currentItems?.includes(p.name)
      );
      
      // Shuffle remaining products
      const shuffled = remainingProducts.sort(() => 0.5 - Math.random());
      
      // Add up to 3 random products
      shuffled.slice(0, 3 - recommendations.length).forEach(product => {
        recommendations.push({
          productId: product.id,
          productName: product.name,
          reason: 'Sugestão do dia',
          confidence: 0.5,
          imageUrl: product.image
        });
      });
    }
    
    return recommendations.slice(0, 3); // Return max 3 recommendations
  };

  // Helper function to get product category from name
  const getProductCategory = (productName: string): string => {
    const name = productName.toLowerCase();
    if (name.includes('açaí') || name.includes('acai')) return 'acai';
    if (name.includes('milk') || name.includes('shake')) return 'milkshake';
    if (name.includes('combo')) return 'combo';
    if (name.includes('vitamina')) return 'vitamina';
    return 'outros';
  };

  // Helper function to get category display name
  const getCategoryName = (category: string): string => {
    const categoryMap: Record<string, string> = {
      acai: 'Açaí',
      milkshake: 'Milkshake',
      combo: 'Combo',
      vitamina: 'Vitamina',
      outros: 'Outros'
    };
    
    return categoryMap[category] || category;
  };

  return {
    recommendations,
    customerHistory,
    loading,
    error,
    getRecommendations
  };
};