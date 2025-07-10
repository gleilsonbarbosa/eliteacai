import React, { useState } from 'react';
import { Calculator, User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PDVOperator } from '../../types/pdv';

interface PDVLoginProps {
  onLogin: (operator: PDVOperator) => void;
}

const PDVLogin: React.FC<PDVLoginProps> = ({ onLogin }) => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      // Check for hardcoded admin credentials for demo purposes
      if (code.toUpperCase() === 'ADMIN' && password === 'elite2024') {
        const { data, error } = await supabase
          .from('pdv_operators')
          .select('*')
          .eq('code', 'ADMIN')
          .single();
        
        if (data) {
          // Login successful with hardcoded credentials
          await supabase
            .from('pdv_operators')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.id);
          
          onLogin(data);
          return true;
        } else {
          // Try to create admin user if it doesn't exist
          try {
            const { data: newAdmin, error: createError } = await supabase
              .from('pdv_operators')
              .insert([{
                name: 'Administrador',
                code: 'ADMIN',
                password_hash: 'elite2024', // Will be hashed by the trigger
                is_active: true,
                permissions: {
                  can_discount: true,
                  can_cancel: true,
                  can_manage_products: true,
                  can_view_sales: true,
                  can_view_cash_register: true,
                  can_view_products: true,
                  can_view_orders: true,
                  can_view_reports: true,
                  can_view_sales_report: true,
                  can_view_cash_report: true,
                  can_view_operators: true
                }
              }])
              .select()
              .single();
              
            if (createError) {
              console.error('Error creating admin user:', createError);
              setError('Erro ao criar usuário administrador');
              return false;
            }
            
            if (newAdmin) {
              onLogin(newAdmin);
              return true;
            }
          } catch (createErr) {
            console.error('Error in admin creation:', createErr);
            setError('Erro ao criar usuário administrador');
            return false;
          }
        }
        return false;
      }
      
      // Buscar operador pelo código
      const { data, error: fetchError } = await supabase
        .from('pdv_operators')
        .select('*')
        .eq('code', code.trim())
        .eq('is_active', true)
        .single();

      if (fetchError || !data) {
        setError('Operador não encontrado ou inativo');
        setLoading(false);
        return;
      }

      // Verificar senha
      const { data: authData, error: authError } = await supabase.rpc(
        'verify_operator_password',
        {
          operator_code: code.trim(),
          password_to_check: password
        }
      );

      // Check if authentication failed
      if (authError || !authData) {
        setError('Senha incorreta');
        setLoading(false);
        return;
      }

      // Atualizar último login
      await supabase
        .from('pdv_operators')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      // Login bem-sucedido
      onLogin(data);
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      setError('Erro ao fazer login. Tente novamente.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fallback para login de demonstração
  const handleDemoLogin = () => {
    setCode('ADMIN');
    setPassword('elite2024');
    setTimeout(() => {
      // Submit the form with the demo credentials
      handleSubmit(new Event('submit') as any);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Calculator size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">PDV - Elite Açaí</h1>
          <p className="text-gray-600">Faça login para acessar o sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código do Operador
            </label>
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Digite seu código"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Autenticando...
              </>
            ) : (
              <>
                <LogIn size={18} className="mr-1" />
                Acessar PDV
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-2">
            Credenciais: ADMIN / elite2024
          </p>
          <button
            onClick={handleDemoLogin}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Entrar como Demonstração
          </button>
          <a
            href="/"
            className="block mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Voltar para o site
          </a>
        </div>
      </div>
    </div>
  );
};

export default PDVLogin;