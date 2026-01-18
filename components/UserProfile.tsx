
import React, { useState, useEffect } from 'react';
import { Subject, CycleItem } from '../types';
import { supabaseService, supabase } from '../services/supabaseService.ts';

interface UserProfileProps {
  subjects: Subject[];
  cycleItems: CycleItem[];
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ subjects, cycleItems, onClose }) => {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setName(user.user_metadata?.full_name || '');
      }
    };
    fetchUser();
  }, []);

  const totalHours = subjects.reduce((acc, s) => acc + s.totalHours, 0);
  const completedItems = cycleItems.filter(i => i.completed).length;
  const completionRate = cycleItems.length > 0 ? Math.round((completedItems / cycleItems.length) * 100) : 0;
  const avgMastery = subjects.length > 0 
    ? Math.round(subjects.reduce((acc, s) => acc + s.masteryPercentage, 0) / subjects.length) 
    : 0;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setMessage(null);
    try {
      const { error } = await supabaseService.updateProfile(name);
      if (error) throw error;
      setMessage({ text: 'Perfil atualizado com sucesso!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao atualizar perfil', type: 'error' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }
    setIsUpdatingPassword(true);
    setMessage(null);
    try {
      const { error } = await supabaseService.updatePassword(newPassword);
      if (error) throw error;
      setMessage({ text: 'Senha alterada com sucesso!', type: 'success' });
      setNewPassword('');
      setIsPasswordFormOpen(false);
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao atualizar senha', type: 'error' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    await supabaseService.signOut();
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'EXCLUIR CONTA') return;
    
    setIsDeletingAccount(true);
    try {
      await supabaseService.deleteAccount();
      window.location.reload();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Erro ao tentar excluir conta. Tente novamente.', type: 'error' });
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-end sm:p-4">
        <div 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={onClose}
        />
        
        <div className="relative w-full max-w-md h-full sm:h-auto sm:max-h-[95vh] bg-white dark:bg-slate-900 sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-500">
          <div className="bg-gradient-to-br from-brand-blue to-brand-darkBlue p-8 text-white relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center gap-5 mt-4">
              <div className="w-20 h-20 rounded-[28px] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl overflow-hidden p-4 text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">{name || 'Estudante'}</h2>
                <p className="text-blue-100/80 text-sm font-medium">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {message && (
              <div className={`p-4 rounded-2xl text-[10px] font-black uppercase border animate-in fade-in zoom-in duration-300 ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Informações da Conta</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                  <input 
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-brand-blue outline-none font-bold transition-all"
                  />
                </div>
                <button 
                  type="submit" disabled={isUpdatingProfile}
                  className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-brand-blue font-black rounded-xl transition-all uppercase text-[10px] tracking-widest border border-blue-100 dark:border-blue-900/40 hover:bg-blue-100"
                >
                  {isUpdatingProfile ? 'Salvando...' : 'Salvar Nome'}
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Segurança</h3>
                <button 
                  onClick={() => setIsPasswordFormOpen(!isPasswordFormOpen)}
                  className="text-[10px] font-black text-brand-blue uppercase"
                >
                  {isPasswordFormOpen ? 'Cancelar' : 'Alterar Senha'}
                </button>
              </div>
              
              {isPasswordFormOpen && (
                <form onSubmit={handleUpdatePassword} className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                    <input 
                      type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-brand-blue outline-none font-bold transition-all"
                    />
                  </div>
                  <button 
                    type="submit" disabled={isUpdatingPassword}
                    className="w-full py-3 bg-brand-blue text-white dark:bg-white dark:text-brand-blue font-black rounded-xl transition-all uppercase text-[10px] tracking-widest hover:opacity-90"
                  >
                    {isUpdatingPassword ? 'Atualizando...' : 'Confirmar Nova Senha'}
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-6 pt-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Estatísticas Rápidas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Total</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{totalHours}h</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Domínio Médio</span>
                  <span className="text-2xl font-black text-emerald-500">{avgMastery}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400">Progresso do Ciclo</span>
                  <span className="text-brand-orange">{completionRate}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-brand-orange rounded-full transition-all duration-1000" 
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
             <button 
              onClick={handleLogout}
              className="w-full py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl transition-all uppercase text-xs tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700"
            >
              Sair da Conta
            </button>
             <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full py-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-black rounded-2xl transition-all uppercase text-xs tracking-widest border border-rose-100 dark:border-rose-900/40 hover:bg-rose-100"
            >
              Excluir Minha Conta
            </button>
             <button 
              onClick={onClose}
              className="w-full py-3 text-slate-400 dark:text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-slate-600"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !isDeletingAccount && setIsDeleteModalOpen(false)} />
          
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">
                ⚠️
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Você tem certeza absoluta?</h3>
              <p className="text-xs font-bold text-slate-400 uppercase leading-relaxed tracking-wider">
                Esta ação é irreversível. Todos os seus ciclos e disciplinas serão perdidos para sempre.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest text-center">
                  Para confirmar, digite abaixo:<br/>
                  <span className="text-slate-900 dark:text-white text-xs mt-1 block">EXCLUIR CONTA</span>
                </label>
                <input 
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Digite aqui..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-rose-500 outline-none font-black text-center transition-all"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmationText !== 'EXCLUIR CONTA' || isDeletingAccount}
                  className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-rose-200 dark:shadow-none disabled:opacity-20 disabled:scale-100 active:scale-95 transition-all"
                >
                  {isDeletingAccount ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeletingAccount}
                  className="w-full py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
                >
                  Desistir e Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfile;