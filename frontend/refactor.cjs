const fs = require('fs');
let content = fs.readFileSync('src/pages/LikesMatches.tsx', 'utf8');

const cardsGridStart = content.indexOf('/* PROFILES CARDS GRID */');
const cardsGridEnd = content.indexOf('</main>', cardsGridStart) - 10;
const cardsGridCode = content.substring(cardsGridStart, cardsGridEnd).trim();

// The inner code
const withoutStart = cardsGridCode.replace('/* PROFILES CARDS GRID */', '').replace('<div className="grid-cols-3" style={{ gap: \'2rem\' }}>', '');
const cleanedInnerCards = withoutStart.substring(0, withoutStart.lastIndexOf('</div>')).trim();

const renderCardsFunc = `
  const renderCards = (isMobile = false) => {
    return (
      <div className={isMobile ? '' : 'grid-cols-3'} style={{ display: isMobile ? 'flex' : undefined, flexDirection: isMobile ? 'column' : undefined, gap: isMobile ? '1.5rem' : '2rem', width: '100%' }}>
        ${cleanedInnerCards}
      </div>
    );
  };
`;

content = content.replace('const renderChatBox = () => {', renderCardsFunc + '\n\n  const renderChatBox = () => {');

content = content.replace(cardsGridCode, '{renderCards(false)}');

const targetStr = `<div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '100px' }}>
        <p style={{ color: '#7E7E7E', fontSize: '1rem' }}>Nothing here yet.</p>
      </div>`;

const targetStr2 = `<div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '100px' }}>\\n        <p style={{ color: '#7E7E7E', fontSize: '1rem' }}>Nothing here yet.</p>\\n      </div>`;

const replacement = `
      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '100px' }}>
        {isEmpty ? (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ color: '#7E7E7E', fontSize: '1rem' }}>Nothing here yet.</p>
          </div>
        ) : selectedChatProfile ? (
          renderChatBox()
        ) : (
          renderCards(true)
        )}
      </div>`;

content = content.replace(targetStr, replacement.trim());
content = content.replace(targetStr2, replacement.trim());
content = content.replace(/<div style=\{\{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '100px' \}\}>\s*<p style=\{\{ color: '#7E7E7E', fontSize: '1rem' \}\}>Nothing here yet.<\/p>\s*<\/div>/, replacement.trim());

fs.writeFileSync('src/pages/LikesMatches.tsx', content);
console.log('Replaced successfully');
