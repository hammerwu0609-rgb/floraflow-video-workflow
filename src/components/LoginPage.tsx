import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Leaf, LogIn } from 'lucide-react';
import { api } from '../api/client';
import type { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.login(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-sand-light rounded-[2rem] shadow-2xl border border-white overflow-hidden"
      >
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="flex items-center justify-center gap-3 text-moss mb-4">
            <Leaf className="w-10 h-10" />
            <span className="font-serif text-3xl font-medium">FloraFlow</span>
          </div>
          <p className="text-earth text-sm">AIGC 视频团队协作平台</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-5">
          <div>
            <label className="text-sm font-bold text-moss uppercase tracking-wider mb-2 block">用户名</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
              className="w-full bg-white border border-earth-light/50 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-moss/50 focus:ring-1 focus:ring-moss/50"
              required
            />
          </div>

          <div>
            <label className="text-sm font-bold text-moss uppercase tracking-wider mb-2 block">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              className="w-full bg-white border border-earth-light/50 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-moss/50 focus:ring-1 focus:ring-moss/50"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-moss text-white hover:bg-moss-light py-3 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
