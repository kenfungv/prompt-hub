import React from 'react';
import TeamCollaborate from '../components/TeamCollaborate';
import './TeamCollaborationPage.css';

const TeamCollaborationPage = () => {
  return (
    <div className="team-collaboration-page">
      <header className="team-header">
        <h1>團隊協作</h1>
        <p>建立與管理團隊、角色與權限，協作編輯 Prompt。</p>
      </header>

      <section className="team-tools">
        <TeamCollaborate />
      </section>

      <section className="team-guidelines">
        <h3>最佳實踐</h3>
        <ul>
          <li>使用最小權限原則設定角色。</li>
          <li>為重要變更建立審核流程與評審人。</li>
          <li>善用日誌與版本控制追蹤變更。</li>
        </ul>
      </section>
    </div>
  );
};

export default TeamCollaborationPage;
