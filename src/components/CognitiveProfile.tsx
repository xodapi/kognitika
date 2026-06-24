import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';
import { ArrowRight, Download, Brain, TrendingUp, History, Info, Activity } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { CognitiveTrendCurve } from './CognitiveTrendCurve';

interface ProfileData {
  profile: Record<string, number> | null;
  trend: number;
  sessionsCount: number;
  requiredSessions?: number;
  remainingSessions?: number;
  updatedAt: string;
}

const DEFAULT_REQUIRED_SESSIONS = 5;

export function CognitiveProfile() {
  const { token } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/analytics/profile', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
    })
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const handleExport = async () => {
    const res = await fetch('/api/analytics/export', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kognitika_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Анализ нейронных связей...</div>;
  if (!data || !data.profile) {
    const completed = data?.sessionsCount ?? 0;
    const required = data?.requiredSessions ?? DEFAULT_REQUIRED_SESSIONS;
    const remaining = data?.remainingSessions ?? Math.max(0, required - completed);
    const progress = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;

    return (
      <div className="p-8 bg-card/30 border border-border rounded-3xl text-center">
        <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">
          Профиль набирает точность
        </p>
        <h3 className="text-xl font-black tracking-tight text-foreground mb-3">
          Пройдено {completed} из {required} тренировок
        </h3>
        <div className="mx-auto mb-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Осталось пройти {remaining} {remaining === 1 ? 'тренировку' : remaining >= 2 && remaining <= 4 ? 'тренировки' : 'тренировок'}. Отличное начало: чем больше завершенных сессий, тем честнее профиль видит ваши сильные стороны и зоны роста.
        </p>
      </div>
    );
  }

  const radarData = [
    { subject: 'Внимание', A: data.profile.attention, fullMark: 100 },
    { subject: 'Память', A: data.profile.memory, fullMark: 100 },
    { subject: 'Логика', A: data.profile.logic, fullMark: 100 },
    { subject: 'Скорость', A: data.profile.speed, fullMark: 100 },
    { subject: 'Стрессоуст.', A: data.profile.resilience, fullMark: 100 },
  ];

  const categories = [
    { key: 'attention', title: 'Внимание', descStrong: 'Вы отлично удерживаете фокус и фильтруете визуальный шум.', descWeak: 'Возможна рассеянность. Рекомендуем регулярные тренировки с Таблицами Шульте.', recommendations: [{ label: 'Таблицы Шульте', route: '/schulte' }] },
    { key: 'memory', title: 'Память', descStrong: 'У вас развита рабочая и топологическая память, вы легко оперируете объемами данных.', descWeak: 'Сложно удерживать структуры данных. Попробуйте тренажер N-назад и Пространство.', recommendations: [{ label: 'N-назад', route: '/nback' }, { label: 'Пространство', route: '/spatial' }] },
    { key: 'logic', title: 'Логика', descStrong: 'Вы превосходно находите скрытые паттерны, причинно-следственные связи и анализируете смыслы.', descWeak: 'Зона роста. Попробуйте Логические матрицы, Числовой анализ и Объективный фильтр.', recommendations: [{ label: 'Логические матрицы', route: '/logical' }, { label: 'Числовой анализ', route: '/numerical' }, { label: 'Объективный фильтр', route: '/objective' }] },
    { key: 'speed', title: 'Скорость', descStrong: 'Вы обладаете мгновенной моторной реакцией и высокой скоростью обработки информации.', descWeak: 'Реакция замедлена. Рекомендуем Скоростную печать и Детектор коллизий.', recommendations: [{ label: 'Скоростная печать', route: '/typing' }, { label: 'Детектор коллизий', route: '/collision' }] },
    { key: 'resilience', title: 'Стрессоустойчивость', descStrong: 'Вы сохраняете продуктивность в условиях высокой когнитивной нагрузки и асинхронности.', descWeak: 'Уровень стресса высок. Рекомендуем Редукцию шума и технику нейрорегуляции «Тишина».', recommendations: [{ label: 'Редукция шума', route: '/noise' }, { label: 'Тишина', route: '/silence' }] },
  ];

  // Sort by score to find strong/weak
  const sortedProfile = Object.entries(data.profile)
    .map(([key, val]) => ({ key, val }))
    .sort((a, b) => b.val - a.val);

  const strong = categories.find(c => c.key === sortedProfile[0]?.key);
  const weak = categories.find(c => c.key === sortedProfile[sortedProfile.length - 1]?.key);

  const handleTrainWeakZone = () => {
    const gameRoutes: Record<string, string> = {
      attention: '/schulte',
      memory: '/nback',
      logic: '/objective',
      speed: '/typing',
      resilience: '/noise'
    };
    const route = weak?.recommendations?.[0]?.route || gameRoutes[weak?.key || 'attention'] || '/';
    navigate(route);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card/40 border border-border rounded-3xl p-6 flex flex-col items-center"
        >
          <div className="flex items-center justify-between w-full mb-6">
            <h3 className="text-lg font-black tracking-tight">Когнитивный Профиль</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-[10px] font-bold text-primary">
              <Activity className="w-3 h-3 animate-pulse" /> ПОСЛЕДНИЕ {data.sessionsCount} СЕССИЙ
            </div>
          </div>
          
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }} />
                <Radar
                  name="Вы"
                  dataKey="A"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stats & Export */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card/40 border border-border rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Динамика</span>
              </div>
              <div className={`text-2xl font-black ${data.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {data.trend > 0 ? '+' : ''}{data.trend}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Относительно прошлых сессий</p>
            </div>

            <div className="bg-card/40 border border-border rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <History className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Прогресс</span>
              </div>
              <div className="text-2xl font-black text-primary">
                {data.sessionsCount}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Всего тренировок</p>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-sm font-black mb-2 flex items-center gap-2">
                <Download className="w-4 h-4" /> Экспорт данных (JSON)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Ваши данные в формате KCTS (Kognitika Cognitive Time-Series). 
                Оптимизировано для анализа в ChatGPT, Claude или вашей собственной LLM.
              </p>
              <button
                onClick={handleExport}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-primary/20"
              >
                Скачать JSON
              </button>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain className="w-24 h-24 rotate-12" />
            </div>
          </div>

          <div className="bg-card/40 border border-border rounded-3xl p-4 flex gap-3 items-start">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Профиль строится на основе алгоритма нормализации баллов по 5 ключевым векторам. 
              Данные за последние 100 сессий анализируются для выявления трендов когнитивной выносливости.
            </p>
          </div>
        </div>
      </div>

      {/* Cognitive Trend Curve */}
      <CognitiveTrendCurve days={30} />

      {/* Smart Interpretation Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/20 border border-border rounded-3xl p-6 space-y-6 backdrop-blur-md"
      >
        <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" /> Когнитивная интерпретация
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strong Domain */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500 mb-2 flex items-center gap-1.5">
              <span>🧠</span> Сильная сторона: {strong?.title} ({sortedProfile[0]?.val}/100)
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {strong?.descStrong}
            </p>
          </div>

          {/* Weak Domain */}
          <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-destructive mb-2 flex items-center gap-1.5">
              <span>⚡</span> Зона роста: {weak?.title} ({sortedProfile[sortedProfile.length - 1]?.val}/100)
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {weak?.descWeak}
            </p>
            {weak?.recommendations && weak.recommendations.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {weak.recommendations.map(item => (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => navigate(item.route)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-background/50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:border-primary hover:text-primary"
                  >
                    {item.label}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Симуляции автоматически адаптируют сложность на основе слабых зон профиля. Прогресс пересчитывается после каждой игры.
          </p>
          <button
            onClick={handleTrainWeakZone}
            className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-primary/20 shrink-0"
          >
            Тренировать зону роста
          </button>
        </div>
      </motion.div>
    </div>
  );
}
