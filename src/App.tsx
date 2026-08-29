import React, { useState } from 'react';
import { WorkflowProvider } from './store/WorkflowContext';
import { Layout } from './components/Layout';
import { TaskBoard } from './components/TaskBoard';
import { DriveView } from './components/DriveView';

export default function App() {
  return (
    <WorkflowProvider>
      <Main />
    </WorkflowProvider>
  );
}

function Main() {
  const [currentView, setCurrentView] = useState<'board' | 'drive'>('board');

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {currentView === 'board' ? <TaskBoard /> : <DriveView />}
    </Layout>
  );
}
