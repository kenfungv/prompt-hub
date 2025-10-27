import React, { useEffect, useState } from 'react';
import APIKeyManager from './APIKeyManager';

const APIPage = () => {
  const [openapi, setOpenapi] = useState(null);
  useEffect(() => {
    fetch('/docs/openapi.yaml')
      .then(res => res.text())
      .then(setOpenapi);
  }, []);
  return (
    <div>
      <h1>API 管理與調用</h1>
      <APIKeyManager />
      <h2>API 文檔 (OpenAPI/Swagger)</h2>
      <pre style={{ maxHeight: 320, overflow: 'auto', background: '#eee', padding: 8 }}>
        {openapi || '載入中...'}
      </pre>
    </div>
  );
};

export default APIPage;
