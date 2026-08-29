import React, { useState, useRef } from 'react';
import { useWorkflow } from '../store/WorkflowContext';
import { LayoutDashboard, HardDrive, FileSpreadsheet, Leaf, LogOut, KeyRound } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../api/client';

type View = 'board' | 'drive';

interface LayoutProps {
  currentView: View;
  setCurrentView: (v: View) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setCurrentView, children }) => {
  const { currentUser, logout, storyboardUrl, updateStoryboardUrl } = useWorkflow();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPwForm, setShowPwForm] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleMouseDown = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      setEditValue(storyboardUrl);
      setEditing(true);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 500);
    }
  };

  const handleSave = async () => {
    await updateStoryboardUrl(editValue.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditValue('');
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!oldPw || !newPw || !confirmPw) {
      setPwError('请填写所有字段');
      return;
    }
    if (newPw.length < 6) {
      setPwError('新密码至少 6 位');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('两次输入的新密码不一致');
      return;
    }
    setPwLoading(true);
    try {
      await api.changePassword(oldPw, newPw);
      setPwSuccess('密码修改成功');
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => {
        setShowPwForm(false);
        setPwSuccess('');
      }, 1500);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : '修改失败');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-bark font-sans">
      <aside className="w-64 bg-sand-light border-r border-earth-light/40 flex flex-col pt-8 pb-6 px-4">
        <div className="flex items-center gap-3 mb-12 px-2 text-moss">
          <Leaf className="w-8 h-8 drop-shadow-sm" />
          <span className="font-serif text-2xl font-medium tracking-tight">FloraFlow</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setCurrentView('board')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-left font-medium active:scale-95",
              currentView === 'board'
                ? "bg-leaf/10 text-moss shadow-[0_4px_20px_rgb(137,168,128,0.15)]"
                : "text-earth hover:bg-black/5"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>任务面板</span>
          </button>

          <button
            onClick={() => setCurrentView('drive')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-left font-medium active:scale-95",
              currentView === 'drive'
                ? "bg-leaf/10 text-moss shadow-[0_4px_20px_rgb(137,168,128,0.15)]"
                : "text-earth hover:bg-black/5"
            )}
          >
            <HardDrive className="w-5 h-5" />
            <span>云端存储</span>
          </button>

          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-left font-medium cursor-pointer",
              storyboardUrl ? "text-earth hover:bg-black/5" : "text-earth/40"
            )}
            title="三击编辑链接"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>分镜脚本</span>
          </div>

          {editing && (
            <div className="px-4 space-y-2">
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                placeholder="输入分镜脚本链接..."
                className="w-full bg-white border border-moss/50 focus:ring-1 ring-moss/50 rounded-xl px-3 py-2 text-sm text-bark outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="bg-moss hover:bg-leaf text-white px-3 py-1.5 rounded-lg text-xs font-medium flex-1">保存</button>
                <button onClick={handleCancel} className="bg-white hover:bg-sand text-earth px-3 py-1.5 rounded-lg text-xs font-medium">取消</button>
              </div>
            </div>
          )}

          {storyboardUrl && !editing && (
            <a
              href={storyboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-2 text-xs text-moss/70 hover:text-moss truncate"
            >
              {storyboardUrl}
            </a>
          )}
        </nav>

        <div className="mt-auto bg-white/60 p-4 rounded-3xl border border-earth-light/20 shadow-sm">
          <p className="text-xs font-semibold text-earth mb-3 uppercase tracking-wider px-1">当前账号</p>
          <div className="flex items-center gap-3 px-2 py-2">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full bg-sand" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-bark truncate">{currentUser.name}</p>
              <p className="text-[10px] text-earth truncate">{currentUser.roleTitle}</p>
            </div>
            <button
              onClick={() => { setShowPwForm(!showPwForm); setPwError(''); setPwSuccess(''); }}
              className="p-1.5 text-earth/50 hover:text-moss hover:bg-moss/10 rounded-full transition-colors"
              title="修改密码"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>

          {showPwForm && (
            <div className="mt-3 space-y-2 px-1">
              <input
                type="password"
                value={oldPw}
                onChange={e => setOldPw(e.target.value)}
                placeholder="旧密码"
                className="w-full bg-white border border-earth-light/50 focus:ring-1 ring-moss/50 rounded-xl px-3 py-2 text-sm text-bark outline-none"
              />
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="新密码（至少 6 位）"
                className="w-full bg-white border border-earth-light/50 focus:ring-1 ring-moss/50 rounded-xl px-3 py-2 text-sm text-bark outline-none"
              />
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="确认新密码"
                className="w-full bg-white border border-earth-light/50 focus:ring-1 ring-moss/50 rounded-xl px-3 py-2 text-sm text-bark outline-none"
                onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
              />
              {pwError && <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{pwError}</p>}
              {pwSuccess && <p className="text-xs text-moss bg-leaf/10 px-3 py-1.5 rounded-lg">{pwSuccess}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                  className="bg-moss hover:bg-leaf text-white px-3 py-1.5 rounded-lg text-xs font-medium flex-1 disabled:opacity-50"
                >
                  {pwLoading ? '修改中...' : '确认修改'}
                </button>
                <button
                  onClick={() => { setShowPwForm(false); setOldPw(''); setNewPw(''); setConfirmPw(''); setPwError(''); }}
                  className="bg-white hover:bg-sand text-earth px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm text-earth hover:bg-black/5 hover:text-bark transition-colors"
          >
            <LogOut className="w-4 h-4" /> 退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-[72px] flex items-center justify-between px-10 border-b border-earth-light/30 bg-sand/50 backdrop-blur-md z-10 shrink-0">
          <h1 className="text-2xl font-serif text-bark">
            {currentView === 'board' ? '当前工作流' : '云盘与资产'}
          </h1>
          <div className="flex items-center gap-4 bg-white/60 px-4 py-2 border border-earth-light/30 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-leaf animate-pulse"></span>
            <span className="text-sm font-medium text-moss">已同步至云端</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden p-10 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
};
