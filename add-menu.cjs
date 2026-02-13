const fs = require('fs');

const content = fs.readFileSync('App.tsx', 'utf8');

const newMenuItem = `          <SidebarItem
            icon={<FileText size={20} />}
            label="Contratos"
            active={currentView === 'CONTRACTS'}
            onClick={() => setCurrentView('CONTRACTS')}
            collapsed={!isSidebarOpen}
          />
          `;

const updatedContent = content.replace(
    `          <SidebarItem
            icon={<Tags size={20} />}
            label="Categorias"`,
    newMenuItem + `<SidebarItem
            icon={<Tags size={20} />}
            label="Categorias"`
);

fs.writeFileSync('App.tsx', updatedContent, 'utf8');
console.log('✅ Menu item added!');
