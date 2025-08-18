import { Product, ProductAvailability, WeeklySchedule, ScheduledDays } from '../types/product';
import { useProductScheduling } from '../hooks/useProductScheduling';

// Hook para acessar programações do banco de dados
let productSchedulingHook: ReturnType<typeof useProductScheduling> | null = null;

export const setProductSchedulingHook = (hook: ReturnType<typeof useProductScheduling>) => {
  productSchedulingHook = hook;
};

export const isProductAvailable = (product: Product): boolean => {
  console.log('🔍 Verificando disponibilidade do produto:', {
    name: product.name,
    id: product.id,
    isActive: product.isActive,
    availability: product.availability,
    scheduledDays: product.scheduledDays
  });
  
  // PRIORIDADE 1: Verificar se o produto está ativo
  if (product.isActive === false) {
    console.log('❌ Produto inativo:', product.name);
    return false;
  }
  
  // PRIORIDADE 2: Verificar programação do banco de dados primeiro
  const dbSchedule = productSchedulingHook?.getProductSchedule(product.id);
  if (dbSchedule) {
    console.log('📅 Usando programação do banco de dados:', dbSchedule);
    const isAvailable = isWithinScheduledDays(dbSchedule);
    console.log(`✅ Resultado (banco): ${isAvailable ? 'DISPONÍVEL' : 'INDISPONÍVEL'} para ${product.name}`);
    return isAvailable;
  }
  
  // PRIORIDADE 3: Verificar programação no código do produto
  if (!product.availability) {
    // Verificar se tem scheduledDays diretamente no produto
    if (product.scheduledDays?.enabled) {
      console.log('📅 Usando programação do código (scheduledDays):', product.scheduledDays);
      const isAvailable = isWithinScheduledDays(product.scheduledDays);
      console.log(`✅ Resultado (código scheduledDays): ${isAvailable ? 'DISPONÍVEL' : 'INDISPONÍVEL'} para ${product.name}`);
      return isAvailable;
    }
    
    console.log('✅ Produto sem configuração de disponibilidade (sempre disponível):', product.name);
    return true;
  }

  const { type, schedule, scheduledDays } = product.availability;

  switch (type) {
    case 'always':
      return true;
    
    case 'scheduled':
      return isWithinSchedule(schedule);
    
    case 'specific_days':
      const scheduleToUse = scheduledDays || product.scheduledDays;
      const isAvailable = isWithinScheduledDays(scheduleToUse);
      console.log(`✅ Resultado (specific_days): ${isAvailable ? 'DISPONÍVEL' : 'INDISPONÍVEL'} para ${product.name}`);
      return isAvailable;
    
    default:
      return true;
  }
};

const isWithinSchedule = (schedule?: WeeklySchedule): boolean => {
  if (!schedule) return true;

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const todaySchedule = schedule[dayNames[currentDay]];

  if (!todaySchedule || !todaySchedule.enabled) {
    return false;
  }

  if (!todaySchedule.startTime || !todaySchedule.endTime) {
    return true; // Se não tem horário definido, está disponível o dia todo
  }

  const [startHour, startMinute] = todaySchedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = todaySchedule.endTime.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  return currentTime >= startTime && currentTime <= endTime;
};

const isWithinScheduledDays = (scheduledDays?: ScheduledDays): boolean => {
  if (!scheduledDays || !scheduledDays.enabled) {
    console.log('⚠️ Programação não habilitada ou desativada');
    return true; // Se não tem programação ativa, está sempre disponível
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Mapear dia da semana para propriedade do objeto
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const todayKey = dayMap[currentDay];

  console.log('🔍 Verificando disponibilidade:', {
    scheduledDays,
    currentDay,
    currentDayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][currentDay],
    todayKey,
    isDayEnabled: scheduledDays.days[todayKey],
    currentTime: `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`,
    startTime: scheduledDays.startTime,
    endTime: scheduledDays.endTime
  });

  // Verificar se hoje está habilitado
  if (!scheduledDays.days[todayKey]) {
    console.log(`❌ Produto não disponível hoje (${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][currentDay]})`);
    return false;
  }

  // Se tem horário específico, verificar se está dentro do horário
  if (scheduledDays.startTime && scheduledDays.endTime) {
    const [startHour, startMinute] = scheduledDays.startTime.split(':').map(Number);
    const [endHour, endMinute] = scheduledDays.endTime.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    const isWithinTime = currentTime >= startTime && currentTime <= endTime;
    console.log('⏰ Verificação de horário:', {
      startTime: scheduledDays.startTime,
      endTime: scheduledDays.endTime,
      currentTime: `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`,
      isWithinTime
    });

    return isWithinTime;
  }

  console.log(`✅ Produto disponível hoje (${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][currentDay]}) - sem restrição de horário`);
  return true; // Se não tem horário específico, está disponível o dia todo
};

export const getAvailabilityMessage = (product: Product): string => {
  // Verificar programação do banco de dados primeiro
  const dbSchedule = productSchedulingHook?.getProductSchedule(product.id);
  if (dbSchedule && dbSchedule.enabled) {
    if (isWithinScheduledDays(dbSchedule)) {
      return 'Disponível hoje';
    } else {
      const nextDay = getNextAvailableDayMessage(dbSchedule);
      return 'Consulte disponibilidade';
    }
  }
  
  // Verificar se o produto está ativo primeiro
  if (product.isActive === false) {
    return 'Produto inativo';
  }
  
  if (!product.availability) {
    return 'Disponível';
  }

  const { type, schedule, scheduledDays } = product.availability;

  switch (type) {
    case 'always':
      return 'Sempre disponível';
    
    case 'scheduled':
      if (isWithinSchedule(schedule)) {
        return 'Disponível agora';
      } else {
        return getNextAvailableTime(schedule) || 'Consulte disponibilidade';
      }
    
    case 'specific_days':
      if (isWithinScheduledDays(scheduledDays || product.scheduledDays)) {
        return 'Disponível hoje';
      } else {
        return getNextAvailableDayMessage(scheduledDays || product.scheduledDays) || 'Consulte disponibilidade';
      }
    
    default:
      return 'Disponível';
  }
};

const getNextAvailableTime = (schedule?: WeeklySchedule): string => {
  if (!schedule) return 'Consulte disponibilidade';

  const now = new Date();
  const currentDay = now.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayNamesPortuguese = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // Verifica os próximos 7 dias
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDay + i) % 7;
    const daySchedule = schedule[dayNames[checkDay]];

    if (daySchedule && daySchedule.enabled && daySchedule.startTime) {
      if (i === 0) {
        // Hoje - verifica se ainda vai abrir
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [startHour, startMinute] = daySchedule.startTime.split(':').map(Number);
        const startTime = startHour * 60 + startMinute;

        if (currentTime < startTime) {
          return `Disponível hoje às ${daySchedule.startTime}`;
        }
      } else {
        const dayName = dayNamesPortuguese[checkDay];
        return `Disponível ${dayName} às ${daySchedule.startTime}`;
      }
    }
  }

  return 'Consulte disponibilidade';
};

const getNextAvailableDayMessage = (scheduledDays?: ScheduledDays): string => {
  if (!scheduledDays || !scheduledDays.enabled) {
    return 'Sempre disponível';
  }

  const now = new Date();
  const currentDay = now.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayNamesPortuguese = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // Verifica os próximos 7 dias
  for (let i = 1; i < 8; i++) {
    const checkDay = (currentDay + i) % 7;
    const dayKey = dayNames[checkDay];

    if (scheduledDays.days && scheduledDays.days[dayKey]) {
      const dayName = dayNamesPortuguese[checkDay];
      
      if (scheduledDays.startTime) {
        return `Disponível ${dayName} às ${scheduledDays.startTime}`;
      } else {
        return `Disponível ${dayName}`;
      }
    }
  }

  return 'Consulte disponibilidade';
};

const getDayNameInPortuguese = (dayIndex: number): string => {
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return dayNames[dayIndex] || 'Dia inválido';
};

const getActiveDaysMessage = (scheduledDays?: ScheduledDays): string => {
  if (!scheduledDays || !scheduledDays.enabled) {
    return 'Sempre disponível';
  }

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  
  if (!scheduledDays.days) {
    return 'Nenhum dia ativo';
  }

  const activeDays = dayKeys
    .map((key, index) => {
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      };
      return scheduledDays.days[key] ? dayNames[dayMap[key]] : null;
    })
    .filter(Boolean);

  if (activeDays.length === 0) {
    return 'Nenhum dia ativo';
  }
  if (activeDays.length === 7) {
    return 'Todos os dias';
  }
  
  return activeDays.join(', ');
};

// FUNÇÃO CORRIGIDA: Verificar se é uma promoção do dia (produtos programados para hoje)
const isPromotionOfTheDay = (product: Product): boolean => {
  // Verificar programação do banco de dados primeiro
  const dbSchedule = productSchedulingHook?.getProductSchedule(product.id);
  if (dbSchedule?.enabled) {
    console.log('🎯 Verificando promoção do dia (DB):', {
      productName: product.name,
      dbSchedule,
      isAvailable: isWithinScheduledDays(dbSchedule)
    });
    const isAvailable = isWithinScheduledDays(dbSchedule);
    // Só é promoção do dia se estiver programado E disponível hoje
    return isAvailable;
  }
  
  // Verificar se o produto tem programação específica de dias
  const scheduledDays = product.scheduledDays || product.availability?.scheduledDays;
  
  if (!scheduledDays?.enabled) {
    console.log('🎯 Produto sem programação específica:', product.name);
    return false;
  }
  
  console.log('🎯 Verificando promoção do dia:', {
    productName: product.name,
    scheduledDays,
    isAvailable: isWithinScheduledDays(scheduledDays)
  });
  
  // Verificar se está disponível hoje
  const isAvailable = isWithinScheduledDays(scheduledDays);
  return isAvailable;
};

// FUNÇÃO CORRIGIDA: Filtrar apenas promoções programadas para hoje
export const getPromotionsOfTheDay = (products: Product[]): Product[] => {
  const promotions = products.filter(product => {
    // Verificar se o produto está ativo
    if (product.isActive === false) return false;
    
    // Verificar se o produto está disponível hoje (programação)
    if (!isProductAvailable(product)) return false;
    
    // Verificar se é uma promoção programada para hoje
    const isPromotion = isPromotionOfTheDay(product);
    
    console.log('🔍 Produto:', product.name, 'É promoção hoje?', isPromotion);
    
    return isPromotion;
  });

  console.log('📋 Promoções do dia encontradas:', promotions.length);
  return promotions;
};

// NOVA FUNÇÃO: Verificar se hoje tem promoções especiais
export const hasTodaySpecialPromotions = (products: Product[]): boolean => {
  return getPromotionsOfTheDay(products).length > 0;
};

// NOVA FUNÇÃO: Obter mensagem personalizada do dia
export const getTodaySpecialMessage = (): string => {
  const today = new Date();
  const dayName = getDayNameInPortuguese(today.getDay());
  
  // Mensagens especiais por dia da semana
  switch (today.getDay()) {
    case 1: // Segunda
      return `🔥 Promoções de ${dayName}`;
    case 2: // Terça
      return `🔥 Terça Especial`;
    case 3: // Quarta
      return `🔥 Quarta de Ofertas`;
    case 4: // Quinta
      return `🔥 QUINTA ELITE - Promoções Especiais`;
    case 5: // Sexta
      return `🔥 Sexta de Promoções`;
    case 6: // Sábado
      return `🔥 Sábado Especial`;
    case 0: // Domingo
      return `🔥 Domingo de Ofertas`;
    default:
      return `🔥 Promoções de ${dayName}`;
  }
};

// NOVA FUNÇÃO: Obter descrição personalizada por dia
export const getTodaySpecialDescription = (): string => {
  const today = new Date();
  
  switch (today.getDay()) {
    case 4: // Quinta-feira
      return 'Aproveite as promoções exclusivas da Quinta Elite! Ofertas especiais que só acontecem às quintas-feiras.';
    case 6: // Sábado
      return 'Fim de semana com sabor especial! Promoções imperdíveis para o seu sábado.';
    case 0: // Domingo
      return 'Domingo é dia de relaxar com açaí! Ofertas especiais para fechar a semana com chave de ouro.';
    default:
      return 'Promoções especiais programadas para hoje! Aproveite enquanto estão disponíveis.';
  }
};

// NOVA FUNÇÃO: Verificar se é quinta-feira (dia da Quinta Elite)
export const isQuintaElite = (): boolean => {
  return new Date().getDay() === 4; // 4 = Quinta-feira
};

// FUNÇÃO CORRIGIDA: Obter produtos da Quinta Elite especificamente
export const getQuintaEliteProducts = (products: Product[]): Product[] => {
  if (!isQuintaElite()) return [];
  
  return products.filter(product => {
    if (product.isActive === false) return false;
    
    // Verificar se é um produto da Quinta Elite
    const isQuintaProduct = product.name.toLowerCase().includes('quinta elite');
    
    // Verificar se está programado para quinta-feira
    const scheduledDays = product.scheduledDays || product.availability?.scheduledDays;
    const isScheduledForThursday = scheduledDays?.enabled && scheduledDays.days.thursday;
    
    const isAvailable = isScheduledForThursday && isWithinScheduledDays(scheduledDays);
    
    console.log('🎯 Quinta Elite check:', {
      productName: product.name,
      isQuintaProduct,
      isScheduledForThursday,
      isAvailable
    });
    
    return isQuintaProduct && isAvailable;
  });
};

// NOVA FUNÇÃO: Debug para verificar configuração de produtos
const debugProductScheduling = (products: Product[]) => {
  console.log('🐛 DEBUG: Configuração de produtos (Banco + Código)');
  
  products.forEach(product => {
    // Verificar programação do banco
    const dbSchedule = productSchedulingHook?.getProductSchedule(product.id);
    
    // Verificar programação do código
    const scheduledDays = product.scheduledDays || product.availability?.scheduledDays;
    
    if (dbSchedule?.enabled || scheduledDays?.enabled) {
      console.log('📅 Produto com programação:', {
        name: product.name,
        dbSchedule,
        scheduledDays,
        isAvailableToday: isProductAvailable(product),
        availabilityType: product.availability?.type,
        source: dbSchedule?.enabled ? 'Banco de Dados' : 'Código'
      });
    }
  });
};

// NOVA FUNÇÃO: Verificar inconsistências na programação de produtos
export const validateProductSchedules = (products: Product[]) => {
  console.log('🔍 VALIDAÇÃO: Verificando programação (Banco + Código)');
  
  const issues: string[] = [];
  
  products.forEach(product => {
    // Verificar programação do banco primeiro
    const dbSchedule = productSchedulingHook?.getProductSchedule(product.id);
    
    if (dbSchedule?.enabled) {
      const selectedDays = Object.values(dbSchedule.days).filter(Boolean).length;
      
      if (selectedDays === 0) {
        issues.push(`❌ ${product.name}: Programação do banco ativada mas nenhum dia selecionado`);
      } else {
        console.log(`✅ ${product.name}: Programado no banco para`, Object.entries(dbSchedule.days)
          .filter(([_, enabled]) => enabled)
          .map(([day, _]) => day)
          .join(', '));
      }
      return; // Se tem programação no banco, não verificar código
    }
    
    // Verificar programação do código
    const scheduledDays = product.scheduledDays || product.availability?.scheduledDays;
    
    if (scheduledDays?.enabled) {
      // Verificar se tem pelo menos um dia selecionado
      const selectedDays = Object.values(scheduledDays.days).filter(Boolean).length;
      
      if (selectedDays === 0) {
        issues.push(`❌ ${product.name}: Programação do código ativada mas nenhum dia selecionado`);
      }
      
      // Verificar consistência entre availability e scheduledDays
      if (product.availability?.type === 'specific_days') {
        const availabilityDays = product.availability.scheduledDays;
        if (availabilityDays && JSON.stringify(scheduledDays) !== JSON.stringify(availabilityDays)) {
          issues.push(`⚠️ ${product.name}: Inconsistência entre scheduledDays e availability.scheduledDays`);
        }
      }
      
      console.log(`✅ ${product.name}: Programado no código para`, Object.entries(scheduledDays.days)
        .filter(([_, enabled]) => enabled)
        .map(([day, _]) => day)
        .join(', '));
    } else {
      console.log(`📅 ${product.name}: Sem programação (sempre disponível)`);
    }
  });
  
  if (issues.length > 0) {
    console.warn('🚨 PROBLEMAS ENCONTRADOS:');
    issues.forEach(issue => console.warn(issue));
  } else {
    console.log('✅ Todas as programações estão válidas');
  }
  
  return issues;
};