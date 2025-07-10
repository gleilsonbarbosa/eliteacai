import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl || 'undefined',
    keyLength: supabaseAnonKey?.length || 0
  })
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Check for placeholder values
if (supabaseUrl === 'your_supabase_url_here' || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.error('❌ Supabase environment variables contain placeholder values')
  throw new Error('Please replace placeholder values in your .env file with actual Supabase credentials.')
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch {
  console.error('❌ Invalid Supabase URL format:', supabaseUrl)
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`)
}

// Log configuration for debugging (remove in production)
console.log('✅ Supabase URL:', supabaseUrl)
console.log('✅ Supabase Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Test connection on initialization
const testConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Add timeout to connection test
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timeout')), 10000);
    });
    
    const testPromise = supabase.from('pdv_products').select('count', { count: 'exact', head: true });
    
    const { error } = await Promise.race([testPromise, timeoutPromise]);
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error)
      console.error('   Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      console.info('ℹ️ A aplicação continuará funcionando com funcionalidades limitadas.')
    } else {
      console.log('✅ Supabase connection test successful')
    }
  } catch (error) {
    console.error('❌ Supabase connection test error:', error)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('   This usually means:')
      console.error('   1. Your Supabase URL is incorrect')
      console.error('   2. Your network is blocking the connection')
      console.error('   3. Your Supabase project is not running')
      console.error('   4. Your internet connection is unstable')
    } else if (error instanceof Error && error.message === 'Connection test timeout') {
      console.error('   Connection test timed out - this may indicate:')
      console.error('   1. Slow internet connection')
      console.error('   2. Supabase service is experiencing delays')
      console.error('   3. Network firewall is blocking the connection')
    }
    console.info('ℹ️ A aplicação continuará funcionando com funcionalidades limitadas.')
  }
}

// Run connection test with delay to avoid blocking app initialization
setTimeout(() => {
  testConnection();
}, 1000);