import React from 'react';
import { motion } from 'framer-motion';
import { Check, Rocket, Shield, Zap, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    id: 'essencial',
    name: 'Essencial',
    price: '99',
    description: 'Perfeito para creperias que estão começando.',
    features: [
      'Gestão de Pedidos (KDS)',
      'Cardápio Digital',
      'Financeiro Básico',
      'Até 2 usuários',
      'Suporte via E-mail'
    ],
    icon: <Zap className="w-6 h-6 text-orange-500" />,
    popular: false,
    color: 'orange'
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: '189',
    description: 'Para quem quer crescer com agilidade e dados.',
    features: [
      'Tudo do Essencial',
      'Relatórios Avançados',
      'Ranking de Produtos',
      'Gestão de Entregas',
      'Até 10 usuários',
      'Suporte Prioritário'
    ],
    icon: <Rocket className="w-6 h-6 text-purple-500" />,
    popular: true,
    color: 'purple'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '450',
    description: 'Solução completa para grandes redes e franquias.',
    features: [
      'Tudo do Profissional',
      'Múltiplas Unidades',
      'API de Integração',
      'Dashboards Customizados',
      'Usuários Ilimitados',
      'Gerente de Conta'
    ],
    icon: <Shield className="w-6 h-6 text-blue-500" />,
    popular: false,
    color: 'blue'
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#1c1917] text-stone-200">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-sm font-medium mb-6"
          >
            <Star className="w-4 h-4 fill-current" />
            <span>Planos Sob Medida</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Sua Creperia em Outro <span className="text-orange-500">Nível</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-stone-400 max-w-2xl mx-auto"
          >
            Gestão inteligente, relatórios em tempo real e agilidade na cozinha. Escolha o plano ideal e transforme seu negócio hoje.
          </motion.p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-3xl border ${
                plan.popular
                  ? 'bg-stone-900 border-orange-500/50 shadow-2xl shadow-orange-500/5'
                  : 'bg-stone-900/50 border-stone-800'
              } flex flex-col h-full overflow-hidden`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-8 px-4 py-1 bg-orange-500 text-stone-900 text-xs font-bold rounded-b-xl">
                  MAIS POPULAR
                </div>
              )}

              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-stone-800 flex items-center justify-center mb-4">
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-stone-400 text-sm">{plan.description}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-stone-500 text-xl font-medium">R$</span>
                <span className="text-5xl font-bold text-white tracking-tighter">{plan.price}</span>
                <span className="text-stone-500 font-medium">/mês</span>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-3 text-stone-300">
                    <div className="mt-1 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Botão que passa o plano escolhido via URL */}
              <Link
                to={`/register?plan=${plan.id}&price=${plan.price}&name=${encodeURIComponent(plan.name)}`}
                className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold transition-all ${
                  plan.popular
                    ? 'bg-orange-500 text-stone-900 hover:bg-orange-400'
                    : 'bg-stone-800 text-white hover:bg-stone-700'
                }`}
              >
                Começar com {plan.name}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer/Contact */}
        <div className="text-center text-stone-500 text-sm">
          <p>Precisa de um plano customizado? <Link to="/login" className="text-orange-500 font-medium hover:underline">Fale com um consultor</Link></p>
        </div>
      </div>
    </div>
  );
}
