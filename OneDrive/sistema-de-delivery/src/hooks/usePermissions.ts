import { useState, useEffect, useCallback } from 'react';
import { PDVOperator } from '../types/pdv';

type Permission = 
  | 'can_discount' 
  | 'can_cancel' 
  | 'can_manage_products'
  | 'can_view_sales'
  | 'can_view_cash_register'
  | 'can_view_products'
  | 'can_view_orders'
  | 'can_view_reports'
  | 'can_view_sales_report'
  | 'can_view_cash_report'
  | 'can_view_attendance'
  | 'can_view_operators';

type PermissionMap = Record<Permission, boolean>;

export const usePermissions = (operator?: PDVOperator | null) => {
  const [permissions, setPermissions] = useState<PermissionMap>({
    can_discount: false,
    can_cancel: false,
    can_manage_products: false,
    can_view_sales: false,
    can_view_cash_register: false,
    can_view_products: false,
    can_view_orders: false,
    can_view_reports: false,
    can_view_sales_report: false,
    can_view_cash_report: false,
    can_view_attendance: false,
    can_view_operators: false
  });

  // Initialize permissions based on operator
  useEffect(() => {
    if (operator && operator.permissions) {
      const newPermissions: PermissionMap = { ...permissions };
      
      // Map all permissions from operator
      Object.entries(operator.permissions).forEach(([key, value]) => {
        if (key in newPermissions) {
          newPermissions[key as Permission] = !!value;
        }
      });
      
      setPermissions(newPermissions);
    }
  }, [operator]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: Permission): boolean => {
    // If no operator is provided, assume no permissions
    if (!operator) {
      return false;
    }
    
    // Check if the permission exists in the operator's permissions
    if (operator.permissions && permission in operator.permissions) {
      return !!operator.permissions[permission];
    }
    
    // Default permissions for backward compatibility
    const defaultPermissions: Partial<Record<Permission, boolean>> = {
      can_view_sales: true,
      can_view_cash_register: true,
      can_view_products: true,
      can_view_orders: true,
      can_view_reports: true,
      can_view_sales_report: true,
      can_view_cash_report: true,
      can_view_attendance: true,
      can_view_operators: operator.code?.toUpperCase() === 'ADMIN' ? true : false
    };
    
    return defaultPermissions[permission] || false;
  }, [operator]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((...permissionList: Permission[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  }, [hasPermission]);

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback((...permissionList: Permission[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  }, [hasPermission]);

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
};